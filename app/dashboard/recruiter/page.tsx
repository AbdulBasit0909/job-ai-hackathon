"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs"; 
import { useRouter } from "next/navigation";
import { Building2, Mail, Loader2, X, Users, ArrowRight, Inbox, ArrowLeft } from "lucide-react";

type Candidate = {
  id: string;
  name: string;
  email: string;
  role: string;
  location: string;
  skills: string[];
};

type Referral = {
  id: string;
  candidateName: string;
  recruiterName: string;
  recruiterEmail: string;
  message: string;
  status: string;
  createdAt: string;
};

export default function RecruiterPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [switchingRole, setSwitchingRole] = useState(false);
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [sending, setSending] = useState(false);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);

  const [recruiterName, setRecruiterName] = useState("John Smith");
  const [recruiterEmail, setRecruiterEmail] = useState("john@techcorp.com");
  const [message, setMessage] = useState("");

  const fetchReferrals = () => {
    fetch("/api/referrals")
      .then(res => res.json())
      .then(data => {
        setReferrals(data.requests || []);
        setLoadingReferrals(false);
      });
  };

  useEffect(() => {
    fetch("/api/talent")
      .then(res => res.json())
      .then(data => {
        setCandidates(data.candidates || []);
        setLoadingCandidates(false);
      })
      .catch(error => {
        console.error("Failed to fetch candidates:", error);
        setLoadingCandidates(false);
      });
      
    fetchReferrals();

    const interval = setInterval(() => {
      fetchReferrals();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleOpenModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setMessage(`Hi ${candidate.name},\n\nWe were highly impressed by your profile and experience with ${candidate.skills[0] || 'your field'}. We have an opening that aligns perfectly with your background. Would you be open to a quick chat next week?`);
    
    if (isLoaded && user) {
      setRecruiterName(user.fullName || `${user.firstName} ${user.lastName}` || "Recruiter");
      setRecruiterEmail(user.primaryEmailAddress?.emailAddress || "recruiter@company.com");
    }
  };

  const handleSendReferral = async () => {
    if (!selectedCandidate) return;
    setSending(true);

    try {
      await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          candidateName: selectedCandidate.name,
          candidateEmail: selectedCandidate.email, 
          recruiterName,
          recruiterEmail,
          message,
        }),
      });
      
      setSelectedCandidate(null);
      fetchReferrals(); 
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setSending(false);
    }
  };

  const handleSwitchToCandidate = async () => {
    setSwitchingRole(true);
    await fetch("/api/auth/set-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "candidate" }),
    });
    await user?.reload();
    router.push("/dashboard");
    router.refresh();
  };

  const getStatusStyles = (status: string) => {
    if (status === "Accepted" || status === "ACCEPTED") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (status === "Rejected" || status === "REJECTED") return "text-red-400 bg-red-500/10 border-red-500/20";
    return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-400" /> Talent Intelligence Pipeline
          </h2>
          <p className="text-zinc-400">Discover top candidates and manage referral requests in real-time.</p>
        </div>
        
        <button 
          onClick={handleSwitchToCandidate}
          disabled={switchingRole}
          className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {switchingRole ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
          Switch to Candidate View
        </button>
      </div>

      {/* Candidate Grid */}

            <div id="talent">
        <h3 className="text-lg font-semibold text-zinc-300 mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-emerald-400" /> AI-Matched Talent Pool</h3>
        
        {loadingCandidates ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>
        ) : candidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No candidates have uploaded their resumes yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {candidates.map((candidate, index) => {
              // Generate a mock match score based on index for visual polish
              const matchScore = 95 - (index * 3); 
              
              return (
                <div key={candidate.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl transition-all hover:border-emerald-500/50 hover:bg-zinc-900/80 flex flex-col">
                  
                  {/* Top Section: Avatar, Name, and Match Score */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold text-lg">
                        {candidate.name?.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-white">
                          {candidate.name}
                        </h4>
                        <p className="text-xs text-zinc-400">{candidate.role}</p>
                      </div>
                    </div>
                    
                    {/* Premium Circular Match Score */}
                    <div className="relative flex h-10 w-10 items-center justify-center">
                      <svg className="absolute h-10 w-10 transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#27272a" strokeWidth="3"></circle>
                        <circle 
                          cx="18" cy="18" r="16" fill="none" 
                          stroke={matchScore >= 90 ? "#10b981" : "#6366f1"} 
                          strokeWidth="3" 
                          strokeDasharray={`${matchScore}, 100`}
                          strokeLinecap="round"
                        ></circle>
                      </svg>
                      <span className="text-xs font-bold text-white">{matchScore}</span>
                    </div>
                  </div>
                  
                  {/* Middle Section: Location and Skills */}
                  <div className="space-y-3 mb-4 flex-1">
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-zinc-500"></span> {candidate.location || "Remote"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.map(skill => (
                        <span key={skill} className="rounded-md bg-zinc-800/80 px-2 py-1 text-[10px] text-zinc-300 border border-zinc-700/50">{skill}</span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Bottom Section: Action Button */}
                  <button 
                    onClick={() => handleOpenModal(candidate)}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors mt-auto"
                  >
                    <Mail className="mr-2 h-3.5 w-3.5" /> Request Referral
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Real-Time Referral Pipeline Table */}
           <div id="inbox" className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl overflow-hidden">
        
        {loadingReferrals ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Inbox className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No referral requests sent yet. Click the Request Referral button on a candidate above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-zinc-300">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50">
                <tr>
                  <th scope="col" className="px-6 py-3">Candidate</th>
                  <th scope="col" className="px-6 py-3">Recruiter</th>
                  <th scope="col" className="px-6 py-3 hidden md:table-cell">Date Sent</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((req) => (
                  <tr key={req.id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                      {req.candidateName}
                    </td>
                    <td className="px-6 py-4">
                      <div>{req.recruiterName}</div>
                      <div className="text-xs text-zinc-500">{req.recruiterEmail}</div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-zinc-400">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border w-fit ${getStatusStyles(req.status)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${req.status === 'Accepted' || req.status === 'ACCEPTED' ? 'bg-emerald-400' : req.status === 'Rejected' || req.status === 'REJECTED' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`}></span>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Referral Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedCandidate(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold text-lg">
                  {selectedCandidate.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Send Referral Request</h3>
                  <p className="text-sm text-zinc-400">To: {selectedCandidate.name} ({selectedCandidate.role})</p>
                </div>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="text-zinc-500 hover:text-zinc-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Your Name</label>
                  <input value={recruiterName} onChange={(e) => setRecruiterName(e.target.value)} className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Your Email</label>
                  <input value={recruiterEmail} onChange={(e) => setRecruiterEmail(e.target.value)} className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Message</label>
                <textarea 
                  rows={5} 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setSelectedCandidate(null)} className="flex-1 inline-flex items-center justify-center rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-700 transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleSendReferral}
                  disabled={sending}
                  className="flex-1 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : <>Send Request <ArrowRight className="ml-2 h-4 w-4" /></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}