"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, DollarSign, Briefcase, Sparkles, Save, Loader2, FileText, CheckCircle, XCircle } from "lucide-react";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  description: string;
};

type AIResult = {
  coverLetter: string;
  skillGaps: string[];
  matchedSkills: string[];
};

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // AI Tailor States
  const [resumeText, setResumeText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);

  useEffect(() => {
    fetch(`/api/jobs/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setJob(data.job);
        setLoading(false);
      });
  }, [params.id]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: params.id }),
    });
    setSaved(true);
    setSaving(false);
  };
  const handleTailor = async () => {
    if (!resumeText.trim() || !job) return;
    setAiLoading(true);
    setAiResult(null);
    
    try {
      const res = await fetch("/api/ai/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          resumeText, 
          jobDescription: job.description, 
          jobTitle: job.title, 
          company: job.company 
        }),
      });
      const data = await res.json();
      
      // FIX: Only set the result if the AI actually returned the cover letter
      if (data.coverLetter) {
        setAiResult(data);
      } else {
        alert("AI failed to generate analysis. Check console for errors.");
      }
    } catch (error) {
      console.error("Tailor failed:", error);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>;
  if (!job) return <div>Job not found.</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" /> Back to Search
      </button>

      {/* Header Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{job.title}</h1>
            <p className="text-zinc-400 mt-1 flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> {job.company}
              <span className="text-zinc-600">|</span>
              <MapPin className="h-4 w-4" /> {job.location}
            </p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={saving || saved}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saved ? "Saved!" : "Save to Tracker"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {job.skills.map((skill: string) => (
            <span key={skill} className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">{skill}</span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
          <p className="text-sm text-zinc-400 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" /> ${(job.salaryMin/1000).toFixed(0)}k - ${(job.salaryMax/1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* Job Description */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-white mb-2">Job Description</h2>
        <p className="text-zinc-300 whitespace-pre-line">{job.description}</p>
      </div>

      {/* AI Application Assistant */}
      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6 backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-400" /> AI Application Assistant
        </h2>
        
        {/* Resume Input */}
        <div className="mt-4">
          <label className="text-sm text-zinc-400 mb-2 block">Paste your resume text here to generate a tailored cover letter and skill gap analysis.</label>
          <textarea 
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={6}
            placeholder="Paste your full resume text..."
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
          />
          <button 
            onClick={handleTailor}
            disabled={aiLoading || !resumeText.trim()}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {aiLoading ? "AI Analyzing..." : "Generate AI Analysis"}
          </button>
        </div>

        {/* AI Results */}
        {aiResult && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Skill Gaps & Matches */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3"><XCircle className="h-4 w-4" /> Skill Gaps</h3>
                <ul className="space-y-2">
                  {aiResult.skillGaps.map((gap, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span> {gap}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3"><CheckCircle className="h-4 w-4" /> Matched Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {aiResult.matchedSkills.map((skill, i) => (
                    <span key={i} className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 border border-emerald-500/20">{skill}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Cover Letter */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-950/50 p-4">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3"><FileText className="h-4 w-4" /> Tailored Cover Letter Draft</h3>
              <p className="text-sm text-zinc-300 whitespace-pre-line">{aiResult.coverLetter}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}