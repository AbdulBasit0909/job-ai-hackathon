"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Plus, 
  TrendingUp, 
  Award, 
  AlertCircle, 
  CheckCircle, 
  Star, 
  Trash2, 
  Edit3, 
  Loader2, 
  Layers, 
  BarChart3, 
  Calendar, 
  Briefcase, 
  Check, 
  Copy, 
  X,
  Upload,
  Sparkles,
  ArrowRight,
  Zap,
  RefreshCw,
  FileCheck
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from "recharts";
import { useToast } from "@/components/ui/toast";

type ResumeVersion = {
  id: string;
  name: string;
  targetRole: string | null;
  fileName: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  _count?: { applications: number };
};

type ABMetric = {
  id: string;
  name: string;
  targetRole: string;
  fileName: string;
  isDefault: boolean;
  createdAt: string;
  totalTracked: number;
  totalSaved: number;
  totalApplied: number;
  totalResponses: number;
  responseRate: number;
  interviews: number;
  interviewRate: number;
  offers: number;
  offerRate: number;
  rejections: number;
  avgDaysToResponse: number | null;
  sampleStatus: string;
  confidence: string;
};

type ABData = {
  metrics: ABMetric[];
  bestVersion: ABMetric | null;
  overTime: any[];
  totalApplications: number;
};

type ComparisonResult = {
  winner: "A" | "B" | "TIE";
  summary: string;
  scoreA: number;
  scoreB: number;
  atsReadabilityA: string;
  atsReadabilityB: string;
  keyStrengthsA: string[];
  keyStrengthsB: string[];
  keyDifferences: string[];
  recommendedImprovements: string[];
};

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];

export default function ResumesPage() {
  const [resumes, setResumes] = useState<ResumeVersion[]>([]);
  const [abData, setAbData] = useState<ABData | null>(null);
  const [loading, setLoading] = useState(true);

  // Dual A/B Upload State
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [textA, setTextA] = useState<string>("");
  const [textB, setTextB] = useState<string>("");
  const [extractingA, setExtractingA] = useState(false);
  const [extractingB, setExtractingB] = useState(false);
  const [nameA, setNameA] = useState("Resume Version A — Baseline (Control)");
  const [nameB, setNameB] = useState("Resume Version B — AI Optimized (Variant)");
  const [targetRole, setTargetRole] = useState("Frontend Engineer");
  const [comparing, setComparing] = useState(false);
  const [aiComparison, setAiComparison] = useState<ComparisonResult | null>(null);

  // Single Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResume, setEditingResume] = useState<ResumeVersion | null>(null);
  const [formName, setFormName] = useState("");
  const [formTargetRole, setFormTargetRole] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formFileName, setFormFileName] = useState("resume.txt");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Preview state
  const [previewResume, setPreviewResume] = useState<ResumeVersion | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [resumesRes, abRes] = await Promise.all([
        fetch("/api/resumes"),
        fetch("/api/resumes/ab-testing")
      ]);
      const resumesData = await resumesRes.json();
      const abJson = await abRes.json();

      setResumes(resumesData.resumes || []);
      setAbData(abJson);
    } catch (err) {
      console.error("Failed to load resume data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Upload for File A
  const handleUploadA = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileA(file);
    setExtractingA(true);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("/api/upload-resume", { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) {
        setTextA(data.text);
      } else {
        toast(data.error || "Failed to extract text from File A", "error");
      }
    } catch (err) {
      console.error("Extraction error A:", err);
      toast("Failed to parse File A.", "error");
    } finally {
      setExtractingA(false);
    }
  };

  // Handle Upload for File B
  const handleUploadB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileB(file);
    setExtractingB(true);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("/api/upload-resume", { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) {
        setTextB(data.text);
      } else {
        toast(data.error || "Failed to extract text from File B", "error");
      }
    } catch (err) {
      console.error("Extraction error B:", err);
      toast("Failed to parse File B.", "error");
    } finally {
      setExtractingB(false);
    }
  };

  // Run Live A/B Compare and Save
  const handleRunABComparison = async () => {
    if (!textA.trim() || !textB.trim()) {
      toast("Please upload both Resume A and Resume B files (PDF, DOCX, or TXT).", "info");
      return;
    }

    setComparing(true);
    try {
      const res = await fetch("/api/resumes/ab-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentA: textA,
          contentB: textB,
          nameA: nameA || "Resume Version A",
          nameB: nameB || "Resume Version B",
          fileNameA: fileA?.name || "resume_a.docx",
          fileNameB: fileB?.name || "resume_b.docx",
          targetRole: targetRole || "Software Engineer",
        }),
      });

      const data = await res.json();
      if (data.success && data.comparison) {
        setAiComparison(data.comparison);
        await fetchData();
      } else {
        toast(data.error || "Failed to complete A/B comparative analysis.", "error");
      }
    } catch (err) {
      console.error("A/B Analysis error:", err);
      toast("Error analyzing resumes.", "error");
    } finally {
      setComparing(false);
    }
  };

  const openCreateModal = () => {
    setEditingResume(null);
    setFormName(`Resume Version ${String.fromCharCode(65 + resumes.length)} - `);
    setFormTargetRole("");
    setFormContent("");
    setFormFileName("resume.txt");
    setFormIsDefault(resumes.length === 0);
    setModalOpen(true);
  };

  const openEditModal = (r: ResumeVersion) => {
    setEditingResume(r);
    setFormName(r.name);
    setFormTargetRole(r.targetRole || "");
    setFormContent(r.content);
    setFormFileName(r.fileName);
    setFormIsDefault(r.isDefault);
    setModalOpen(true);
  };

  const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormFileName(file.name);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.text) {
        setFormContent(data.text);
      } else {
        toast(data.error || "Failed to extract text from resume file.", "error");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast("Error uploading file.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) {
      toast("Please provide resume text content.", "info");
      return;
    }

    setSaving(true);
    try {
      if (editingResume) {
        await fetch(`/api/resumes/${editingResume.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            targetRole: formTargetRole,
            content: formContent,
            fileName: formFileName,
            isDefault: formIsDefault,
          }),
        });
      } else {
        await fetch("/api/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            targetRole: formTargetRole,
            content: formContent,
            fileName: formFileName,
            isDefault: formIsDefault,
          }),
        });
      }
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error("Save error:", err);
      toast("Failed to save resume version.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? Applications linked to this version will keep their records.`)) {
      return;
    }

    try {
      await fetch(`/api/resumes/${id}`, { method: "DELETE" });
      await fetchData();
    } catch (err) {
      console.error("Delete error:", err);
      toast("Failed to delete resume.", "error");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await fetch(`/api/resumes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      await fetchData();
    } catch (err) {
      console.error("Set default error:", err);
    }
  };

  const handleCopyContent = () => {
    if (!previewResume) return;
    navigator.clipboard.writeText(previewResume.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const chartKeys = Array.from(
    new Set(
      (abData?.metrics || [])
        .filter((m) => m.id !== "unassigned")
        .map((m) => m.name)
    )
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Layers className="h-8 w-8 text-indigo-400" /> Resume A/B Testing & Versions
          </h2>
          <p className="text-zinc-400 mt-1">
            Upload two resume versions (PDF or DOCX) to compare content, analyze keyword strength, and track real-world application response rates.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 text-sm"
        >
          <Plus className="h-4 w-4" /> Add Single Version
        </button>
      </div>

      {/* DUAL RESUME A/B UPLOADER & COMPARISON ENGINE */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 via-zinc-900/60 to-zinc-950 p-6 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" /> Upload & Compare Resume A vs Resume B
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Upload your Baseline (Version A) and Variant (Version B) in PDF or DOCX format to extract and analyze actual content.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Target Role (e.g. Frontend Engineer)"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* UPLOAD BOX: RESUME A */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                VERSION A (Baseline / Control)
              </span>
              {textA && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <FileCheck className="h-3.5 w-3.5" /> Extracted ({textA.length} chars)
                </span>
              )}
            </div>

            <input
              type="text"
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="Version A Name"
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {!textA ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
                {extractingA ? (
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mb-2" />
                ) : (
                  <Upload className="h-6 w-6 text-zinc-400 mb-2" />
                )}
                <p className="text-xs text-zinc-400 mb-2">
                  {extractingA ? "Extracting text from File A..." : "Upload Resume A (PDF or DOCX)"}
                </p>
                <label className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors">
                  Select File A
                  <input type="file" accept=".pdf,.docx,.txt" onChange={handleUploadA} className="hidden" />
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span className="font-mono truncate max-w-[200px]">{fileA?.name || "resume_a.docx"}</span>
                  <label className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-medium">
                    Change
                    <input type="file" accept=".pdf,.docx,.txt" onChange={handleUploadA} className="hidden" />
                  </label>
                </div>
                <textarea
                  rows={4}
                  value={textA}
                  onChange={(e) => setTextA(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-[11px] font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Extracted Resume A text..."
                />
              </div>
            )}
          </div>

          {/* UPLOAD BOX: RESUME B */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                VERSION B (Variant / Optimized)
              </span>
              {textB && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <FileCheck className="h-3.5 w-3.5" /> Extracted ({textB.length} chars)
                </span>
              )}
            </div>

            <input
              type="text"
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="Version B Name"
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {!textB ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
                {extractingB ? (
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mb-2" />
                ) : (
                  <Upload className="h-6 w-6 text-zinc-400 mb-2" />
                )}
                <p className="text-xs text-zinc-400 mb-2">
                  {extractingB ? "Extracting text from File B..." : "Upload Resume B (PDF or DOCX)"}
                </p>
                <label className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors">
                  Select File B
                  <input type="file" accept=".pdf,.docx,.txt" onChange={handleUploadB} className="hidden" />
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span className="font-mono truncate max-w-[200px]">{fileB?.name || "resume_b.docx"}</span>
                  <label className="cursor-pointer text-emerald-400 hover:text-emerald-300 font-medium">
                    Change
                    <input type="file" accept=".pdf,.docx,.txt" onChange={handleUploadB} className="hidden" />
                  </label>
                </div>
                <textarea
                  rows={4}
                  value={textB}
                  onChange={(e) => setTextB(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-[11px] font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Extracted Resume B text..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500">
            {textA && textB 
              ? "Ready! Click below to analyze extracted content and save both versions to your A/B suite." 
              : "Upload both File A and File B to enable side-by-side A/B testing."}
          </p>
          <button
            onClick={handleRunABComparison}
            disabled={comparing || !textA.trim() || !textB.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 px-6 py-2.5 font-medium text-white hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {comparing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing Actual Documents...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Run A/B Test & Save Versions
              </>
            )}
          </button>
        </div>

        {/* AI COMPARATIVE ANALYSIS RESULT CARD */}
        {aiComparison && (
          <div className="rounded-xl border border-indigo-500/40 bg-zinc-950/90 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-6 w-6 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-white text-base">
                    AI Comparative Analysis: {aiComparison.winner === "B" ? "Version B Wins 🏆" : aiComparison.winner === "A" ? "Version A Wins 🏆" : "Dead Heat / Tie"}
                  </h4>
                  <p className="text-xs text-zinc-400">{aiComparison.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <span className="text-xs text-zinc-500 block">Score A</span>
                  <span className="text-lg font-bold text-indigo-400">{aiComparison.scoreA}/100</span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-zinc-500 block">Score B</span>
                  <span className="text-lg font-bold text-emerald-400">{aiComparison.scoreB}/100</span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg bg-zinc-900/60 p-3 border border-zinc-800">
                <h5 className="text-xs font-semibold text-indigo-300 mb-2">Version A Strengths</h5>
                <ul className="space-y-1 text-xs text-zinc-300">
                  {aiComparison.keyStrengthsA.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-indigo-400 mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg bg-zinc-900/60 p-3 border border-zinc-800">
                <h5 className="text-xs font-semibold text-emerald-300 mb-2">Version B Strengths</h5>
                <ul className="space-y-1 text-xs text-zinc-300">
                  {aiComparison.keyStrengthsB.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-zinc-900/60 p-3 border border-zinc-800">
              <h5 className="text-xs font-semibold text-zinc-200 mb-2">Key Differentiators & Phrasing Differences</h5>
              <div className="grid sm:grid-cols-3 gap-2">
                {aiComparison.keyDifferences.map((d, i) => (
                  <div key={i} className="rounded bg-zinc-950 p-2 text-xs text-zinc-300 border border-zinc-800/80">
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Best Performing Insight Banner */}
      {abData?.bestVersion ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-zinc-900/50 to-indigo-500/10 p-6 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-emerald-500/20 p-3 text-emerald-400">
                <Award className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Top Performing Version</span>
                  {abData.bestVersion.confidence === "Low" && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      Early Data ({abData.bestVersion.totalApplied} applied)
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mt-0.5">{abData.bestVersion.name}</h3>
                <p className="text-sm text-zinc-300 mt-1">
                  Achieving a <span className="font-bold text-emerald-400">{abData.bestVersion.responseRate}% response rate</span> with {abData.bestVersion.interviews} interviews and {abData.bestVersion.offers} offers across {abData.bestVersion.totalApplied} submitted applications.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{abData.bestVersion.responseRate}%</p>
                <p className="text-xs text-zinc-500">Response Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-400">{abData.bestVersion.interviews}</p>
                <p className="text-xs text-zinc-500">Interviews</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{abData.bestVersion.offers}</p>
                <p className="text-xs text-zinc-500">Offers</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-xl text-center">
          <TrendingUp className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-zinc-300">No Application Outcomes Tracked Yet</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
            Apply to jobs with your uploaded resume versions and update statuses to "Applied", "Interviewing", or "Offer" to see live A/B comparison metrics.
          </p>
        </div>
      )}

      {/* Performance Over Time Chart */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-400" /> Response Rate Trends Over Time (%)
            </h3>
            <p className="text-xs text-zinc-400">Weekly response rate performance tracked per resume version</p>
          </div>
        </div>
        <div className="h-[280px] w-full">
          {abData?.overTime && abData.overTime.length > 0 && chartKeys.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={abData.overTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} unit="%" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }}
                  formatter={(value: any) => [`${value}%`, "Response Rate"]}
                />
                <Legend />
                {chartKeys.map((key, index) => (
                  <Line
                    key={`chart-line-${key}-${index}`}
                    type="monotone"
                    dataKey={key}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
              Create resume versions and submit applications to view performance trend charts.
            </div>
          )}
        </div>
      </div>

      {/* A/B Comparison Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Version Comparison Table</h3>
          <p className="text-xs text-zinc-400">Detailed breakdown of application funnels and outcomes by version</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 text-xs text-zinc-400 uppercase bg-zinc-950/40">
              <tr>
                <th className="py-3 px-4">Resume Version</th>
                <th className="py-3 px-4 text-center">Tracked</th>
                <th className="py-3 px-4 text-center">Applied</th>
                <th className="py-3 px-4 text-center">Responses</th>
                <th className="py-3 px-4 text-center">Response Rate</th>
                <th className="py-3 px-4 text-center">Interviews</th>
                <th className="py-3 px-4 text-center">Offers</th>
                <th className="py-3 px-4 text-center">Rejections</th>
                <th className="py-3 px-4 text-center">Sample Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {abData?.metrics && abData.metrics.length > 0 ? (
                abData.metrics.map((m) => {
                  const isTop = abData.bestVersion?.id === m.id;
                  return (
                    <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{m.name}</span>
                          {m.isDefault && (
                            <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                              Default
                            </span>
                          )}
                          {isTop && (
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 flex items-center gap-1">
                              <Star className="h-3 w-3 fill-emerald-400 text-emerald-400" /> Leader
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">Target: {m.targetRole} | File: {m.fileName}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-zinc-300">{m.totalTracked}</td>
                      <td className="py-3 px-4 text-center font-medium text-zinc-300">{m.totalApplied}</td>
                      <td className="py-3 px-4 text-center font-bold text-white">{m.totalResponses}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className={`font-bold ${m.responseRate >= 30 ? "text-emerald-400" : m.responseRate >= 15 ? "text-amber-400" : "text-zinc-400"}`}>
                            {m.responseRate}%
                          </span>
                          <div className="w-16 bg-zinc-800 rounded-full h-1.5 hidden sm:block">
                            <div 
                              className="bg-indigo-500 h-1.5 rounded-full" 
                              style={{ width: `${Math.min(100, m.responseRate)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-indigo-300 font-semibold">{m.interviews}</td>
                      <td className="py-3 px-4 text-center text-emerald-300 font-semibold">{m.offers}</td>
                      <td className="py-3 px-4 text-center text-zinc-500">{m.rejections}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          m.confidence === "High" 
                            ? "bg-emerald-500/20 text-emerald-300"
                            : m.confidence === "Moderate"
                            ? "bg-indigo-500/20 text-indigo-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}>
                          {m.sampleStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-500">
                    No resume versions created yet. Upload File A and File B above to begin A/B testing!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resume Management Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Manage Resume Versions ({resumes.length})</h3>
            <p className="text-xs text-zinc-400">View, edit, set default, or preview your uploaded resume versions</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-xl flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-white text-base">{r.name}</h4>
                    <p className="text-xs text-indigo-400 mt-0.5">{r.targetRole || "General Target"}</p>
                  </div>
                  {r.isDefault && (
                    <span className="rounded-md bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[11px] font-medium text-indigo-300 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-indigo-400" /> Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-2 line-clamp-3 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60 font-mono">
                  {r.content.slice(0, 180)}...
                </p>
                <div className="flex items-center justify-between text-xs text-zinc-500 mt-3">
                  <span>File: {r.fileName}</span>
                  <span>{r._count?.applications || 0} applications</span>
                </div>
              </div>

              <div className="border-t border-zinc-800/80 pt-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPreviewResume(r)}
                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition-colors"
                >
                  Preview
                </button>
                <div className="flex items-center gap-1.5">
                  {!r.isDefault && (
                    <button
                      onClick={() => handleSetDefault(r.id)}
                      title="Set as Default"
                      className="rounded-lg p-1.5 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(r)}
                    title="Edit Version"
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id, r.name)}
                    title="Delete Version"
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingResume ? "Edit Resume Version" : "Create New Resume Version"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Version Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Resume Version A — Full Stack"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Target Role / Specialty</label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend Engineer, DevOps, AI"
                    value={formTargetRole}
                    onChange={(e) => setFormTargetRole(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-zinc-400">Resume Content (Extracted or Pasted) *</label>
                  <label className="cursor-pointer text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Extracting..." : "Upload PDF/DOCX to Fill"}
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleSingleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  required
                  rows={8}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Paste or upload your full resume text here..."
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                  <span>Characters: {formContent.length}</span>
                  <span>File label: {formFileName}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultCheckbox"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isDefaultCheckbox" className="text-sm text-zinc-300 cursor-pointer">
                  Set as my primary / default resume version for new applications
                </label>
              </div>

              <div className="border-t border-zinc-800 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formContent.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {editingResume ? "Update Version" : "Save Version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{previewResume.name}</h3>
                <p className="text-xs text-zinc-400">Target: {previewResume.targetRole || "General"} | File: {previewResume.fileName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyContent}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy Text"}
                </button>
                <button onClick={() => setPreviewResume(null)} className="text-zinc-400 hover:text-white p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl bg-zinc-950 p-4 border border-zinc-800 font-mono text-xs text-zinc-300 whitespace-pre-wrap">
              {previewResume.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}