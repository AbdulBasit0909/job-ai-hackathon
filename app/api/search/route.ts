import { NextResponse } from "next/server";
import { aggregateJobs } from "@/lib/jobs/aggregator";
import type { JobSource } from "@/types/job";
import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";

// Fast algorithmic relevance scoring (runs in < 2ms)
function scoreJobRelevance(job: any, query: string, targetLocation: string): { score: number; explanation: string } {
  const qTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const titleLower = (job.title || "").toLowerCase();
  const companyLower = (job.company || "").toLowerCase();
  const descLower = (job.description || "").toLowerCase();
  const tagsLower = (job.skills || job.tags || []).map((t: string) => t.toLowerCase());
  const locLower = (job.location || "").toLowerCase();

  let score = 70;
  const matchedTokens: string[] = [];

  // Title match (highest weight)
  qTokens.forEach((tok) => {
    if (titleLower.includes(tok)) {
      score += 12;
      matchedTokens.push(tok);
    } else if (tagsLower.some((t: string) => t.includes(tok))) {
      score += 8;
      matchedTokens.push(tok);
    } else if (descLower.includes(tok)) {
      score += 4;
    }
  });

  // Location match
  if (targetLocation && targetLocation.toLowerCase() !== "all") {
    const loc = targetLocation.toLowerCase();
    if (job.remote || locLower.includes("remote")) {
      score += 5;
    } else if (locLower.includes(loc) || (loc.includes("pakistan") && /lahore|karachi|islamabad|faisalabad|pakistan/i.test(locLower))) {
      score += 6;
    }
  }

  score = Math.min(99, Math.max(65, score));

  let explanation = `Matches key skills and requirements for "${query}" at ${job.company}.`;
  if (matchedTokens.length > 0) {
    explanation = `Strong match for ${matchedTokens.join(", ")} skills at ${job.company} (${job.location || "Remote"}).`;
  }

  return { score, explanation };
}

export async function POST(req: Request) {
  try {
    const { query, location, filters } = await req.json();

    const searchQuery = query?.trim() || "Software Engineer";
    const searchLocation = location?.trim() || (filters?.remoteOnly ? "remote" : "Pakistan");

    // 1. Fetch real aggregated jobs (parallel external fetch with strict timeouts)
    const aggregated = await aggregateJobs({
      query: searchQuery,
      location: searchLocation,
      source: (filters?.source as JobSource) || "all",
      limit: 25,
      page: 1,
    });

    const rawJobs = aggregated.jobs;

    if (!rawJobs || rawJobs.length === 0) {
      return NextResponse.json({ jobs: [], usingFallback: aggregated.usingFallback });
    }

    // 2. Fast intelligent ranking (Instant sub-second response)
    const rankedJobs = rawJobs.map((j, idx) => {
      const { score, explanation } = scoreJobRelevance(j, searchQuery, searchLocation);
      return {
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
        skills: j.tags || [],
        description: j.description,
        postedAt: j.postedAt,
        isFallback: j.isFallback,
        matchScore: score,
        explanation,
      };
    });

    // Sort by match score descending
    rankedJobs.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      jobs: rankedJobs,
      usingFallback: aggregated.usingFallback,
    });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json(
      { error: "Failed to process search", jobs: [] },
      { status: 500 },
    );
  }
}