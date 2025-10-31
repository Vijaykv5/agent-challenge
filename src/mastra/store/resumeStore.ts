import { z } from 'zod';

export const CandidateSchema = z.object({
  name: z.string().default(''),
  email: z.string().default(''),
  skills: z.array(z.string()).default([]),
  total_experience: z.string().default(''),
  last_role: z.string().default(''),
  education: z.string().default(''),
});

export type Candidate = z.infer<typeof CandidateSchema>;

let parsedCandidates: Candidate[] = [];

export function setParsedCandidates(candidates: Candidate[]) {
  parsedCandidates = candidates;
}

export function getParsedCandidates(): Candidate[] {
  return parsedCandidates;
}



