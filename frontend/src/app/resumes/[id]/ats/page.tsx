'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useResumes } from '@/context/ResumeContext';
import { apiPost, apiGet } from '@/lib/api';

interface ATSReport {
  id: string;
  score: number;
  feedback: {
    keyword_coverage?: string[];
    suggestions?: string[];
  };
  created_at: string;
}

export default function ATSAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resumeId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const { activeResume } = useResumes();
  const router = useRouter();

  const [jobDescription, setJobDescription] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeReport, setActiveReport] = useState<ATSReport | null>(null);
  const [reportsHistory, setReportsHistory] = useState<ATSReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'suggestions' | 'keywords'>('suggestions');

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await apiGet<ATSReport[]>(`/resumes/${resumeId}/ats`);
      setReportsHistory(data);
      if (data.length > 0 && !activeReport) {
        setActiveReport(data[0]);
      }
    } catch (err) {
      console.error('Failed to load scan history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [resumeId, activeReport]);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, fetchHistory]);

  // Security redirect check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!jobDescription.trim()) {
      setError('Please paste a job description first.');
      return;
    }

    setIsAuditing(true);
    try {
      const response = await apiPost<{ ats_score: number; keyword_coverage: string[]; suggestions: string[] }>(
        `/resumes/${resumeId}/ats`,
        { job_description: jobDescription }
      );
      
      const newReport: ATSReport = {
        id: Math.random().toString(), // local fallback ID
        score: response.ats_score,
        feedback: {
          keyword_coverage: response.keyword_coverage,
          suggestions: response.suggestions,
        },
        created_at: new Date().toISOString(),
      };
      
      setActiveReport(newReport);
      // Refresh scan list history
      await fetchHistory();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ATS Audit failed. Please try again.');
    } finally {
      setIsAuditing(false);
    }
  };

  const loadSampleJD = () => {
    setJobDescription(
      `We are looking for a Senior Software Engineer with a strong background in Python, Django, AWS Cloud, Docker container setups, and MySQL database management. Excellent styling practices and standard layout patterns are highly appreciated.`
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
  const score = activeReport ? activeReport.score : 0;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let scoreColor = 'stroke-rose-500 text-rose-400';
  let scoreBg = 'bg-rose-500/10 border-rose-500/20';
  let scoreBadge = 'Formatting Issues Found';

  if (score >= 80) {
    scoreColor = 'stroke-emerald-500 text-emerald-400';
    scoreBg = 'bg-emerald-500/10 border-emerald-500/20';
    scoreBadge = 'Highly Compatible';
  } else if (score >= 60) {
    scoreColor = 'stroke-amber-500 text-amber-400';
    scoreBg = 'bg-amber-500/10 border-amber-500/20';
    scoreBadge = 'Action Items Required';
  }

  return (
    <div className="min-h-screen bg-[#070610] text-[#EDEDED] flex flex-col font-sans relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] max-w-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60vw] h-[60vw] max-w-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Page block */}
      <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto p-6 md:p-8 z-10 space-y-6">
        
        {/* Navigation back helper */}
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          {activeResume && (
            <span className="text-[11px] text-zinc-500 font-semibold bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-1.5">
              Auditing: {activeResume.file_name}
            </span>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">Applicant Tracking System (ATS) Auditor</h1>
          <p className="text-zinc-500 text-xs mt-1">Audit formatting, structure, and check keyword density matching against postings</p>
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

        {/* 3-Column Grid: Scans List on Left, Form in Center, Score/Results on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* History Sidebar Panel (Left 3 cols) */}
          <div className="lg:col-span-3 bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-5 shadow-xl space-y-4">
            <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Scan History</h2>
            
            {loadingHistory ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              </div>
            ) : reportsHistory.length > 0 ? (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {reportsHistory.map((rep) => (
                  <button
                    key={rep.id}
                    onClick={() => setActiveReport(rep)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      activeReport?.id === rep.id
                        ? 'bg-purple-600/15 border-purple-500/30 text-purple-400'
                        : 'bg-white/[0.01] border-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="text-[10px] text-zinc-500 font-bold block">{new Date(rep.created_at).toLocaleDateString()}</span>
                      <span className="text-xs truncate block mt-0.5">ATS Assessment Report</span>
                    </div>
                    <span className={`text-xs font-black rounded-lg px-2 py-1 border ${
                      rep.score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      rep.score >= 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {rep.score}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic py-2">No prior scans recorded.</p>
            )}
          </div>

          {/* Pasting board (Center 5 cols) */}
          <div className="lg:col-span-5 bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Target Job description</h2>
              <button
                onClick={loadSampleJD}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors"
              >
                Use Sample JD
              </button>
            </div>

            <form onSubmit={handleRunAudit} className="space-y-4">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job details here..."
                rows={11}
                className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/50 rounded-2xl p-4 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium leading-relaxed resize-y"
                required
              />

              <button
                type="submit"
                disabled={isAuditing}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all focus:outline-none shadow-[0_0_20px_rgba(124,58,237,0.25)] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isAuditing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    <span>Auditing Resume layout...</span>
                  </>
                ) : (
                  <span>Run ATS Audit</span>
                )}
              </button>
            </form>
          </div>

          {/* Results Details Column (Right 4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {activeReport ? (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Score Widget */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-center space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Audit Score</h3>

                  <div className="relative flex items-center justify-center">
                    <svg className="w-32 h-32 -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        className="stroke-white/[0.04]"
                        strokeWidth="9"
                        fill="transparent"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        className={`transition-all duration-1000 ease-out ${scoreColor}`}
                        strokeWidth="9"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <span className="absolute text-2xl font-black text-white">{score}%</span>
                  </div>

                  <span className={`px-3 py-1 border rounded-full text-[10px] font-extrabold uppercase ${scoreBg}`}>
                    {scoreBadge}
                  </span>
                </div>

                {/* Feedback Breakdown Tab Control Panel */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-5 shadow-xl space-y-4">
                  <div className="flex border-b border-white/[0.05] pb-2">
                    <button
                      onClick={() => setActiveResultTab('suggestions')}
                      className={`flex-1 text-center pb-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        activeResultTab === 'suggestions'
                          ? 'text-purple-400 border-b border-purple-500'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Suggestions
                    </button>
                    <button
                      onClick={() => setActiveResultTab('keywords')}
                      className={`flex-1 text-center pb-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        activeResultTab === 'keywords'
                          ? 'text-purple-400 border-b border-purple-500'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Keywords
                    </button>
                  </div>

                  {/* Suggestions View */}
                  {activeResultTab === 'suggestions' && (
                    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                      {activeReport.feedback.suggestions && activeReport.feedback.suggestions.length > 0 ? (
                        <ul className="space-y-3">
                          {activeReport.feedback.suggestions.map((sug, idx) => (
                            <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2.5 bg-white/[0.01] border border-white/[0.04] rounded-xl p-3">
                              <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-purple-500 mt-1.5" />
                              <span className="leading-relaxed">{sug}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-zinc-500 italic text-center py-4">No suggestions reported.</p>
                      )}
                    </div>
                  )}

                  {/* Keywords View */}
                  {activeResultTab === 'keywords' && (
                    <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
                      {activeReport.feedback.keyword_coverage && activeReport.feedback.keyword_coverage.length > 0 ? (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Identified Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {activeReport.feedback.keyword_coverage.map((tag, idx) => (
                              <span key={idx} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-2.5 py-1 text-[11px] font-semibold">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 italic text-center py-4">No keyword density details available.</p>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-10 shadow-xl flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-zinc-500">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Awaiting Audit</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
                    Paste job details on the left and trigger the scan to audit keywords and layout metrics.
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
