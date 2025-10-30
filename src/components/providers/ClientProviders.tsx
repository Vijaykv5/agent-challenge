"use client";

import { ResumeProvider } from "@/store/resumeContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ResumeProvider>{children}</ResumeProvider>;
}

