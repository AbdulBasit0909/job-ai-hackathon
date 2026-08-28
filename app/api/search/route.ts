import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { groq } from "@ai-sdk/groq";
import { aggregateJobs } from "@/lib/jobs/aggregator";
import type { JobSource } from "@/types/job";

export async function POST(req: Request) {
  try {
    const { query, location, filters } = await req.json();

    const searchQuery = query?.trim() || "software engineer";
    const searchLocation = location?.trim() || (filters?.remoteOnly ? "remote" : "Pakistan");

    // 1. Fetch real aggregated jobs across LinkedIn, Adzuna, Remotive (or seed fallback)
    const aggregated = await aggregateJobs({
      query: searchQuery,
      location: searchLocation,
      source: (filters?.source as JobSource) || "all",
      limit: 25,
      page: 1,
    });

    const jobs = aggregated.jobs;

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ jobs: [], usingFallback: aggregated.usingFallback });
    }

    // 2. Prepare simplified list for Groq AI to score
    const jobsForAI = jobs.slice(0, 15).map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location,
      remote: j.isRemote,
      source: j.source,
      tags: j.tags,
      description: j.description.slice(0, 300),
    }));

    try {
      // 3. Call Groq AI for intelligent semantic matching & explanations
      const { object } = await generateObject({
        model: groq("openai/gpt-oss-20b"),
        schema: z.object({
          rankedJobs: z.array(
            z.object({
              jobId: z.string(),
              matchScore: z.number(),
              explanation: z
                .string()
                .describe(
                  "A concise 1-sentence explanation of why this job matches the user query.",
                ),
            }),
          ),
        }),
        prompt: `
          You are an expert technical recruiter.
          User Search Query: "${searchQuery}"
          User Location Preference: "${searchLocation}"
          
          Here are available aggregated jobs:
          ${JSON.stringify(jobsForAI, null, 2)}
          
          Analyze the query against the job title, company, location, remote status, and skills.
          Rank jobs by relevance and assign a match score between 60 and 99.
          Provide a concise explanation for why it matches.
        `,
      });

      // 4. Merge AI scores with complete Job data
      const rankedResults = object.rankedJobs
        .map((aiJob) => {
          const fullJob = jobs.find((j) => j.id === aiJob.jobId);
          if (!fullJob) return null;
          return {
            id: fullJob.id,
            title: fullJob.title,
            company: fullJob.company,
            location: fullJob.location,
            remote: fullJob.isRemote,
            source: fullJob.source,
            sourceUrl: fullJob.sourceUrl,
            salaryRange: fullJob.salaryRange,
            salaryMin: 90000,
            salaryMax: 150000,
            skills: fullJob.tags,
            description: fullJob.description,
            postedAt: fullJob.postedAt,
            isFallback: fullJob.isFallback,
            matchScore: aiJob.matchScore,
            explanation: aiJob.explanation,
          };
        })
        .filter(Boolean);

      return NextResponse.json({
        jobs: rankedResults.length > 0 ? rankedResults : jobs.map((j, i) => ({
          ...j,
          remote: j.isRemote,
          skills: j.tags,
          matchScore: 90 - i * 3,
          explanation: `Strong match for "${searchQuery}" at ${j.company} in ${j.location}.`,
        })),
        usingFallback: aggregated.usingFallback,
      });
    } catch (aiErr) {
      console.warn("[search-ai] Groq ranking fallback to rule-based:", aiErr);
      // If AI fails or limits out, return the aggregated jobs directly with heuristic scores
      const fallbackRanked = jobs.map((j, idx) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        remote: j.isRemote,
        source: j.source,
        sourceUrl: j.sourceUrl,
        salaryRange: j.salaryRange,
        salaryMin: 90000,
        salaryMax: 150000,
        skills: j.tags,
        description: j.description,
        postedAt: j.postedAt,
        isFallback: j.isFallback,
        matchScore: Math.max(70, 95 - idx * 4),
        explanation: `Relevant role for "${searchQuery}" at ${j.company} (${j.location}).`,
      }));

      return NextResponse.json({
        jobs: fallbackRanked,
        usingFallback: aggregated.usingFallback,
      });
    }
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json(
      { error: "Failed to process search", jobs: [] },
      { status: 500 },
    );
  }
}