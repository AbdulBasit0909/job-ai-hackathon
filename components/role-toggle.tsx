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
  const isRecruiter = role === "recruiter";

  const handleToggle = (targetRole: "candidate" | "recruiter") => {
    if (targetRole === "recruiter") {
      // If they are already a recruiter, just go to the page
      if (isRecruiter) {
        router.push("/dashboard/recruiter");
      } else {
        // If they are a candidate, send them to the Access Gate
        router.push("/dashboard/recruiter-access");
      }
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-1">
      <button 
        onClick={() => handleToggle("candidate")}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${pathname === "/dashboard" ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-100'}`}
      >
        <Briefcase className="h-3 w-3" /> Candidate
      </button>
      <button 
        onClick={() => handleToggle("recruiter")}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${isRecruiter && pathname.includes("/recruiter") ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-100'}`}
      >
        <Building2 className="h-3 w-3" /> Recruiter
      </button>
    </div>
  );
}