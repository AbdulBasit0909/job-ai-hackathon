import type { Job, JobSearchFilters } from "@/types/job";
import type { ProviderFetcher } from "./base";
import { fetchWithTimeout } from "./base";

// ---------------------------------------------------------------------------
// LinkedIn Provider Adapter
// ---------------------------------------------------------------------------

const LINKEDIN_API_KEY = process.env.LINKEDIN_API_KEY ?? "";
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID ?? "";

/**
 * Clean and normalize text extracted from HTML.
 */
function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch live LinkedIn job postings.
 * Supports Pakistan locations (Lahore, Karachi, Islamabad, etc.), Remote, and Global queries.
 */
export const fetchLinkedInJobs: ProviderFetcher = async (
  filters: JobSearchFilters,
  signal: AbortSignal,
): Promise<Job[]> => {
  const query = filters.query?.trim() || "Software Engineer";
  const location = filters.location?.trim() || "Pakistan";
  const page = filters.page || 1;
  const start = (page - 1) * 10;

  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(
    query,
  )}&location=${encodeURIComponent(location)}&start=${start}`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
      5000,
    );

    if (!response.ok) {
      console.warn(`[linkedin] Guest search returned status ${response.status}`);
      return [];
    }

    const html = await response.text();
    if (!html || !html.includes("base-card")) {
      return [];
    }

    const cards = html.split('<div class="base-card');
    const jobs: Job[] = [];

    for (let i = 1; i < cards.length; i++) {
      const card = cards[i];

      // Extract Job ID
      const urnMatch = card.match(/data-entity-urn="urn:li:jobPosting:(\d+)"/);
      const jobId = urnMatch ? urnMatch[1] : `li-${Date.now()}-${i}`;

      // Extract Title
      const titleMatch = card.match(
        /<h3 class="base-search-card__title"[^>]*>\s*([\s\S]*?)\s*<\/h3>/,
      );
      const title = titleMatch ? cleanText(titleMatch[1]) : "Job Title";

      // Extract Company
      const compMatch =
        card.match(/<h4 class="base-search-card__subtitle"[^>]*>([\s\S]*?)<\/h4>/) ||
        card.match(/<a class="hidden-nested-link"[^>]*>([\s\S]*?)<\/a>/);
      const company = compMatch ? cleanText(compMatch[1]) : "Company on LinkedIn";

      // Extract Location
      const locMatch = card.match(
        /<span class="job-search-card__location"[^>]*>\s*([\s\S]*?)\s*<\/span>/,
      );
      const loc = locMatch ? cleanText(locMatch[1]) : location;

      // Extract Application URL (clean URL without tracking query parameters)
      const linkMatch = card.match(
        /<a class="base-card__full-link[^"]*" href="([^"]+)"/,
      );
      let sourceUrl = linkMatch ? linkMatch[1].split("?")[0] : "";
      if (!sourceUrl || !sourceUrl.startsWith("http")) {
        sourceUrl = `https://www.linkedin.com/jobs/view/${jobId}`;
      }

      // Extract Posted Date
      const timeMatch = card.match(/datetime="([^"]+)"/);
      const postedAt = timeMatch
        ? new Date(timeMatch[1]).toISOString()
        : new Date().toISOString();

      // Remote detection
      const isRemote =
        /remote/i.test(title) ||
        /remote/i.test(loc) ||
        Boolean(filters.location?.toLowerCase().includes("remote"));

      // Tags
      const tags: string[] = ["LinkedIn"];
      if (isRemote) tags.push("Remote");
      if (/lahore/i.test(loc)) tags.push("Lahore");
      if (/karachi/i.test(loc)) tags.push("Karachi");
      if (/islamabad/i.test(loc)) tags.push("Islamabad");
      if (/pakistan/i.test(loc)) tags.push("Pakistan");

      jobs.push({
        id: `linkedin-${jobId}`,
        title,
        company,
        location: loc,
        isRemote,
        source: "linkedin",
        sourceUrl,
        description: `Exciting career opportunity for ${title} at ${company} in ${loc}. Apply directly on LinkedIn using the official listing URL.`,
        tags,
        postedAt,
      });
    }

    return jobs;
  } catch (err) {
    console.warn("[linkedin] Fetch error:", err);
    return [];
  }
};
