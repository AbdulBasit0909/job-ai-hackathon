"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, X, ChevronUp, Loader2, CheckCircle2, AlertCircle, Search, Briefcase, FileText, BarChart3, MessageSquare, Layers, Zap } from "lucide-react";

// ---------------------------------------------------------------------------
// WebMCP Activity Event System
// ---------------------------------------------------------------------------
// A global event bus that WebMCP tools emit to, and the ActivityFeed listens on.
// This lets users SEE what AI agents are doing in real-time.
// ---------------------------------------------------------------------------

export type ActivityEvent = {
  id: string;
  tool: string;
  status: "running" | "success" | "error";
  summary: string;
  timestamp: Date;
  result?: string;
};

type Listener = (event: ActivityEvent) => void;
const listeners: Set<Listener> = new Set();

export function emitActivity(event: ActivityEvent) {
  listeners.forEach((fn) => fn(event));
}

function useActivityEvents() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    const handler: Listener = (event) => {
      setEvents((prev) => {
        // Update existing event or add new
        const idx = prev.findIndex((e) => e.id === event.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = event;
          return updated;
        }
        return [event, ...prev].slice(0, 20); // Keep last 20
      });
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return events;
}

// Tool icon mapping
const TOOL_ICONS: Record<string, typeof Search> = {
  search_jobs: Search,
  get_job_details: Briefcase,
  save_job: Briefcase,
  get_applications: Briefcase,
  update_application_status: Briefcase,
  get_dashboard_analytics: BarChart3,
  analyze_resume: FileText,
  get_interview_questions: MessageSquare,
  find_matching_jobs: Layers,
  smart_job_hunt: Zap,
};

export function WebMCPActivityFeed() {
  const events = useActivityEvents();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  // Auto-open when first event arrives
  useEffect(() => {
    if (events.length > 0) {
      setIsOpen(true);
      setHasNew(true);
      const t = setTimeout(() => setHasNew(false), 3000);
      return () => clearTimeout(t);
    }
  }, [events.length]);

  if (events.length === 0) return null;

  const Icon = (name: string) => TOOL_ICONS[name] || Bot;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start">
      {/* Panel */}
      {isOpen && (
        <div className="mb-2 w-[340px] max-h-[400px] rounded-2xl border border-indigo-500/30 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-indigo-600/10 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950/50">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">Agent Activity</span>
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                WebMCP
              </span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Events */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {events.map((ev) => {
              const ToolIcon = Icon(ev.tool);
              return (
                <div
                  key={ev.id}
                  className={`rounded-xl border p-3 transition-all ${
                    ev.status === "running"
                      ? "border-indigo-500/30 bg-indigo-500/5"
                      : ev.status === "error"
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-zinc-800 bg-zinc-950/50"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 rounded-lg p-1.5 ${
                      ev.status === "running" ? "bg-indigo-500/20" :
                      ev.status === "error" ? "bg-red-500/20" : "bg-emerald-500/20"
                    }`}>
                      {ev.status === "running" ? (
                        <Loader2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                      ) : ev.status === "error" ? (
                        <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <ToolIcon className="h-3 w-3 text-zinc-500" />
                        <span className="text-[11px] font-mono text-zinc-400">{ev.tool}</span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-0.5">{ev.summary}</p>
                      {ev.result && (
                        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{ev.result}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                      {ev.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setHasNew(false); }}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition shadow-lg ${
            hasNew
              ? "border-indigo-500/50 bg-indigo-600 text-white shadow-indigo-600/30 animate-pulse"
              : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          <Bot className="h-4 w-4" />
          Agent Activity
          {hasNew && <span className="h-2 w-2 rounded-full bg-white" />}
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
