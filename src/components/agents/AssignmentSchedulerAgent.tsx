"use client";

import { useCallback, useState } from "react";
import { Loader2, Trash2, AlertTriangle, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { useResumeContext } from "@/store/resumeContext";

interface AssignmentSchedulerAgentProps {
  onRunComplete?: (summary: string) => void;
}

export default function AssignmentSchedulerAgent({ onRunComplete }: AssignmentSchedulerAgentProps) {
  const { candidates } = useResumeContext();
  const [isRunning, setIsRunning] = useState(false);
  const [taskDescription, setTaskDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [emailPreviews, setEmailPreviews] = useState<{ name: string; email: string; subject: string; body: string }[] | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    if (!taskDescription.trim()) {
      onRunComplete?.("Please enter a task description.");
      return;
    }
    if (!deadline.trim()) {
      onRunComplete?.("Please set a deadline.");
      return;
    }

    if (candidates.length === 0) {
      setWarning("⚠️ No resumes found. Please run the Resume Parser Agent first.");
      setEmailPreviews(null);
      onRunComplete?.("⚠️ No resumes found. Please run the Resume Parser Agent first.");
      return;
    }

    setWarning(null);
    setIsRunning(true);
    setEmailPreviews(null);

    try {
      await new Promise((r) => setTimeout(r, 800));
      const deadlineText = new Date(deadline).toLocaleString();
      const previews = candidates.map((c) => {
        const name = c.name || "there";
        const to = c.email || "";
        const { subject, body } = buildAssignmentEmail(taskDescription, name, deadlineText);
        return { name: c.name || "Candidate", email: to, subject, body };
      });
      setEmailPreviews(previews);
      onRunComplete?.(`📧 Prepared ${previews.length} email${previews.length === 1 ? '' : 's'} for review.`);
    } catch (error) {
      onRunComplete?.(`❌ Error: ${error instanceof Error ? error.message : 'Failed to prepare emails'}`);
    } finally {
      setIsRunning(false);
    }
  }, [taskDescription, deadline, candidates, onRunComplete]);

  const clearResults = useCallback(() => {
    setTaskDescription("");
    setDeadline("");
    setEmailPreviews(null);
    setWarning(null);
    onRunComplete?.("");
  }, [onRunComplete]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Enter task details and set a deadline</div>
        {(emailPreviews || warning) && (
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
        value={taskDescription}
        onChange={(e) => setTaskDescription(e.target.value)}
        placeholder="Describe the task to assign (what to build, acceptance criteria, links, etc.)"
        rows={5}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm text-black placeholder-gray-400"
      />

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Deadline</label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black"
        />
      </div>

      <button
        onClick={handleRun}
        disabled={isRunning}
        className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors bg-gradient-to-r from-purple-400 to-purple-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>📧 Preparing emails...</span>
          </>
        ) : (
          'Run Agent'
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

      {(emailPreviews && emailPreviews.length > 0) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto"
        >
          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-lg">📧</span>
            Email Previews
          </h4>
          <div className="space-y-3">
            {emailPreviews.map((mail, i) => {
              return (
                <div key={i} className="border border-gray-100 rounded-md p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 mb-1">
                        {mail.name} {mail.email ? <span className="text-gray-500 font-normal">&lt;{mail.email}&gt;</span> : null}
                      </div>
                      <div className="text-sm text-gray-700"><span className="font-medium">Subject:</span> {mail.subject}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(`To: ${mail.email}\nSubject: ${mail.subject}\n\n${mail.body}`)}
                      className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800"
                    >
                      <Copy className="w-4 h-4" /> Copy
                    </button>
                  </div>
                  <pre className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded text-xs text-gray-800 whitespace-pre-wrap">{mail.body}</pre>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function buildAssignmentEmail(taskDescription: string, candidateName: string, deadlineText: string): { subject: string; body: string } {
  const td = (taskDescription || '').toLowerCase();
  const isReact = /(react|next\.js|nextjs)/.test(td);
  const isJs = /(javascript|js)/.test(td);
  const isFullStack = /(full\s*stack|api|backend|server)/.test(td);

  if (isReact || isJs) {
    const subject = 'Assignment: Build a small React app and mock API';
    const body = [
      `Hi ${candidateName},`,
      '',
      'We would like you to complete a short take-home assignment:',
      '',
      'Task:',
      '- Build a small React application (Create React App or Next.js is fine).',
      '- Create a simple UI page that lists items fetched from a mock API.',
      '- Include a detail view (modal or route) for an individual item.',
      '- Add basic create/update/delete (can be optimistic; persistence not required).',
      '',
      'Mock API:',
      '- Implement a small mock API in JavaScript (e.g., json-server, Next.js API routes, or a simple in-memory Express server).',
      '- Provide endpoints: GET /items, GET /items/:id, POST /items, PUT /items/:id, DELETE /items/:id.',
      '',
      'Requirements:',
      '- Use React with functional components.',
      '- Manage state cleanly (React state, Context, or a small state library).',
      '- Handle loading and error states.',
      '- Keep the UI simple but clean; any minimal styling (Tailwind or CSS) is fine.',
      '',
      'Deliverables:',
      '- A public GitHub repository containing your code.',
      '- A README with setup and run instructions.',
      '- A brief note on trade-offs/assumptions (1-2 paragraphs).',
      '',
      'Evaluation criteria:',
      '- Correctness and completeness of features.',
      '- Code structure, readability, and naming.',
      '- State management and component composition.',
      '- Error handling and edge cases.',
      '- Developer experience (clear README, easy to run).',
      '',
      `Deadline: ${deadlineText}`,
      '',
      'Please share your GitHub repository link by replying to this email. Let us know if you have any questions.',
      '',
      'Thanks,',
      'Hiring Team',
    ].join('\n');
    return { subject, body };
  }

  // Default generic assignment when no template matched
  const subject = `Task assignment: ${taskDescription.substring(0, 60)}${taskDescription.length > 60 ? '…' : ''}`;
  const body = [
    `Hi ${candidateName},`,
    '',
    'We are assigning you the following task:',
    '',
    taskDescription.trim(),
    '',
    `Deadline: ${deadlineText}`,
    '',
    'Please confirm receipt and let us know if you have any questions.',
    '',
    'Thanks,',
    'Hiring Team',
  ].join('\n');
  return { subject, body };
}


