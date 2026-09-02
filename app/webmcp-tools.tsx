"use client";

import { useEffect } from "react";
import { emitActivity } from "@/components/webmcp-activity-feed";
import type { ActivityEvent } from "@/components/webmcp-activity-feed";

// ---------------------------------------------------------------------------
// WebMCP Tools Registration
// ---------------------------------------------------------------------------
// This component registers tools with the browser's WebMCP API so that
// AI agents (ChatGPT desktop, Chrome AI, etc.) can discover and invoke
// actions on our platform programmatically.
//
// Each tool simply calls our existing Next.js API routes — no business
// logic is duplicated. Tools operate within the user's authenticated
// Clerk session (cookies are already present in the browser).
// ---------------------------------------------------------------------------

// Type-safe guard for the WebMCP API
declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: {
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      }) => Promise<void>;
    };
  }
}

// Helper: wrap a tool execute function with activity feed events
function withActivity(
  toolName: string,
  summaryFn: (input: Record<string, unknown>) => string,
  executeFn: (input: Record<string, unknown>) => Promise<unknown>,
  resultFn?: (result: unknown) => string
) {
  return async (input: Record<string, unknown>) => {
    const id = `${toolName}-${Date.now()}`;
    emitActivity({
      id,
      tool: toolName,
      status: "running",
      summary: summaryFn(input),
      timestamp: new Date(),
    });

    try {
      const result = await executeFn(input);
      emitActivity({
        id,
        tool: toolName,
        status: "success",
        summary: summaryFn(input),
        timestamp: new Date(),
        result: resultFn ? resultFn(result) : undefined,
      });
      return result;
    } catch (err) {
      emitActivity({
        id,
        tool: toolName,
        status: "error",
        summary: summaryFn(input),
        timestamp: new Date(),
        result: String(err),
      });
      throw err;
    }
  };
}

async function registerAllTools() {
  if (!document.modelContext) {
    console.log("[WebMCP] document.modelContext not available — skipping tool registration.");
    return;
  }

  const mc = document.modelContext;

  // ── 1. Search Jobs ──────────────────────────────────────────────────────
  await mc.registerTool({
    name: "search_jobs",
    description:
      "Search for job listings by role title, location, and filters. Returns ranked results with AI-powered match scores.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Job title or role to search for (e.g. 'React Developer', 'Data Scientist')",
        },
        location: {
          type: "string",
          description: "Location filter such as a city, country, or 'remote' for remote-only jobs",
        },
      },
      required: ["query"],
    },
    execute: withActivity(
      "search_jobs",
      (input) => `Searching for "${input.query}" jobs${input.location ? ` in ${input.location}` : ""}...`,
      async (input) => {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: input.query, location: input.location || "remote" }),
        });
        const data = await res.json();
        const jobs = (data.jobs || []).slice(0, 10).map((j: any) => ({
          title: j.title, company: j.company, location: j.location, remote: j.remote,
          matchScore: j.matchScore, explanation: j.explanation, skills: j.skills,
          sourceUrl: j.sourceUrl, id: j.id,
        }));
        return { totalResults: data.jobs?.length || 0, showing: jobs.length, jobs };
      },
      (r: any) => `Found ${r.totalResults} jobs, showing top ${r.showing}`
    ),
  });

  // ── 2. Get Job Details ──────────────────────────────────────────────────
  await mc.registerTool({
    name: "get_job_details",
    description: "Get full details of a specific job listing by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "The unique ID of the job to retrieve" },
      },
      required: ["jobId"],
    },
    execute: withActivity(
      "get_job_details",
      (input) => `Fetching details for job ${String(input.jobId).slice(0, 8)}...`,
      async (input) => {
        const res = await fetch(`/api/jobs/${input.jobId}`);
        const data = await res.json();
        if (data.error) return { error: data.error };
        return { job: data.job };
      },
      (r: any) => r.job ? `${r.job.title} at ${r.job.company}` : "Job not found"
    ),
  });

  // ── 3. Save / Track a Job ───────────────────────────────────────────────
  await mc.registerTool({
    name: "save_job",
    description: "Save a job to the user's application tracker.",
    inputSchema: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "The unique ID of the job to save" },
        jobData: {
          type: "object",
          description: "Optional job metadata if the job isn't in the database",
          properties: {
            title: { type: "string" }, company: { type: "string" },
            location: { type: "string" }, description: { type: "string" },
            skills: { type: "array", items: { type: "string" } }, remote: { type: "boolean" },
          },
        },
        status: { type: "string", description: "Status: 'Saved', 'Applied', 'Interviewing', 'Offer', or 'Rejected'" },
      },
      required: ["jobId"],
    },
    execute: withActivity(
      "save_job",
      (input) => `Saving job to tracker...`,
      async (input) => {
        const res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: input.jobId, jobData: input.jobData, status: input.status || "Saved" }),
        });
        const data = await res.json();
        if (data.error) return { error: data.error };
        return {
          success: true, alreadySaved: data.alreadySaved || false,
          application: {
            id: data.application?.id, status: data.application?.status,
            jobTitle: data.application?.job?.title, company: data.application?.job?.company,
          },
        };
      },
      (r: any) => r.success ? `Saved: ${r.application?.jobTitle} at ${r.application?.company}` : r.error
    ),
  });

  // ── 4. Get My Applications ──────────────────────────────────────────────
  await mc.registerTool({
    name: "get_applications",
    description: "Retrieve all tracked job applications with status and details.",
    inputSchema: { type: "object", properties: {} },
    execute: withActivity(
      "get_applications",
      () => `Fetching your tracked applications...`,
      async () => {
        const res = await fetch("/api/applications");
        const data = await res.json();
        const apps = (data.applications || []).map((a: any) => ({
          id: a.id, status: a.status, jobTitle: a.job?.title, company: a.job?.company,
          location: a.job?.location, resumeVersion: a.resumeVersion?.name || null,
          appliedAt: a.appliedAt, createdAt: a.createdAt,
        }));
        return { total: apps.length, applications: apps };
      },
      (r: any) => `Found ${r.total} tracked applications`
    ),
  });

  // ── 5. Update Application Status ────────────────────────────────────────
  await mc.registerTool({
    name: "update_application_status",
    description: "Update the status of a tracked job application.",
    inputSchema: {
      type: "object",
      properties: {
        applicationId: { type: "string", description: "The ID of the application to update" },
        status: { type: "string", description: "New status: 'Saved', 'Applied', 'Interviewing', 'Offer', or 'Rejected'" },
      },
      required: ["applicationId", "status"],
    },
    execute: withActivity(
      "update_application_status",
      (input) => `Updating application to "${input.status}"...`,
      async (input) => {
        const res = await fetch(`/api/applications/${input.applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: input.status }),
        });
        const data = await res.json();
        if (data.error) return { error: data.error };
        return { success: true, application: { id: data.application?.id, status: data.application?.status, jobTitle: data.application?.job?.title } };
      },
      (r: any) => r.success ? `Updated to: ${r.application?.status}` : r.error
    ),
  });

  // ── 6. Get Dashboard Analytics ──────────────────────────────────────────
  await mc.registerTool({
    name: "get_dashboard_analytics",
    description: "Get career analytics: applications, response rate, time-to-response, salary benchmarks, A/B testing results.",
    inputSchema: { type: "object", properties: {} },
    execute: withActivity(
      "get_dashboard_analytics",
      () => `Fetching your career analytics...`,
      async () => {
        const res = await fetch("/api/analytics");
        const data = await res.json();
        if (data.error) return { error: data.error };
        return { metrics: data.metrics };
      },
      (r: any) => r.metrics ? `${r.metrics.totalApps} apps tracked, ${r.metrics.responseRate}% response rate` : "No data yet"
    ),
  });

  // ── 7. Analyze Resume Against Job ───────────────────────────────────────
  await mc.registerTool({
    name: "analyze_resume",
    description: "Analyze a resume against a job description. Returns tailored cover letter, skill gaps, matched skills, and course recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        resumeText: { type: "string", description: "The full text content of the resume" },
        jobDescription: { type: "string", description: "The job description to tailor for" },
        jobTitle: { type: "string", description: "The job title" },
        company: { type: "string", description: "The company name" },
      },
      required: ["resumeText"],
    },
    execute: withActivity(
      "analyze_resume",
      (input) => `Analyzing resume${input.jobTitle ? ` for "${input.jobTitle}"` : ""}...`,
      async (input) => {
        const res = await fetch("/api/ai/tailor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText: input.resumeText, jobDescription: input.jobDescription || "",
            jobTitle: input.jobTitle || "Software Engineer", company: input.company || "Tech Company",
          }),
        });
        const data = await res.json();
        if (data.error) return { error: data.error };
        return data;
      },
      (r: any) => r.skillGaps ? `Found ${r.matchedSkills?.length || 0} matched skills, ${r.skillGaps?.length || 0} gaps` : "Analysis complete"
    ),
  });

  // ── 8. Generate Interview Questions ─────────────────────────────────────
  await mc.registerTool({
    name: "get_interview_questions",
    description: "Generate tailored interview prep questions for a job role. Returns 8 questions across behavioral, technical, and culture categories.",
    inputSchema: {
      type: "object",
      properties: {
        jobTitle: { type: "string", description: "Job title to prepare for" },
        company: { type: "string", description: "Company name" },
        jobDescription: { type: "string", description: "Optional job description" },
      },
      required: ["jobTitle"],
    },
    execute: withActivity(
      "get_interview_questions",
      (input) => `Generating interview questions for "${input.jobTitle}"...`,
      async (input) => {
        const res = await fetch("/api/ai/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobTitle: input.jobTitle, company: input.company || "Tech Company", jobDescription: input.jobDescription || "" }),
        });
        const data = await res.json();
        if (data.error) return { error: data.error };
        return data;
      },
      (r: any) => r.questions ? `Generated ${r.questions.length} interview questions` : "Questions ready"
    ),
  });

  // ── 9. Find Jobs Matching Resume ────────────────────────────────────────
  await mc.registerTool({
    name: "find_matching_jobs",
    description: "Upload resume text to extract skills and find best-matching jobs across multiple platforms.",
    inputSchema: {
      type: "object",
      properties: {
        resumeText: { type: "string", description: "The full text content of the resume/CV" },
      },
      required: ["resumeText"],
    },
    execute: withActivity(
      "find_matching_jobs",
      () => `Analyzing your CV and finding matching jobs...`,
      async (input) => {
        const res = await fetch("/api/ai/cv-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText: input.resumeText }),
        });
        const data = await res.json();
        if (data.error) return { error: data.error };
        return { analysis: data.analysis, matchingJobs: (data.jobs || []).slice(0, 10) };
      },
      (r: any) => r.analysis ? `Profile: ${r.analysis.primaryRole} (${r.analysis.experienceLevel}). Found ${r.matchingJobs?.length || 0} matches.` : "Matching complete"
    ),
  });

  // ── 10. Smart Job Hunt (Composite) ──────────────────────────────────────
  await mc.registerTool({
    name: "smart_job_hunt",
    description:
      "All-in-one job hunting workflow: searches for jobs matching a query, saves the top results to your tracker, and returns a summary. This is a multi-step tool that combines search + save in one action.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Job title or role to search for" },
        location: { type: "string", description: "Location or 'remote'" },
        saveTop: { type: "number", description: "Number of top results to auto-save (default: 3, max: 5)" },
      },
      required: ["query"],
    },
    execute: withActivity(
      "smart_job_hunt",
      (input) => `Running smart job hunt for "${input.query}"...`,
      async (input) => {
        const saveCount = Math.min(Number(input.saveTop) || 3, 5);

        // Step 1: Search
        emitActivity({ id: `smart-search-${Date.now()}`, tool: "search_jobs", status: "running", summary: `Step 1: Searching for "${input.query}"...`, timestamp: new Date() });

        const searchRes = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: input.query, location: input.location || "remote" }),
        });
        const searchData = await searchRes.json();
        const jobs = (searchData.jobs || []).slice(0, 10);

        emitActivity({ id: `smart-search-${Date.now()}`, tool: "search_jobs", status: "success", summary: `Found ${jobs.length} jobs for "${input.query}"`, timestamp: new Date(), result: `Top: ${jobs.slice(0, 3).map((j: any) => j.title).join(", ")}` });

        // Step 2: Save top results
        const saved: Array<{ title: string; company: string; status: string }> = [];
        const toSave = jobs.slice(0, saveCount);

        for (const job of toSave) {
          emitActivity({ id: `smart-save-${job.id}`, tool: "save_job", status: "running", summary: `Step 2: Saving "${job.title}" at ${job.company}...`, timestamp: new Date() });

          try {
            const saveRes = await fetch("/api/applications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jobId: job.id,
                jobData: { title: job.title, company: job.company, location: job.location, description: job.description || "", skills: job.skills || [], remote: job.remote || false },
                status: "Saved",
              }),
            });
            const saveData = await saveRes.json();

            saved.push({ title: job.title, company: job.company, status: saveData.alreadySaved ? "already tracked" : "saved" });
            emitActivity({ id: `smart-save-${job.id}`, tool: "save_job", status: "success", summary: `Saved "${job.title}" at ${job.company}`, timestamp: new Date() });
          } catch {
            saved.push({ title: job.title, company: job.company, status: "failed" });
          }
        }

        return {
          totalFound: jobs.length,
          savedCount: saved.filter((s) => s.status === "saved").length,
          alreadyTracked: saved.filter((s) => s.status === "already tracked").length,
          saved,
          topJobs: jobs.slice(0, 5).map((j: any) => ({
            title: j.title, company: j.company, matchScore: j.matchScore, location: j.location,
          })),
        };
      },
      (r: any) => `Found ${r.totalFound} jobs. Saved ${r.savedCount} new, ${r.alreadyTracked} already tracked.`
    ),
  });

  console.log("[WebMCP] ✅ All 10 tools registered successfully (including smart_job_hunt composite).");
}

// ---------------------------------------------------------------------------
// Component — renders nothing visible, just registers tools on mount
// ---------------------------------------------------------------------------
export function WebMCPTools() {
  useEffect(() => {
    registerAllTools().catch((err) => {
      console.warn("[WebMCP] Tool registration error:", err);
    });
  }, []);

  return null;
}
