import { z } from 'zod';
import { getParsedCandidates, type Candidate } from '../store/resumeStore';

export const MatchResultSchema = z.object({
  candidateIndex: z.number(),
  matchPercentage: z.number(),
  explanation: z.string().default(''),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

function normalizeOllamaBase(url: string): string {
  return url.replace(/\/$/, '').replace(/\/api$/i, '');
}

type JdConstraints = {
  requiredSkills: string[];
  minYears: number | null;
  roleKeywords: string[];
};

function extractJdConstraints(jobDesc: string): JdConstraints {
  const jd = (jobDesc || '').toLowerCase();
  const normalized = jd.replace(/[^a-z0-9+\.\/#\-\s]/g, ' ');

  const knownTech = [
    'react', 'next.js', 'nextjs', 'typescript', 'javascript', 'node', 'node.js',
    'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'spring boot',
    'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'kafka', 'rabbitmq',
    'docker', 'kubernetes', 'helm', 'terraform', 'ansible', 'aws', 'azure', 'gcp',
    'graphql', 'rest', 'api', 'microservices', 'grpc', 'react native', 'vue', 'angular',
    'go', 'golang', 'ruby', 'rails', 'php', 'laravel', 'elixir', 'phoenix',
    'pandas', 'numpy', 'pytorch', 'tensorflow', 'ml', 'machine learning', 'data science', 'airflow', 'dbt', 'snowflake'
  ];

  const minYearsMatch = normalized.match(/(\d{1,2})\+?\s*(?:years?|yrs?)/);
  const minYears = minYearsMatch ? parseInt(minYearsMatch[1], 10) : null;

  // Heuristics: if JD contains sections like "must have", "requirements", "required", prefer those tokens
  const requiredBlocks = normalized
    .split(/\n+/)
    .filter(line => /must\s*have|requirements|required|qualification/.test(line));
  const requiredSkillsSet = new Set<string>();
  for (const block of requiredBlocks) {
    for (const tech of knownTech) {
      if (block.includes(tech)) requiredSkillsSet.add(tech);
    }
  }
  // If none found in explicit sections, fall back to any tech mentioned in JD
  if (requiredSkillsSet.size === 0) {
    for (const tech of knownTech) {
      if (normalized.includes(tech)) requiredSkillsSet.add(tech);
    }
  }

  const roleKeywords: string[] = [];
  if (/frontend|front-end|ui/.test(normalized)) roleKeywords.push('frontend');
  if (/backend|back-end|server/.test(normalized)) roleKeywords.push('backend');
  if (/full\s*stack/.test(normalized)) roleKeywords.push('full stack');
  if (/data|ml|machine\s*learning|ai/.test(normalized)) roleKeywords.push('data');
  if (/devops|sre|site\s*reliability/.test(normalized)) roleKeywords.push('devops');

  return {
    requiredSkills: Array.from(requiredSkillsSet),
    minYears,
    roleKeywords,
  };
}

function computeMissingRequiredSkills(requiredSkills: string[], candidate: Candidate): string[] {
  const candSkills = new Set((candidate.skills || []).map(s => s.toLowerCase().replace(/\s+/g, ' ').trim()));
  const norm = (s: string) => {
    let t = s.toLowerCase().replace(/\s+/g, ' ').trim();
    if (t === 'node') t = 'node.js';
    if (t === 'postgres') t = 'postgresql';
    return t;
  };
  const missing: string[] = [];
  for (const req of requiredSkills) {
    const r = norm(req);
    if (!candSkills.has(r)) missing.push(req);
  }
  return missing;
}

function calculateMatchPercentage(jobDesc: string, candidate: Candidate): number {
  const jd = (jobDesc || '').toLowerCase();
  const jdClean = jd.replace(/[^a-z0-9+\.\/#\-\s]/g, ' ');
  const candidateSkillsArr = Array.isArray(candidate.skills) ? candidate.skills : [];
  const candSkills = candidateSkillsArr.map(s => s.toLowerCase());
  const candRole = (candidate.last_role || '').toLowerCase();
  const candEdu = (candidate.education || '').toLowerCase();

  const constraints = extractJdConstraints(jobDesc);
  const missingRequired = computeMissingRequiredSkills(constraints.requiredSkills, candidate);

  let score = 40; // base

  // Extract years requirement from JD and candidate
  const jdYearsMatch = jdClean.match(/(\d{1,2})\+?\s*(?:years?|yrs?)/);
  const jdYears = jdYearsMatch ? parseInt(jdYearsMatch[1], 10) : null;
  const candYearsMatch = (candidate.total_experience || '').toLowerCase().match(/(\d{1,2}(?:\.\d+)?)\s*(?:years?|yrs?)/);
  const candYears = candYearsMatch ? parseFloat(candYearsMatch[1]) : null;

  if (jdYears != null && candYears != null) {
    const diff = Math.abs(candYears - jdYears);
    if (candYears >= jdYears) score += 10; // meets or exceeds
    else if (diff <= 1) score += 6; // close
    else if (diff <= 2) score += 3;
  }

  // Normalize known multi-word tech tokens
  const knownTech = [
    'react', 'next.js', 'nextjs', 'typescript', 'javascript', 'node', 'node.js',
    'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'spring boot',
    'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'kafka', 'rabbitmq',
    'docker', 'kubernetes', 'helm', 'terraform', 'ansible', 'aws', 'azure', 'gcp',
    'graphql', 'rest', 'api', 'microservices', 'grpc', 'react native', 'vue', 'angular',
    'go', 'golang', 'ruby', 'rails', 'php', 'laravel', 'elixir', 'phoenix',
    'pandas', 'numpy', 'pytorch', 'tensorflow', 'ml', 'machine learning', 'data science', 'airflow', 'dbt', 'snowflake'
  ];

  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
  const jdSkillsSet = new Set<string>();
  for (const tech of knownTech) {
    if (jdClean.includes(tech)) jdSkillsSet.add(tech);
  }

  const candSkillsSet = new Set<string>();
  for (const s of candSkills) {
    let skill = normalize(s);
    if (skill === 'node') skill = 'node.js';
    if (skill === 'postgres') skill = 'postgresql';
    candSkillsSet.add(skill);
  }

  // Skill overlap scoring
  let overlap = 0;
  jdSkillsSet.forEach((t) => {
    if (candSkillsSet.has(t)) overlap += 1;
  });
  if (overlap > 0) {
    score += Math.min(35, overlap * 8); // strong weight for direct matches
  }

  // Role alignment
  const candRoleFullStack = /(full\s*stack|fullstack|full-stack)/.test(candRole);
  const jdRoleFullStack = /(full\s*stack|fullstack|full-stack)/.test(jdClean);
  const frontendIndicators = ['react', 'next.js', 'nextjs', 'vue', 'angular'];
  const backendIndicators = ['node.js', 'django', 'spring', 'rails', 'go', 'golang', 'php', 'laravel', 'flask', 'fastapi'];
  const hasFrontendSkill = frontendIndicators.some(t => candSkillsSet.has(t));
  const hasBackendSkill = backendIndicators.some(t => candSkillsSet.has(t));

  if (/developer|engineer|architect|manager/.test(jdClean) && /developer|engineer|architect|manager/.test(candRole)) {
    score += 6;
  }
  if (/frontend|front-end|ui/.test(jdClean) && (/frontend|front-end|ui/.test(candRole) || hasFrontendSkill)) score += 6;
  if (/backend|back-end|server/.test(jdClean) && (/backend|back-end|server/.test(candRole) || hasBackendSkill)) score += 6;
  if (jdRoleFullStack && (candRoleFullStack || (hasFrontendSkill && hasBackendSkill))) score += 10;
  if (/data|ml|machine\s*learning|ai/.test(jdClean) && /data|ml|machine\s*learning|ai/.test(candRole)) score += 6;

  // Education hints
  if (/bachelor|bs|b\.tech|be/.test(jdClean) && /bachelor|b\.tech|be/.test(candEdu)) score += 3;
  if (/master|ms|mba/.test(jdClean) && /master|ms|mba/.test(candEdu)) score += 3;

  // Hard penalty for missing must-haves
  if (missingRequired.length > 0) {
    score -= Math.min(25, missingRequired.length * 8);
    score = Math.min(score, 45); // cap if missing any required
  }

  // Enforce role focus if present in JD
  if (constraints.roleKeywords.length > 0) {
    const roleMatched = (
      (constraints.roleKeywords.includes('frontend') && (/(frontend|front-end|ui)/.test(candRole) || hasFrontendSkill)) ||
      (constraints.roleKeywords.includes('backend') && (/(backend|back-end|server)/.test(candRole) || hasBackendSkill)) ||
      (constraints.roleKeywords.includes('full stack') && (candRoleFullStack || (hasFrontendSkill && hasBackendSkill))) ||
      (constraints.roleKeywords.includes('data') && /(data|ml|machine\s*learning|ai)/.test(candRole)) ||
      (constraints.roleKeywords.includes('devops') && /(devops|sre|site\s*reliability)/.test(candRole))
    );
    if (!roleMatched) {
      score -= 20;
      score = Math.min(score, 50);
    }
  }

  // Enforce years strictly when under specified threshold
  if (jdYears != null && candYears != null && candYears < jdYears - 0.5) {
    score -= 20;
    score = Math.min(score, 55);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function generateExplanation(candidate: Candidate, matchPercentage: number, jobDescription: string): string {
  const topSkills = (candidate.skills || []).slice(0, 3).join(', ');
  const pieces: string[] = [];
  if (candidate.last_role) pieces.push(`Role: ${candidate.last_role}`);
  if (topSkills) pieces.push(`Skills: ${topSkills}`);
  if (candidate.total_experience) pieces.push(`Experience: ${candidate.total_experience}`);
  if (candidate.education) pieces.push(`Education: ${candidate.education}`);
  const constraints = extractJdConstraints(jobDescription);
  const missing = computeMissingRequiredSkills(constraints.requiredSkills, candidate);
  if (missing.length) pieces.push(`Missing required: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`);
  return pieces.length ? pieces.join(' • ') : `${candidate.name || 'Candidate'} appears relevant.`;
}

async function interpretMatchesWithLLM(jobDescription: string, candidates: Candidate[]): Promise<MatchResult[] | null> {
  try {
    const system = [
      'You are an expert talent-matching engine. First extract constraints from the job description, then score each candidate.',
      'Output must be a STRICT JSON array, one per candidate in input order. Do not include markdown or commentary.',
      'For the job description, infer these constraints:',
      '- mustHaveSkills: shortlist of concrete tools/tech that are explicitly required (from sections like "Must have", "Requirements").',
      '- minYears: integer years if specified (e.g., 5 for "5+ years").',
      '- roleFocus: one of frontend/backend/full stack/data/devops if implied.',
      'Scoring rules:',
      '- If a candidate is missing any mustHaveSkills, the score should not exceed 45.',
      '- Reward exact or near-exact skill matches heavily; include recency/seniority alignment.',
      '- Reward meeting/exceeding minYears; partial credit if close (within ~1 year).',
      '- Be conservative. Rarely give >90 unless outstandingly aligned.',
      'Return fields per item:',
      '- candidateIndex: integer',
      '- matchPercentage: 0–100 integer',
      '- explanation: 1–2 sentences citing matched skills and any missing required skills explicitly.'
    ].join('\n');

    const candidatesJson = candidates.map((c, idx) => ({
      candidateIndex: idx,
      name: c.name,
      email: c.email,
      skills: c.skills,
      total_experience: c.total_experience,
      last_role: c.last_role,
      education: c.education,
    }));

    const user = [
      'Job Description:',
      jobDescription,
      '',
      'Candidates:',
      JSON.stringify(candidatesJson, null, 2),
      '',
      'Respond ONLY with a JSON array of objects: { candidateIndex, matchPercentage, explanation }.'
    ].join('\n');

    // Try OLLAMA if configured
    const ollamaBase = (process.env.NOS_OLLAMA_API_URL || process.env.OLLAMA_API_URL || '').trim();
    const ollamaModel = (process.env.NOS_MODEL_NAME_AT_ENDPOINT || process.env.MODEL_NAME_AT_ENDPOINT || '').trim();
    if (ollamaBase && ollamaModel) {
      try {
        const base = normalizeOllamaBase(ollamaBase);
        const r = await fetch(`${base}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            stream: false,
            options: { temperature: 0.1 },
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          }),
        });
        if (r.ok) {
          const data = await r.json();
          const content: string | undefined = data?.message?.content || data?.content || data?.response;
          if (content) {
            let parsed: unknown;
            try { parsed = JSON.parse(content); } 
            catch {
              const trimmed = String(content).replace(/^```json\n?|```$/g, '').trim();
              parsed = JSON.parse(trimmed);
            }
            if (Array.isArray(parsed)) {
              return parsed.map((m) => MatchResultSchema.parse({
                candidateIndex: m.candidateIndex,
                matchPercentage: m.matchPercentage,
                explanation: m.explanation ?? '',
              }));
            }
          }
        }
      } catch { /* fallthrough */ }
    }

    // Try Gemini if configured
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    if (geminiKey) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [ { role: 'user', parts: [{ text: `${system}\n\n${user}` }] } ],
            generationConfig: { temperature: 0.1, response_mime_type: 'application/json' }
          })
        });
        if (r.ok) {
          const data = await r.json();
          const content: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            let parsed: unknown;
            try { parsed = JSON.parse(content); }
            catch {
              const trimmed = String(content).replace(/^```json\n?|```$/g, '').trim();
              parsed = JSON.parse(trimmed);
            }
            if (Array.isArray(parsed)) {
              return parsed.map((m) => MatchResultSchema.parse({
                candidateIndex: m.candidateIndex,
                matchPercentage: m.matchPercentage,
                explanation: m.explanation ?? '',
              }));
            }
          }
        }
      } catch { /* fallthrough */ }
    }

    // OpenAI fallback
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [ { role: 'system', content: system }, { role: 'user', content: user } ],
        temperature: 0.1
      })
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    let parsed: unknown;
    try { parsed = JSON.parse(content); }
    catch {
      const trimmed = String(content).replace(/^```json\n?|```$/g, '').trim();
      parsed = JSON.parse(trimmed);
    }
    if (!Array.isArray(parsed)) return null;
    return parsed.map((m) => MatchResultSchema.parse({
      candidateIndex: m.candidateIndex,
      matchPercentage: m.matchPercentage,
      explanation: m.explanation ?? '',
    }));
  } catch {
    return null;
  }
}

export async function run(jobDescription: string): Promise<MatchResult[]> {
  if (!jobDescription || jobDescription.trim().length === 0) {
    throw new Error('Job description is required for matching.');
  }

  const candidates = getParsedCandidates();
  if (candidates.length === 0) {
    throw new Error('No resumes found. Please run the Resume Parser Agent first.');
  }

  // Try LLM-based structured matching first
  const llmMatches = await interpretMatchesWithLLM(jobDescription, candidates).catch(() => null);
  let matches: MatchResult[] | null = null;
  if (llmMatches && llmMatches.length === candidates.length) {
    matches = llmMatches;
  } else {
    // Fallback: heuristic scoring
    matches = candidates.map((candidate, index) => ({
      candidateIndex: index,
      matchPercentage: calculateMatchPercentage(jobDescription, candidate),
      explanation: generateExplanation(candidate, 0, jobDescription),
    }));
  }

  // Sort by match percentage (highest first)
  matches.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // Regenerate explanations with correct ordering
  matches.forEach((match, idx) => {
    match.explanation = generateExplanation(candidates[match.candidateIndex], match.matchPercentage, jobDescription);
  });

  return matches;
}

export default { run };

