import { MCPServer } from "@mastra/mcp"
import { weatherTool, writerTool, editorTool, designerTool, resumeParserTool } from "../tools";

export const server = new MCPServer({
  name: "Content Studio MCP Server",
  version: "1.0.0",
  tools: { 
    weatherTool,
    writerTool,
    editorTool,
    designerTool,
    resumeParserTool
  },

  // workflows: {
  // dataProcessingWorkflow, // this workflow will become tool "run_dataProcessingWorkflow"
  // }
});
