import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { groq } from "@ai-sdk/groq";
import { aggregateJobs } from "@/lib/jobs/aggregator";
import type { Job } from "@/types/job";

const candidateModels = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

const cvAnalysisSchema = z.object({
  primaryRole: z
    .string()
    .describe(
      "The single best-fit job title for this candidate (e.g. 'Frontend Developer', 'Full Stack Engineer', 'Data Scientist')."
    ),
  skills: z
    .array(z.string())
    .describe("Top 6-8 technical skills extracted from the CV."),
  experienceLevel: z
    .enum(["Entry", "Mid", "Senior"])
    .describe("The candidate's experience level based on years and depth of work."),
  searchQueries: z
    .array(z.string())
    .describe(
      "2 alternative job-search queries that would surface relevant positions for this candidate."
    ),
});

function scoreJobAgainstCV(
  job: Job,
  skills: string[]
): { score: number; matchedSkills: string[]; explanation: string } {
  const skillsLower = skills.map((s) => s.toLowerCase());
  const titleLower = (job.title || "").toLowerCase();
  const descLower = (job.description || "").toLowerCase();
  const tagsLower = (job.tags || []).map((t: string) => t.toLowerCase());

  let score = 60;
  const matchedSkills: string[] = [];

  skillsLower.forEach((skill) => {
    if (titleLower.includes(skill)) {
      score += 10;
      if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
    } else if (tagsLower.some((t) => t.includes(skill))) {
      score += 7;
      if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
    } else if (descLower.includes(skill)) {
      score += 4;
      if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
    }
  });

  score = Math.min(99, Math.max(60, score));

  const explanation =
    matchedSkills.length > 0
      ? `Matches your ${matchedSkills.join(", ")} skills at ${job.company}.`
      : `Relevant position at ${job.company} (${job.location || "Remote"}).`;

  return { score, matchedSkills, explanation };
}

export async function POST(req: Request) {
  try {
    const { resumeText } = await req.json();

    if (!resumeText || typeof resumeText !== "string" || !resumeText.trim()) {
      return NextResponse.json(
        { error: "Resume text is required." },
        { status: 400 }
      );
    }

    // --- Step 1: AI-powered CV analysis ---
    const cleanText = resumeText.slice(0, 6000);

    let analysis: z.infer<typeof cvAnalysisSchema> | null = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const { object } = await generateObject({
          model: groq(modelName),
          schema: cvAnalysisSchema,
          prompt: `Analyze this resume/CV. Extract the candidate's best-fit job title, top technical skills, experience level, and 2 alternative job-search queries.\n\nResume:\n${cleanText}`,
        });
        analysis = object;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!analysis) {
      throw lastError || new Error("All AI models failed. Please try again.");
    }

    // --- Step 2: Fetch real jobs using the extracted role + alternative queries ---
    const queries = [analysis.primaryRole, ...analysis.searchQueries];
    let allJobs: Job[] = [];

    for (const query of queries.slice(0, 3)) {
      try {
        const result = await aggregateJobs({
          query,
          location: "all",
          limit: 15,
          page: 1,
        });
        allJobs.push(...result.jobs);
      } catch (err) {
        console.warn(`[cv-match] aggregateJobs("${query}") failed:`, err);
      }
    }

    if (allJobs.length === 0) {
      return NextResponse.json({
        analysis: {
          primaryRole: analysis.primaryRole,
          skills: analysis.skills,
          experienceLevel: analysis.experienceLevel,
        },
        jobs: [],
      });
    }

    // --- Step 3: Score & rank each job against the CV skills ---
    const scored = allJobs.map((job) => {
      const { score, matchedSkills, explanation } = scoreJobAgainstCV(
        job,
        analysis!.skills
      );
      return {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.isRemote,
        source: job.source,
        sourceUrl: job.sourceUrl,
        salaryRange: job.salaryRange,
        skills: job.tags || [],
        description: job.description,
        matchScore: score,
        matchedSkills,
        explanation,
        isFallback: job.isFallback,
      };
    });

    // Deduplicate by ID, keep highest score
    const bestByID = new Map<string, (typeof scored)[0]>();
    for (const j of scored) {
      const existing = bestByID.get(j.id);
      if (!existing || j.matchScore > existing.matchScore) {
        bestByID.set(j.id, j);
      }
    }

    const uniqueJobs = Array.from(bestByID.values())
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);

    return NextResponse.json({
      analysis: {
        primaryRole: analysis.primaryRole,
        skills: analysis.skills,
        experienceLevel: analysis.experienceLevel,
      },
      jobs: uniqueJobs,
    });
  } catch (error: any) {
    console.error("CV Match Error:", error);
    return NextResponse.json(
      {
        error:
          error?.message || "Failed to analyze CV and find matching jobs.",
      },
      { status: 500 }
    );
  }
}
