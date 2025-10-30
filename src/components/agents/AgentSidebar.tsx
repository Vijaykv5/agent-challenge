"use client";

import { DraggableAgentCard } from "./DraggableAgentCard";
import { AGENTS } from "@/types";

export function AgentSidebar() {
  return (
    <div className="w-80 bg-[#0F172A] border-r border-gray-800 p-6 text-[#E5E7EB]">
      <h2 className="text-lg font-semibold mb-4">
        AI Recruiter Modules
      </h2>
      <div className="space-y-4">
        {AGENTS.map((agent) => (
          <DraggableAgentCard key={agent.id} agent={agent} />
        ))}
      </div>
      <div className="mt-8 text-sm text-[#E5E7EB]/70">
        <p>💡 Drag modules to workspace to build your AI recruiter pipeline.</p>
      </div>
    </div>
  );
}
