import { Sparkles, Search, FileText, Layers, MessageSquare, BarChart3, Briefcase, ArrowRight, Bot, Zap, Shield, Globe } from "lucide-react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span className="text-lg font-bold tracking-tight">
              JobHunt<span className="text-indigo-400">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                >
                  Dashboard
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20 px-6">
        {/* Glow effects */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="pointer-events-none absolute top-20 right-1/4 h-[300px] w-[400px] rounded-full bg-purple-600/8 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300">
            <Bot className="h-3.5 w-3.5" />
            WebMCP-Powered &middot; Agent-Native Platform
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Your AI-Powered{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Career Command Center
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 leading-relaxed">
            Stop juggling 50 tabs. JobHunt AI unifies job discovery, resume optimization,
            application tracking, and interview preparation into one intelligent workspace — operable by both
            you <em>and</em> AI agents via WebMCP.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 shadow-lg shadow-indigo-600/25"
                >
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard/search"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                >
                  <Search className="h-4 w-4" /> AI Job Search
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 shadow-lg shadow-indigo-600/25"
                >
                  Start Job Hunting <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            <div>
              <p className="text-2xl font-bold text-white">9</p>
              <p className="text-xs text-zinc-500 mt-0.5">WebMCP Tools</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">5+</p>
              <p className="text-xs text-zinc-500 mt-0.5">AI Workflows</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">3</p>
              <p className="text-xs text-zinc-500 mt-0.5">Job Sources</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WebMCP Section ─────────────────────────────────── */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/30 py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <Globe className="h-3.5 w-3.5" />
              WebMCP Integration
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Two Interfaces. One Platform.
            </h2>
            <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
              Every action has a human interface (our UI) and an agent interface (WebMCP tools).
              AI agents like ChatGPT can search jobs, save applications, and analyze resumes — all through structured tool calls.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Search, name: "search_jobs", desc: "Search jobs by role & location" },
              { icon: Briefcase, name: "save_job", desc: "Save to application tracker" },
              { icon: FileText, name: "analyze_resume", desc: "AI resume analysis & cover letter" },
              { icon: BarChart3, name: "get_analytics", desc: "Career metrics & A/B results" },
              { icon: MessageSquare, name: "interview_prep", desc: "Generate practice questions" },
              { icon: Layers, name: "find_matching", desc: "CV-to-job smart matching" },
            ].map((tool) => (
              <div
                key={tool.name}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm"
              >
                <tool.icon className="h-5 w-5 text-indigo-400 mb-2" />
                <p className="text-sm font-semibold text-white font-mono">{tool.name}</p>
                <p className="text-xs text-zinc-500 mt-1">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything You Need to Land Your Next Role
            </h2>
            <p className="mt-3 text-zinc-400">
              Six AI-powered modules working together across your entire job search lifecycle.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Search,
                title: "AI Job Search",
                desc: "Search across Adzuna, Remotive & our database. AI scores each match 0-100 with explanations.",
                color: "text-indigo-400",
                border: "border-indigo-500/20",
              },
              {
                icon: FileText,
                title: "Resume Tailoring",
                desc: "AI-generated cover letters, skill gap analysis, matched skills, and personalized upskilling paths.",
                color: "text-purple-400",
                border: "border-purple-500/20",
              },
              {
                icon: Layers,
                title: "A/B Resume Testing",
                desc: "Track which resume version gets more callbacks. Statistical confidence, weekly trends, and AI comparison.",
                color: "text-emerald-400",
                border: "border-emerald-500/20",
              },
              {
                icon: Briefcase,
                title: "Application Tracker",
                desc: "Track every application from Saved → Applied → Interviewing → Offer with follow-up dates.",
                color: "text-amber-400",
                border: "border-amber-500/20",
              },
              {
                icon: MessageSquare,
                title: "Interview Prep",
                desc: "8 AI-generated questions per role. Practice with speech input. Get scored 0-100 on the STAR method.",
                color: "text-rose-400",
                border: "border-rose-500/20",
              },
              {
                icon: BarChart3,
                title: "Career Analytics",
                desc: "Response rates, time-to-response, salary benchmarks, and AI-powered insights from your data.",
                color: "text-cyan-400",
                border: "border-cyan-500/20",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className={`rounded-2xl border ${feature.border} bg-zinc-900/50 p-6 backdrop-blur-sm transition hover:bg-zinc-900/80`}
              >
                <feature.icon className={`h-6 w-6 ${feature.color} mb-3`} />
                <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/20 py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
            How It Works
          </h2>
          <div className="grid gap-6 sm:grid-cols-4">
            {[
              { step: "1", title: "Upload Resume", desc: "PDF, DOCX, or paste text. AI extracts your profile." },
              { step: "2", title: "Find Jobs", desc: "Search or let AI match jobs to your skills automatically." },
              { step: "3", title: "Tailor & Apply", desc: "AI writes your cover letter and identifies skill gaps." },
              { step: "4", title: "Track & Improve", desc: "A/B test resumes. Track results. Optimize your approach." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-sm">
                  {s.step}
                </div>
                <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ─────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-6">Built With</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500">
            {["Next.js 16", "React 19", "TypeScript", "Tailwind CSS", "PostgreSQL", "Prisma", "Clerk Auth", "Groq AI", "Google Gemini", "WebMCP", "Vercel AI SDK", "Recharts"].map((tech) => (
              <span key={tech} className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1.5">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="border-t border-zinc-800/60 py-20 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Zap className="mx-auto h-8 w-8 text-indigo-400 mb-4" />
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to Transform Your Job Search?
          </h2>
          <p className="mt-3 text-zinc-400">
            Join the future of AI-native career management. Free to use.
          </p>
          <Link
            href={isSignedIn ? "/dashboard" : "/sign-up"}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 shadow-lg shadow-indigo-600/25"
          >
            {isSignedIn ? "Go to Dashboard" : "Get Started"} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/60 py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>JobHunt<span className="text-indigo-400">AI</span></span>
            <span>&middot; Built for the WebMCP Challenge 2026</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <span>Powered by WebMCP</span>
            <span>&middot;</span>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}