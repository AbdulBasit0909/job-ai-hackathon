"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Clock, Briefcase, BarChart3, Layers, Award, ArrowRight, Star, Sparkles, Brain } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type ResumeStat = {
  id: string;
  name: string;
  targetRole?: string | null;
  isDefault: boolean;
  totalApplied: number;
  totalResponses: number;
  responseRate: number;
  interviews: number;
  offers: number;
};

type Metrics = {
  totalSaved: number;
  totalApplied: number;
  responseRate: number;
  avgTimeToResponse: string;
  salaryBenchmark: number;
  totalApps: number;
  totalResumes?: number;
  resumeBreakdown?: ResumeStat[];
  bestResume?: ResumeStat | null;
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then(res => res.json())
      .then(data => {
        setMetrics(data.metrics);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>;

  const chartData = [
    { name: "Saved", count: metrics?.totalSaved || 0 },
    { name: "Applied", count: metrics?.totalApplied || 0 },
    { name: "Responses", count: metrics ? Math.round((metrics.responseRate / 100) * metrics.totalApplied) : 0 },
  ];

  // Derive AI insight from existing metrics
  const aiInsight = metrics?.bestResume
    ? `Your "${metrics.bestResume.name}" resume is leading with a ${metrics.bestResume.responseRate}% response rate. Consider using it for upcoming applications.`
    : metrics?.totalApplied && metrics.totalApplied > 0
      ? `You've applied to ${metrics.totalApplied} positions. Keep tracking responses to unlock deeper AI insights.`
      : "Start tracking your job applications to unlock AI-powered career insights.";

  // Time-of-day greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">

      {/* ── Welcome Hero ───────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">{greeting} </h2>
          <p className="text-zinc-400 mt-1">Here&apos;s your AI-powered career intelligence report</p>
        </div>
        <a
          href="/dashboard/resumes"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 text-sm w-fit"
        >
          <Layers className="h-4 w-4" /> Manage Resume Versions
        </a>
      </div>

      {/* ── AI Insight Card ────────────────────────── */}
      <div className="gradient-border-card rounded-2xl p-4 backdrop-blur-xl flex items-start gap-3">
        <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-indigo-300 mb-0.5">AI Insight</p>
          <p className="text-sm text-zinc-300">{aiInsight}</p>
        </div>
      </div>

      {/* ── Section: Performance Metrics ────────────── */}
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Performance Metrics</p>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Apps */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Total Tracked</h3>
            <Briefcase className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-4xl font-bold text-white">{metrics?.totalApps || 0}</p>
          <p className="text-xs text-zinc-500 mt-2">{metrics?.totalSaved || 0} saved, {metrics?.totalApplied || 0} applied</p>
        </div>

        {/* Response Rate — Accent Glow */}
        <div className="rounded-2xl border border-indigo-500/30 bg-zinc-900/50 p-6 backdrop-blur-xl glow-indigo">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Overall Response Rate</h3>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-4xl font-bold text-emerald-400">{metrics?.responseRate || 0}%</p>
          <p className="text-xs text-zinc-500 mt-2">Interviews &amp; Offers / Applied</p>
        </div>

        {/* Resume Versions Count */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Resume Versions</h3>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-4xl font-bold text-white">{metrics?.totalResumes || 0}</p>
          <p className="text-xs text-zinc-500 mt-2">
            {metrics?.bestResume ? `Leader: ${metrics.bestResume.name}` : "A/B Testing Enabled"}
          </p>
        </div>

        {/* Avg Time to Response */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Avg Time to Respond</h3>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-4xl font-bold text-white">{metrics?.avgTimeToResponse || "N/A"}</p>
          <p className="text-xs text-zinc-500 mt-2">From application to interview</p>
        </div>
      </div>

      {/* ── Section: Resume Analytics ───────────────── */}
      {metrics?.resumeBreakdown && metrics.resumeBreakdown.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Resume Analytics</p>

          {/* Resume A/B Performance Section */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-400" /> Resume A/B Performance Snapshot
                </h3>
                <p className="text-xs text-zinc-400">Comparing response rates across your active resume versions</p>
              </div>
              <a
                href="/dashboard/resumes"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Full A/B Analytics <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {metrics.resumeBreakdown.map((r) => {
                const isBest = metrics.bestResume?.id === r.id;
                return (
                  <div
                    key={r.id}
                    className={`rounded-xl border p-4 backdrop-blur-md flex flex-col justify-between ${
                      isBest 
                        ? "border-emerald-500/40 bg-emerald-950/20" 
                        : "border-zinc-800 bg-zinc-950/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-white line-clamp-1">{r.name}</h4>
                        {isBest && (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 flex items-center gap-1 shrink-0">
                            <Star className="h-3 w-3 fill-emerald-400" /> Top
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{r.targetRole || "General Target"}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xl font-bold text-emerald-400">{r.responseRate}%</span>
                          <span className="text-[11px] text-zinc-500 ml-1.5">rate</span>
                        </div>
                        <div className="text-right text-xs text-zinc-400">
                          <span>{r.totalResponses} responses / {r.totalApplied} applied</span>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2">
                        <div
                          className={`h-full rounded-full transition-all ${isBest ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(r.responseRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Section: Pipeline ──────────────────────── */}
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Pipeline</p>

      {/* Pipeline Chart & Next Steps */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl h-[300px]">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-400" /> Funnel Overview</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "12px" }} />
              <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pro Tip / Action Box */}
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6 backdrop-blur-xl flex flex-col justify-center">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-400" /> A/B Testing Recommendation
          </h3>
          <p className="text-zinc-300 text-sm mb-4">
            {metrics?.bestResume 
              ? `Your "${metrics.bestResume.name}" version is currently leading with a ${metrics.bestResume.responseRate}% response rate. Use it for upcoming applications or tailor a new challenger version!`
              : "Create multiple resume versions tailored to different job specializations (e.g. Frontend vs Backend) and track which version generates the most interview callbacks."}
          </p>
          <div className="flex items-center gap-4">
            <a href="/dashboard/resumes" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500 transition-colors text-sm">
              Create Version
            </a>
            <a href="/dashboard/search" className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 font-medium text-zinc-200 hover:bg-zinc-700 transition-colors text-sm">
              Find Jobs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}