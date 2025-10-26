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

  return (
    <div
      id="workspace"
      ref={setNodeRef}
      className="min-h-full bg-white relative"
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
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-medium mb-2">Welcome to Multi-Agent Studio</h3>
              <p>Drag agents from the sidebar to start creating content</p>
              <div className="mt-4 text-sm">
                <p>💡 Try dragging the Writer, Editor, or Designer agents!</p>
              </div>
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
