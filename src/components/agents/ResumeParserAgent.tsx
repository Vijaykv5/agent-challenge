"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, CheckCircle2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { parseResumes } from "@/app/api/actions/parseResumes";
import { useResumeContext, type CandidateViewModel } from "@/store/resumeContext";

interface ResumeParserAgentProps {
  onRunComplete?: (summary: string) => void;
}

export default function ResumeParserAgent({ onRunComplete }: ResumeParserAgentProps) {
  const { setCandidates, clearCandidates } = useResumeContext();
  const [isRunning, setIsRunning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<{ name: string; mimeType?: string; contentBase64: string }[]>([]);
  const [candidates, setLocalCandidates] = useState<CandidateViewModel[] | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    setIsUploading(true);
    try {
      const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || '';
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const arr = Array.from(fileList);
      const converted = await Promise.all(arr.map(async (f) => ({
        name: f.name,
        mimeType: f.type,
        contentBase64: await toBase64(f),
      })));
      setFiles((prev) => [...prev, ...converted]);
      setLocalCandidates(null);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files) {
      void handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleRun = useCallback(async () => {
    if (files.length === 0) {
      onRunComplete?.('No resume files detected — please upload a resume.');
      return;
    }
    setIsRunning(true);
    setLocalCandidates(null);
    try {
      // Simulate 2–3s latency for UX consistency
      const delay = new Promise((r) => setTimeout(r, 2000 + Math.floor(Math.random() * 1000)));
      const [data] = await Promise.all([
        parseResumes(files) as Promise<CandidateViewModel[]>,
        delay,
      ]);
      const candidatesArray = Array.isArray(data) ? data : [];
      setLocalCandidates(candidatesArray);
      setCandidates(candidatesArray); // Store in global context
      onRunComplete?.(`📄 Parsed ${candidatesArray.length} resume(s).`);
    } catch (error) {
      onRunComplete?.(`❌ Error: ${error instanceof Error ? error.message : 'Failed to execute agent'}`);
    } finally {
      setIsRunning(false);
    }
  }, [files, onRunComplete]);

  const clearAll = useCallback(() => {
    setFiles([]);
    setLocalCandidates(null);
    clearCandidates(); // Clear global context
    onRunComplete?.('');
  }, [onRunComplete, clearCandidates]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Upload multiple resumes (PDF, DOCX)</div>
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
        >
          <Trash2 className="w-4 h-4" /> <span>Clear All</span>
        </button>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white text-center cursor-pointer hover:bg-gray-50"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-6 h-6 text-gray-500" />
          <div className="text-sm text-gray-700">Drag & drop resumes here or click to upload</div>
          {isUploading && (
            <div className="text-xs text-gray-500 flex items-center gap-2 mt-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
            </div>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, idx) => (
            <span key={`${f.name}-${idx}`} className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-green-600" /> {f.name}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={isRunning}
        className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors bg-gradient-to-r from-green-400 to-green-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>🔍 Extracting skills & experience...</span>
          </>
        ) : (
          'Run Agent'
        )}
      </button>

      {(candidates && candidates.length > 0) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto"
        >
          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-lg">📄</span>
            Parsed Candidates
          </h4>
          <div className="space-y-3">
            {candidates.map((c, i) => (
              <div key={i} className="border border-gray-100 rounded-md p-3">
                <div className="font-medium text-gray-800">
                  {c.name || 'Unknown'}{c.last_role ? ` — ${c.last_role}` : ''}
                </div>
                <div className="text-gray-600 text-sm">
                  {c.skills && c.skills.length > 0 && (
                    <div><span className="font-medium">Skills:</span> {c.skills.join(', ')}</div>
                  )}
                  {c.total_experience && (
                    <div><span className="font-medium">Experience:</span> {c.total_experience}</div>
                  )}
                  {c.education && (
                    <div><span className="font-medium">Education:</span> {c.education}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}


