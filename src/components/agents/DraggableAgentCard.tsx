"use client";

import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { PenTool, Edit3, Palette } from "lucide-react";
import { Agent } from "@/types";

interface DraggableAgentCardProps {
  agent: Agent;
}

const iconMap = {
  PenTool: <PenTool className="w-5 h-5" />,
  Edit3: <Edit3 className="w-5 h-5" />,
  Palette: <Palette className="w-5 h-5" />
};

export function DraggableAgentCard({ agent }: DraggableAgentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: agent.id,
    data: { agent }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        cursor-grab active:cursor-grabbing p-4 rounded-2xl shadow-lg
        bg-linear-to-br ${agent.gradient} text-white
        hover:shadow-xl hover:scale-105 transition-all duration-200
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        select-none
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{iconMap[agent.icon as keyof typeof iconMap]}</div>
        <div>
          <div className="font-semibold text-sm">{agent.name}</div>
          <div className="text-xs opacity-90">{agent.emoji}</div>
        </div>
      </div>
    </motion.div>
  );
}
