"use client";

import { DraggableAgentCard } from "./DraggableAgentCard";
import { AGENTS } from "@/types";

export function AgentSidebar() {
  return (
    <div className="w-80 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        AI Agents
      </h2>
      <div className="space-y-4">
        {AGENTS.map((agent) => (
          <DraggableAgentCard key={agent.id} agent={agent} />
        ))}
      </div>
      <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        <p>💡 Drag agents to the workspace to create content blocks</p>
      </div>
    </div>
  );
}
