'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useResumes } from '@/context/ResumeContext';
import { apiPost, apiGet } from '@/lib/api';

interface InterviewQuestion {
  question: string;
  type: 'technical' | 'behavioral' | 'resume-specific';
  tip: string;
  sample_answer: string;
}

interface InterviewReport {
  id: string;
  user_id: string;
  resume_id: string;
  job_description: string;
  questions: InterviewQuestion[];
  created_at: string;
}

type TabType = 'technical' | 'behavioral' | 'resume-specific';

export default function InterviewPrepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resumeId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const { activeResume } = useResumes();
  const router = useRouter();

  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeReport, setActiveReport] = useState<InterviewReport | null>(null);
  const [reportsHistory, setReportsHistory] = useState<InterviewReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('technical');
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await apiGet<InterviewReport[]>('/interviews/user');
      // Filter reports matching the current active resume
      const filtered = data.filter((r) => r.resume_id === resumeId);
      setReportsHistory(filtered);
      if (filtered.length > 0 && !activeReport) {
        setActiveReport(filtered[0]);
      }
    } catch (err) {
      console.error('Failed to load interview history:', err);
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

  const handleGenerateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!jobDescription.trim()) {
      setError('Please paste a job description first.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiPost<InterviewReport>('/interviews/generate', {
        resume_id: resumeId,
        job_description: jobDescription,
      });

      setActiveReport(response);
      setExpandedIndices({});
      setSuccessMessage('Successfully generated practice interview!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchHistory();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate interview questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadSampleJD = () => {
    setJobDescription(
      `We are seeking a Backend Software Engineer experienced in Python, FastAPI, and PostgreSQL. \n\nKey Responsibilities:\n- Design and scale RESTful APIs.\n- Work with relational databases (PostgreSQL) and migrations (Alembic).\n- Deploy services to cloud servers using Docker containerization and AWS infrastructure.\n- Implement secure JWT authentication modules.`
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage(`Copied ${label} to clipboard!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#070610] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter questions for the active tab
  const filteredQuestions = activeReport
    ? activeReport.questions.filter((q) => q.type === activeTab)
    : [];

  // Determine difficulty rating based on category and index for styling
  const getDifficulty = (type: TabType, idx: number) => {
    if (type === 'technical') {
      return idx % 2 === 0 ? { label: 'Hard', style: 'bg-rose-500/10 border-rose-500/20 text-rose-400' } : { label: 'Medium', style: 'bg-amber-500/10 border-amber-500/20 text-amber-400' };
    }
    if (type === 'resume-specific') {
      return { label: 'Medium', style: 'bg-amber-500/10 border-amber-500/20 text-amber-400' };
    }
    return idx % 2 === 0 ? { label: 'Medium', style: 'bg-amber-500/10 border-amber-500/20 text-amber-400' } : { label: 'Easy', style: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' };
  };

  return (
    <div className="min-h-screen bg-[#070610] text-[#EDEDED] flex flex-col font-sans relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] max-w-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60vw] h-[60vw] max-w-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main dashboard body */}
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-6 md:p-8 z-10 space-y-6">
        
        {/* Navigation back and header details */}
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          {activeResume && (
            <span className="text-[11px] text-zinc-500 font-semibold bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-1.5">
              Target Profile: {activeResume.file_name}
            </span>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">Mock Interview Practice</h1>
          <p className="text-zinc-500 text-xs mt-1">Practice custom technical, behavioral, and resume-based questions generated by Gemini AI</p>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3.5 flex items-start justify-between gap-2.5 animate-fadeIn">
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

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl p-3 flex items-center gap-2 animate-fadeIn fixed bottom-6 right-6 z-50 shadow-2xl">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* 3-Column Split Workplace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* History Panel (Left 3 columns) */}
          <div className="lg:col-span-3 bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-5 shadow-xl space-y-4">
            <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Practice Sessions</h2>
            
            {loadingHistory ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              </div>
            ) : reportsHistory.length > 0 ? (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {reportsHistory.map((rep) => (
                  <button
                    key={rep.id}
                    onClick={() => {
                      setActiveReport(rep);
                      setExpandedIndices({});
                    }}
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
                    <span className="text-[9px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded px-1 py-0.5 shrink-0">
                      Q ({rep.questions.length})
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic py-2">No prior interview audits found.</p>
            )}
          </div>

          {/* Generator Form Panel (Center 4 columns) */}
          <div className="lg:col-span-4 bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Target Job description</h2>
              <button
                type="button"
                onClick={loadSampleJD}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors focus:outline-none"
              >
                Use Sample JD
              </button>
            </div>

            <form onSubmit={handleGenerateInterview} className="space-y-4">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job requirements description..."
                rows={11}
                className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/50 rounded-2xl p-4 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium leading-relaxed resize-y"
                required
              />

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all focus:outline-none shadow-[0_0_20px_rgba(124,58,237,0.25)] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    <span>Analyzing & Writing Questions...</span>
                  </>
                ) : (
                  <span>Generate Interview Prep</span>
                )}
              </button>
            </form>
          </div>

          {/* Interactive practice accordion workplace (Right 5 columns) */}
          <div className="lg:col-span-5 space-y-6">
            
            {activeReport ? (
              <div className="space-y-5 animate-fadeIn">
                
                {/* Category Filtering Tabs */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-1.5 flex shadow-sm">
                  {[
                    { id: 'technical', label: 'Technical' },
                    { id: 'behavioral', label: 'Behavioral' },
                    { id: 'resume-specific', label: 'Projects' },
                  ].map((tb) => (
                    <button
                      key={tb.id}
                      onClick={() => {
                        setActiveTab(tb.id as TabType);
                        setExpandedIndices({});
                      }}
                      className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all focus:outline-none ${
                        activeTab === tb.id
                          ? 'bg-purple-600/15 text-purple-400 border border-purple-500/20'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {tb.label}
                    </button>
                  ))}
                </div>

                {/* Collapsible Questions list */}
                <div className="space-y-4">
                  {filteredQuestions.length > 0 ? (
                    filteredQuestions.map((q, idx) => {
                      const isExpanded = expandedIndices[idx];
                      const diff = getDifficulty(q.type, idx);

                      return (
                        <div
                          key={idx}
                          className={`bg-white/[0.01] border rounded-3xl overflow-hidden transition-all duration-300 ${
                            isExpanded ? 'border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.05)]' : 'border-white/[0.06] hover:border-white/[0.1]'
                          }`}
                        >
                          {/* Accordion header */}
                          <div
                            onClick={() => toggleExpand(idx)}
                            className="p-5 flex items-start gap-4 cursor-pointer select-none"
                          >
                            <div className="flex flex-col gap-1.5 shrink-0 mt-0.5">
                              <span className={`text-[8px] font-black uppercase rounded px-1.5 py-0.5 border text-center ${diff.style}`}>
                                {diff.label}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <h4 className="text-xs font-bold text-white leading-normal">
                                {q.question}
                              </h4>
                            </div>
                            
                            {/* Actions / Caret */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(q.question, 'question text');
                                }}
                                className="p-1 bg-white/[0.02] hover:bg-white/[0.06] rounded-lg border border-white/[0.06] text-zinc-500 hover:text-white transition-all focus:outline-none"
                                title="Copy question"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </button>
                              <svg
                                className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {/* Accordion body (Tips and answers) */}
                          {isExpanded && (
                            <div className="px-5 pb-5 pt-1 border-t border-white/[0.03] space-y-4 animate-slideDown">
                              
                              {/* Tip Section */}
                              <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4 text-[11px] leading-relaxed text-purple-300/95">
                                <strong className="font-bold text-purple-400 block mb-1 uppercase text-[9px] tracking-wide">
                                  Strategy Tip:
                                </strong>
                                {q.tip}
                              </div>

                              {/* Sample Answer Section */}
                              <div className="bg-[#05040a] rounded-2xl p-4 text-[11px] border border-white/[0.04] leading-relaxed text-zinc-400">
                                <strong className="font-bold text-zinc-300 block mb-1 uppercase text-[9px] tracking-wide flex items-center justify-between">
                                  <span>Suggested Response Outline:</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(q.sample_answer, 'sample answer')}
                                    className="text-[9px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase border border-purple-500/20 rounded px-1.5 py-0.5 bg-purple-500/5"
                                  >
                                    Copy Outline
                                  </button>
                                </strong>
                                <p className="whitespace-pre-wrap">{q.sample_answer}</p>
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-8 text-center text-xs text-zinc-500">
                      No questions available in this category for the loaded session description.
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-10 shadow-xl flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-zinc-500">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Awaiting Prep Generation</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[200px] mx-auto">
                    Paste the target requirements description on the left to write and practice customized interview questions.
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
