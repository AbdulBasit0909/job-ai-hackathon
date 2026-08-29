"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { Briefcase, Building2 } from "lucide-react";

export function RoleToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null;

  const role = (user?.publicMetadata as { role?: string })?.role || "candidate";
  const isRecruiter = role === "recruiter" || pathname.startsWith("/dashboard/recruiter");

  const handleToggle = (targetRole: "candidate" | "recruiter") => {
    if (targetRole === "recruiter") {
      // If they are already a recruiter, just go to the page
      if (role === "recruiter") {
        router.push("/dashboard/recruiter");
      } else {
        // If they are a candidate, send them to the Access Gate
        router.push("/dashboard/recruiter-access");
      }
    } else {
      // If in recruiter context, direct navigation is disabled.
      // Must use "Switch to Candidate View" on the recruiter page.
      if (isRecruiter) {
        return;
      }
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-1">
      <button 
        onClick={() => handleToggle("candidate")}
        disabled={isRecruiter}
        title={isRecruiter ? "Use 'Switch to Candidate View' button to return to Candidate mode" : "Candidate Dashboard"}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
          isRecruiter
            ? 'opacity-40 cursor-not-allowed text-zinc-500 hover:text-zinc-500'
            : pathname === "/dashboard" || !pathname.startsWith("/dashboard/recruiter")
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
              : 'text-zinc-400 hover:text-zinc-100'
        }`}
      >
        <Briefcase className="h-3 w-3" /> Candidate
      </button>
      <button 
        onClick={() => handleToggle("recruiter")}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
          isRecruiter && pathname.includes("/recruiter") 
            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20' 
            : 'text-zinc-400 hover:text-zinc-100'
        }`}
      >
        <Building2 className="h-3 w-3" /> Recruiter
      </button>
    </div>
  );
}