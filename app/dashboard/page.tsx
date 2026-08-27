"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, DollarSign, Clock, Briefcase, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Metrics = {
  totalSaved: number;
  totalApplied: number;
  responseRate: number;
  avgTimeToResponse: string;
  salaryBenchmark: number;
  totalApps: number;
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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Analytics Overview</h2>
        <p className="text-zinc-400">Track your job search progress and measure your success.</p>
      </div>

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

        {/* Response Rate */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Response Rate</h3>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-4xl font-bold text-emerald-400">{metrics?.responseRate || 0}%</p>
          <p className="text-xs text-zinc-500 mt-2">Interviews / Applications</p>
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

        {/* Salary Benchmark */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-400">Target Salary Avg</h3>
            <DollarSign className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-4xl font-bold text-white">${(metrics ? metrics.salaryBenchmark / 1000 : 0).toFixed(0)}k</p>
          <p className="text-xs text-zinc-500 mt-2">Based on tracked roles</p>
        </div>
      </div>

      {/* Pipeline Chart */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl h-[300px]">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-400" /> Funnel Overview</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pro Tip / Action Box */}
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6 backdrop-blur-xl flex flex-col justify-center">
          <h3 className="text-lg font-semibold text-white mb-2">Next Steps</h3>
          <p className="text-zinc-300 text-sm mb-4">Based on your activity, you have <span className="font-bold text-indigo-400">{metrics?.totalSaved || 0} jobs</span> sitting in your Saved list. It is time to tailor your resume and apply!</p>
          <a href="/dashboard/search" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 transition-colors w-fit">
            Find More Jobs
          </a>
        </div>
      </div>
    </div>
  );
}