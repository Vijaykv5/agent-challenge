"use client";

import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence } from "framer-motion";
import { WorkspaceBlock } from "./WorkspaceBlock";
import { WorkspaceBlock as WorkspaceBlockType } from "@/types";

interface DroppableWorkspaceProps {
  children: React.ReactNode;
  blocks: WorkspaceBlockType[];
  onUpdateBlock: (id: string, updates: Partial<WorkspaceBlockType>) => void;
  onDeleteBlock: (id: string) => void;
}

export function DroppableWorkspace({ 
  children, 
  blocks,
  onUpdateBlock,
  onDeleteBlock
}: DroppableWorkspaceProps) {
  const { setNodeRef } = useDroppable({
    id: "workspace"
  });

  const showInitialBorder = blocks.length === 0;
  const requiredIds = ["resume-parser", "role-matcher", "ranking-agent"];
  const presentIds = new Set(blocks.map((b) => (b.agentId ?? b.agent?.id)) as string[]);
  const allModulesPresent = requiredIds.every((id) => presentIds.has(id));

  return (
    <div
      id="workspace"
      ref={setNodeRef}
      className="min-h-full bg-[#F9FAFB] relative"
    >
      {showInitialBorder && (
        <div className="absolute inset-4 pointer-events-none border-2 border-dashed border-gray-300 rounded-lg" />
      )}
      
      <div className="p-6 min-h-full relative">
        <AnimatePresence>
          {blocks.map((block) => (
            <div
              key={block.id}
              className="absolute z-10"
              style={{
                left: block.position.x,
                top: block.position.y,
                width: '400px'
              }}
            >
              <WorkspaceBlock
                block={block}
                onUpdate={onUpdateBlock}
                onDelete={onDeleteBlock}
              />
            </div>
          ))}
        </AnimatePresence>

        {blocks.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-600">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-medium mb-2">🎯 Welcome to HireMind — Your AI-powered recruiter assistant.</h3>
              <p>Upload resumes and a job description to find your top candidates.</p>
              <div className="mt-4 text-sm">
                <p>💡 Try dragging the Resume Parser, Role Matcher, and Ranking Agent to create your recruitment flow.</p>
              </div>
            </div>
          </div>
        )}

        {children}

        {/* <div className="pointer-events-auto absolute bottom-6 right-6">
          <button
            disabled={!allModulesPresent}
            className={`px-4 py-2 rounded-lg shadow text-white transition-colors ${
              allModulesPresent
                ? 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            🚀 Run HireMind Pipeline
          </button>
        </div> */}
      </div>
    </div>
  );
}
