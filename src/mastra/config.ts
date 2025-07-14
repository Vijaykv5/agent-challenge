import dotenv from "dotenv";
import { createOllama } from "ollama-ai-provider";

// Load environment variables once at the beginning
dotenv.config();

// Debug: Print all environment variables that might affect the baseURL
console.log("Environment variables:");
console.log("API_BASE_URL:", process.env.API_BASE_URL);
console.log("BASE_URL:", process.env.BASE_URL);
console.log("OLLAMA_HOST:", process.env.OLLAMA_HOST);
console.log("OLLAMA_ORIGINS:", process.env.OLLAMA_ORIGINS);

// Export all your environment variables
// Updated to use new LLM endpoint
// https://5p9r6bnba2i4gkbrde59qtyti8qd7mtkkgrtycrp13bc.node.k8s.prd.nos.ci/
export const modelName = process.env.MODEL_NAME_AT_ENDPOINT ?? "qwen2.5:7b";

// Updated baseURL to use the new LLM endpoint
export const baseURL = "https://5p9r6bnba2i4gkbrde59qtyti8qd7mtkkgrtycrp13bc.node.k8s.prd.nos.ci/api";

// Create and export the model instance
export const model = createOllama({ baseURL }).chat(modelName, {
  simulateStreaming: true,
});

console.log(`ModelName: ${modelName}\nbaseURL: ${baseURL}`);
