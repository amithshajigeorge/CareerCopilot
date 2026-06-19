'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useResumes } from '@/context/ResumeContext';
import { apiPost } from '@/lib/api';

interface SectionAdjustment {
  section_name: string;
  original_text: string;
  suggested_text: string;
  reason: string;
}

interface TailorResponse {
  tailored_summary: string;
  section_adjustments: SectionAdjustment[];
}

interface MatchResponse {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
}

export default function ResumeTailorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resumeId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const { activeResume } = useResumes();
  const router = useRouter();

  const [jobDescription, setJobDescription] = useState('');
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<TailorResponse | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Security redirect check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleTailorResume = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!jobDescription.trim()) {
      setError('Please paste a job description first.');
      return;
    }

    setIsTailoring(true);
    try {
      // 1. Fetch tailoring adjustments
      const tailorData = await apiPost<TailorResponse>(`/resumes/${resumeId}/tailor`, {
        job_description: jobDescription,
      });
      setTailorResult(tailorData);

      // 2. Fetch keyword/match details from match endpoint for completeness checking
      try {
        const matchData = await apiPost<MatchResponse>(`/resumes/${resumeId}/match`, {
          job_description: jobDescription,
        });
        setMatchResult(matchData);
      } catch (matchErr) {
        console.error('Failed to load keywords alignment details:', matchErr);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Wording tailoring failed. Please try again.');
    } finally {
      setIsTailoring(false);
    }
  };

  const loadSampleJD = () => {
    setJobDescription(
      `We are looking for a Senior Software Engineer with a strong background in Python, Django, AWS Cloud, Docker container setups, and MySQL database management. Excellent styling practices and standard layout patterns are highly appreciated.`
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage(`Copied ${label} to clipboard!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCopyAll = () => {
    if (!tailorResult) return;
    let compiled = `TAILORED CAREER SUMMARY:\n${tailorResult.tailored_summary}\n\nSECTION ADJUSTMENTS:\n`;
    tailorResult.section_adjustments.forEach((adj, idx) => {
      compiled += `\n[${idx + 1}] Section: ${adj.section_name}\nOriginal Wording: ${adj.original_text}\nSuggested Revision: ${adj.suggested_text}\nReasoning: ${adj.reason}\n`;
    });
    copyToClipboard(compiled, 'all revisions');
  };

  const handleDownloadPDF = () => {
    if (!activeResume || !tailorResult) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Could not open print window. Please allow popups for this site.');
      return;
    }

    // Try to reconstruct from parsed content if available, fallback to list layout
    let resumeHtml = '';
    const parsed = activeResume.parsed_content;
    const name = parsed?.contact_details?.name || user?.name || 'Resume Profile';
    const email = parsed?.contact_details?.email || user?.email || '';
    const phone = parsed?.contact_details?.phone || '';
    const location = parsed?.contact_details?.location || '';
    const links = parsed?.contact_details?.links || [];

    if (parsed) {
      // Reconstruct work experience with adjustments applied
      const jobs = (parsed.work_experience || []).map((job: any) => {
        const achievements = (job.achievements || []).map((ach: string) => {
          const adj = tailorResult.section_adjustments.find(
            (a) => a.section_name.toLowerCase().includes('experience') &&
              (ach.trim() === a.original_text.trim() || ach.includes(a.original_text))
          );
          return adj ? adj.suggested_text : ach;
        });
        return { ...job, achievements };
      });

      // Reconstruct projects with adjustments applied
      const projects = (parsed.projects || []).map((proj: any) => {
        const desc = proj.description || '';
        const adj = tailorResult.section_adjustments.find(
          (a) => a.section_name.toLowerCase().includes('project') &&
            (desc.trim() === a.original_text.trim() || desc.includes(a.original_text))
        );
        return { ...proj, description: adj ? adj.suggested_text : desc };
      });

      resumeHtml = `
        <div class="resume-container">
          <header class="resume-header">
            <h1>${name}</h1>
            <p class="contacts">
              ${email ? `<span>${email}</span>` : ''}
              ${phone ? `<span> | ${phone}</span>` : ''}
              ${location ? `<span> | ${location}</span>` : ''}
            </p>
            ${links.length > 0 ? `<p class="links">${links.join(' | ')}</p>` : ''}
          </header>

          <section class="section">
            <h2>Professional Summary</h2>
            <hr/>
            <p>${tailorResult.tailored_summary || 'Highly driven professional.'}</p>
          </section>

          ${jobs.length > 0 ? `
            <section class="section">
              <h2>Work Experience</h2>
              <hr/>
              ${jobs.map((job: any) => `
                <div class="item">
                  <div class="item-header">
                    <strong>${job.role}</strong>
                    <span>${job.duration || ''}</span>
                  </div>
                  <div class="item-subheader">
                    <em>${job.company}</em>
                  </div>
                  <ul>
                    ${job.achievements.map((ach: string) => `<li>${ach}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </section>
          ` : ''}

          ${projects.length > 0 ? `
            <section class="section">
              <h2>Key Projects</h2>
              <hr/>
              ${projects.map((proj: any) => `
                <div class="item">
                  <div class="item-header">
                    <strong>${proj.title}</strong>
                    <span>${proj.technologies ? proj.technologies.join(', ') : ''}</span>
                  </div>
                  <p>${proj.description}</p>
                </div>
              `).join('')}
            </section>
          ` : ''}

          ${parsed.skills && parsed.skills.length > 0 ? `
            <section class="section">
              <h2>Skills</h2>
              <hr/>
              <p>${parsed.skills.join(', ')}</p>
            </section>
          ` : ''}

          ${parsed.education && parsed.education.length > 0 ? `
            <section class="section">
              <h2>Education</h2>
              <hr/>
              ${parsed.education.map((edu: any) => `
                <div class="item">
                  <div class="item-header">
                    <strong>${edu.school}</strong>
                    <span>${edu.graduation_year || ''}</span>
                  </div>
                  <p>${edu.degree}</p>
                </div>
              `).join('')}
            </section>
          ` : ''}
        </div>
      `;
    } else {
      // Fallback Layout when parsed structure is unavailable
      resumeHtml = `
        <div class="resume-container">
          <header class="resume-header">
            <h1>${name}</h1>
            <p class="contacts">${email}</p>
          </header>

          <section class="section">
            <h2>Tailored Profile Summary</h2>
            <hr/>
            <p>${tailorResult.tailored_summary}</p>
          </section>

          <section class="section">
            <h2>Wording Adjustments</h2>
            <hr/>
            ${tailorResult.section_adjustments.map((adj, idx) => `
              <div class="item" style="margin-bottom: 20px;">
                <strong>Adjustment ${idx + 1} (${adj.section_name})</strong>
                <p style="margin: 5px 0; color: #555;"><em>Original:</em> ${adj.original_text}</p>
                <p style="margin: 5px 0; font-weight: bold; color: #111;"><em>Revision:</em> ${adj.suggested_text}</p>
              </div>
            `).join('')}
          </section>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tailored Resume - ${name}</title>
          <style>
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              color: #222;
              line-height: 1.5;
              margin: 40px;
              font-size: 14px;
              background-color: #ffffff;
            }
            .resume-container {
              max-width: 800px;
              margin: 0 auto;
            }
            .resume-header {
              text-align: center;
              margin-bottom: 25px;
            }
            .resume-header h1 {
              margin: 0 0 5px 0;
              font-size: 28px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .contacts, .links {
              margin: 5px 0;
              color: #555;
              font-size: 12px;
            }
            .section {
              margin-bottom: 20px;
            }
            .section h2 {
              margin: 0 0 5px 0;
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              color: #333;
            }
            .section hr {
              border: none;
              border-top: 1px solid #ccc;
              margin: 0 0 10px 0;
            }
            .item {
              margin-bottom: 12px;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
            }
            .item-subheader {
              margin-top: 2px;
              font-size: 13px;
              color: #444;
            }
            ul {
              margin: 5px 0 0 0;
              padding-left: 20px;
            }
            li {
              margin-bottom: 4px;
            }
            @media print {
              body { margin: 20px; }
              @page { size: A4; margin: 20mm; }
            }
          </style>
        </head>
        <body>
          ${resumeHtml}
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

  // Radial calculation details
  const score = matchResult ? Math.round(matchResult.match_score) : 0;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let scoreColor = 'stroke-rose-500 text-rose-400';
  let scoreBg = 'bg-rose-500/10 border-rose-500/20';
  let scoreBadge = 'Low Alignment';

  if (score >= 80) {
    scoreColor = 'stroke-emerald-500 text-emerald-400';
    scoreBg = 'bg-emerald-500/10 border-emerald-500/20';
    scoreBadge = 'Highly Compatible';
  } else if (score >= 60) {
    scoreColor = 'stroke-amber-500 text-amber-400';
    scoreBg = 'bg-amber-500/10 border-amber-500/20';
    scoreBadge = 'Moderate Compatibility';
  }

  return (
    <div className="min-h-screen bg-[#070610] text-[#EDEDED] flex flex-col font-sans relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] max-w-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60vw] h-[60vw] max-w-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-6 md:p-8 z-10 space-y-6">
        
        {/* Navigation back and file tag */}
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          {activeResume && (
            <span className="text-[11px] text-zinc-500 font-semibold bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-1.5">
              Tailoring: {activeResume.file_name}
            </span>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">Smart Resume Tailoring</h1>
          <p className="text-zinc-500 text-xs mt-1">Optimize bullet points and resume highlights side-by-side to match specific vacancies</p>
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

        {/* Form and Input Area (Only show if result is not loaded) */}
        {!tailorResult && (
          <div className="max-w-xl w-full mx-auto bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Paste Job Description</h2>
              <button
                type="button"
                onClick={loadSampleJD}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors focus:outline-none"
              >
                Use Sample JD
              </button>
            </div>

            <form onSubmit={handleTailorResume} className="space-y-4">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description here..."
                rows={10}
                className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/50 rounded-2xl p-4 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium leading-relaxed resize-y"
                required
              />

              <button
                type="submit"
                disabled={isTailoring}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all focus:outline-none shadow-[0_0_20px_rgba(124,58,237,0.25)] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isTailoring ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    <span>Analyzing & Rephrasing Resume...</span>
                  </>
                ) : (
                  <span>Optimize & Tailor Resume</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tailoring workspace layout */}
        {tailorResult && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Top Row: General Statistics and Missing Keywords alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Score Circular Dial Widget */}
              <div className="bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-5 shadow-xl flex items-center gap-6">
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-24 h-24 -rotate-90">
                    <circle cx="48" cy="48" r="38" className="stroke-white/[0.04]" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="38" className={`transition-all duration-1000 ease-out ${scoreColor}`} strokeWidth="8" strokeDasharray="238.76" strokeDashoffset={238.76 - (score / 100) * 238.76} fill="transparent" />
                  </svg>
                  <span className="absolute text-lg font-black text-white">{score}%</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Initial Job Alignment</h3>
                  <p className="text-sm font-black text-white mt-0.5">{scoreBadge}</p>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">We analyzed your resume to identify missing keywords and formatting improvements.</p>
                </div>
              </div>

              {/* Keyword alerts panel */}
              <div className="lg:col-span-2 bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-5 shadow-xl space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Keyword Optimization Summary
                </h3>
                
                {matchResult ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      To bridge your skill delta, Gemini has integrated the following keywords into your resume's experience and summary section:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {matchResult.missing_skills.length > 0 ? (
                        matchResult.missing_skills.slice(0, 12).map((skill, idx) => (
                          <span key={idx} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold">All keywords are fully synchronized. Excellent alignment.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No missing keywords retrieved. Section adjustments applied organically.</p>
                )}
              </div>

            </div>

            {/* Actions Bar */}
            <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <span className="text-xs text-zinc-400">
                You can copy adjustments individually or download the fully re-tailored resume draft.
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleCopyAll}
                  className="flex-1 sm:flex-none py-2.5 px-4 bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] text-zinc-300 font-semibold rounded-xl text-xs transition-all text-center flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy All Revisions
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex-1 sm:flex-none py-2.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs transition-all text-center flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download as PDF
                </button>
              </div>
            </div>

            {/* Split Panel Workplace */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Left Panel: Original Resume */}
              <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Original Resume
                </h3>
                <div className="bg-[#05040a] rounded-2xl p-5 text-xs text-zinc-400 font-mono leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap border border-white/[0.03] select-none">
                  {activeResume?.raw_text || 'No raw resume text available.'}
                </div>
              </div>

              {/* Right Panel: Tailored Resume revisions */}
              <div className="space-y-6">
                
                {/* Tailored Career Summary Section */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Suggested Career Summary</h3>
                    <button
                      onClick={() => copyToClipboard(tailorResult.tailored_summary, 'summary')}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-bold transition-colors"
                    >
                      Copy Summary
                    </button>
                  </div>
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 text-emerald-300/90 text-xs rounded-2xl leading-relaxed italic">
                    "{tailorResult.tailored_summary}"
                  </div>
                </div>

                {/* Section revisions list */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-2">Bullet Point Adjustments ({tailorResult.section_adjustments.length})</h3>
                  
                  {tailorResult.section_adjustments.length > 0 ? (
                    tailorResult.section_adjustments.map((adj, idx) => (
                      <div key={idx} className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 shadow-xl space-y-4 hover:border-white/[0.1] transition-all">
                        
                        {/* Adjustment Header */}
                        <div className="flex justify-between items-center border-b border-white/[0.04] pb-2.5">
                          <span className="text-[10px] font-black uppercase text-purple-400 px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/20">
                            {adj.section_name || 'Experience Section'}
                          </span>
                          <button
                            onClick={() => copyToClipboard(adj.suggested_text, 'suggested edit')}
                            className="text-[10px] text-zinc-500 hover:text-white transition-colors font-bold"
                          >
                            Copy Suggestion
                          </button>
                        </div>

                        {/* Diff blocks representation */}
                        <div className="space-y-2.5 text-[11px]">
                          {/* Original Wording Block */}
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex gap-2">
                            <span className="font-bold shrink-0 text-xs">-</span>
                            <p className="leading-relaxed"><strong className="font-bold uppercase text-[9px] mr-1 block text-rose-500">Original:</strong>{adj.original_text}</p>
                          </div>

                          {/* Suggested Revision Block */}
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex gap-2">
                            <span className="font-bold shrink-0 text-xs">+</span>
                            <p className="leading-relaxed"><strong className="font-bold uppercase text-[9px] mr-1 block text-emerald-500">Suggested Adjustment:</strong>{adj.suggested_text}</p>
                          </div>
                        </div>

                        {/* Reason / Advice block */}
                        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-[10px] text-zinc-500 leading-relaxed">
                          <strong className="text-zinc-400 font-bold block mb-1">Tailoring Justification:</strong>
                          {adj.reason}
                        </div>

                      </div>
                    ))
                  ) : (
                    <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-8 text-center text-xs text-zinc-500">
                      No specific modifications required. Your details are well aligned with the job posting requirements!
                    </div>
                  )}

                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
