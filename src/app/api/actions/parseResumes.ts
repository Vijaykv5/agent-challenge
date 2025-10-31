"use server";

import { resumeParserTool } from "@/mastra/tools";
import { setParsedCandidates } from "@/mastra/store/resumeStore";

export interface UploadedResumeFile {
  name: string;
  mimeType?: string;
  contentBase64: string;
}

export async function parseResumes(files: UploadedResumeFile[]) {
  const result = await resumeParserTool.execute({
    context: { files },
    runtimeContext: {} as any,
  });
  // Persist into global resume store for downstream agents
  try {
    setParsedCandidates(result as any);
  } catch {}
  return result as any;
}


