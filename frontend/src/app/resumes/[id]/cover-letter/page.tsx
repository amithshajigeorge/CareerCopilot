'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useResumes } from '@/context/ResumeContext';
import { apiPost } from '@/lib/api';

interface CoverLetterResponse {
  cover_letter: string;
}

type ToneType = 'Professional' | 'Confident' | 'Humble' | 'Creative';

export default function CoverLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resumeId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const { activeResume } = useResumes();
  const router = useRouter();

  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState<ToneType>('Professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetterText, setCoverLetterText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Security redirect check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleGenerateCoverLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!jobDescription.trim()) {
      setError('Please paste a job description first.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiPost<CoverLetterResponse>(`/resumes/${resumeId}/cover-letter`, {
        job_description: jobDescription,
        tone: tone,
      });
      setCoverLetterText(response.cover_letter);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Cover letter generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadSampleJD = () => {
    setJobDescription(
      `We are looking for a Senior Software Engineer with a strong background in Python, Django, AWS Cloud, Docker container setups, and MySQL database management. Excellent styling practices and standard layout patterns are highly appreciated.`
    );
  };

  const copyToClipboard = () => {
    if (!coverLetterText) return;
    navigator.clipboard.writeText(coverLetterText);
    setSuccessMessage('Copied cover letter to clipboard!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDownloadTXT = () => {
    if (!coverLetterText) return;
    const blob = new Blob([coverLetterText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = activeResume?.file_name.replace('.pdf', '') || 'Tailored';
    link.download = `Cover_Letter_${baseName}_${tone}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setSuccessMessage('TXT download started!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDownloadPDF = () => {
    if (!coverLetterText) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Could not open print window. Please allow popups for this site.');
      return;
    }

    const name = user?.name || 'Candidate Name';
    const email = user?.email || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cover Letter - ${name}</title>
          <style>
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              color: #222;
              line-height: 1.6;
              margin: 50px;
              font-size: 14px;
              background-color: #ffffff;
            }
            .content {
              max-width: 650px;
              margin: 0 auto;
              white-space: pre-wrap;
            }
            .header-info {
              margin-bottom: 30px;
            }
            .header-info strong {
              font-size: 18px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header-info p {
              margin: 4px 0;
              color: #555;
            }
            hr {
              border: none;
              border-top: 1px solid #ddd;
              margin: 15px 0 25px 0;
            }
            @media print {
              body { margin: 20px; }
              @page { size: A4; margin: 20mm; }
            }
          </style>
        </head>
        <body>
          <div class="content">
            <div class="header-info">
              <strong>${name}</strong>
              <p>${email}</p>
            </div>
            <hr />
            <div>${coverLetterText}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#070610] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tones: { name: ToneType; desc: string }[] = [
    { name: 'Professional', desc: 'Standard, polite business tone' },
    { name: 'Confident', desc: 'Bold, highlights direct values' },
    { name: 'Humble', desc: 'Sincere, emphasizes growth' },
    { name: 'Creative', desc: 'Expressive, narrative-driven' },
  ];

  return (
    <div className="min-h-screen bg-[#070610] text-[#EDEDED] flex flex-col font-sans relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] max-w-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60vw] h-[60vw] max-w-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Page Content Block */}
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-6 md:p-8 z-10 space-y-6">
        
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
              Generating for: {activeResume.file_name}
            </span>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">Cover Letter Generator</h1>
          <p className="text-zinc-500 text-xs mt-1">Generate high-impact customized cover letters matching your credentials to vacancies</p>
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

        {/* Workspace Splitting Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Inputs Column (Left 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Tone Selector */}
            <div className="bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Select Tone</h2>
              <div className="grid grid-cols-2 gap-3">
                {tones.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setTone(t.name)}
                    className={`p-3.5 rounded-2xl border text-left transition-all focus:outline-none ${
                      tone === t.name
                        ? 'bg-purple-600/15 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                        : 'bg-white/[0.01] border-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="text-xs font-bold block">{t.name}</span>
                    <span className="text-[9px] text-zinc-500 block mt-1 leading-snug">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pasting form */}
            <div className="bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-6 space-y-4 shadow-xl">
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

              <form onSubmit={handleGenerateCoverLetter} className="space-y-4">
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={8}
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
                      <span>Writing Letter...</span>
                    </>
                  ) : (
                    <span>Generate Cover Letter</span>
                  )}
                </button>
              </form>
            </div>

          </div>

          {/* Preview Area Panel (Right 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Actions & Preview Container */}
            {coverLetterText ? (
              <div className="space-y-4 animate-fadeIn">
                
                {/* Actions Toolbar */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-3 flex items-center justify-between shadow-md">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider ml-1">Letter Preview</span>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={copyToClipboard}
                      className="py-2 px-3.5 bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] text-zinc-300 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Copy
                    </button>
                    <button
                      onClick={handleDownloadTXT}
                      className="py-2 px-3.5 bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] text-zinc-300 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      TXT
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="py-2 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      PDF
                    </button>
                  </div>
                </div>

                {/* Printable Paper Preview container */}
                <div className="bg-[#05040a] rounded-3xl p-8 border border-white/[0.04] shadow-2xl relative select-text max-h-[560px] overflow-y-auto">
                  <div className="font-serif text-sm text-zinc-300/90 leading-relaxed whitespace-pre-wrap">
                    {coverLetterText}
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-12 shadow-xl flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-zinc-500">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 012 2v6a2 2 0 01-2 2h-2m-4-12h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cover Letter Preview</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[220px]">
                    Select your preferred tone and input the job requirements on the left to write a customized letter.
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
