import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    // 1. Fetch jobs from our Neon Database
    // For a hackathon, we'll grab a diverse set of recent jobs to send to the AI
    const jobs = await prisma.job.findMany({
      take: 25,
      orderBy: { postedDate: "desc" },
    });

    if (jobs.length === 0) {
      return NextResponse.json({ error: "No jobs found in database" }, { status: 404 });
    }

    // 2. Prepare a simplified list for the AI to read (saves tokens/speeds up Groq)
    const jobsForAI = jobs.map(j => ({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location,
      remote: j.remote,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      skills: j.skills,
    }));

    // 3. Call Groq AI to analyze and score the jobs
    const { object } = await generateObject({
     model: google("gemini-3.6-flash"),// Super fast model on Groq
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
        You are an expert technical recruiter AI. 
        A user is searching for a job with this query: "${query}"
        
        Here is a list of available jobs:
        ${JSON.stringify(jobsForAI, null, 2)}
        
        Analyze the user's query (looking at skills, location, remote preference, salary, role level).
        Rank the jobs by relevance. Return the top 5 matches.
        Assign a matchScore from 0 to 100. 
        Write a concise, specific explanation for WHY it matches.
      `,
    });

    // 4. Merge the AI scores back with the full job data to send to the frontend
    const rankedResults = object.rankedJobs
      .map(aiJob => {
        const fullJob = jobs.find(j => j.id === aiJob.jobId);
        return fullJob ? { ...fullJob, matchScore: aiJob.matchScore, explanation: aiJob.explanation } : null;
      })
      .filter(Boolean)
      .slice(0, 5); // Ensure we only return top 5

    return NextResponse.json({ jobs: rankedResults });

  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Failed to process AI search" }, { status: 500 });
  }
}