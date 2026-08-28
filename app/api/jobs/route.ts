import { NextResponse } from "next/server";
import type { JobSearchFilters, JobSearchResponse, JobSource } from "@/types/job";
import { aggregateJobs } from "@/lib/jobs/aggregator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_SOURCES = new Set<JobSource | "all">([
  "linkedin",
  "indeed",
  "glassdoor",
  "adzuna",
  "remotive",
  "other",
  "all",
]);

function parseFilters(url: URL): JobSearchFilters {
  const q = url.searchParams.get("q") ?? undefined;
  const location = url.searchParams.get("location") ?? undefined;
  const sourceParam = url.searchParams.get("source") ?? "all";
  const source = VALID_SOURCES.has(sourceParam as JobSource | "all")
    ? (sourceParam as JobSource | "all")
    : "all";

  const pageRaw = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "10", 10);

  return {
    query: q,
    location,
    source,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    limit: Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 50 ? limitRaw : 10,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * GET /api/jobs
 *
 * Aggregates jobs from multiple external platforms, deduplicates,
 * filters, and paginates. Falls back to seed data when external
 * APIs are unavailable.
 *
 * Query params: q, location, source, page, limit
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const filters = parseFilters(url);

    const result = await aggregateJobs(filters);

    const body: JobSearchResponse = {
      success: true,
      total: result.total,
      page: result.page,
      usingFallback: result.usingFallback,
      jobs: result.jobs,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error("[GET /api/jobs] Unrecoverable error:", error);
    return NextResponse.json(
      { success: false, total: 0, page: 1, usingFallback: false, jobs: [] },
      { status: 500 },
    );
  }
}
