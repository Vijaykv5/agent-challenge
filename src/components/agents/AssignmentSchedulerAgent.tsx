"use client";

import { useCallback, useState } from "react";
import { Loader2, Trash2, AlertTriangle, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { useResumeContext } from "@/store/resumeContext";
import { generateAssignment } from "@/app/api/actions/generateAssignment";

interface AssignmentSchedulerAgentProps {
  onRunComplete?: (summary: string) => void;
}

export default function AssignmentSchedulerAgent({ onRunComplete }: AssignmentSchedulerAgentProps) {
  const { candidates, position } = useResumeContext();
  const [isRunning, setIsRunning] = useState(false);
  const [taskDescription, setTaskDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [emailPreviews, setEmailPreviews] = useState<{ name: string; email: string; subject: string; body: string }[] | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
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
      const deadlineText = new Date(deadline).toLocaleString();
      // Generate one assignment for all candidates to keep subject/topic identical
      let sharedSubject = "Task assignment";
      let templateBody = "";
      const deriveSkillKeyword = (text: string): string => {
        const t = (text || "").toLowerCase();
        const candidates: { re: RegExp; out: string }[] = [
          { re: /(react|next\.js|nextjs)/, out: "React" },
          { re: /typescript|ts\b/, out: "TypeScript" },
          { re: /javascript|js\b/, out: "JavaScript" },
          { re: /rust\b/, out: "Rust" },
          { re: /python\b/, out: "Python" },
          { re: /java\b/, out: "Java" },
          { re: /node\.?js|nodejs|express\b/, out: "Node.js" },
          { re: /go\b|golang\b/, out: "Go" },
          { re: /sql\b|postgres|mysql|snowflake|bigquery/, out: "SQL" },
          { re: /frontend|front-end/, out: "Frontend" },
          { re: /backend|back-end/, out: "Backend" },
          { re: /full\s*stack/, out: "Full-Stack" },
          { re: /data engineer|data-engineer|etl|pipeline/, out: "Data" },
        ];
        for (const c of candidates) if (c.re.test(t)) return c.out;
        return "Software";
      };
      try {
        const res = await generateAssignment(taskDescription);
        const generatedSubject = res.subject || sharedSubject;
        const generatedBody = (res.body || "").replace(/\{\{DEADLINE\}\}/g, deadlineText);
        const skill = deriveSkillKeyword(position || taskDescription || generatedSubject);
        sharedSubject = `Task assignment for the position of ${skill} developer`;
        // Assemble professional email around dynamic task content with name placeholder
        const taskContent = generatedBody;
        templateBody = [
          'Hi {{NAME}},',
          '',
          'Thanks for showing interest.',
          '',
          'Here is your task',
          '',
          taskContent,
          '',
          'Make sure to submit before deadline.',
          '',
          'Please reach out to the hiring team if you need any assistance.',
          '',
          'Thanks',
          'Hiring Team',
        ].join('\n');
      } catch {
        const fb = buildAssignmentEmail(taskDescription, "there", deadlineText, undefined);
        const skill = deriveSkillKeyword(position || taskDescription || fb.subject);
        sharedSubject = `Task assignment for the position of ${skill} developer`;
        templateBody = fb.body.replace(/^Hi [^,]*,?/, 'Hi {{NAME}},');
      }

      const previews = candidates.map((c) => {
        const to = c.email || "";
        const name = c.name && c.name.trim().length > 0 ? c.name.trim() : "there";
        const body = (templateBody || "").replace(/\{\{NAME\}\}/g, name);
        return { name, email: to, subject: sharedSubject, body };
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
    setFromAddress("");
    setEmailPreviews(null);
    setWarning(null);
    setSendResult(null);
    onRunComplete?.("");
  }, [onRunComplete]);

  const handleSend = useCallback(async () => {
    if (!emailPreviews || emailPreviews.length === 0) return;
    const toSend = emailPreviews.filter((e) => !!e.email);
    if (toSend.length === 0) {
      setSendResult("No valid recipient emails found.");
      return;
    }
    const from = fromAddress.trim();
    const emailRegex = /[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/;
    const plainEmailRegex = new RegExp(`^${emailRegex.source}$`);
    const nameEmailRegex = new RegExp(`^.{1,100} \<${emailRegex.source}\>$`);
    // Allow blank From to fall back to RESEND_FROM on server; validate only if provided
    if (from && !(plainEmailRegex.test(from) || nameEmailRegex.test(from))) {
      setSendResult("Please enter a valid From: email@example.com or Name <email@example.com>. For testing, try: Your Name <onboarding@resend.dev>.");
      return;
    }
    setIsSending(true);
    setSendResult(null);
    try {
      const r = await fetch("/api/send-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from || undefined,
          emails: toSend.map(({ email, subject, body }) => ({ to: email, subject, body })),
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setSendResult(`Failed to send: ${data?.error || "Unknown error"}`);
        onRunComplete?.(`❌ Email send failed: ${data?.error || "Unknown error"}`);
      } else {
        setSendResult(`Sent ${data?.success || 0}, failed ${data?.failed || 0}.`);
        onRunComplete?.(`✅ Emails sent: ${data?.success || 0}. Failed: ${data?.failed || 0}.`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setSendResult(`Failed to send: ${msg}`);
      onRunComplete?.(`❌ Email send failed: ${msg}`);
    } finally {
      setIsSending(false);
    }
  }, [emailPreviews, onRunComplete]);

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

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">From</label>
        <input
          type="text"
          value={fromAddress}
          onChange={(e) => setFromAddress(e.target.value)}
          placeholder="Your Name <no-reply@yourdomain.com>"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black"
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

      {(emailPreviews && emailPreviews.length > 0) && (
        <button
          onClick={handleSend}
          disabled={isSending}
          className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending emails...</span>
            </>
          ) : (
            `Send ${emailPreviews.filter(e => /[^@\s]+@[^@\s]+\.[^@\s]+/.test(e.email)).length} email${emailPreviews.filter(e => /[^@\s]+@[^@\s]+\.[^@\s]+/.test(e.email)).length === 1 ? '' : 's'}`
          )}
        </button>
      )}

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
                        {mail.name}
                      </div>
                      <div className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">To:</span>{' '}
                        <input
                          type="email"
                          value={mail.email}
                          onChange={(e) => setEmailPreviews((prev) => {
                            if (!prev) return prev;
                            const next = [...prev];
                            next[i] = { ...next[i], email: e.target.value };
                            return next;
                          })}
                          placeholder="candidate@example.com"
                          className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm text-black"
                        />
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

      {sendResult && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800"
        >
          {sendResult}
        </motion.div>
      )}
    </div>
  );
}

function buildAssignmentEmail(taskDescription: string, candidateName: string, deadlineText: string, candidateRole?: string): { subject: string; body: string } {
  const td = (taskDescription || '').toLowerCase();
  const isReact = /(react|next\.js|nextjs)/.test(td);
  const isJs = /(javascript|js)/.test(td);
  const isFullStack = /(full\s*stack|api|backend|server)/.test(td);
  const isSql = /(\bsql\b|postgres|mysql|snowflake|bigquery|warehouse|etl|dbt)/.test(td);
  const roleForSubject = (candidateRole || (isSql ? 'SQL Developer' : (isReact || isJs ? 'Frontend Developer' : 'Candidate'))).trim();

  if (isReact || isJs) {
    const subject = `Task assignment for ${roleForSubject}`;
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

  if (isSql) {
    const subject = `Task assignment for ${roleForSubject}`;
    const body = [
      `Hi ${candidateName},`,
      '',
      'We would like you to complete a short SQL-focused assignment:',
      '',
      'Dataset:',
      '- Assume three tables:',
      '  - customers(id, name, country)',
      '  - orders(id, customer_id, order_date, total_amount)',
      '  - order_items(id, order_id, sku, quantity, unit_price)',
      '',
      'Tasks:',
      '1) Write a query to return the top 5 customers by total spend in the last 12 months.',
      '2) Write a query that returns monthly revenue for the last 12 months with months that have zero revenue shown as 0.',
      '3) Using window functions, compute each customer’s total spend and their rank within their country.',
      '4) Find SKUs whose sales dropped by >30% comparing the last full month to the prior month.',
      '',
      'Expectations:',
      '- Use ANSI SQL (Postgres dialect preferred).',
      '- Include brief notes explaining assumptions and indexes you would add.',
      '- Aim for readable, maintainable SQL with correct joins and date handling.',
      '',
      `Deadline: ${deadlineText}`,
      '',
      'Please reply with your SQL statements and brief notes in a single file or gist.',
      '',
      'Thanks,',
      'Hiring Team',
    ].join('\n');
    return { subject, body };
  }

  // Default generic assignment when no template matched
  const subject = `Task assignment for ${roleForSubject}`;
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
    'Please reach out to the hiring team if you need any assistance.',
    '',
    'Thanks,',
    'Hiring Team',
  ].join('\n');
  return { subject, body };
}


