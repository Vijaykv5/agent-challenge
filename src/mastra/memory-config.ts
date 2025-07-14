import { Memory } from "@mastra/memory";

// Create a memory instance with basic configuration
// Note: This will require a storage provider to be configured at the Mastra instance level
export const memory = new Memory();

// Export memory configuration for use in the agent
export const memoryConfig = {
  memory,
  // Additional memory settings can be added here
  enableMemory: true,
  memoryType: "conversation", // Type of memory to use
}; 