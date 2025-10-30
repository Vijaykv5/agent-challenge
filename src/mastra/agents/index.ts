import "dotenv/config";
import { openai } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";
import { Agent } from "@mastra/core/agent";
import { resumeParserTool } from "@/mastra/tools";
import { LibSQLStore } from "@mastra/libsql";
import { z } from "zod";
import { Memory } from "@mastra/memory";

// ==================== STATE ====================
export const ResumeParserState = z.object({
  uploadedFiles: z.array(z.string()).default([]),
  lastParsedAt: z.number().default(0),
  parsedCandidatesCount: z.number().default(0),
});

// ==================== OLLAMA CONFIG ====================
const ollama = createOllama({
  baseURL: process.env.NOS_OLLAMA_API_URL || process.env.OLLAMA_API_URL,
});

const getModel = () => {
  const modelName = process.env.NOS_MODEL_NAME_AT_ENDPOINT || process.env.MODEL_NAME_AT_ENDPOINT || "qwen3:8b";
  return ollama(modelName);
  // Uncomment to use OpenAI instead:
  // return openai("gpt-4o");
};

// ==================== RESUME PARSER AGENT ====================
export const resumeParserAgent = new Agent({
  name: "Resume Parser Agent",
  tools: { resumeParserTool },
  model: getModel(),
  instructions: `You are the Resume Parser Agent. Your job is to parse uploaded resumes (PDF/DOCX/TXT) and return a strict JSON array of candidates with the following fields: name, email, skills (5-10), total_experience (e.g., "3 years"), last_role, education (highest). Always call the resumeParserTool to perform parsing and return only the structured results.`,
  description: "Parses resumes and extracts structured candidate information.",
  memory: new Memory({
    storage: new LibSQLStore({ url: "file::memory:" }),
    options: {
      workingMemory: {
        enabled: true,
        schema: ResumeParserState,
      },
    },
  }),
});
