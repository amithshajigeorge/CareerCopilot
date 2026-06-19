'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useResumes } from '@/context/ResumeContext';
import { apiPost, apiGet } from '@/lib/api';

interface SkillGapReport {
  id: string;
  job_description: string;
  missing_skills: string[];
  roadmap: string[];
  learning_resources: {
    skill: string;
    resource_name: string;
    resource_type: string;
    url: string;
  }[];
  created_at: string;
}

export default function SkillGapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resumeId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const { activeResume } = useResumes();
  const router = useRouter();

  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeReport, setActiveReport] = useState<SkillGapReport | null>(null);
  const [reportsHistory, setReportsHistory] = useState<SkillGapReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await apiGet<SkillGapReport[]>(`/resumes/${resumeId}/gap`);
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

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!jobDescription.trim()) {
      setError('Please paste a job description first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await apiPost<{
        missing_skills: string[];
        roadmap: string[];
        learning_resources: {
          skill: string;
          resource_name: string;
          resource_type: string;
          url: string;
        }[];
      }>(`/resumes/${resumeId}/gap`, {
        job_description: jobDescription,
      });

      const newReport: SkillGapReport = {
        id: Math.random().toString(), // local fallback ID
        job_description: jobDescription,
        missing_skills: response.missing_skills,
        roadmap: response.roadmap,
        learning_resources: response.learning_resources,
        created_at: new Date().toISOString(),
      };

      setActiveReport(newReport);
      // Refresh scan list history
      await fetchHistory();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Skill Gap Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
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
          <h1 className="text-2xl font-black text-white">Skill Gap Analyzer & Learning Roadmap</h1>
          <p className="text-zinc-500 text-xs mt-1">Identify missing skills from your resume and generate customized structured learning steps</p>
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
            <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Audit History</h2>
            
            {loadingHistory ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              </div>
            ) : reportsHistory.length > 0 ? (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
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
                      <span className="text-xs truncate block mt-0.5 italic text-zinc-300">
                        {rep.job_description.slice(0, 30)}...
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-extrabold bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-md px-1.5 py-0.5">
                      Gaps ({rep.missing_skills.length})
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic py-2">No prior gap audits found.</p>
            )}
          </div>

          {/* Pasting board (Center 4 cols) */}
          <div className="lg:col-span-4 bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Target Job Description</h2>
              <button
                onClick={loadSampleJD}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors focus:outline-none"
              >
                Use Sample JD
              </button>
            </div>

            <form onSubmit={handleRunAnalysis} className="space-y-4">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job details here..."
                rows={12}
                className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/50 rounded-2xl p-4 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium leading-relaxed resize-y"
                required
              />

              <button
                type="submit"
                disabled={isAnalyzing}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all focus:outline-none shadow-[0_0_20px_rgba(124,58,237,0.25)] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    <span>Analyzing Competencies...</span>
                  </>
                ) : (
                  <span>Run Skill Gap Analysis</span>
                )}
              </button>
            </form>
          </div>

          {/* Results Details Column (Right 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {activeReport ? (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Missing Skills Section */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 shadow-xl space-y-3">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Missing Skill Gaps ({activeReport.missing_skills.length})
                  </h3>
                  {activeReport.missing_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeReport.missing_skills.map((skill, idx) => (
                        <span key={idx} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg px-2.5 py-1 text-[11px] font-semibold">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-500 font-semibold">All target skills exist in your resume context!</p>
                  )}
                </div>

                {/* Structured Roadmap Section */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Sequential Roadmap Actions
                  </h3>
                  {activeReport.roadmap && activeReport.roadmap.length > 0 ? (
                    <div className="space-y-3.5">
                      {activeReport.roadmap.map((step, idx) => (
                        <div key={idx} className="flex gap-4 p-3 bg-white/[0.01] border border-white/[0.04] rounded-2xl text-xs hover:border-purple-500/20 transition-all">
                          <span className="w-6 h-6 shrink-0 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-black text-purple-400">
                            {idx + 1}
                          </span>
                          <p className="text-zinc-300 font-semibold self-center leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic text-center py-4">No roadmap steps generated.</p>
                  )}
                </div>

                {/* Learning Resources Section */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Curated Resources & Certifications
                  </h3>
                  {activeReport.learning_resources && activeReport.learning_resources.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {activeReport.learning_resources.map((res, idx) => (
                        <a
                          key={idx}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl transition-all flex justify-between items-center group"
                        >
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors leading-tight">
                              {res.resource_name}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className="bg-purple-500/10 text-purple-400 text-[9px] px-2 py-0.5 rounded border border-purple-500/20 font-bold uppercase">
                                {res.resource_type}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-semibold">{res.skill}</span>
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic text-center py-4">No curated resources available.</p>
                  )}
                </div>

              </div>
            ) : (
              <div className="bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-10 shadow-xl flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-zinc-500">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Awaiting Analysis</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
                    Paste job details on the left and trigger the scan to evaluate missing skills and map learning resources.
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
