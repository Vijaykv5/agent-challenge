"use server";

import { roleMatcherTool } from "@/mastra/tools";
import { setMatchResults } from "@/mastra/store/roleMatcherStore";
import type { Candidate } from "@/mastra/store/resumeStore";

export async function matchRoles(jobDescription: string, candidates: any[]) {
  // First, set the candidates in the store for the tool to use
  const { setParsedCandidates } = await import("@/mastra/store/resumeStore");
  setParsedCandidates(candidates as Candidate[]);

  const result = await roleMatcherTool.execute({
    context: { jobDescription },
    runtimeContext: {} as any,
  });
  // Persist into global role matcher store
  try {
    setMatchResults(result as any);
  } catch {}
  return result as any;
}

