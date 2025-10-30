export interface Agent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  gradient: string;
  icon: string;
}

export interface WorkspaceBlock {
  id: string;
  agentId: string;
  agent: Agent;
  prompt: string;
  result: string;
  position: { x: number; y: number };
}

export const AGENTS: Agent[] = [
  {
    id: "resume-parser",
    name: "📄 Resume Parser",
    emoji: "📄",
    description: "Extracts skills & experience from uploaded resumes",
    color: "green",
    gradient: "from-[#10B981] to-[#10B981]",
    icon: "PenTool"
  },
  {
    id: "role-matcher",
    name: "🧩 Role Matcher", 
    emoji: "🧩",
    description: "Matches resumes with provided job description",
    color: "blue",
    gradient: "from-[#2563EB] to-[#2563EB]",
    icon: "Edit3"
  },
  {
    id: "assignment-scheduler",
    name: "📅 Assignment Scheduler",
    emoji: "📅", 
    description: "Create task + deadline and preview emails to candidates",
    color: "purple",
    gradient: "from-[#7C3AED] to-[#7C3AED]",
    icon: "Palette"
  }
];
