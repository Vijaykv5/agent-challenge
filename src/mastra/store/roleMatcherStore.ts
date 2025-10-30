import { z } from 'zod';

export const MatchResultSchema = z.object({
  candidateIndex: z.number(),
  matchPercentage: z.number(),
  explanation: z.string().default(''),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

let matchResults: MatchResult[] = [];

export function setMatchResults(results: MatchResult[]) {
  matchResults = results;
}

export function getMatchResults(): MatchResult[] {
  return matchResults;
}

export function clearMatchResults() {
  matchResults = [];
}

