'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  raw_text: string | null;
  parsed_content: Record<string, any> | null;
  is_primary: boolean;
  created_at: string;
}

interface ResumeContextType {
  resumes: Resume[];
  activeResume: Resume | null;
  isLoadingResumes: boolean;
  fetchResumes: () => Promise<void>;
  selectResume: (id: string) => void;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export function ResumeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);

  const fetchResumes = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingResumes(true);
    try {
      const data = await apiGet<Resume[]>('/resumes');
      setResumes(data);

      // Determine active resume
      if (data.length > 0) {
        const cachedId = localStorage.getItem('active_resume_id');
        const cached = data.find((r) => r.id === cachedId);
        
        if (cached) {
          setActiveResume(cached);
        } else {
          // Default to primary or first uploaded
          const primary = data.find((r) => r.is_primary) || data[0];
          setActiveResume(primary);
          localStorage.setItem('active_resume_id', primary.id);
        }
      } else {
        setActiveResume(null);
      }
    } catch (error) {
      console.error('Failed to fetch user resumes:', error);
    } finally {
      setIsLoadingResumes(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchResumes();
    } else {
      setResumes([]);
      setActiveResume(null);
    }
  }, [isAuthenticated, fetchResumes]);

  const selectResume = (id: string) => {
    const selected = resumes.find((r) => r.id === id);
    if (selected) {
      setActiveResume(selected);
      localStorage.setItem('active_resume_id', id);
    }
  };

  return (
    <ResumeContext.Provider
      value={{
        resumes,
        activeResume,
        isLoadingResumes,
        fetchResumes,
        selectResume,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
}

export function useResumes() {
  const context = useContext(ResumeContext);
  if (context === undefined) {
    throw new Error('useResumes must be used within a ResumeProvider');
  }
  return context;
}
