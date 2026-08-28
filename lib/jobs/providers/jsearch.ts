import type { Job, JobSearchFilters, JobSource } from "@/types/job";
import type { ProviderFetcher } from "./base";
import { fetchWithTimeout } from "./base";

// ---------------------------------------------------------------------------
// JSearch (RapidAPI) response types
// ---------------------------------------------------------------------------

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city: string;
  job_state: string;
  job_country: string;
  job_is_remote: boolean;
  job_description: string;
  job_apply_link: string;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_currency: string | null;
  job_required_skills: string[] | null;
  job_posted_at_datetime_utc: string;
  job_publisher: string;
}

interface JSearchResponse {
  data: JSearchJob[];
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY ?? "";

function inferSource(publisher: string): JobSource {
  const p = publisher.toLowerCase();
  if (p.includes("linkedin")) return "linkedin";
  if (p.includes("indeed")) return "indeed";
  if (p.includes("glassdoor")) return "glassdoor";
  return "other";
}

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | undefined {
  if (min === null && max === null) return undefined;
  const sym = currency === "USD" || !currency ? "$" : currency + " ";
  const lo = min !== null ? `${sym}${Math.round(min / 1000)}k` : "?";
  const hi = max !== null ? `${sym}${Math.round(max / 1000)}k` : "?";
  return `${lo} – ${hi}`;
}

function buildLocation(city: string, state: string, country: string): string {
  const parts: string[] = [];
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (!city && !state && country) parts.push(country);
  return parts.join(", ") || "Unknown";
}

function mapResult(r: JSearchJob): Job {
  const location = buildLocation(r.job_city, r.job_state, r.job_country);
  return {
    id: `jsearch-${r.job_id}`,
    title: r.job_title,
    company: r.employer_name,
    location,
    isRemote: r.job_is_remote,
    source: inferSource(r.job_publisher),
    sourceUrl: r.job_apply_link,
    salaryRange: formatSalary(
      r.job_min_salary,
      r.job_max_salary,
      r.job_salary_currency,
    ),
    description: r.job_description,
    tags: r.job_required_skills ?? [],
    postedAt: r.job_posted_at_datetime_utc
      ? new Date(r.job_posted_at_datetime_utc).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Fetch jobs via JSearch (RapidAPI).
 * Covers LinkedIn, Indeed, and Glassdoor listings.
 * Silently returns `[]` when the API key is not configured.
 */
export const fetchJSearchJobs: ProviderFetcher = async (
  filters: JobSearchFilters,
  signal: AbortSignal,
): Promise<Job[]> => {
  if (!JSEARCH_API_KEY) return [];

  const query = encodeURIComponent(filters.query ?? "software engineer");
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;

  const url =
    `https://jsearch.p.rapidapi.com/search` +
    `?query=${query}` +
    `&page=${page}` +
    `&num_pages=1` +
    `&results_per_page=${limit}`;

  const response = await fetchWithTimeout(url, {
    signal,
    headers: {
      "X-RapidAPI-Key": JSEARCH_API_KEY,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  });
  if (!response.ok) return [];

  const data = (await response.json()) as JSearchResponse;
  return (data.data ?? []).map(mapResult);
};
