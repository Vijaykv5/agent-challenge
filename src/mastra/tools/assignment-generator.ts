import { z } from 'zod';

function normalizeOllamaBase(url: string): string {
  return url.replace(/\/$/, '').replace(/\/api$/i, '');
}

export const AssignmentOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type AssignmentOutput = z.infer<typeof AssignmentOutputSchema>;

export async function run(description: string, role?: string): Promise<AssignmentOutput> {
  if (!description || description.trim().length === 0) {
    throw new Error('Task description is required.');
  }

  const system = [
    'You are an expert hiring assistant. Generate a concise, real-world technical assignment for a candidate.',
    'Return ONLY a JSON object with exactly these keys: subject, body.',
    'Constraints:',
    '- subject MUST be: "Task assignment for {Role}" (use provided role or infer succinctly from the description).',
    '- body MUST be 70–80 words total, focused ONLY on the specified expertise; no generic fluff.',
    '- Keep scope to ~1–2 hours and include concrete, verifiable steps and deliverables.',
    '- End with a line: "Deadline: {{DEADLINE}}" (placeholder to be replaced by the app).',
    '- Plain text only. No markdown fences. No extra keys. No commentary or analysis. Output MUST be a single JSON object.',
  ].join('\n');

  const user = [
    `Description: ${description}`,
    role ? `Candidate role (optional): ${role}` : '',
    '',
    'Return ONLY valid JSON: {"subject":"...","body":"..."} with no extra text.',
  ].join('\n');

  // OLLAMA (required)
  const ollamaBase = (process.env.NOS_OLLAMA_API_URL || process.env.OLLAMA_API_URL || '').trim();
  const ollamaModel = (process.env.NOS_MODEL_NAME_AT_ENDPOINT || process.env.MODEL_NAME_AT_ENDPOINT || '').trim();
  if (!ollamaBase || !ollamaModel) {
    throw new Error('Ollama is required. Set OLLAMA_API_URL and MODEL_NAME_AT_ENDPOINT (or NOS_* equivalents).');
  }

  try {
    const base = normalizeOllamaBase(ollamaBase);
    const r = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        stream: false,
        format: 'json',
        options: { temperature: 0.2 },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!r.ok) throw new Error(`Ollama responded with HTTP ${r.status}`);
    const data = await r.json();
    const content: string | undefined = data?.message?.content || data?.content || data?.response;
    if (!content) throw new Error('Empty response from Ollama');

    let raw = String(content)
      .replace(/^```json\n?|```$/g, '')
      .replace(/<\/?[a-zA-Z][^>]*>/g, '') // strip XML-like tags such as <think>
      .replace(/^\uFEFF/, '') // strip BOM if present
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const preview = raw.slice(0, 240).replace(/\s+/g, ' ').trim();
      throw new Error(`Model output is not valid JSON. Expected {"subject","body"}. Preview: ${preview}`);
    }
    const out = AssignmentOutputSchema.parse(parsed);

    // Ensure body ~70–80 words max without changing semantics
    const words = out.body.split(/\s+/);
    if (words.length > 85) {
      out.body = words.slice(0, 85).join(' ');
      if (!/\{\{DEADLINE\}\}/.test(out.body)) {
        out.body += '\n\nDeadline: {{DEADLINE}}';
      }
    } else if (!/\{\{DEADLINE\}\}/.test(out.body)) {
      out.body += '\n\nDeadline: {{DEADLINE}}';
    }

    return out;
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Failed to generate assignment via Ollama');
  }
}

export default { run };


