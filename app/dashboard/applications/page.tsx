"use client";

import { useState, useEffect } from "react";
import { Briefcase, Loader2, MapPin, CalendarClock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Application = {
  id: string;
  status: string;
  followUpDate: string | null;
  job: { title: string; company: string; location: string; };
};

const statuses = ["Saved", "Applied", "Interviewing", "Offer", "Rejected"];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = () => {
    fetch("/api/applications")
      .then(res => res.json())
      .then(data => {
        setApplications(data.applications || []);
        setLoading(false);
      });
  };

  useEffect(() => { fetchApps(); }, []);

  const handleUpdate = async (id: string, field: string, value: string) => {
    setApplications(prev => prev.map(app => app.id === id ? { ...app, [field]: value } : app));
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const chartData = statuses.map(status => ({ name: status, count: applications.filter(app => app.status === status).length }));

  // Upcoming Deadlines Logic
  const upcomingDeadlines = applications
    .filter(app => app.followUpDate && new Date(app.followUpDate) >= new Date())
    .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())
    .slice(0, 5);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Application Tracker</h2>
        <p className="text-zinc-400">Manage your job pipeline and track your progress.</p>
      </div>

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2"><CalendarClock className="h-5 w-5" /> Upcoming Deadlines & Follow-ups</h3>
          <div className="space-y-3">
            {upcomingDeadlines.map(app => (
              <div key={app.id} className="flex items-center justify-between border-b border-amber-500/10 pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{app.job.title} at {app.job.company}</p>
                  <p className="text-xs text-zinc-400">Status: {app.status}</p>
                </div>
                <p className="text-sm text-amber-300 font-medium">{new Date(app.followUpDate!).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl h-[300px]">
        <h3 className="text-lg font-semibold text-white mb-4">Pipeline Overview</h3>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
            <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }} />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-zinc-300">Your Jobs</h3>
        {applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
            <Briefcase className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-400">No jobs saved yet. Go to AI Search to find your next role!</p>
          </div>
        ) : (
          applications.map((app) => (
            <div key={app.id} className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-white">{app.job.title}</h4>
                <p className="text-sm text-zinc-400 flex items-center gap-2 mt-1"><Briefcase className="h-3 w-3" /> {app.job.company} <span className="text-zinc-600">|</span> <MapPin className="h-3 w-3" /> {app.job.location}</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="date" 
                  value={app.followUpDate ? new Date(app.followUpDate).toISOString().split('T')[0] : ''} 
                  onChange={(e) => handleUpdate(app.id, "followUpDate", e.target.value)} 
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <select value={app.status} onChange={(e) => handleUpdate(app.id, "status", e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                  {statuses.map(status => (<option key={status} value={status}>{status}</option>))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}