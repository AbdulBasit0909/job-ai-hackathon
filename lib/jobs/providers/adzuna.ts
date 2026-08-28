import type { Job, JobSearchFilters } from "@/types/job";
import type { ProviderFetcher } from "./base";
import { fetchWithTimeout } from "./base";

// ---------------------------------------------------------------------------
// Adzuna response types
// ---------------------------------------------------------------------------

interface AdzunaResult {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string; area?: string[] };
  description: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  category?: { tag: string; label: string };
  created: string;
}

interface AdzunaResponse {
  results: AdzunaResult[];
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID ?? "";
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY ?? "";

function formatSalary(min?: number, max?: number): string | undefined {
  if (min === undefined && max === undefined) return undefined;
  const lo = min ? `$${Math.round(min / 1000)}k` : "?";
  const hi = max ? `$${Math.round(max / 1000)}k` : "?";
  return `${lo} – ${hi}`;
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapResult(r: AdzunaResult): Job {
  const locationStr = r.location?.display_name ?? "International";
  const isRemote =
    /remote/i.test(locationStr) ||
    /remote/i.test(r.title) ||
    /work from home/i.test(r.description);

  return {
    id: `adzuna-${r.id}`,
    title: r.title,
    company: r.company?.display_name ?? "Company",
    location: locationStr,
    isRemote,
    source: "adzuna",
    sourceUrl: r.redirect_url,
    salaryRange: formatSalary(r.salary_min, r.salary_max),
    description: cleanDescription(r.description),
    tags: r.category ? ["Adzuna", r.category.label] : ["Adzuna"],
    postedAt: r.created ? new Date(r.created).toISOString() : new Date().toISOString(),
  };
}

/**
 * Fetch jobs from the Adzuna API using configured credentials.
 * Supports multi-region query and remote/Pakistan filtering.
 */
export const fetchAdzunaJobs: ProviderFetcher = async (
  filters: JobSearchFilters,
  signal: AbortSignal,
): Promise<Job[]> => {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];

  const query = filters.query?.trim() || "software engineer";
  const location = filters.location?.trim() || "";
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;

  // Determine countries to search based on location filter
  let countries = ["gb", "us", "in"];
  if (location.toLowerCase().includes("pakistan") || location.toLowerCase().includes("remote")) {
    countries = ["gb", "us", "in"];
  }

  const allJobs: Job[] = [];

  for (const country of countries) {
    const isSpecificLocation =
      location &&
      !["pakistan", "remote", "global", "all"].includes(location.toLowerCase());

    const whereParam = isSpecificLocation
      ? `&where=${encodeURIComponent(location)}`
      : "";

    const searchTerm = encodeURIComponent(
      query + (location && location.toLowerCase().includes("remote") ? " remote" : ""),
    );

    const url =
      `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}` +
      `?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}` +
      `&results_per_page=${Math.max(5, Math.floor(limit / countries.length))}` +
      `&what=${searchTerm}${whereParam}`;

    try {
      const response = await fetchWithTimeout(url, { signal }, 4000);
      if (response.ok) {
        const data = (await response.json()) as AdzunaResponse;
        if (data.results && Array.isArray(data.results)) {
          allJobs.push(...data.results.map(mapResult));
        }
      }
    } catch (err) {
      console.warn(`[adzuna] Region ${country} fetch failed:`, err);
    }
  }

  return allJobs;
};
