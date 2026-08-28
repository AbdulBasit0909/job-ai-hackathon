import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from "zod";
import { groq } from "@ai-sdk/groq";
export async function POST(req: Request) {
  try {
    const { query, filters } = await req.json();

    // Build the Prisma WHERE clause based on filters
    const whereClause: Prisma.JobWhereInput = {};
    if (filters?.remoteOnly) whereClause.remote = true;
    if (filters?.minSalary) whereClause.salaryMax = { gte: parseInt(filters.minSalary) };
    if (filters?.postedDays) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(filters.postedDays));
      whereClause.postedDate = { gte: date };
    }

    const jobs = await prisma.job.findMany({
      take: 25,
      orderBy: { postedDate: "desc" },
      where: whereClause
    });

    if (jobs.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const jobsForAI = jobs.map(j => ({
      id: j.id, title: j.title, company: j.company, location: j.location,
      remote: j.remote, salaryMin: j.salaryMin, salaryMax: j.salaryMax, skills: j.skills,
    }));

    const { object } = await generateObject({
     model: groq("openai/gpt-oss-20b"),
      schema: z.object({
        rankedJobs: z.array(
          z.object({
            jobId: z.string(),
            matchScore: z.number(),
            explanation: z.string().describe("A short, 1-sentence explanation of why this job matches the user's query."),
          })
        )
      }),
      prompt: `
        You are an expert technical recruiter. 
        User query: "${query}"
        Jobs: ${JSON.stringify(jobsForAI, null, 2)}
        Analyze the query (skills, location, salary, role level). Rank by relevance. Return top 5. Assign matchScore 0-100. Write a concise explanation.
      `,
    });

    const rankedResults = object.rankedJobs
      .map(aiJob => {
        const fullJob = jobs.find(j => j.id === aiJob.jobId);
        return fullJob ? { ...fullJob, matchScore: aiJob.matchScore, explanation: aiJob.explanation } : null;
      })
      .filter(Boolean)
      .slice(0, 5);

    return NextResponse.json({ jobs: rankedResults });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Failed to process AI search" }, { status: 500 });
  }
}