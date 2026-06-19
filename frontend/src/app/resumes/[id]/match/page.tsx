'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useResumes } from '@/context/ResumeContext';
import { apiPost } from '@/lib/api';

interface MatchResponse {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
}

export default function JobMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resumeId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const { activeResume } = useResumes();
  const router = useRouter();

  const [jobDescription, setJobDescription] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Security redirect check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleCalculateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!jobDescription.trim()) {
      setError('Please paste a job description first.');
      return;
    }

    setIsMatching(true);
    try {
      const response = await apiPost<MatchResponse>(`/resumes/${resumeId}/match`, {
        job_description: jobDescription,
      });
      setMatchResult(response);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Job matching failed. Please check your network and try again.');
    } finally {
      setIsMatching(false);
    }
  };

  const loadSampleJD = () => {
    setJobDescription(
      `We are seeking a Backend Software Engineer experienced in Python, FastAPI, and PostgreSQL. \n\nKey Responsibilities:\n- Design and scale RESTful APIs.\n- Work with relational databases (PostgreSQL) and migrations (Alembic).\n- Deploy services to cloud servers using Docker containerization and AWS infrastructure.\n- Implement secure JWT authentication modules.`
    );
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#070610] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Radial calculation details
  const score = matchResult ? Math.round(matchResult.match_score) : 0;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let scoreColor = 'stroke-rose-500 text-rose-400';
  let scoreBg = 'bg-rose-500/10 border-rose-500/20';
  let scoreBadge = 'Low Match Alignment';

  if (score >= 80) {
    scoreColor = 'stroke-emerald-500 text-emerald-400';
    scoreBg = 'bg-emerald-500/10 border-emerald-500/20';
    scoreBadge = 'Excellent Skill Match';
  } else if (score >= 60) {
    scoreColor = 'stroke-amber-500 text-amber-400';
    scoreBg = 'bg-amber-500/10 border-amber-500/20';
    scoreBadge = 'Fair Skill Match';
  }

  return (
    <div className="min-h-screen bg-[#070610] text-[#EDEDED] flex flex-col font-sans relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] max-w-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60vw] h-[60vw] max-w-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main dashboard body */}
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-6 md:p-8 z-10 space-y-6">
        
        {/* Navigation back and title */}
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          {activeResume && (
            <span className="text-[11px] text-zinc-500 font-semibold bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-1.5">
              Matching for: {activeResume.file_name}
            </span>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">Semantic Job Matching</h1>
          <p className="text-zinc-500 text-xs mt-1">Calculate matching scores and extract keyword alignment using sentence transformers</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 flex items-start justify-between gap-2.5 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-zinc-500 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded-lg p-0.5"
              aria-label="Dismiss error alert"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 2-Column Split: Inputs on Left, Score and Compare on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          
          {/* Paste Input Container (Left 3 columns) */}
          <div className="lg:col-span-3 bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Target Job Description</h2>
              <button
                type="button"
                onClick={loadSampleJD}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors focus:outline-none"
              >
                Use Sample JD
              </button>
            </div>

            <form onSubmit={handleCalculateMatch} className="space-y-4">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job requirements description here..."
                rows={12}
                className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/50 rounded-2xl p-4 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium leading-relaxed resize-y"
                required
              />

              <button
                type="submit"
                disabled={isMatching}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all focus:outline-none shadow-[0_0_20px_rgba(124,58,237,0.25)] hover:shadow-[0_0_30px_rgba(124,58,237,0.4)] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isMatching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    <span>Calculating Semantic Match...</span>
                  </>
                ) : (
                  <span>Calculate Match Score</span>
                )}
              </button>
            </form>
          </div>

          {/* Results Side (Right 2 columns) */}
          <div className="lg:col-span-2 space-y-8">
            {matchResult ? (
              <div className="space-y-8 animate-fadeIn">
                
                {/* Score Circular Dial Widget */}
                <div className="bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-center space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Semantic Match Accuracy</h3>
                  
                  <div className="relative flex items-center justify-center">
                    {/* SVG Circular Ring */}
                    <svg className="w-36 h-36 -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        className="stroke-white/[0.04]"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        className={`transition-all duration-1000 ease-out ${scoreColor}`}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <span className="absolute text-3xl font-black text-white">{score}%</span>
                  </div>

                  <span className={`px-3 py-1 border rounded-full text-[10px] font-extrabold uppercase ${scoreBg}`}>
                    {scoreBadge}
                  </span>
                </div>

                {/* Match/Gaps Lists */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 shadow-xl space-y-5">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Competency Breakdown</h3>
                  
                  <div className="grid grid-cols-1 gap-5">
                    {/* Matched Skills */}
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                        <svg className="w-4.5 h-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                        </svg>
                        Matched Skills ({matchResult.matched_skills.length})
                      </h4>
                      {matchResult.matched_skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {matchResult.matched_skills.map((skill, idx) => (
                            <span key={idx} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-2.5 py-1 text-[11px] font-semibold">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600 italic">No matching skills found.</p>
                      )}
                    </div>

                    {/* Missing Skills */}
                    <div className="space-y-2 border-t border-white/[0.04] pt-4">
                      <h4 className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wide">
                        <svg className="w-4.5 h-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Missing Skills ({matchResult.missing_skills.length})
                      </h4>
                      {matchResult.missing_skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {matchResult.missing_skills.map((skill, idx) => (
                            <span key={idx} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg px-2.5 py-1 text-[11px] font-semibold">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-500 font-medium">All target skills are present on your resume!</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-10 shadow-xl flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-zinc-500">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Awaiting Analysis</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[220px]">
                    Paste a job description on the left to see semantic matching dials and keyword breakdowns.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
