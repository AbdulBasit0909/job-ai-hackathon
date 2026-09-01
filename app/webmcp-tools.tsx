"use client";

import { useEffect } from "react";

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

async function registerAllTools() {
  // Graceful degradation: only register if the browser supports WebMCP
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
          description:
            "Job title or role to search for (e.g. 'React Developer', 'Data Scientist', 'Product Manager')",
        },
        location: {
          type: "string",
          description:
            "Location filter such as a city, country, or 'remote' for remote-only jobs",
        },
      },
      required: ["query"],
    },
    async execute(input: Record<string, unknown>) {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: input.query,
          location: input.location || "remote",
        }),
      });
      const data = await res.json();
      const jobs = (data.jobs || []).slice(0, 10).map((j: Record<string, unknown>) => ({
        title: j.title,
        company: j.company,
        location: j.location,
        remote: j.remote,
        matchScore: j.matchScore,
        explanation: j.explanation,
        skills: j.skills,
        sourceUrl: j.sourceUrl,
        id: j.id,
      }));
      return { totalResults: data.jobs?.length || 0, showing: jobs.length, jobs };
    },
  });

  // ── 2. Get Job Details ──────────────────────────────────────────────────
  await mc.registerTool({
    name: "get_job_details",
    description:
      "Get full details of a specific job listing by its ID, including description, salary range, required skills, and application URL.",
    inputSchema: {
      type: "object",
      properties: {
        jobId: {
          type: "string",
          description: "The unique ID of the job to retrieve",
        },
      },
      required: ["jobId"],
    },
    async execute(input: Record<string, unknown>) {
      const res = await fetch(`/api/jobs/${input.jobId}`);
      const data = await res.json();
      if (data.error) return { error: data.error };
      return { job: data.job };
    },
  });

  // ── 3. Save / Track a Job ───────────────────────────────────────────────
  await mc.registerTool({
    name: "save_job",
    description:
      "Save a job to the user's application tracker. Optionally set an initial status like 'Saved' or 'Applied'.",
    inputSchema: {
      type: "object",
      properties: {
        jobId: {
          type: "string",
          description: "The unique ID of the job to save",
        },
        jobData: {
          type: "object",
          description:
            "Optional job metadata (title, company, location, description, skills) if the job isn't already in the database",
          properties: {
            title: { type: "string" },
            company: { type: "string" },
            location: { type: "string" },
            description: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            remote: { type: "boolean" },
          },
        },
        status: {
          type: "string",
          description:
            "Application status: 'Saved' (default), 'Applied', 'Interviewing', 'Offer', or 'Rejected'",
        },
      },
      required: ["jobId"],
    },
    async execute(input: Record<string, unknown>) {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: input.jobId,
          jobData: input.jobData || undefined,
          status: input.status || "Saved",
        }),
      });
      const data = await res.json();
      if (data.error) return { error: data.error };
      return {
        success: true,
        alreadySaved: data.alreadySaved || false,
        application: {
          id: data.application?.id,
          status: data.application?.status,
          jobTitle: data.application?.job?.title,
          company: data.application?.job?.company,
        },
      };
    },
  });

  // ── 4. Get My Applications ──────────────────────────────────────────────
  await mc.registerTool({
    name: "get_applications",
    description:
      "Retrieve all of the user's tracked job applications with their current status, job details, and linked resume version.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    async execute() {
      const res = await fetch("/api/applications");
      const data = await res.json();
      const apps = (data.applications || []).map((a: Record<string, unknown>) => ({
        id: a.id,
        status: a.status,
        jobTitle: (a as any).job?.title,
        company: (a as any).job?.company,
        location: (a as any).job?.location,
        resumeVersion: (a as any).resumeVersion?.name || null,
        appliedAt: a.appliedAt,
        createdAt: a.createdAt,
      }));
      return { total: apps.length, applications: apps };
    },
  });

  // ── 5. Update Application Status ────────────────────────────────────────
  await mc.registerTool({
    name: "update_application_status",
    description:
      "Update the status of a tracked job application. Valid statuses are: Saved, Applied, Interviewing, Offer, Rejected.",
    inputSchema: {
      type: "object",
      properties: {
        applicationId: {
          type: "string",
          description: "The ID of the application to update",
        },
        status: {
          type: "string",
          description:
            "New status: 'Saved', 'Applied', 'Interviewing', 'Offer', or 'Rejected'",
        },
      },
      required: ["applicationId", "status"],
    },
    async execute(input: Record<string, unknown>) {
      const res = await fetch(`/api/applications/${input.applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status }),
      });
      const data = await res.json();
      if (data.error) return { error: data.error };
      return {
        success: true,
        application: {
          id: data.application?.id,
          status: data.application?.status,
          jobTitle: data.application?.job?.title,
        },
      };
    },
  });

  // ── 6. Get Dashboard Analytics ──────────────────────────────────────────
  await mc.registerTool({
    name: "get_dashboard_analytics",
    description:
      "Get the user's career analytics: total applications, response rate, average time to response, salary benchmarks, and resume A/B testing performance breakdown.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    async execute() {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (data.error) return { error: data.error };
      return { metrics: data.metrics };
    },
  });

  // ── 7. Analyze Resume Against Job ───────────────────────────────────────
  await mc.registerTool({
    name: "analyze_resume",
    description:
      "Analyze a resume against a specific job description. Returns a tailored cover letter, skill gaps, matched skills, parsed candidate data, and course recommendations to bridge gaps.",
    inputSchema: {
      type: "object",
      properties: {
        resumeText: {
          type: "string",
          description: "The full text content of the user's resume",
        },
        jobDescription: {
          type: "string",
          description: "The job description to tailor the resume for",
        },
        jobTitle: {
          type: "string",
          description: "The job title being applied for",
        },
        company: {
          type: "string",
          description: "The company name",
        },
      },
      required: ["resumeText"],
    },
    async execute(input: Record<string, unknown>) {
      const res = await fetch("/api/ai/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: input.resumeText,
          jobDescription: input.jobDescription || "",
          jobTitle: input.jobTitle || "Software Engineer",
          company: input.company || "Tech Company",
        }),
      });
      const data = await res.json();
      if (data.error) return { error: data.error };
      return data;
    },
  });

  // ── 8. Generate Interview Questions ─────────────────────────────────────
  await mc.registerTool({
    name: "get_interview_questions",
    description:
      "Generate tailored interview preparation questions for a specific job role and company. Returns 8 questions across behavioral, technical, and culture categories with model answers.",
    inputSchema: {
      type: "object",
      properties: {
        jobTitle: {
          type: "string",
          description: "The job title to prepare interview questions for",
        },
        company: {
          type: "string",
          description: "The company name for contextual questions",
        },
        jobDescription: {
          type: "string",
          description:
            "Optional job description for more tailored questions",
        },
      },
      required: ["jobTitle"],
    },
    async execute(input: Record<string, unknown>) {
      const res = await fetch("/api/ai/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: input.jobTitle,
          company: input.company || "Tech Company",
          jobDescription: input.jobDescription || "",
        }),
      });
      const data = await res.json();
      if (data.error) return { error: data.error };
      return data;
    },
  });

  // ── 9. Find Jobs Matching My Resume ─────────────────────────────────────
  await mc.registerTool({
    name: "find_matching_jobs",
    description:
      "Upload resume text to automatically extract your skills and role, then find the best-matching job listings across multiple platforms. Returns AI-scored results ranked by fit.",
    inputSchema: {
      type: "object",
      properties: {
        resumeText: {
          type: "string",
          description: "The full text content of the user's resume/CV",
        },
      },
      required: ["resumeText"],
    },
    async execute(input: Record<string, unknown>) {
      const res = await fetch("/api/ai/cv-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: input.resumeText }),
      });
      const data = await res.json();
      if (data.error) return { error: data.error };
      return {
        analysis: data.analysis,
        matchingJobs: (data.jobs || []).slice(0, 10),
      };
    },
  });

  console.log("[WebMCP] ✅ All 9 tools registered successfully.");
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
