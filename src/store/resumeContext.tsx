"use client";

import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface CandidateViewModel {
  name?: string;
  last_role?: string;
  skills?: string[];
  total_experience?: string;
  education?: string;
  email?: string;
}

interface ResumeContextType {
  candidates: CandidateViewModel[];
  setCandidates: (candidates: CandidateViewModel[]) => void;
  clearCandidates: () => void;
  position: string;
  setPosition: (position: string) => void;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [candidates, setCandidates] = useState<CandidateViewModel[]>([]);
  const [position, setPosition] = useState<string>("");
  const clearCandidates = () => setCandidates([]);

  return (
    <ResumeContext.Provider value={{ candidates, setCandidates, clearCandidates, position, setPosition }}>
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
