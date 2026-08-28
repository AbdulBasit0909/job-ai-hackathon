import type { Job } from "@/types/job";

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

/** Noise words / suffixes stripped during normalisation. */
const STRIP_PATTERNS: Array<[RegExp, string]> = [
  [/\b(inc\.?|llc\.?|corp\.?|ltd\.?|co\.?|plc\.?|gmbh)\b/gi, ""],
  [/\bsr\.?\b/gi, "senior"],
  [/\bjr\.?\b/gi, "junior"],
  [/\beng\.?\b/gi, "engineer"],
  [/\bdev\b/gi, "developer"],
  [/\bswe\b/gi, "software engineer"],
  [/[,\-\/\\()[\]{}'"]/g, " "],
];

/**
 * Normalise a string for deduplication comparison:
 * lowercase → strip noise → collapse whitespace → trim.
 */
function normalise(text: string): string {
  let result = text.toLowerCase();
  for (const [pattern, replacement] of STRIP_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result.replace(/\s+/g, " ").trim();
}

/**
 * Turn an arbitrary string into a URL-safe slug.
 */
function slugify(text: string): string {
  return normalise(text)
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * Strip remote-related qualifiers from a location string
 * (the `isRemote` flag carries this information instead).
 */
function normaliseLocation(location: string): string {
  return normalise(
    location
      .replace(/\(?\s*remote\s*\)?/gi, "")
      .replace(/,\s*$/, "")
      .trim() || "anywhere",
  );
}

// ---------------------------------------------------------------------------
// Signature generation
// ---------------------------------------------------------------------------

function signatureKey(job: Job): string {
  return [
    slugify(job.company),
    slugify(job.title),
    slugify(normaliseLocation(job.location)),
  ].join(":");
}

// ---------------------------------------------------------------------------
// Levenshtein similarity (secondary check)
// ---------------------------------------------------------------------------

/**
 * Compute the Levenshtein edit distance between two strings.
 * Uses a single-row DP approach for O(min(m, n)) memory.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure `a` is the shorter string for memory efficiency.
  if (a.length > b.length) [a, b] = [b, a];

  const aLen = a.length;
  const bLen = b.length;
  const row: number[] = Array.from({ length: aLen + 1 }, (_, i) => i);

  for (let j = 1; j <= bLen; j++) {
    let prev = row[0]!;
    row[0] = j;
    for (let i = 1; i <= aLen; i++) {
      const current = row[i]!;
      row[i] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, row[i]!, row[i - 1]!);
      prev = current;
    }
  }
  return row[aLen]!;
}

/**
 * Returns a similarity score between 0 and 1.
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/** Threshold above which two keys are considered duplicates. */
const SIMILARITY_THRESHOLD = 0.85;

// ---------------------------------------------------------------------------
// Richness scoring (decides which duplicate to keep)
// ---------------------------------------------------------------------------

function richnessScore(job: Job): number {
  let score = 0;
  score += job.description.length;
  if (job.salaryRange) score += 500;
  if (job.tags.length > 0) score += job.tags.length * 50;
  if (job.sourceUrl) score += 100;
  return score;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Remove duplicate jobs across platforms.
 *
 * 1. Generate a normalised signature key for each job.
 * 2. If the exact key already exists → duplicate.
 * 3. If no exact key match, compare the new key against every existing
 *    key using Levenshtein similarity — if ≥ 0.85 → duplicate.
 * 4. When a duplicate is found, keep the *richer* record and merge
 *    `sourceUrl` into `alternateUrls`.
 */
export function deduplicateJobs(jobs: Job[]): Job[] {
  /** Map from signature key → canonical job index in `results`. */
  const keyIndex = new Map<string, number>();
  const results: Job[] = [];

  for (const job of jobs) {
    const key = signatureKey(job);

    // --- Exact key match ---------------------------------------------------
    const exactIdx = keyIndex.get(key);
    if (exactIdx !== undefined) {
      mergeInto(results, exactIdx, job);
      continue;
    }

    // --- Fuzzy match -------------------------------------------------------
    let matched = false;
    for (const [existingKey, idx] of keyIndex) {
      if (similarity(key, existingKey) >= SIMILARITY_THRESHOLD) {
        mergeInto(results, idx, job);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // --- New unique job ----------------------------------------------------
    keyIndex.set(key, results.length);
    results.push({ ...job });
  }

  return results;
}

/**
 * Merge `incoming` into the job at `results[idx]`, keeping whichever
 * version is richer and collecting all source URLs.
 */
function mergeInto(results: Job[], idx: number, incoming: Job): void {
  const existing = results[idx]!;

  // Collect the alternate URL.
  const alternates = new Set<string>(existing.alternateUrls ?? []);
  alternates.add(incoming.sourceUrl);
  // Also keep the existing sourceUrl if we swap.
  if (richnessScore(incoming) > richnessScore(existing)) {
    alternates.delete(incoming.sourceUrl);
    alternates.add(existing.sourceUrl);
    results[idx] = {
      ...incoming,
      alternateUrls: [...alternates],
    };
  } else {
    results[idx] = {
      ...existing,
      alternateUrls: [...alternates],
    };
  }
}
