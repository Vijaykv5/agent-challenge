"use client";

import { Sun, Moon } from "lucide-react";

interface NavbarProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Navbar({ isDarkMode, onToggleDarkMode }: NavbarProps) {
  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-1 flex justify-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Multi-Agent Studio
            </h1>
          </div>
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
