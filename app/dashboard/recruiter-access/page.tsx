"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Building2, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";

export default function RecruiterAccessPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const handleSwitch = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "recruiter" }),
      });

      // CRITICAL: Force Clerk to fetch the new session token with the updated role
      await user?.reload();

      // Now that the session is updated, navigate to the recruiter dashboard
      router.push("/dashboard/recruiter");
       router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] max-w-2xl mx-auto text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
        <ShieldCheck className="h-8 w-8 text-emerald-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-3">Recruiter Access Required</h1>
      <p className="text-zinc-400 mb-8 max-w-md">
        You are currently signed in as a Candidate. To view the Talent Intelligence Pipeline, you need to switch your account to Recruiter Mode.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Candidate View
        </button>
        <button 
          onClick={handleSwitch}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
          {loading ? "Switching Account..." : "Switch to Recruiter Account"}
        </button>
      </div>
      
      <p className="text-xs text-zinc-600 mt-8">
        This will change your dashboard experience. You can switch back anytime.
      </p>
    </div>
  );
}