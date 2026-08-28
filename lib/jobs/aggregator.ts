import type { Job, JobSearchFilters } from "@/types/job";
import type { ProviderFetcher } from "./providers/base";
import { PROVIDER_TIMEOUT_MS } from "./providers/base";
import { fetchLinkedInJobs } from "./providers/linkedin";
import { fetchAdzunaJobs } from "./providers/adzuna";
import { fetchRemotiveJobs } from "./providers/remotive";
import { deduplicateJobs } from "./deduplication";
import { seedJobs } from "@/data/seedJobs";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Provider Registry
// ---------------------------------------------------------------------------

interface ProviderEntry {
  name: string;
  fetcher: ProviderFetcher;
}

const providers: ProviderEntry[] = [
  { name: "LinkedIn", fetcher: fetchLinkedInJobs },
  { name: "Adzuna", fetcher: fetchAdzunaJobs },
  { name: "Remotive", fetcher: fetchRemotiveJobs },
];

// ---------------------------------------------------------------------------
// Filtering Helpers
// ---------------------------------------------------------------------------

function applyFilters(jobs: Job[], filters: JobSearchFilters): Job[] {
  let filtered = jobs;

  // Keyword search (title, company, description, tags)
  if (filters.query) {
    const q = filters.query.toLowerCase().trim();
    const queryTokens = q.split(/\s+/).filter(Boolean);

    filtered = filtered.filter((job) => {
      const target = `${job.title} ${job.company} ${job.description} ${job.tags.join(" ")}`.toLowerCase();
      return queryTokens.some((tok) => target.includes(tok));
    });
  }

  // Location filter
  if (filters.location && filters.location.toLowerCase() !== "all") {
    const loc = filters.location.toLowerCase().trim();
    if (loc === "remote") {
      filtered = filtered.filter((job) => job.isRemote);
    } else {
      filtered = filtered.filter(
        (job) =>
          job.location.toLowerCase().includes(loc) ||
          (loc.includes("pakistan") && /lahore|karachi|islamabad|rawalpindi|faisalabad|pakistan/i.test(job.location)) ||
          job.isRemote,
      );
    }
  }

  // Source filter
  if (filters.source && filters.source !== "all") {
    filtered = filtered.filter((job) => job.source === filters.source);
  }

  return filtered;
}

function sortByDate(jobs: Job[]): Job[] {
  return [...jobs].sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
  );
}

function paginate(
  jobs: Job[],
  page: number,
  limit: number,
): { paged: Job[]; total: number } {
  const start = (page - 1) * limit;
  return {
    paged: jobs.slice(start, start + limit),
    total: jobs.length,
  };
}

// ---------------------------------------------------------------------------
// DB Persistence Helper (Upserts aggregated jobs for foreign key safety)
// ---------------------------------------------------------------------------

export async function persistJobsToDb(jobs: Job[]): Promise<void> {
  try {
    for (const j of jobs) {
      const salaryMin = j.salaryRange ? parseMinSalary(j.salaryRange) : 90000;
      const salaryMax = j.salaryRange ? parseMaxSalary(j.salaryRange) : 150000;

      await prisma.job.upsert({
        where: { id: j.id },
        update: {
          title: j.title,
          company: j.company,
          location: j.location,
          remote: j.isRemote,
          salaryMin,
          salaryMax,
          description: j.description,
          skills: j.tags,
        },
        create: {
          id: j.id,
          title: j.title,
          company: j.company,
          location: j.location,
          remote: j.isRemote,
          salaryMin,
          salaryMax,
          description: j.description,
          skills: j.tags,
          postedDate: new Date(j.postedAt),
        },
      });
    }
  } catch (err) {
    // Non-fatal if DB write fails; logging only
    console.warn("[aggregator] DB persistence note:", err);
  }
}

function parseMinSalary(range: string): number {
  const m = range.match(/\$?(\d+)[kK]?/);
  if (!m) return 80000;
  let val = parseInt(m[1], 10);
  if (val < 1000) val *= 1000;
  return val;
}

function parseMaxSalary(range: string): number {
  const parts = range.split(/[-–—]/);
  const target = parts.length > 1 ? parts[1] : parts[0];
  const m = target.match(/\$?(\d+)[kK]?/);
  if (!m) return 150000;
  let val = parseInt(m[1], 10);
  if (val < 1000) val *= 1000;
  return val;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AggregatorResult {
  jobs: Job[];
  total: number;
  page: number;
  usingFallback: boolean;
}

/**
 * Main aggregation pipeline:
 * 1. Fetch from live providers (LinkedIn, Adzuna, Remotive) in parallel.
 * 2. If all live providers fail or return 0 jobs, seamlessly fall back to seedJobs with `isFallback: true`.
 * 3. Deduplicate across platforms.
 * 4. Apply filters (keyword, location, remote, source).
 * 5. Sort and paginate.
 */
export async function aggregateJobs(
  filters: JobSearchFilters,
): Promise<AggregatorResult> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort("global-timeout"),
    PROVIDER_TIMEOUT_MS + 1000,
  );

  let liveJobs: Job[] = [];
  let usingFallback = false;

  try {
    const settled = await Promise.allSettled(
      providers.map(async (p) => {
        try {
          const jobs = await p.fetcher(filters, controller.signal);
          return { name: p.name, jobs };
        } catch (err) {
          console.warn(`[aggregator] Provider "${p.name}" failed:`, err);
          return { name: p.name, jobs: [] as Job[] };
        }
      }),
    );

    for (const result of settled) {
      if (result.status === "fulfilled" && result.value.jobs.length > 0) {
        liveJobs.push(...result.value.jobs);
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  // Fallback to seed data ONLY if live providers returned 0 jobs
  if (liveJobs.length === 0) {
    liveJobs = seedJobs.map((j) => ({ ...j, isFallback: true }));
    usingFallback = true;
  }

  // Deduplicate
  const unique = deduplicateJobs(liveJobs);

  // Filter
  const filtered = applyFilters(unique, filters);

  // Sort
  const sorted = sortByDate(filtered);

  // Paginate
  const { paged, total } = paginate(sorted, page, limit);

  // Background persist top results so /dashboard/jobs/[id] and save-to-tracker work smoothly
  persistJobsToDb(paged).catch(() => {});

  return { jobs: paged, total, page, usingFallback };
}
