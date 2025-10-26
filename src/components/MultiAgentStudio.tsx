"use client";

import { useState, useEffect } from "react";
import { DndContext, DragStartEvent, DragEndEvent, TouchSensor, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { Navbar } from "./ui/Navbar";
import { AgentSidebar } from "./agents/AgentSidebar";
import { DroppableWorkspace } from "./workspace/DroppableWorkspace";
import { CustomDragOverlay } from "./ui/DragOverlay";
import { AGENTS, WorkspaceBlock } from "../types";

export default function MultiAgentStudio() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<WorkspaceBlock[]>([]);
  const [nextId, setNextId] = useState(1);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (activeId) {
        const workspaceElement = document.getElementById('workspace');
        if (workspaceElement) {
          const rect = workspaceElement.getBoundingClientRect();
          setCursorPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [activeId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    // Check if we're dragging an existing block
    const existingBlock = blocks.find(b => b.id === active.id);
    
    if (existingBlock && over && over.id === "workspace") {
      const workspaceElement = document.getElementById('workspace');
      if (workspaceElement) {
        const rect = workspaceElement.getBoundingClientRect();
        
        const newPosition = cursorPosition ? {
          x: Math.max(20, Math.min(rect.width - 420, cursorPosition.x - 200)),
          y: Math.max(20, Math.min(rect.height - 200, cursorPosition.y - 50))
        } : existingBlock.position; // Keep current position if no cursor info
        
        updateBlock(existingBlock.id, { position: newPosition });
      }
    } else if (over && over.id === "workspace") {
      // Dropping a new agent from sidebar
      const agent = AGENTS.find(a => a.id === active.id);
      if (agent) {
        const workspaceElement = document.getElementById('workspace');
        if (workspaceElement) {
          const rect = workspaceElement.getBoundingClientRect();
          let position = { x: 100, y: 100 };
          
          if (cursorPosition) {
            // Use the tracked cursor position
            position = {
              x: Math.max(20, Math.min(rect.width - 420, cursorPosition.x - 200)),
              y: Math.max(20, Math.min(rect.height - 200, cursorPosition.y - 50))
            };
          } else {
            // Fallback to center
            position = {
              x: Math.max(20, Math.min(rect.width - 420, rect.width / 2 - 200)),
              y: Math.max(20, Math.min(rect.height - 200, rect.height / 2 - 50))
            };
          }

          const newBlock: WorkspaceBlock = {
            id: `block-${nextId}`,
            agentId: agent.id,
            agent,
            prompt: "",
            result: "",
            position
          };

          setBlocks(prev => [...prev, newBlock]);
          setNextId(prev => prev + 1);
        }
      }
    }
    setCursorPosition(null);
  };

  const updateBlock = (id: string, updates: Partial<WorkspaceBlock>) => {
    setBlocks(prev => prev.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));
  };

  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(block => block.id !== id));
  };

  const activeAgent = activeId ? AGENTS.find(a => a.id === activeId) : null;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-white'}`}>
      <Navbar 
        isDarkMode={isDarkMode} 
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
      />

      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-[calc(100vh-4rem)]">
          <AgentSidebar />

          {/* Main Workspace */}
          <div className="flex-1 relative">
            <DroppableWorkspace 
              blocks={blocks}
              onUpdateBlock={updateBlock}
              onDeleteBlock={deleteBlock}
            >
            </DroppableWorkspace>
          </div>
        </div>

        <CustomDragOverlay activeAgent={activeAgent} />
      </DndContext>
    </div>
  );
}
