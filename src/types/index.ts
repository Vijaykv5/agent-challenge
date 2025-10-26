export interface Agent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  gradient: string;
  icon: React.ReactNode;
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
    id: "writer",
    name: "Writer Agent",
    emoji: "📝",
    color: "yellow",
    gradient: "from-yellow-400 to-yellow-500",
    icon: "PenTool"
  },
  {
    id: "editor",
    name: "Editor Agent", 
    emoji: "✍️",
    color: "green",
    gradient: "from-green-400 to-green-500",
    icon: "Edit3"
  },
  {
    id: "designer",
    name: "Designer Agent",
    emoji: "🎨", 
    color: "blue",
    gradient: "from-blue-400 to-blue-500",
    icon: "Palette"
  }
];
