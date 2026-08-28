"use client";

import { useState } from "react";
import { Search, MapPin, DollarSign, Sparkles, Briefcase, Loader2, ArrowRight } from "lucide-react";

type JobResult = {
  id: string; title: string; company: string; location: string; remote: boolean;
  salaryMin: number; salaryMax: number; skills: string[]; matchScore: number; explanation: string;
};

export default function JobSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter States
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minSalary, setMinSalary] = useState("100000");
  const [postedDays, setPostedDays] = useState("7");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query, 
          filters: { remoteOnly, minSalary, postedDays } 
        }),
      });
      const data = await res.json();
      if (data.jobs) setResults(data.jobs);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-400" /> Semantic AI Job Search
        </h2>
        <p className="text-zinc-400">Stop scrolling through hundreds of listings. Let AI find the perfect match.</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="e.g. Remote React developer using TypeScript..." className="w-full rounded-xl bg-zinc-950 border border-zinc-800 py-3 pl-10 pr-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
          </div>
          <button onClick={handleSearch} disabled={loading} className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} {loading ? "AI Searching..." : "Search with AI"}
          </button>
        </div>
        
        {/* Functional Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button onClick={() => setRemoteOnly(!remoteOnly)} className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${remoteOnly ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50'}`}>🌍 Remote Only</button>
          
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            💰 Min Salary: 
            <select value={minSalary} onChange={(e) => setMinSalary(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-100 focus:outline-none">
              <option value="0">Any</option>
              <option value="80000">$80k</option>
              <option value="100000">$100k</option>
              <option value="130000">$130k</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            📅 Posted: 
            <select value={postedDays} onChange={(e) => setPostedDays(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-100 focus:outline-none">
              <option value="1">Today</option>
              <option value="7">This Week</option>
              <option value="14">2 Weeks Ago</option>
              <option value="30">This Month</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {results.length > 0 && <h3 className="text-lg font-semibold text-zinc-300">Top AI Matches</h3>}
        {results.map((job) => {
          const scoreColor = job.matchScore >= 85 ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" : "text-amber-400 border-amber-500/20 bg-amber-500/10";
          return (
            <div key={job.id} className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-indigo-500/50 hover:bg-zinc-900/80 backdrop-blur-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-semibold text-white">{job.title}</h4>
                  <p className="text-sm text-zinc-400 mt-1 flex items-center gap-2"><Briefcase className="h-3 w-3" /> {job.company} <span className="text-zinc-600">|</span> <MapPin className="h-3 w-3" /> {job.location}</p>
                </div>
                <div className={`flex flex-col items-center rounded-xl px-4 py-2 border ${scoreColor}`}><span className="text-2xl font-bold">{job.matchScore}%</span><span className="text-[10px] uppercase tracking-wide">Match</span></div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-zinc-950/50 p-3 border border-zinc-800"><Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" /><p className="text-sm text-zinc-300">{job.explanation}</p></div>
              <div className="mt-4 flex flex-wrap gap-2">{job.skills.map((skill) => (<span key={skill} className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">{skill}</span>))}</div>
              <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
                <p className="text-sm text-zinc-400 flex items-center gap-2"><DollarSign className="h-3 w-3 text-emerald-400" /> ${(job.salaryMin/1000).toFixed(0)}k - ${(job.salaryMax/1000).toFixed(0)}k</p>
                <a href={`/dashboard/jobs/${job.id}`} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 group-hover:gap-2 transition-all">View Details <ArrowRight className="h-3 w-3" /></a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}