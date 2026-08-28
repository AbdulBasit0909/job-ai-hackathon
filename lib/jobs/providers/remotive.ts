import type { Job, JobSearchFilters } from "@/types/job";
import type { ProviderFetcher } from "./base";
import { fetchWithTimeout } from "./base";

// ---------------------------------------------------------------------------
// Remotive response types
// ---------------------------------------------------------------------------

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  candidate_required_location: string;
  description: string;
  url: string;
  salary: string;
  tags: string[];
  publication_date: string;
  category: string;
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s{2,}/g, " ").trim();
}

function mapResult(r: RemotiveJob): Job {
  const locationStr = r.candidate_required_location || "Remote";
  return {
    id: `remotive-${r.id}`,
    title: r.title,
    company: r.company_name,
    location: locationStr,
    isRemote: true, // Remotive is a remote-only board
    source: "remotive",
    sourceUrl: r.url,
    salaryRange: r.salary || undefined,
    description: stripHtmlTags(r.description),
    tags: r.tags?.length ? r.tags : r.category ? [r.category] : [],
    postedAt: new Date(r.publication_date).toISOString(),
  };
}

/**
 * Fetch jobs from the Remotive API (public, no API key required).
 */
export const fetchRemotiveJobs: ProviderFetcher = async (
  filters: JobSearchFilters,
  signal: AbortSignal,
): Promise<Job[]> => {
  const query = encodeURIComponent(filters.query ?? "");
  const limit = filters.limit ?? 10;

  const url =
    `https://remotive.com/api/remote-jobs` +
    (query ? `?search=${query}&limit=${limit}` : `?limit=${limit}`);

  const response = await fetchWithTimeout(url, { signal });
  if (!response.ok) return [];

  const data = (await response.json()) as RemotiveResponse;
  return (data.jobs ?? []).map(mapResult);
};
