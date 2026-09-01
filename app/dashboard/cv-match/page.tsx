"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  MapPin,
  Briefcase,
  DollarSign,
  ExternalLink,
  Save,
  CheckCircle2,
  Target,
  X,
} from "lucide-react";

type MatchedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  source: string;
  sourceUrl?: string;
  salaryRange?: string;
  skills: string[];
  matchScore: number;
  matchedSkills: string[];
  explanation: string;
  isFallback?: boolean;
};

type CVAnalysis = {
  primaryRole: string;
  skills: string[];
  experienceLevel: string;
};

export default function CVMatchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [error, setError] = useState("");
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Load existing saved applications for button state
  useEffect(() => {
    fetch("/api/applications")
      .then((res) => res.json())
      .then((data) => {
        if (data.applications) {
          const ids = new Set<string>(
            data.applications.map((a: any) => a.jobId)
          );
          setSavedJobIds(ids);
        }
      })
      .catch(() => {});
  }, []);

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setError("");
    setAnalysis(null);
    setJobs([]);
    setExtractedText("");

    // Step 1: Extract text using existing /api/upload-resume
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("resume", selectedFile);
      const res = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to extract text from CV");
      }
      if (!data.text || !data.text.trim()) {
        throw new Error("No text could be extracted from this file.");
      }
      setExtractedText(data.text);

      // Step 2: AI analysis + job matching
      setExtracting(false);
      setAnalyzing(true);

      const matchRes = await fetch("/api/ai/cv-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: data.text }),
      });
      const matchData = await matchRes.json();
      if (!matchRes.ok || matchData.error) {
        throw new Error(matchData.error || "AI analysis failed");
      }

      setAnalysis(matchData.analysis);
      setJobs(matchData.jobs || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setExtracting(false);
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleSaveJob = async (job: MatchedJob) => {
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

  const getSourceBadge = (job: MatchedJob) => {
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
        Job Board
      </span>
    );
  };

  const isProcessing = extracting || analyzing;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Target className="h-7 w-7 text-indigo-400" /> CV Smart Match
        </h2>
        <p className="text-zinc-400">
          Upload your CV and let AI find the most relevant jobs from{" "}
          <span className="text-[#70B5F9] font-medium">LinkedIn</span>,{" "}
          <span className="text-emerald-400 font-medium">Adzuna</span>, and
          remote platforms.
        </p>
      </div>

      {/* Upload Section */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all backdrop-blur-xl ${
          dragOver
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
        } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            <p className="text-sm text-zinc-300 font-medium">
              {extracting
                ? "Extracting text from your CV..."
                : "AI is analyzing your CV and finding matching jobs..."}
            </p>
            <p className="text-xs text-zinc-500">This may take 10-20 seconds</p>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-zinc-500 mx-auto mb-4" />
            <p className="text-zinc-300 font-medium">
              Drag & drop your CV here, or{" "}
              <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer underline">
                browse
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Supports PDF, DOCX, and TXT files
            </p>
            {file && !error && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300">
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                {file.name}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setExtractedText("");
                    setAnalysis(null);
                    setJobs([]);
                    setError("");
                  }}
                  className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* AI Analysis Summary */}
      {analysis && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 space-y-4 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wide">
              AI Profile Analysis
            </h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                Best-Fit Role
              </p>
              <p className="text-lg font-bold text-white mt-1">
                {analysis.primaryRole}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                Experience Level
              </p>
              <p className="text-lg font-bold text-white mt-1">
                {analysis.experienceLevel}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                Jobs Found
              </p>
              <p className="text-lg font-bold text-white mt-1">{jobs.length}</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">
              Detected Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg bg-indigo-500/15 border border-indigo-500/25 px-2.5 py-1 text-xs font-medium text-indigo-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Matched Jobs */}
      {analysis && (
        <div className="space-y-4">
          {jobs.length > 0 && (
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-400" />
                {jobs.length} Jobs Matching Your CV
              </h3>
              <span className="text-xs text-zinc-500">
                Ranked by CV skill match
              </span>
            </div>
          )}

          {jobs.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center space-y-3">
              <Briefcase className="h-10 w-10 text-zinc-600 mx-auto" />
              <h4 className="text-zinc-300 font-medium">
                No matching jobs found right now
              </h4>
              <p className="text-xs text-zinc-500">
                External job APIs may be rate-limited. Try again in a moment or use the AI Job Search page.
              </p>
            </div>
          )}

          {jobs.map((job) => {
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
                {/* Top Row */}
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

                  {/* Match Score */}
                  <div
                    className={`flex flex-col items-center rounded-xl px-3.5 py-1.5 border ${scoreColor}`}
                  >
                    <span className="text-xl font-bold">{job.matchScore}%</span>
                    <span className="text-[9px] uppercase tracking-wider font-semibold">
                      Match
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                {job.explanation && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-zinc-950/70 p-3 border border-zinc-800/80">
                    <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {job.explanation}
                    </p>
                  </div>
                )}

                {/* Skill Tags — highlight matched skills */}
                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((skill) => {
                      const isMatched = job.matchedSkills?.some(
                        (ms) =>
                          skill.toLowerCase().includes(ms.toLowerCase()) ||
                          ms.toLowerCase().includes(skill.toLowerCase())
                      );
                      return (
                        <span
                          key={skill}
                          className={`rounded-md px-2 py-0.5 text-xs border ${
                            isMatched
                              ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300 font-medium"
                              : "bg-zinc-800/80 border-zinc-700/60 text-zinc-300"
                          }`}
                        >
                          {skill}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {job.sourceUrl ? (
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20"
                      >
                        <span>
                          Apply on{" "}
                          {job.source === "linkedin"
                            ? "LinkedIn"
                            : job.source === "adzuna"
                            ? "Adzuna"
                            : "Original Site"}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-500">
                        Direct link not provided
                      </span>
                    )}

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
      )}

      {/* Feature Info (only before first upload) */}
      {!analysis && !isProcessing && !error && !file && (
        <div className="grid md:grid-cols-3 gap-4 pt-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-indigo-400" />
            </div>
            <h4 className="text-sm font-semibold text-white">
              Smart Extraction
            </h4>
            <p className="text-xs text-zinc-400">
              Automatically reads your CV and extracts skills, role, and
              experience level
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <h4 className="text-sm font-semibold text-white">AI Matching</h4>
            <p className="text-xs text-zinc-400">
              AI understands your profile and searches across LinkedIn, Adzuna &
              Remotive
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-violet-400" />
            </div>
            <h4 className="text-sm font-semibold text-white">
              Relevance Scoring
            </h4>
            <p className="text-xs text-zinc-400">
              Each job is scored against your specific skills with matched
              highlights
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
