/**
 * Code Review Tool
 * ---------------
 * This tool provides a comprehensive codebase review by listing all files in a GitHub repository,
 * fetching their content, generating brief summaries, and returning a formatted report with file links.
 *
 * Input: { repoUrl: string, maxFiles?: number, maxLines?: number }
 * Output: Markdown report with file summaries and links
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { listRepoFiles, fetchFileContent } from "./helpers/github-api-utils";
import { summarizeFile } from "./helpers/file-summarizer";

export const codeReviewTool = createTool({
  id: "code-review",
  description: "Generate a comprehensive codebase review with file-by-file summaries and links",
  inputSchema: z.object({
    repoUrl: z
      .string()
      .describe(
        "GitHub repository URL, e.g., https://github.com/vercel/next.js"
      ),
    maxFiles: z
      .number()
      .optional()
      .describe(
        "Maximum number of files to analyze (default: 100, max: 200)"
      ),
    maxLines: z
      .number()
      .optional()
      .describe(
        "Maximum number of lines to fetch per file for analysis (default: 50, max: 100)"
      ),
  }),
  outputSchema: z.object({
    repository: z.object({
      name: z.string(),
      fullName: z.string(),
      owner: z.string(),
    }),
    summary: z.object({
      totalFiles: z.number(),
      analyzedFiles: z.number(),
      fileTypes: z.array(
        z.object({
          type: z.string(),
          count: z.number(),
        })
      ),
    }),
    report: z.string(),
  }),
  execute: async ({ context }) => {
    return await generateCodebaseReview(
      context.repoUrl,
      context.maxFiles || 100,
      context.maxLines || 50
    );
  },
});

export const generateCodebaseReview = async (
  repoUrl: string,
  maxFiles: number = 100,
  maxLines: number = 50
): Promise<any> => {
  const { owner, repo } = parseGitHubUrl(repoUrl);

  // List all files in the repository
  let files;
  try {
    files = await listRepoFiles(repoUrl);
  } catch (error) {
    throw new Error(`Could not list files in the repository: ${error}`);
  }

  if (!files || files.length === 0) {
    throw new Error("No files found in the repository.");
  }

  // Limit files and sort alphabetically
  const filesToAnalyze = files
    .sort((a, b) => a.path.localeCompare(b.path))
    .slice(0, Math.min(maxFiles, 200));

  // Analyze each file
  const summaries: Array<{ path: string; url: string; summary: string; type: string }> = [];
  const fileTypeCounts = new Map<string, number>();

  for (const file of filesToAnalyze) {
    let content = "";
    try {
      content = await fetchFileContent(repoUrl, file.path, undefined, maxLines);
    } catch (error) {
      content = "(Could not fetch file content)";
    }

    const summary = summarizeFile(file.path, content);
    const fileType = getFileTypeFromPath(file.path);
    
    summaries.push({
      path: file.path,
      url: file.url,
      summary,
      type: fileType,
    });

    // Count file types
    fileTypeCounts.set(fileType, (fileTypeCounts.get(fileType) || 0) + 1);
  }

  // Generate file type summary
  const fileTypes = Array.from(fileTypeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Generate Markdown report
  const report = generateMarkdownReport(summaries, fileTypes);

  return {
    repository: {
      name: repo,
      fullName: `${owner}/${repo}`,
      owner: owner,
    },
    summary: {
      totalFiles: files.length,
      analyzedFiles: summaries.length,
      fileTypes,
    },
    report,
  };
};

function getFileTypeFromPath(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  const fileName = filePath.toLowerCase();
  
  if (fileName.endsWith('readme.md')) return 'README';
  if (fileName.endsWith('package.json')) return 'Package Config';
  if (fileName.endsWith('requirements.txt')) return 'Requirements';
  if (fileName.endsWith('dockerfile')) return 'Dockerfile';
  if (fileName.endsWith('makefile')) return 'Makefile';
  if (fileName.endsWith('.lock')) return 'Lock File';
  if (fileName.endsWith('.env')) return 'Environment';
  if (fileName.endsWith('.test.js') || fileName.endsWith('.test.ts') || fileName.endsWith('.spec.js') || fileName.endsWith('.spec.ts')) return 'Test';
  if (fileName.endsWith('.md')) return 'Documentation';
  if (fileName.endsWith('.json')) return 'JSON';
  if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) return 'YAML';
  if (fileName.endsWith('.js')) return 'JavaScript';
  if (fileName.endsWith('.ts')) return 'TypeScript';
  if (fileName.endsWith('.jsx')) return 'JSX';
  if (fileName.endsWith('.tsx')) return 'TSX';
  if (fileName.endsWith('.py')) return 'Python';
  if (fileName.endsWith('.java')) return 'Java';
  if (fileName.endsWith('.cpp')) return 'C++';
  if (fileName.endsWith('.c')) return 'C';
  if (fileName.endsWith('.go')) return 'Go';
  if (fileName.endsWith('.rs')) return 'Rust';
  if (fileName.endsWith('.php')) return 'PHP';
  if (fileName.endsWith('.rb')) return 'Ruby';
  if (fileName.endsWith('.html')) return 'HTML';
  if (fileName.endsWith('.css')) return 'CSS';
  if (fileName.endsWith('.scss')) return 'SCSS';
  if (fileName.endsWith('.less')) return 'Less';
  if (fileName.endsWith('.sql')) return 'SQL';
  if (fileName.endsWith('.xml')) return 'XML';
  if (fileName.endsWith('.sh')) return 'Shell';
  if (fileName.endsWith('.bat')) return 'Batch';
  if (fileName.endsWith('.ps1')) return 'PowerShell';
  
  return extension.toUpperCase() || 'Other';
}

function generateMarkdownReport(
  summaries: Array<{ path: string; url: string; summary: string; type: string }>,
  fileTypes: Array<{ type: string; count: number }>
): string {
  let report = `# 📦 Codebase Review Report\n\n`;

  // File type summary
  report += `## 📊 File Type Summary\n\n`;
  report += `| Type | Count |\n|------|-------|\n`;
  for (const { type, count } of fileTypes) {
    report += `| ${type} | ${count} |\n`;
  }
  report += `\n`;

  // File-by-file summary
  report += `## 📁 File-by-File Summary\n\n`;
  report += `| File | Summary |\n|------|---------|\n`;
  
  for (const { path, url, summary } of summaries) {
    // Escape pipe characters in summary for Markdown table
    const escapedSummary = summary.replace(/\|/g, '\\|');
    report += `| [${path}](${url}) | ${escapedSummary} |\n`;
  }

  return report;
}

// Helper function to parse GitHub URL (reuse from existing utils)
function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const githubRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/;
  const match = url.match(githubRegex);

  if (!match) {
    throw new Error(
      "Invalid GitHub repository URL. Please provide a URL in the format: https://github.com/owner/repo"
    );
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
  };
} 