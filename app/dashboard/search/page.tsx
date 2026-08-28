"use client";

import { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  DollarSign,
  Sparkles,
  Briefcase,
  Loader2,
  ExternalLink,
  Save,
  CheckCircle2,
  Globe,
  Building,
} from "lucide-react";

type JobResult = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  source: string;
  sourceUrl?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryRange?: string;
  skills: string[];
  matchScore: number;
  explanation: string;
  isFallback?: boolean;
};

export default function JobSearchPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("Pakistan");
  const [source, setSource] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [results, setResults] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const quickLocations = [
    { label: "🇵🇰 Pakistan (All)", value: "Pakistan" },
    { label: "Lahore", value: "Lahore, Pakistan" },
    { label: "Karachi", value: "Karachi, Pakistan" },
    { label: "Islamabad", value: "Islamabad, Pakistan" },
    { label: "🌍 Remote", value: "Remote" },
  ];

  const handleSearch = async (overrideLocation?: string) => {
    const loc = overrideLocation !== undefined ? overrideLocation : location;
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim() || "Software Engineer",
          location: loc,
          filters: { remoteOnly, source },
        }),
      });
      const data = await res.json();
      if (data.jobs) {
        setResults(data.jobs);
        setUsingFallback(Boolean(data.usingFallback));
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Run an initial search for Pakistan on load
  useEffect(() => {
    handleSearch("Pakistan");
  }, []);

  const handleSaveJob = async (job: JobResult) => {
    setSavingId(job.id);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          jobData: {
            title: job.title,
            company: job.company,
            location: job.location,
            remote: job.remote,
            skills: job.skills,
            description: job.explanation,
          },
        }),
      });
      if (res.ok) {
        setSavedJobIds((prev) => new Set(prev).add(job.id));
      }
    } catch (e) {
      console.error("Failed to save job:", e);
    } finally {
      setSavingId(null);
    }
  };

  const getSourceBadge = (job: JobResult) => {
    const src = (job.source || "other").toLowerCase();
    if (src === "linkedin") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[#0A66C2]/15 border border-[#0A66C2]/30 px-2.5 py-0.5 text-xs font-medium text-[#70B5F9]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0A66C2]"></span>
          LinkedIn
        </span>
      );
    }
    if (src === "adzuna") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          Adzuna
        </span>
      );
    }
    if (src === "remotive") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-xs font-medium text-purple-300">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
          Remotive
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
        Seed Fallback
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-indigo-400" /> Multi-Platform AI Job Search
        </h2>
        <p className="text-zinc-400">
          Aggregating live opportunities across <span className="text-[#70B5F9] font-medium">LinkedIn</span>,{" "}
          <span className="text-emerald-400 font-medium">Adzuna</span>, and remote platforms in Pakistan and globally.
        </p>
      </div>

      {/* Search Filter Box */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-xl shadow-xl space-y-4">
        {/* Main Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Query */}
          <div className="relative md:col-span-6">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Job title or skills (e.g. React Developer, Python, AI...)"
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 py-3 pl-10 pr-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
            />
          </div>

          {/* Location Input */}
          <div className="relative md:col-span-4">
            <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Location (e.g. Pakistan, Lahore, Remote)"
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 py-3 pl-10 pr-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
            />
          </div>

          {/* Search Button */}
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="md:col-span-2 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20 text-sm cursor-pointer"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
          {/* Quick Location Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-400 mr-1">Locations:</span>
            {quickLocations.map((qLoc) => (
              <button
                key={qLoc.value}
                onClick={() => {
                  setLocation(qLoc.value);
                  handleSearch(qLoc.value);
                }}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  location.toLowerCase() === qLoc.value.toLowerCase()
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-medium"
                    : "bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                {qLoc.label}
              </button>
            ))}
          </div>

          {/* Source and Remote toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRemoteOnly(!remoteOnly)}
              className={`cursor-pointer rounded-lg border px-3 py-1 text-xs transition-colors ${
                remoteOnly
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-medium"
                  : "border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              🌐 Remote Only
            </button>

            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
            >
              <option value="all">All Platforms</option>
              <option value="linkedin">LinkedIn</option>
              <option value="adzuna">Adzuna</option>
              <option value="remotive">Remotive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fallback Banner Notice */}
      {usingFallback && results.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-center gap-2">
          <span className="font-semibold">⚠️ Note:</span> External live APIs are currently rate-limited or unavailable; displaying high-quality seed fallback postings.
        </div>
      )}

      {/* Search Results */}
      <div className="space-y-4">
        {results.length > 0 && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
              Found {results.length} Matches {location ? `for ${location}` : ""}
            </h3>
            <span className="text-xs text-zinc-500">Sorted by AI Match Relevance</span>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-sm text-zinc-400">Aggregating live jobs across LinkedIn & Adzuna...</p>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center space-y-3">
            <Building className="h-10 w-10 text-zinc-600 mx-auto" />
            <h4 className="text-zinc-300 font-medium">No jobs found matching your criteria</h4>
            <p className="text-xs text-zinc-500">
              Try searching with broader keywords or checking "Pakistan (All)" or "Remote".
            </p>
          </div>
        )}

        {results.map((job) => {
          const scoreColor =
            job.matchScore >= 85
              ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
              : "text-indigo-400 border-indigo-500/30 bg-indigo-500/10";
          const isSaved = savedJobIds.has(job.id);
          const isSaving = savingId === job.id;

          return (
            <div
              key={job.id}
              className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-indigo-500/40 hover:bg-zinc-900/80 backdrop-blur-xl shadow-lg space-y-4"
            >
              {/* Card Top Row */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xl font-semibold text-white group-hover:text-indigo-200 transition-colors">
                      {job.title}
                    </h4>
                    {getSourceBadge(job)}
                    {job.remote && (
                      <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                        Remote
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 flex items-center gap-2 flex-wrap">
                    <span className="text-zinc-200 font-medium flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                      {job.company}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                      {job.location}
                    </span>
                    {job.salaryRange && (
                      <>
                        <span className="text-zinc-600">•</span>
                        <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                          <DollarSign className="h-3.5 w-3.5" />
                          {job.salaryRange}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* Match Score Badge */}
                <div className={`flex flex-col items-center rounded-xl px-3.5 py-1.5 border ${scoreColor}`}>
                  <span className="text-xl font-bold">{job.matchScore}%</span>
                  <span className="text-[9px] uppercase tracking-wider font-semibold">Match</span>
                </div>
              </div>

              {/* AI Explanation Pill */}
              {job.explanation && (
                <div className="flex items-start gap-2.5 rounded-xl bg-zinc-950/70 p-3 border border-zinc-800/80">
                  <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-zinc-300 leading-relaxed">{job.explanation}</p>
                </div>
              )}

              {/* Tags */}
              {job.skills && job.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 text-xs text-zinc-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Card Action Footer */}
              <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 gap-3 flex-wrap">
                {/* Apply Now Button (Original Source URL) */}
                <div className="flex items-center gap-2">
                  {job.sourceUrl ? (
                    <a
                      href={job.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20"
                    >
                      <span>Apply on {job.source === "linkedin" ? "LinkedIn" : job.source === "adzuna" ? "Adzuna" : "Original Site"}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-500">Direct link not provided</span>
                  )}

                  {/* Save to Tracker */}
                  <button
                    onClick={() => handleSaveJob(job)}
                    disabled={isSaved || isSaving}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium border transition-all cursor-pointer ${
                      isSaved
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isSaved ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {isSaved ? "Saved in Tracker" : "Save Job"}
                  </button>
                </div>

                {/* View Details & AI Prep */}
                <a
                  href={`/dashboard/jobs/${job.id}`}
                  className="text-xs font-medium text-zinc-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  Tailor Resume & Cover Letter →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}