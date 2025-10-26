"use client";

import { DragOverlay } from "@dnd-kit/core";
import { DraggableAgentCard } from "../agents/DraggableAgentCard";
import { Agent } from "@/types";

interface CustomDragOverlayProps {
  activeAgent: Agent | null;
}

export function CustomDragOverlay({ activeAgent }: CustomDragOverlayProps) {
  return (
    <DragOverlay>
      {activeAgent ? (
        <div className="opacity-90 rotate-3 scale-105 shadow-2xl">
          <DraggableAgentCard agent={activeAgent} />
        </div>
      ) : null}
    </DragOverlay>
  );
}
