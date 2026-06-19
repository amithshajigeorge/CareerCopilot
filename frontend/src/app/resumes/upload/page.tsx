'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useResumes, Resume } from '@/context/ResumeContext';
import { apiMultipartPost } from '@/lib/api';

export default function ResumeUploadPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { fetchResumes } = useResumes();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [uploadedResume, setUploadedResume] = useState<Resume | null>(null);

  // Security redirect check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const validateFile = (selectedFile: File): boolean => {
    setError(null);
    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      setError('Only PDF resume uploads are supported.');
      return false;
    }
    // Limit file size to 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return false;
    }
    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const triggerFileBrowser = () => {
    fileInputRef.current?.click();
  };

  const handleUploadSubmit = async () => {
    if (!file) return;

    setUploadStatus('uploading');
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Send file to FastAPI POST /resumes/upload
      const result = await apiMultipartPost<Resume>('/resumes/upload', formData);
      setUploadedResume(result);
      setUploadStatus('success');

      // Refresh global resume context so it appears in active drop-downs
      await fetchResumes();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to upload resume. Please try again.');
      setUploadStatus('error');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#070610] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070610] text-[#EDEDED] flex font-sans relative overflow-hidden">
      {/* Glow ambient background elements */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] max-w-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60vw] h-[60vw] max-w-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main page block */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        
        {/* Navigation back helper */}
        <div className="w-full max-w-[540px] mb-6 flex justify-between items-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <span className="text-zinc-500 text-xs font-semibold">Step 1 of 2</span>
        </div>

        {/* Upload Container Card */}
        <div className="w-full max-w-[540px] bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-black text-white">Upload your Resume</h1>
            <p className="text-zinc-500 text-xs mt-1">We parse your profile details to align with targeted job listings</p>
          </div>

          {/* Validation error display */}
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

          {/* UPLOADER DOCK ZONE */}
          {uploadStatus === 'idle' && (
            <div className="space-y-6">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileBrowser}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-purple-500 bg-purple-500/5 shadow-[0_0_25px_rgba(168,85,247,0.15)] scale-[1.01]'
                    : file
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-white/[0.08] hover:border-white/[0.2] bg-white/[0.01] hover:bg-white/[0.03]'
                }`}
              >
                {/* Hidden browser picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,application/pdf"
                  className="hidden"
                />

                {/* PDF Status display */}
                {file ? (
                  <div className="text-center space-y-4">
                    <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400 inline-flex shadow-inner">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white max-w-[260px] truncate mx-auto">{file.name}</h4>
                      <p className="text-[10px] text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-zinc-400 inline-flex group-hover:text-white transition-colors">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Drag and drop your PDF resume</p>
                      <p className="text-[10px] text-zinc-500 mt-1">or click to browse local files (Max 10MB)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {file && (
                <div className="flex gap-4">
                  <button
                    onClick={() => setFile(null)}
                    className="flex-1 py-3 px-4 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] rounded-xl text-xs font-semibold transition-colors active:scale-[0.99]"
                  >
                    Clear File
                  </button>
                  <button
                    onClick={handleUploadSubmit}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all active:scale-[0.99]"
                  >
                    Upload Resume
                  </button>
                </div>
              )}
            </div>
          )}

          {/* UPLOADING PROGRESS VIEW */}
          {uploadStatus === 'uploading' && (
            <div className="py-10 flex flex-col items-center justify-center space-y-6">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-500/10 border-t-purple-500 rounded-full animate-spin" />
                <svg className="w-6 h-6 text-purple-400 absolute" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-white">Uploading file...</h4>
                <p className="text-zinc-500 text-[10px]">Analyzing parsing metadata structure and saving content</p>
              </div>
            </div>
          )}

          {/* SUCCESS STATE CONTAINER */}
          {uploadStatus === 'success' && (
            <div className="py-6 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.2)] animate-bounce">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Upload Completed!</h4>
                <p className="text-zinc-500 text-xs">
                  Your resume <span className="text-zinc-300 font-bold">{uploadedResume?.file_name}</span> has been stored.
                </p>
              </div>

              <div className="w-full pt-4 flex gap-4">
                <Link
                  href="/dashboard"
                  className="flex-1 py-3 px-4 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] rounded-xl text-xs font-semibold transition-colors text-center"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href={`/dashboard`} // Fallback to Dashboard to see results
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all text-center"
                >
                  Analyze Resume
                </Link>
              </div>
            </div>
          )}

          {/* ERROR STATUS CONTAINER */}
          {uploadStatus === 'error' && (
            <div className="py-6 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="p-4 bg-red-500/15 border border-red-500/30 text-red-400 rounded-full shadow-inner animate-pulse">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Upload Failed</h4>
                <p className="text-zinc-500 text-xs">{error || 'An error occurred during save operations.'}</p>
              </div>

              <button
                onClick={() => {
                  setFile(null);
                  setUploadStatus('idle');
                  setError(null);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl text-xs shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all active:scale-[0.99]"
              >
                Try Again
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
