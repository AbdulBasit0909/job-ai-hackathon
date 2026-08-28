"use client";

import { useState, useRef } from "react";
import { Sparkles, Loader2, MessageSquare, Code, Users, Play, CheckCircle, XCircle } from "lucide-react";


type Question = {
  category: "Behavioral" | "Technical" | "Company/Culture";
  question: string;
  modelAnswer: string;
};

export default function InterviewPage() {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Practice Mode States
  const [practiceIndex, setPracticeIndex] = useState<number | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<{ score: number; feedback: string } | null>(null);

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return;
    setLoading(true);
    setQuestions([]);
    
    try {
      const res = await fetch("/api/ai/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, jobTitle, company }),
      });
      const data = await res.json();
      if (data.questions) setQuestions(data.questions);
    } catch (error) {
      console.error("Failed to generate:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!userAnswer.trim() || practiceIndex === null) return;
    setGrading(true);
    setGradeResult(null);

    try {
      const res = await fetch("/api/ai/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: questions[practiceIndex].question, 
          userAnswer, 
          jobTitle 
        }),
      });
      const data = await res.json();
      if (data.score !== undefined) setGradeResult(data);
    } catch (error) {
      console.error("Grading failed:", error);
    } finally {
      setGrading(false);
    }
  };    const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const baseAnswerRef = useRef("");

  const handleVoiceInput = () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (SpeechRecognition) {
      if (isRecording && recognitionRef.current) {
        recognitionRef.current.stop();
        return;
      }

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const recognition = new SpeechRecognition();
      /* eslint-enable @typescript-eslint/no-explicit-any */
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      baseAnswerRef.current = userAnswer ? userAnswer + " " : "";

      recognition.onstart = () => setIsRecording(true);
      
      recognition.onend = () => {
        setIsRecording(false);
        setUserAnswer(prev => prev.trim());
      };

      /* eslint-disable @typescript-eslint/no-explicit-any */
      recognition.onresult = (event: any) => {
      /* eslint-enable @typescript-eslint/no-explicit-any */
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          baseAnswerRef.current += finalTranscript;
        }

        setUserAnswer(baseAnswerRef.current + interimTranscript);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } else {
      alert("Voice input not supported in this browser. Please use Chrome.");
    }
  };
  const categoryIcon = (cat: string) => {
    if (cat === "Behavioral") return <Users className="h-4 w-4 text-blue-400" />;
    if (cat === "Technical") return <Code className="h-4 w-4 text-emerald-400" />;
    return <MessageSquare className="h-4 w-4 text-purple-400" />;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-400" /> AI Interview Prep
        </h2>
        <p className="text-zinc-400">Generate tailored interview questions and practice your answers with AI feedback.</p>
      </div>

      {/* Input Form */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job Title (e.g. Backend Engineer)" className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (e.g. Stripe)" className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
        </div>
        <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={4} placeholder="Paste the Job Description here..." className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
        <button onClick={handleGenerate} disabled={loading || !jobDescription.trim()} className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? "AI Generating..." : "Generate 8 Questions"}
        </button>
      </div>

      {/* Questions List & Practice Mode */}
      {questions.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-zinc-300">Generated Questions</h3>
          
          {questions.map((q, index) => (
            <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {categoryIcon(q.category)}
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{q.category}</span>
                  </div>
                  <h4 className="text-lg font-semibold text-white">{q.question}</h4>
                  
                  {/* Show Model Answer ONLY if not practicing this question */}
                  {practiceIndex !== index && (
                    <div className="mt-3 rounded-lg bg-zinc-950/50 p-3 border border-zinc-800">
                      <p className="text-xs text-zinc-500 mb-1 font-medium">What a strong answer covers:</p>
                      <p className="text-sm text-zinc-300">{q.modelAnswer}</p>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => { setPracticeIndex(index); setUserAnswer(""); setGradeResult(null); }}
                  className="flex-shrink-0 inline-flex items-center justify-center rounded-lg border border-indigo-500 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                >
                  <Play className="mr-1 h-3 w-3" /> Practice
                </button>
              </div>
                                   <button 
                    onClick={handleVoiceInput} 
                    className={`inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium transition-colors mb-2 ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'}`}
                  >
                    {isRecording ? "Stop Recording" : "Start Voice Answer"}
                  </button>
              {/* Practice Interface */}
              {practiceIndex === index && (
                <div className="mt-6 border-t border-zinc-800 pt-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <label className="text-sm text-zinc-400 block">Your Answer:</label>
                  <textarea 
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    rows={5}
                    placeholder="Type your answer here... (Tip: Use the STAR method for behavioral questions)"
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                  />
                  <button onClick={handleGrade} disabled={grading || !userAnswer.trim()} className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50">
                    {grading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    {grading ? "AI Grading..." : "Submit for AI Feedback"}
                  </button>

                  {/* Grade Result */}
                  {gradeResult && (
                    <div className={`rounded-xl p-4 border ${gradeResult.score >= 70 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-2xl font-bold ${gradeResult.score >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{gradeResult.score}/100</span>
                        {gradeResult.score >= 70 ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-amber-400" />}
                      </div>
                      <p className="text-sm text-zinc-300">{gradeResult.feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}