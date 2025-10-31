"use server";

import { assignmentGeneratorTool } from "@/mastra/tools";

export async function generateAssignment(description: string, role?: string) {
  const result = await assignmentGeneratorTool.execute({
    context: { description, role },
    runtimeContext: {} as any,
  });
  return result as { subject: string; body: string };
}


