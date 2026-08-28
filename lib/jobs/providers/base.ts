import type { Job, JobSearchFilters, JobSource } from "@/types/job";

// ---------------------------------------------------------------------------
// Provider contract
// ---------------------------------------------------------------------------

/**
 * Every provider adapter must implement this signature.
 * The `signal` is wired to an `AbortController` so the
 * aggregator can enforce per-provider timeouts.
 */
export type ProviderFetcher = (
  filters: JobSearchFilters,
  signal: AbortSignal,
) => Promise<Job[]>;

export interface ProviderConfig {
  /** Human-readable name for logging */
  name: string;
  /** Base URL of the external API */
  baseUrl: string;
  /** Name of the env-var that holds the API key (empty string if none needed) */
  apiKeyEnv: string;
  /** Source tag applied to all jobs from this provider */
  source: JobSource;
  /** Whether this provider is enabled — disabled when its API key is missing */
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default per-provider timeout in milliseconds. */
export const PROVIDER_TIMEOUT_MS = 4_000;

/**
 * Create a `fetch` wrapper that automatically aborts when *either* the
 * caller's signal fires or the timeout elapses — whichever comes first.
 *
 * Returns the `Response` object so the caller can parse it.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();

  // If the parent already provides a signal, chain it.
  const parentSignal = init.signal;
  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener("abort", () => {
        controller.abort(parentSignal.reason);
      });
    }
  }

  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}
