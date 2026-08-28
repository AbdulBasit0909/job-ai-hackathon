/**
 * Unified job aggregation types.
 *
 * Every provider adapter normalizes external data into
 * the `Job` interface so the rest of the app can work
 * with a single, strongly-typed shape.
 */

export type JobSource =
  | "linkedin"
  | "indeed"
  | "glassdoor"
  | "adzuna"
  | "remotive"
  | "other";

export interface Job {
  /** Deterministic id — usually `<source>-<externalId>` */
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  source: JobSource;
  sourceUrl: string;
  /** Optional alternate URLs found during deduplication */
  alternateUrls?: string[];
  salaryRange?: string;
  description: string;
  tags: string[];
  /** ISO-8601 date string */
  postedAt: string;
  /** `true` when the record comes from seed / fallback data */
  isFallback?: boolean;
}

export interface JobSearchFilters {
  query?: string;
  location?: string;
  source?: JobSource | "all";
  page?: number;
  limit?: number;
}

export interface JobSearchResponse {
  success: boolean;
  total: number;
  page: number;
  usingFallback: boolean;
  jobs: Job[];
}
