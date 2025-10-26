"use client";

import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { WorkspaceBlock as WorkspaceBlockType } from "@/types";

interface WorkspaceBlockProps {
  block: WorkspaceBlockType;
  onUpdate: (id: string, updates: Partial<WorkspaceBlockType>) => void;
  onDelete: (id: string) => void;
}

export function WorkspaceBlock({ block, onUpdate, onDelete }: WorkspaceBlockProps) {
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

  const handleRun = () => {
    let mockResult = "";
    switch (block.agent.id) {
      case "writer":
        mockResult = "📝 Generated a compelling blog post about AI and creativity. The content includes engaging headlines, structured paragraphs, and a strong call-to-action.";
        break;
      case "editor":
        mockResult = "✍️ Reviewed and refined the content. Improved grammar, enhanced readability, and optimized for SEO. Added transition sentences and improved flow.";
        break;
      case "designer":
        mockResult = "🎨 Created visual mockups including color schemes, typography choices, and layout designs. Generated 3 different design variations for review.";
        break;
    }
    onUpdate(block.id, { result: mockResult });
  };

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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompt
          </label>
          <textarea
            value={block.prompt}
            onChange={(e) => onUpdate(block.id, { prompt: e.target.value })}
            placeholder="Enter your prompt here..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <button
          onClick={handleRun}
          className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors ${getHeaderColor(block.agent.color)} hover:opacity-90`}
        >
          Run Agent
        </button>
        {block.result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-white p-3 rounded-lg border border-gray-200"
          >
            <h4 className="font-medium text-gray-700 mb-2">Result:</h4>
            <p className="text-gray-600 text-sm">{block.result}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
