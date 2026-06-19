'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useResumes } from '@/context/ResumeContext';
import { apiGet, apiFetch } from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ATSReportData {
  id: string;
  score: number;
  feedback: {
    keyword_coverage?: string[];
    suggestions?: string[];
  };
  created_at: string;
}

interface SkillGapReportData {
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

interface ApplicationData {
  id: string;
  user_id: string;
  role: string;
  company: string;
  location?: string;
  status: string; // Interested, Applied, Assessment, Interview, Rejected, Offer
  applied_date?: string;
  salary?: string;
  job_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { resumes, activeResume, selectResume, isLoadingResumes } = useResumes();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'ats' | 'gap' | 'applications' | 'analytics'>('overview');
  const [atsReports, setAtsReports] = useState<ATSReportData[]>([]);
  const [gapReports, setGapReports] = useState<SkillGapReportData[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Real Applications state
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationData | null>(null);

  const [formRole, setFormRole] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formStatus, setFormStatus] = useState('Interested');
  const [formAppliedDate, setFormAppliedDate] = useState('');
  const [formSalary, setFormSalary] = useState('');
  const [formJobUrl, setFormJobUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoadingApplications(true);
    try {
      const data = await apiGet<ApplicationData[]>('/applications');
      setApplications(data);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoadingApplications(false);
    }
  }, []);

  const openCreateModal = (initialStatus = 'Interested') => {
    setModalMode('create');
    setSelectedApplication(null);
    setFormRole('');
    setFormCompany('');
    setFormLocation('');
    setFormStatus(initialStatus);
    setFormAppliedDate(new Date().toISOString().split('T')[0]);
    setFormSalary('');
    setFormJobUrl('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (app: ApplicationData) => {
    setModalMode('edit');
    setSelectedApplication(app);
    setFormRole(app.role || '');
    setFormCompany(app.company || '');
    setFormLocation(app.location || '');
    setFormStatus(app.status || 'Interested');
    setFormAppliedDate(app.applied_date ? app.applied_date.split('T')[0] : '');
    setFormSalary(app.salary || '');
    setFormJobUrl(app.job_url || '');
    setFormNotes(app.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRole.trim() || !formCompany.trim()) {
      alert('Role and Company are required.');
      return;
    }

    const payload = {
      role: formRole,
      company: formCompany,
      location: formLocation || null,
      status: formStatus,
      applied_date: formAppliedDate || null,
      salary: formSalary || null,
      job_url: formJobUrl || null,
      notes: formNotes || null,
    };

    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      if (modalMode === 'create') {
        const newApp = await apiFetch<ApplicationData>('/applications', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        setApplications(prev => [newApp, ...prev]);
      } else if (modalMode === 'edit' && selectedApplication) {
        const updatedApp = await apiFetch<ApplicationData>(`/applications/${selectedApplication.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        setApplications(prev => prev.map(a => a.id === selectedApplication.id ? updatedApp : a));
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save application.');
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return;

    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      await apiFetch(`/applications/${id}`, {
        method: 'DELETE',
        headers,
      });
      setApplications(prev => prev.filter(a => a.id !== id));
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete application.');
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    setDraggingId(null);
    if (!id) return;

    const app = applications.find(a => a.id === id);
    if (!app || app.status === targetStatus) return;

    // Optimistic UI update
    const previousStatus = app.status;
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: targetStatus } : a));

    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      await apiFetch(`/applications/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: targetStatus }),
      });
    } catch (err) {
      console.error('Failed to update application status:', err);
      // Revert optimistic update on failure
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: previousStatus } : a));
    }
  };

  const fetchReports = useCallback(async (resumeId: string) => {
    setLoadingReports(true);
    try {
      const [atsData, gapData] = await Promise.all([
        apiGet<ATSReportData[]>(`/resumes/${resumeId}/ats`).catch(() => []),
        apiGet<SkillGapReportData[]>(`/resumes/${resumeId}/gap`).catch(() => []),
      ]);
      setAtsReports(atsData);
      setGapReports(gapData);
    } catch (error) {
      console.error('Failed to load reports for resume:', error);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (activeResume) {
      fetchReports(activeResume.id);
    } else {
      setAtsReports([]);
      setGapReports([]);
    }
  }, [activeResume, fetchReports]);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user, fetchApplications]);

  // Security check redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#070610] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate Metrics
  const avgAtsScore = atsReports.length > 0
    ? Math.round(atsReports.reduce((acc, curr) => acc + curr.score, 0) / atsReports.length)
    : 72; // Default mock average if empty

  const totalGapsCount = gapReports.length > 0
    ? gapReports[0].missing_skills.length
    : 4; // Default mock gaps count if empty

  return (
    <div className="min-h-screen bg-[#070610] text-[#EDEDED] flex flex-col md:flex-row font-sans">
      
      {/* MOBILE TOP BAR */}
      <div className="flex md:hidden items-center justify-between px-6 py-4 bg-white/[0.01] border-b border-white/[0.06] backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.3)]">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="font-extrabold text-base bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            CareerCopilot
          </span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 bg-white/[0.02] border border-white/[0.06] rounded-xl text-zinc-400 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          aria-label="Open navigation menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fadeIn" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Content */}
          <div className="relative flex flex-col w-full max-w-[280px] h-full bg-[#0A091A] border-r border-white/[0.08] p-6 justify-between z-10">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.3)]">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <span className="font-extrabold text-base bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    CareerCopilot
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-zinc-500 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-lg"
                  aria-label="Close navigation menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Upload Resume Button */}
              <Link
                href="/resumes/upload"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(124,58,237,0.25)] text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Upload Resume
              </Link>

              {/* Navigation Links */}
              <nav className="space-y-1.5">
                {[
                  { id: 'overview', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
                  { id: 'ats', label: 'ATS Scan History', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                  { id: 'gap', label: 'Skill Gap & Roadmap', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                  { id: 'match', label: 'Semantic Job Matcher', icon: 'M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z' },
                  { id: 'tailor', label: 'Smart Wording Tailor', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
                  { id: 'cover-letter', label: 'Cover Letter Generator', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                  { id: 'interview', label: 'Mock Interview Prep', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { id: 'applications', label: 'Applications Tracker', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
                  { id: 'analytics', label: 'Analytics Dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (item.id === 'match') {
                        if (activeResume) {
                          router.push(`/resumes/${activeResume.id}/match`);
                        } else {
                          alert('Please upload a resume first to run job matching.');
                        }
                      } else if (item.id === 'tailor') {
                        if (activeResume) {
                          router.push(`/resumes/${activeResume.id}/tailor`);
                        } else {
                          alert('Please upload a resume first to run wording tailoring.');
                        }
                      } else if (item.id === 'cover-letter') {
                        if (activeResume) {
                          router.push(`/resumes/${activeResume.id}/cover-letter`);
                        } else {
                          alert('Please upload a resume first to run cover letter generation.');
                        }
                      } else if (item.id === 'interview') {
                        if (activeResume) {
                          router.push(`/resumes/${activeResume.id}/interview`);
                        } else {
                          alert('Please upload a resume first to run mock interview prep.');
                        }
                      } else {
                        setActiveTab(item.id as any);
                      }
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                      activeTab === item.id
                        ? 'bg-purple-600/15 text-purple-400 border border-purple-500/20'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] border border-transparent'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* User Card at bottom */}
            <div className="border-t border-white/[0.06] pt-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-inner">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
                  <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/[0.02] hover:bg-red-500/10 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 rounded-xl text-xs font-medium text-zinc-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR NAVBAR (DESKTOP) */}
      <aside className="hidden md:flex w-64 bg-white/[0.01] border-r border-white/[0.06] backdrop-blur-md p-6 flex-col justify-between shrink-0">
        <div className="space-y-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.3)]">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              CareerCopilot
            </span>
          </div>

          {/* Upload Resume Button */}
          <Link
            href="/resumes/upload"
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(124,58,237,0.25)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] active:scale-[0.99] text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Upload Resume
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {[
              { id: 'overview', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
              { id: 'ats', label: 'ATS Scan History', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { id: 'gap', label: 'Skill Gap & Roadmap', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
              { id: 'match', label: 'Semantic Job Matcher', icon: 'M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z' },
              { id: 'tailor', label: 'Smart Wording Tailor', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
              { id: 'cover-letter', label: 'Cover Letter Generator', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
              { id: 'interview', label: 'Mock Interview Prep', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { id: 'applications', label: 'Applications Tracker', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
              { id: 'analytics', label: 'Analytics Dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'match') {
                    if (activeResume) {
                      router.push(`/resumes/${activeResume.id}/match`);
                    } else {
                      alert('Please upload a resume first to run job matching.');
                    }
                  } else if (item.id === 'tailor') {
                    if (activeResume) {
                      router.push(`/resumes/${activeResume.id}/tailor`);
                    } else {
                      alert('Please upload a resume first to run wording tailoring.');
                    }
                  } else if (item.id === 'cover-letter') {
                    if (activeResume) {
                      router.push(`/resumes/${activeResume.id}/cover-letter`);
                    } else {
                      alert('Please upload a resume first to run cover letter generation.');
                    }
                  } else if (item.id === 'interview') {
                    if (activeResume) {
                      router.push(`/resumes/${activeResume.id}/interview`);
                    } else {
                      alert('Please upload a resume first to run mock interview prep.');
                    }
                  } else {
                    setActiveTab(item.id as any);
                  }
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                  activeTab === item.id
                    ? 'bg-purple-600/15 text-purple-400 border border-purple-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* User Card at bottom */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-inner">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/[0.02] hover:bg-red-500/10 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 rounded-xl text-xs font-medium text-zinc-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* TOP BAR / HEADER */}
        <header className="min-h-20 border-b border-white/[0.06] px-4 md:px-8 py-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between shrink-0">
          <div>
            <h1 className="text-lg md:text-xl font-extrabold text-white">
              {activeTab === 'overview' && 'Main Overview'}
              {activeTab === 'ats' && 'ATS Analysis Scan History'}
              {activeTab === 'gap' && 'Skill Gap Analysis & Roadmap'}
              {activeTab === 'applications' && 'Job Applications Tracker'}
              {activeTab === 'analytics' && 'Analytics Overview'}
            </h1>
            <p className="text-zinc-500 text-[10px] md:text-xs mt-0.5">Welcome back, {user.name}!</p>
          </div>

          {/* Active Resume Selector */}
          <div className="flex items-center gap-2 md:gap-3 self-start sm:self-auto">
            <span className="text-zinc-500 text-[10px] md:text-xs font-medium">Active Resume:</span>
            {resumes.length > 0 ? (
              <select
                value={activeResume?.id || ''}
                onChange={(e) => selectResume(e.target.value)}
                className="bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] text-white rounded-xl py-1.5 px-2.5 md:py-2 md:px-3.5 text-[10px] md:text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-semibold"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#0D0C1D] text-white">
                    {r.file_name} {r.is_primary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[10px] md:text-xs text-purple-400 font-semibold bg-purple-500/10 px-2 py-1.5 md:px-3 md:py-1.5 border border-purple-500/20 rounded-xl">
                No Resumes Uploaded
              </span>
            )}
          </div>
        </header>

        {/* PAGE BODY */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {resumes.length === 0 && (
                <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-purple-900/20 border border-purple-500/20 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md animate-fadeIn">
                  <div className="absolute top-[-20%] right-[-10%] w-[40vw] h-[40vw] bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
                  <div className="relative z-10 max-w-2xl space-y-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 border border-purple-500/20 text-purple-400">
                      ✨ Getting Started
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                      🚀 Welcome to CareerCopilot AI!
                    </h2>
                    <p className="text-zinc-300 text-xs md:text-sm leading-relaxed">
                      Unlock your full potential! Upload your resume to unlock AI-powered ATS scan history, semantic job matching, smart wording optimization, tailored cover letters, and interactive mock interview practice questions.
                    </p>
                    <div className="pt-2">
                      <Link
                        href="/resumes/upload"
                        className="inline-flex items-center gap-2.5 py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(124,58,237,0.25)] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] active:scale-[0.99] text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload Your Resume
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              {/* KPI Metric Summary Banners */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { title: 'Uploaded Resumes', value: resumes.length, label: 'Active profiles', color: 'from-purple-500 to-indigo-500' },
                  { title: 'Average ATS Score', value: `${avgAtsScore}%`, label: 'Based on latest scans', color: 'from-blue-500 to-cyan-500' },
                  { title: 'Active Applications', value: applications.length, label: 'Ongoing job searches', color: 'from-emerald-500 to-teal-500' },
                  { title: 'Target Skill Gaps', value: totalGapsCount, label: 'Missing core skills', color: 'from-pink-500 to-rose-500' }
                ].map((kpi, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden shadow-md">
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr ${kpi.color} opacity-5 rounded-full blur-xl`} />
                    <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{kpi.title}</p>
                    <h3 className="text-3xl font-extrabold text-white mt-2 tracking-tight">{kpi.value}</h3>
                    <p className="text-zinc-400 text-[10px] mt-1">{kpi.label}</p>
                  </div>
                ))}
              </div>

              {/* Grid Content Column (Applications on Left, Gaps on Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Applications List (Left 2/3) */}
                <div className="lg:col-span-2 bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 space-y-5 shadow-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-white">Tracked Applications</h3>
                      <p className="text-zinc-500 text-xs">A live pipeline of jobs you are targeting or interviewing for</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('applications')}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                    >
                      View All
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.05] text-zinc-500 font-medium pb-2">
                          <th className="py-2.5">Role</th>
                          <th className="py-2.5">Company</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.slice(0, 4).map((app) => (
                          <tr key={app.id} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                            <td className="py-3.5 font-bold text-white">{app.role}</td>
                            <td className="py-3.5 text-zinc-400">{app.company}</td>
                            <td className="py-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                app.status === 'Offer' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                app.status === 'Interview' || app.status === 'Assessment' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                app.status === 'Applied' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                app.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              }`}>
                                {app.status}
                              </span>
                            </td>
                            <td className="py-3.5 text-zinc-500 text-right">
                              {app.applied_date ? new Date(app.applied_date).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Skill Gaps Overview Card (Right 1/3) */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 space-y-5 shadow-xl flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-white">Skill Gaps & Actions</h3>
                      <p className="text-zinc-500 text-xs">Identified competencies missing for selected job descriptions</p>
                    </div>

                    {gapReports.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {gapReports[0].missing_skills.slice(0, 6).map((skill, idx) => (
                            <span key={idx} className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-2.5 py-1 text-[10px] font-semibold">
                              {skill}
                            </span>
                          ))}
                        </div>
                        <div className="border-t border-white/[0.04] pt-3">
                          <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Next Roadmap Step</h4>
                          <p className="text-xs text-white bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 font-medium">
                            {gapReports[0].roadmap[0] || 'Create Docker environment setup'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Demo/Fallback view */}
                        <div className="flex flex-wrap gap-2">
                          {['System Architecture', 'Kubernetes', 'Golang', 'Redis'].map((s, idx) => (
                            <span key={idx} className="bg-red-500/5 border border-red-500/10 text-red-400/70 rounded-lg px-2.5 py-1 text-[10px] font-semibold">
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="border-t border-white/[0.04] pt-3">
                          <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Simulated Next Step</h4>
                          <p className="text-xs text-zinc-400 italic">
                            No Skill Gap audit history. Execute a gap audit to view learning steps.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveTab('gap')}
                    className="w-full py-2.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 rounded-xl text-xs font-semibold transition-all mt-4"
                  >
                    View Detailed Gaps & Roadmap
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATS SCANS */}
          {activeTab === 'ats' && (
            <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-8 space-y-6 shadow-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white">ATS Scans History</h3>
                  <p className="text-zinc-500 text-xs">Evaluations of your resume formatting, keywords, and density alignment</p>
                </div>
                {activeResume && (
                  <Link
                    href={`/resumes/${activeResume.id}/ats`}
                    className="py-2 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                  >
                    + Run New ATS Audit
                  </Link>
                )}
              </div>

              {loadingReports ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-3 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                </div>
              ) : atsReports.length > 0 ? (
                <div className="space-y-6">
                  {atsReports.map((report) => (
                    <div key={report.id} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className={`text-2xl font-black rounded-xl p-3 border ${
                            report.score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            report.score >= 60 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {report.score}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">Applicant Tracking score</h4>
                            <p className="text-zinc-500 text-[10px]">{new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Suggestions list */}
                      {report.feedback.suggestions && report.feedback.suggestions.length > 0 && (
                        <div className="space-y-2 border-t border-white/[0.04] pt-4">
                          <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Recommendations</h5>
                          <ul className="space-y-1.5">
                            {report.feedback.suggestions.map((sug, idx) => (
                              <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                                <span className="text-purple-400 mt-1 shrink-0">•</span>
                                <span>{sug}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-white/[0.08] rounded-2xl">
                  <svg className="w-10 h-10 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-bold text-zinc-400">No ATS reports found</p>
                  <p className="text-xs text-zinc-600 max-w-sm mx-auto mt-1">
                    Upload a resume and request an ATS compatibility analysis to see keyword density reports here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SKILL GAPS */}
          {activeTab === 'gap' && (
            <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-8 space-y-6 shadow-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white">Skill Gap Analysis & Roadmaps</h3>
                  <p className="text-zinc-500 text-xs">Personalized actions and materials curated to match job description gaps</p>
                </div>
                {activeResume && (
                  <Link
                    href={`/resumes/${activeResume.id}/gap`}
                    className="py-2 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                  >
                    + Run New Skill Gap Audit
                  </Link>
                )}
              </div>

              {loadingReports ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-3 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                </div>
              ) : gapReports.length > 0 ? (
                <div className="space-y-6">
                  {gapReports.map((report) => (
                    <div key={report.id} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-6">
                      
                      {/* Job title & date */}
                      <div className="flex justify-between items-center pb-4 border-b border-white/[0.04]">
                        <div>
                          <h4 className="text-sm font-bold text-white">Target Job Description Profile</h4>
                          <p className="text-xs text-zinc-500 mt-1 truncate max-w-lg italic">{report.job_description.slice(0, 80)}...</p>
                        </div>
                        <span className="text-[10px] text-zinc-500">{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>

                      {/* Missing skills */}
                      <div className="space-y-2">
                        <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Missing Skills</h5>
                        <div className="flex flex-wrap gap-2">
                          {report.missing_skills.map((skill, idx) => (
                            <span key={idx} className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-2.5 py-1 text-xs font-semibold">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Learning roadmap */}
                      <div className="space-y-3">
                        <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Sequential Learning Steps</h5>
                        <div className="space-y-2.5">
                          {report.roadmap.map((step, idx) => (
                            <div key={idx} className="flex gap-4 p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl text-xs">
                              <span className="w-6 h-6 shrink-0 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-bold text-purple-400">
                                {idx + 1}
                              </span>
                              <p className="text-zinc-300 font-medium self-center">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Curated Resources */}
                      {report.learning_resources && report.learning_resources.length > 0 && (
                        <div className="space-y-3">
                          <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Curated Training & Certifications</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {report.learning_resources.map((res, idx) => (
                              <a
                                key={idx}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl transition-all flex justify-between items-center group"
                              >
                                <div>
                                  <h6 className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">{res.resource_name}</h6>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="bg-purple-500/10 text-purple-400 text-[9px] px-2 py-0.5 rounded border border-purple-500/20 font-bold uppercase">{res.resource_type}</span>
                                    <span className="text-[10px] text-zinc-500">{res.skill}</span>
                                  </div>
                                </div>
                                <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-white/[0.08] rounded-2xl">
                  <svg className="w-10 h-10 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-sm font-bold text-zinc-400">No Skill Gap audits found</p>
                  <p className="text-xs text-zinc-600 max-w-sm mx-auto mt-1">
                    Execute a job description comparison to diagnose gap skills and auto-generate training roadmaps.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: APPLICATIONS - KANBAN BOARD */}
          {activeTab === 'applications' && (
            <div className="space-y-6">
              
              {/* Header section */}
              <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-xl">
                <div>
                  <h3 className="text-lg font-bold text-white">Tracked Applications</h3>
                  <p className="text-zinc-500 text-xs">Organize and monitor interviews, offers, and callbacks</p>
                </div>
                <button
                  onClick={() => openCreateModal()}
                  className="py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(124,58,237,0.2)] self-start sm:self-auto"
                >
                  + Add Application
                </button>
              </div>

              {/* Kanban Columns Grid */}
              {loadingApplications ? (
                <div className="flex justify-center py-20 bg-white/[0.01] border border-white/[0.06] rounded-3xl">
                  <div className="w-8 h-8 border-3 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 items-start">
                  {[
                    { id: 'Interested', title: 'Interested', bar: 'bg-purple-500' },
                    { id: 'Applied', title: 'Applied', bar: 'bg-blue-500' },
                    { id: 'Assessment', title: 'Assessment', bar: 'bg-amber-500' },
                    { id: 'Interview', title: 'Interview', bar: 'bg-indigo-500' },
                    { id: 'Offer', title: 'Offer', bar: 'bg-emerald-500' },
                    { id: 'Rejected', title: 'Rejected', bar: 'bg-rose-500' }
                  ].map((column) => {
                    const columnApps = applications.filter(app => app.status === column.id);
                    
                    return (
                      <div
                        key={column.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id)}
                        className="bg-white/[0.01] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-4 flex flex-col min-h-[480px] space-y-3 transition-colors hover:bg-white/[0.015]"
                      >
                        {/* Column Header */}
                        <div className="flex justify-between items-center pb-2 border-b border-white/[0.04] mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${column.bar}`} />
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">{column.title}</h4>
                          </div>
                          <span className="text-[10px] bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-full font-bold text-zinc-400">
                            {columnApps.length}
                          </span>
                        </div>

                        {/* Column Body / Cards List */}
                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[550px] pr-0.5">
                          {columnApps.length > 0 ? (
                            columnApps.map((app) => (
                              <div
                                key={app.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, app.id)}
                                onClick={() => openEditModal(app)}
                                className="bg-[#0D0B21]/60 hover:bg-[#120F2D] border border-white/[0.06] hover:border-purple-500/30 p-3.5 rounded-xl space-y-2 cursor-grab active:cursor-grabbing transition-all shadow-md group relative text-left"
                              >
                                <div>
                                  <h5 className="text-xs font-bold text-white leading-snug group-hover:text-purple-400 transition-colors truncate">
                                    {app.role}
                                  </h5>
                                  <p className="text-[11px] text-zinc-400 font-semibold truncate mt-0.5">
                                    {app.company}
                                  </p>
                                </div>

                                {app.location && (
                                  <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="truncate">{app.location}</span>
                                  </div>
                                )}

                                <div className="flex justify-between items-center pt-1 border-t border-white/[0.03] text-[9px]">
                                  <span className="text-zinc-500">
                                    {app.applied_date ? new Date(app.applied_date).toLocaleDateString() : 'No date'}
                                  </span>
                                  {app.salary && (
                                    <span className="text-emerald-400 font-bold">
                                      {app.salary}
                                    </span>
                                  )}
                                </div>
                                
                                {app.notes && (
                                  <p className="text-[10px] text-zinc-600 line-clamp-1 italic pt-0.5">
                                    {app.notes}
                                  </p>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="h-28 border border-dashed border-white/[0.04] rounded-xl flex items-center justify-center text-center p-4">
                              <p className="text-[10px] text-zinc-600 italic">No applications</p>
                            </div>
                          )}
                        </div>

                        {/* Column Add Card Button */}
                        <button
                          onClick={() => openCreateModal(column.id)}
                          className="w-full py-2 bg-white/[0.01] hover:bg-white/[0.03] border border-dashed border-white/[0.08] hover:border-white/[0.15] text-zinc-500 hover:text-white rounded-xl text-[10px] font-bold transition-all mt-2"
                        >
                          + Add Card
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ANALYTICS DASHBOARD */}
          {activeTab === 'analytics' && mounted && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Header card */}
              <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 flex justify-between items-center shadow-xl">
                <div>
                  <h3 className="text-lg font-bold text-white">Analytics Overview</h3>
                  <p className="text-zinc-500 text-xs">Visualize your job application trends, rates, and skill gap metrics</p>
                </div>
                {applications.length === 0 && (
                  <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold uppercase rounded-full px-3 py-1">
                    Demo Mode (No Active Applications)
                  </span>
                )}
              </div>

              {/* Grid 1: KPI Stats and Gauges (Interview Rate & Offer Rate) */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Stats Summary */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden shadow-md">
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Total Applications</p>
                    <h3 className="text-3xl font-extrabold text-white mt-2">{applications.length}</h3>
                    <p className="text-zinc-400 text-[9px] mt-1">In your active pipeline</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden shadow-md">
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Active Interviews</p>
                    <h3 className="text-3xl font-extrabold text-white mt-2">
                      {applications.filter(a => a.status === 'Interview').length}
                    </h3>
                    <p className="text-zinc-400 text-[9px] mt-1">Scheduled/ongoing loops</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden shadow-md">
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Job Offers</p>
                    <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">
                      {applications.filter(a => a.status === 'Offer').length}
                    </h3>
                    <p className="text-emerald-400/70 text-[9px] mt-1">Successful offers received</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden shadow-md">
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Rejections</p>
                    <h3 className="text-3xl font-extrabold text-rose-400 mt-2">
                      {applications.filter(a => a.status === 'Rejected').length}
                    </h3>
                    <p className="text-rose-400/70 text-[9px] mt-1">Opportunities archived</p>
                  </div>
                </div>

                {/* Interview Rate Gauge */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-md relative">
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2">Interview Rate</p>
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Interviewed', value: applications.length > 0 ? Math.round((applications.filter(a => a.status === 'Interview' || a.status === 'Offer').length / applications.length) * 100) : 40 },
                            { name: 'Remaining', value: applications.length > 0 ? 100 - Math.round((applications.filter(a => a.status === 'Interview' || a.status === 'Offer').length / applications.length) * 100) : 60 }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={46}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                        >
                          <Cell fill="#6366f1" />
                          <Cell fill="rgba(255,255,255,0.03)" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-lg font-black text-white">
                        {applications.length > 0 ? Math.round((applications.filter(a => a.status === 'Interview' || a.status === 'Offer').length / applications.length) * 100) : 40}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-zinc-500 mt-1">Ratio of loop invites to total leads</p>
                </div>

                {/* Offer Rate Gauge */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-md relative">
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2">Offer Rate</p>
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Offers', value: applications.length > 0 ? Math.round((applications.filter(a => a.status === 'Offer').length / applications.length) * 100) : 15 },
                            { name: 'Remaining', value: applications.length > 0 ? 100 - Math.round((applications.filter(a => a.status === 'Offer').length / applications.length) * 100) : 85 }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={46}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="rgba(255,255,255,0.03)" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-lg font-black text-white">
                        {applications.length > 0 ? Math.round((applications.filter(a => a.status === 'Offer').length / applications.length) * 100) : 15}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-zinc-500 mt-1">Ratio of signed offers to total leads</p>
                </div>

              </div>

              {/* Grid 2: Charts (Breakdown and Most Missing Skills) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Applications Pipeline status breakdown */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 shadow-xl space-y-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pipeline Stage Distribution</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Interested', count: applications.filter(a => a.status === 'Interested').length || (applications.length === 0 ? 4 : 0) },
                          { name: 'Applied', count: applications.filter(a => a.status === 'Applied').length || (applications.length === 0 ? 8 : 0) },
                          { name: 'Assessment', count: applications.filter(a => a.status === 'Assessment').length || (applications.length === 0 ? 3 : 0) },
                          { name: 'Interview', count: applications.filter(a => a.status === 'Interview').length || (applications.length === 0 ? 5 : 0) },
                          { name: 'Offer', count: applications.filter(a => a.status === 'Offer').length || (applications.length === 0 ? 2 : 0) },
                          { name: 'Rejected', count: applications.filter(a => a.status === 'Rejected').length || (applications.length === 0 ? 3 : 0) }
                        ]}
                        margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      >
                        <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} />
                        <YAxis stroke="#52525b" fontSize={10} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0A091A',
                            borderColor: 'rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '11px'
                          }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          <Cell fill="#a78bfa" />
                          <Cell fill="#60a5fa" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#6366f1" />
                          <Cell fill="#10b981" />
                          <Cell fill="#f43f5e" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Most Missing Skills Chart */}
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Most Missing Skill Gaps</h4>
                    {gapReports.length === 0 && (
                      <span className="text-[9px] bg-purple-500/10 text-purple-400 rounded-md px-1.5 py-0.5 border border-purple-500/20 font-bold uppercase">
                        Sample Data
                      </span>
                    )}
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={(() => {
                          if (gapReports.length === 0) {
                            return [
                              { name: 'Kubernetes', occurrences: 5 },
                              { name: 'System Design', occurrences: 4 },
                              { name: 'Redis', occurrences: 3 },
                              { name: 'CI/CD Pipelines', occurrences: 3 },
                              { name: 'GraphQL', occurrences: 2 },
                              { name: 'TypeScript', occurrences: 2 },
                            ];
                          }
                          const occurrences: Record<string, number> = {};
                          gapReports.forEach((r) => {
                            if (r.missing_skills) {
                              r.missing_skills.forEach((skill) => {
                                occurrences[skill] = (occurrences[skill] || 0) + 1;
                              });
                            }
                          });
                          return Object.keys(occurrences)
                            .map((k) => ({ name: k, occurrences: occurrences[k] }))
                            .sort((a, b) => b.occurrences - a.occurrences)
                            .slice(0, 6);
                        })()}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                        <XAxis type="number" stroke="#52525b" fontSize={10} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={9} tickLine={false} width={80} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0A091A',
                            borderColor: 'rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '11px'
                          }}
                        />
                        <Bar dataKey="occurrences" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={15} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* DYNAMIC DIALOG MODAL FOR ADD/EDIT */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-[#070610]/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-[#0A091A] border border-white/[0.08] max-w-lg w-full rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                
                {/* Close X */}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div>
                  <h3 className="text-base font-black text-white">
                    {modalMode === 'create' ? 'Add Job Application' : 'Application Details'}
                  </h3>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {modalMode === 'create' ? 'Track a new opportunity in your dashboard pipeline.' : 'Modify tracking details or move stage.'}
                  </p>
                </div>

                <form onSubmit={handleSaveApplication} className="space-y-4">
                  {/* Grid fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Role Title *</label>
                      <input
                        type="text"
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value)}
                        placeholder="e.g. Software Engineer"
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/50 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Company *</label>
                      <input
                        type="text"
                        value={formCompany}
                        onChange={(e) => setFormCompany(e.target.value)}
                        placeholder="e.g. Google"
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/50 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Location</label>
                      <input
                        type="text"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        placeholder="e.g. Remote / New York"
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/50 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status Column</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        className="w-full bg-[#0A091A] border border-white/[0.08] focus:border-purple-500/50 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium"
                      >
                        {['Interested', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected'].map((status) => (
                          <option key={status} value={status} className="bg-[#0C0B1B] text-white">
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Applied Date</label>
                      <input
                        type="date"
                        value={formAppliedDate}
                        onChange={(e) => setFormAppliedDate(e.target.value)}
                        className="w-full bg-[#0A091A] border border-white/[0.08] focus:border-purple-500/50 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Salary Offered/Expected</label>
                      <input
                        type="text"
                        value={formSalary}
                        onChange={(e) => setFormSalary(e.target.value)}
                        placeholder="e.g. $140,000 / year"
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/50 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Job Posting URL</label>
                    <input
                      type="url"
                      value={formJobUrl}
                      onChange={(e) => setFormJobUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/50 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Personal Notes</label>
                    <textarea
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Add key notes, follow-up timeline, interviewer details..."
                      rows={3}
                      className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-purple-500/50 rounded-xl p-3 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-medium leading-relaxed resize-none"
                    />
                  </div>

                  {/* Modal Footer Buttons */}
                  <div className="flex justify-between items-center pt-4 border-t border-white/[0.05]">
                    {modalMode === 'edit' && selectedApplication ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteApplication(selectedApplication.id)}
                        className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Delete Opportunity
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="py-2.5 px-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl text-xs text-zinc-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                      >
                        {modalMode === 'create' ? 'Save Application' : 'Save Changes'}
                      </button>
                    </div>
                  </div>

                </form>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
