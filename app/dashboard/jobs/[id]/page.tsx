"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  MapPin, 
  DollarSign, 
  Briefcase, 
  Sparkles, 
  Save, 
  Loader2, 
  FileText, 
  CheckCircle, 
  XCircle, 
  GraduationCap, 
  Clock, 
  ExternalLink 
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salaryMin: number;
  salaryMax: number;
  description: string;
  skills: string[];
  source?: string;
  sourceUrl?: string;
  salaryRange?: string;
};

type AIResult = {
  coverLetter: string;
  skillGaps: string[];
  matchedSkills: string[];
  parsedData: {
    name: string;
    email: string;
    experienceYears: number;
    skills: string[];
  };
  courseRecommendations?: {
    skill: string;
    course: string;
    provider: string;
    estimatedTime: string;
    level: "Beginner" | "Intermediate" | "Advanced";
  }[];
};

type ResumeOption = {
  id: string;
  name: string;
  content: string;
  fileName: string;
  isDefault: boolean;
  targetRole?: string | null;
};

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Resume Versions State
  const [savedResumes, setSavedResumes] = useState<ResumeOption[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [savingVersion, setSavingVersion] = useState(false);

  // AI Tailor States
  const [resumeText, setResumeText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const { toast } = useToast();

  // File Upload States
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/jobs/${params.id}`).then((res) => res.json()),
      fetch("/api/resumes").then((res) => res.json()),
    ])
      .then(([jobData, resumesData]) => {
        setJob(jobData.job);
        const resList: ResumeOption[] = resumesData.resumes || [];
        setSavedResumes(resList);

        const defaultRes = resList.find((r) => r.isDefault) || resList[0];
        if (defaultRes) {
          setSelectedResumeId(defaultRes.id);
          setResumeText(defaultRes.content);
          setFileName(defaultRes.fileName || defaultRes.name);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load job details:", err);
        setLoading(false);
      });
  }, [params.id]);

  const handleResumeSelect = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    if (!resumeId) {
      setResumeText("");
      setFileName("");
      return;
    }
    const found = savedResumes.find((r) => r.id === resumeId);
    if (found) {
      setResumeText(found.content);
      setFileName(found.fileName || found.name);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        jobId: params.id,
        resumeVersionId: selectedResumeId || undefined,
        status: "Saved"
      }),
    });
    setSaved(true);
    setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFileName(file.name);
    setSelectedResumeId("");
    
    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.text) {
        setResumeText(data.text);
      } else {
        toast(data.error || "Failed to parse resume.", "error");
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAsNewVersion = async () => {
    if (!resumeText.trim()) return;
    const versionName = "Tailored for " + (job?.company || "Role") + " - " + (job?.title || "Position");

    setSavingVersion(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: versionName,
          fileName: fileName || "tailored_resume.txt",
          content: resumeText,
          targetRole: job?.title || "Tailored Role",
          isDefault: false,
        }),
      });
      const data = await res.json();
      if (data.resume) {
        setSavedResumes((prev) => [...prev, data.resume]);
        setSelectedResumeId(data.resume.id);
        toast("Saved as \"" + data.resume.name + "\"! Track its A/B performance in the Resume section.", "success");
      }
    } catch (err) {
      console.error("Failed to save resume version:", err);
      toast("Failed to save resume version.", "error");
    } finally {
      setSavingVersion(false);
    }
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
      if (data.coverLetter) {
        setAiResult(data);
      } else {
        toast(data.error || "AI failed to generate analysis.", "error");
      }
    } catch (error: unknown) {
      console.error("Tailor failed:", error);
      const message = error instanceof Error ? error.message : "Failed to generate AI analysis.";
      toast(message, "error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    setSubmitting(true);
    try {
      const appsRes = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: params.id,
          resumeVersionId: selectedResumeId || undefined,
          status: "Applied"
        }),
      });
      const data = await appsRes.json();
      if (data.success) {
        toast("Application marked as Applied! Track its response outcome in Applications & A/B Testing.", "success");
      } else {
        toast("Could not update application status.", "error");
      }
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>;
  if (!job) return <div className="text-center p-12 text-zinc-400">Job not found.</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
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
          <div className="flex items-center gap-2">
            {job.sourceUrl && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 transition-colors text-sm shadow-md shadow-emerald-600/20"
              >
                <span>Apply on {job.source === "linkedin" ? "LinkedIn" : job.source === "adzuna" ? "Adzuna" : "Original Site"}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button 
              onClick={handleSave} 
              disabled={saving || saved}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 text-sm"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saved ? "Saved!" : "Save to Tracker"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {job.skills.map((skill: string) => (
            <span key={skill} className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">{skill}</span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
          <p className="text-sm text-zinc-400 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" /> {job.salaryMin && job.salaryMax ? `$${(job.salaryMin/1000).toFixed(0)}k - $${(job.salaryMax/1000).toFixed(0)}k` : (job.salaryRange || "Competitive")}
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
        
        {/* Resume Version Picker & Upload UI */}
        <div className="mt-4 space-y-3">
          {savedResumes.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                Select Resume Version to Test / Use
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {savedResumes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleResumeSelect(r.id)}
                    className={"rounded-xl px-3 py-2 text-xs font-medium transition-all border flex items-center gap-1.5 " + (
                      selectedResumeId === r.id
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-200 shadow-md shadow-indigo-500/10"
                        : "border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{r.name}</span>
                    {r.isDefault && (
                      <span className="rounded bg-indigo-500/30 px-1 py-0.2 text-[9px] text-indigo-300">Default</span>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleResumeSelect("")}
                  className={"rounded-xl px-3 py-2 text-xs font-medium transition-all border flex items-center gap-1.5 " + (
                    !selectedResumeId
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-200"
                      : "border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:border-zinc-700"
                  )}
                >
                  <span>+ Custom / Upload New</span>
                </button>
              </div>
            </div>
          )}

          {!resumeText ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950 p-8 text-center">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-3" />
              ) : (
                <FileText className="h-8 w-8 text-zinc-500 mb-3" />
              )}
              <p className="text-sm text-zinc-400 mb-3">
                {uploading ? "Parsing resume..." : "Upload a resume file (PDF, DOCX, TXT) or select a version above"}
              </p>
              <input 
                type="file" 
                accept=".pdf,.docx,.txt" 
                onChange={handleFileUpload} 
                className="hidden" 
                id="resume-upload"
              />
              <label 
                htmlFor="resume-upload" 
                className="cursor-pointer rounded-lg border border-indigo-500 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors"
              >
                Select Resume File
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-emerald-300 font-medium">{fileName || "Active Resume"}</span>
                  {selectedResumeId && (
                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                      Tracking A/B Version
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveAsNewVersion}
                    disabled={savingVersion}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    {savingVersion ? "Saving..." : "Save as New Version"}
                  </button>
                  <span className="text-zinc-600">|</span>
                  <button 
                    onClick={() => { setResumeText(""); setFileName(""); setSelectedResumeId(""); setAiResult(null); }} 
                    className="text-xs text-zinc-400 hover:text-zinc-100"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <textarea 
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                placeholder="Extracted resume text (editable)..."
              />
            </div>
          )}

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

            {/* Auto-fill Application Form */}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <h3 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Auto-Populated Application Form
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Full Name</label>
                  <input type="text" value={aiResult.parsedData.name} readOnly className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Email</label>
                  <input type="text" value={aiResult.parsedData.email} readOnly className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Years of Experience</label>
                  <input type="text" value={aiResult.parsedData.experienceYears + " years"} readOnly className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Top Skills</label>
                  <input type="text" value={aiResult.parsedData.skills.join(", ")} readOnly className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none" />
                </div>
              </div>
              <button 
                onClick={handleSubmitApplication}
                disabled={submitting}
                className="mt-4 w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {submitting ? "Updating Tracker..." : "Submit Application & Mark as Applied"}
              </button>
            </div>

            {/* AI Upskilling Path (Course Recommendations) */}
            {aiResult.courseRecommendations && aiResult.courseRecommendations.length > 0 && (
              <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-500/20 border border-purple-500/30">
                    <GraduationCap className="h-5 w-5 text-purple-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Your AI Upskilling Path</h3>
                    <p className="text-xs text-zinc-400">Close your skill gaps with these recommended courses</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {aiResult.courseRecommendations.map((rec, i) => (
                    <div key={i} className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-zinc-800 hover:border-purple-500/50 transition-all">
                      <div className="flex items-start gap-4 mb-3 md:mb-0">
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                            {i + 1}
                          </div>
                          {aiResult.courseRecommendations && i < aiResult.courseRecommendations.length - 1 && (
                            <div className="w-px h-6 bg-zinc-700 mt-1"></div>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-semibold text-white">{rec.course}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-zinc-400">{rec.provider}</span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-xs font-medium text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">{rec.skill}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pl-12 md:pl-0">
                        <div className="flex items-center gap-1.5">
                          <div className={"h-2 w-2 rounded-full " + (rec.level === "Beginner" ? "bg-emerald-400" : rec.level === "Intermediate" ? "bg-amber-400" : "bg-red-400")}></div>
                          <span className="text-xs text-zinc-400">{rec.level}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Clock className="h-3 w-3" />
                          {rec.estimatedTime}
                        </div>

                         
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}