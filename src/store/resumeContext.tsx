"use client";

import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface CandidateViewModel {
  name?: string;
  last_role?: string;
  skills?: string[];
  total_experience?: string;
  education?: string;
}

interface ResumeContextType {
  candidates: CandidateViewModel[];
  setCandidates: (candidates: CandidateViewModel[]) => void;
  clearCandidates: () => void;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [candidates, setCandidates] = useState<CandidateViewModel[]>([]);
  const clearCandidates = () => setCandidates([]);

  return (
    <ResumeContext.Provider value={{ candidates, setCandidates, clearCandidates }}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useResumeContext() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResumeContext must be used within ResumeProvider');
  }
  return context;
}
