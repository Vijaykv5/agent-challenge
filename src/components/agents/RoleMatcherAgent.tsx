"use client";

import { useCallback, useState } from "react";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { matchRoles } from "@/app/api/actions/matchRoles";
import { useResumeContext, type CandidateViewModel } from "@/store/resumeContext";
import type { MatchResult } from "@/mastra/store/roleMatcherStore";

interface RoleMatcherAgentProps {
  onRunComplete?: (summary: string) => void;
}

export default function RoleMatcherAgent({ onRunComplete }: RoleMatcherAgentProps) {
  const { candidates, setPosition } = useResumeContext();
  const [isRunning, setIsRunning] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    if (!jobDescription.trim()) {
      onRunComplete?.("Please enter a job description.");
      return;
    }
    
    // Check if there are parsed resumes
    if (candidates.length === 0) {
      setWarning("⚠️ No resumes found. Please run the Resume Parser Agent first.");
      setMatchResults(null);
      onRunComplete?.("⚠️ No resumes found. Please run the Resume Parser Agent first.");
      return;
    }
    
    setWarning(null);
    setIsRunning(true);
    setMatchResults(null);
    
    try {
      // Persist the intended position/role from the job description for downstream agents
      setPosition(jobDescription.trim());
      // Simulate 2–3s latency for UX consistency
      const delay = new Promise((r) => setTimeout(r, 2000 + Math.floor(Math.random() * 1000)));
      const [data] = await Promise.all([
        matchRoles(jobDescription, candidates) as Promise<MatchResult[]>,
        delay,
      ]);
      setMatchResults(Array.isArray(data) ? data : []);
      onRunComplete?.(`🧩 Matched ${Array.isArray(data) ? data.length : 0} candidates.`);
    } catch (error) {
      onRunComplete?.(`❌ Error: ${error instanceof Error ? error.message : 'Failed to execute agent'}`);
    } finally {
      setIsRunning(false);
    }
  }, [jobDescription, candidates, onRunComplete]);

  const clearResults = useCallback(() => {
    setJobDescription("");
    setMatchResults(null);
    setWarning(null);
    onRunComplete?.("");
  }, [onRunComplete]);

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-blue-500";
    return "bg-yellow-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Enter job description or skill query</div>
        {(matchResults || warning) && (
          <button
            type="button"
            onClick={clearResults}
            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
          >
            <Trash2 className="w-4 h-4" /> <span>Clear</span>
          </button>
        )}
      </div>

      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="e.g., Frontend Developer with React experience..."
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm text-black placeholder-gray-400"
      />

      <button
        onClick={handleRun}
        disabled={isRunning}
        className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors bg-gradient-to-r from-blue-400 to-blue-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>🧩 Running match...</span>
          </>
        ) : (
          'Run Match'
        )}
      </button>

      {warning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">{warning}</div>
        </motion.div>
      )}

      {(matchResults && matchResults.length > 0) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto"
        >
          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-lg">🧩</span>
            Match Results
          </h4>
          <div className="space-y-3">
            {matchResults.map((match, i) => {
              const candidate = candidates[match.candidateIndex];
              return (
                <div key={i} className="border border-gray-100 rounded-md p-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 mb-1">
                      {candidate?.name || `Candidate #${match.candidateIndex + 1}`}
                      {candidate?.last_role ? ` — ${candidate.last_role}` : ''}
                    </div>
                    <div className="text-gray-600 text-sm mb-2">{match.explanation}</div>
                    {candidate && (
                      <div className="text-xs text-gray-500">
                        {candidate.skills && candidate.skills.length > 0 && (
                          <div><span className="font-medium">Skills:</span> {candidate.skills.join(', ')}</div>
                        )}
                        {candidate.total_experience && (
                          <div><span className="font-medium">Experience:</span> {candidate.total_experience}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-16 h-16 rounded-full ${getMatchColor(match.matchPercentage)} flex items-center justify-center text-white font-bold text-sm`}>
                      {Math.round(match.matchPercentage)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

