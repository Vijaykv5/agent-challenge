"use client";

import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { WorkspaceBlock as WorkspaceBlockType } from "@/types";
import { useCallback, useState } from "react";
import ResumeParserAgent from "@/components/agents/ResumeParserAgent";
import RoleMatcherAgent from "@/components/agents/RoleMatcherAgent";
import AssignmentSchedulerAgent from "@/components/agents/AssignmentSchedulerAgent";

interface WorkspaceBlockProps {
  block: WorkspaceBlockType;
  onUpdate: (id: string, updates: Partial<WorkspaceBlockType>) => void;
  onDelete: (id: string) => void;
}

export function WorkspaceBlock({ block, onUpdate, onDelete }: WorkspaceBlockProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [candidates, setCandidates] = useState<any[] | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: { type: 'workspace-block', block }
  });

  const getBlockColor = (color: string) => {
    switch (color) {
      case "yellow": return "bg-yellow-50 border-yellow-200";
      case "green": return "bg-green-50 border-green-200";
      case "blue": return "bg-blue-50 border-blue-200";
      default: return "bg-gray-50 border-gray-200";
    }
  };

  const getHeaderColor = (color: string) => {
    switch (color) {
      case "yellow": return "bg-gradient-to-r from-yellow-400 to-yellow-500";
      case "green": return "bg-gradient-to-r from-green-400 to-green-500";
      case "blue": return "bg-gradient-to-r from-blue-400 to-blue-500";
      default: return "bg-gradient-to-r from-gray-400 to-gray-500";
    }
  };

  const handleRun = async () => {
    if (block.agent.id === 'resume-parser') return; // handled by ResumeParserAgent

    if (!block.prompt.trim()) {
      onUpdate(block.id, { result: "Please enter a prompt before running the agent." });
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          agentId: block.agent.id, 
          prompt: block.prompt 
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to execute agent');
      const formattedResult = `${block.agent.emoji} **${block.agent.name} Result:**\n\n${data.result}`;
      onUpdate(block.id, { result: formattedResult });
    } catch (error) {
      onUpdate(block.id, { result: `❌ Error: ${error instanceof Error ? error.message : 'Failed to execute agent'}` });
    } finally {
      setIsRunning(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {}, []);
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {}, []);

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      className={`rounded-2xl border-2 ${getBlockColor(block.agent.color)} shadow-lg overflow-hidden ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <div 
        {...listeners} 
        {...attributes}
        className={`${getHeaderColor(block.agent.color)} text-white p-4 flex items-center justify-between cursor-grab active:cursor-grabbing`}
      >
        <div className="flex items-center gap-3">
          <div className="text-xl">{block.agent.emoji}</div>
          <h3 className="font-semibold">{block.agent.name}</h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(block.id);
          }}
          className="hover:bg-white/20 rounded-full p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        {block.agent.id === 'resume-parser' ? (
          <>
            <ResumeParserAgent
              onRunComplete={(summary) => {
                onUpdate(block.id, { result: summary });
              }}
            />
            {block.result && !candidates && (
              <div className="text-sm text-gray-600">{block.result}</div>
            )}
          </>
        ) : block.agent.id === 'role-matcher' ? (
          <>
            <RoleMatcherAgent
              onRunComplete={(summary) => {
                onUpdate(block.id, { result: summary });
              }}
            />
            {block.result && (
              <div className="text-sm text-gray-600">{block.result}</div>
            )}
          </>
        ) : block.agent.id === 'assignment-scheduler' ? (
          <>
            <AssignmentSchedulerAgent
              onRunComplete={(summary) => {
                onUpdate(block.id, { result: summary });
              }}
            />
            {block.result && (
              <div className="text-sm text-gray-600">{block.result}</div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt
              </label>
              <textarea
                value={block.prompt}
                onChange={(e) => onUpdate(block.id, { prompt: e.target.value })}
                placeholder="Enter your prompt here..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-400"
                rows={3}
              />
            </div>

            <button
              onClick={handleRun}
              disabled={isRunning}
              className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors ${getHeaderColor(block.agent.color)} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                'Run Agent'
              )}
            </button>
            {block.result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-white p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto"
              >
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-lg">{block.agent.emoji}</span>
                  Result:
                </h4>
                <div className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                  {block.result.split('\n').map((line, index) => {
                    const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                    if (imageMatch) {
                      const [, alt, src] = imageMatch;
                      return (
                        <div key={index} className="my-4">
                          <img 
                            src={src} 
                            alt={alt || 'Design Preview'} 
                            className="w-full h-auto rounded-lg shadow-md border border-gray-200"
                            style={{ maxHeight: '500px' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="flex items-center justify-center h-48 bg-gray-100 rounded-lg border border-gray-200">
                                    <div class="text-center">
                                      <div class="text-4xl mb-2">🎨</div>
                                      <div class="text-sm text-gray-600">Design Preview</div>
                                    </div>
                                  </div>
                                `;
                              }
                            }}
                          />
                        </div>
                      );
                    }
                    return <div key={index}>{line}</div>;
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
