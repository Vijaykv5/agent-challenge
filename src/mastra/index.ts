import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { repositoryIntelligenceAgent } from "./agents/repository-intelligence-agent/repository-intelligence-agent";
import { repoAnalyzerWorkflow } from "./agents/repository-intelligence-agent/repository-analysis-workflow";

console.log("\n--- Mastra Server Startup Info ---");
console.log("Available agent endpoints:");
console.log("  POST /agents/repositoryIntelligenceAgent/run");
console.log("Available workflow endpoints:");
console.log("  POST /workflows/repo-analyzer-workflow/run");
console.log(
  "Model in use:",
  process.env.MODEL_NAME_AT_ENDPOINT ?? "qwen2.5:7b"
);
console.log("-----------------------------------\n");

export const mastra = new Mastra({
  workflows: { repoAnalyzerWorkflow },
  agents: { repositoryIntelligenceAgent },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  server: {
    port: 8080,
    timeout: 10000,
  },
});
