/**
 * PR Summary Tool
 * --------------------
 * This tool analyzes pull requests in a GitHub repository to provide insights about
 * PR patterns, contributors, review activity, and code quality metrics.
 *
 * Input: { repoUrl: string, prNumber?: number, analysisType?: string }
 * Output: Detailed PR analysis with patterns, insights, and recommendations
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { parseGitHubUrl } from "./helpers/github-api-utils";
import { analyzeFileChanges, getFileChangeSummary, getDetailedFileAnalysis, FileChange } from "./helpers/file-change-analyzer";

// Type definitions for PR analysis
interface PRData {
  number: number;
  title: string;
  body: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
  requested_reviewers: Array<{
    login: string;
    avatar_url: string;
  }>;
  labels: Array<{
    name: string;
    color: string;
  }>;
  milestone: {
    title: string;
  } | null;
  draft: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  comments: number;
  review_comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  base: {
    ref: string;
    sha: string;
  };
  head: {
    ref: string;
    sha: string;
  };
}

interface PRSummary {
  summary: {
    totalPRs: number;
    openPRs: number;
    closedPRs: number;
    mergedPRs: number;
    draftPRs: number;
    averagePRSize: number;
    averageTimeToMerge: number;
  };
  contributors: {
    username: string;
    prs: number;
    percentage: number;
    averageSize: number;
    averageTimeToMerge: number;
  }[];
  patterns: {
    labelPatterns: {
      label: string;
      count: number;
      percentage: number;
    }[];
    statePatterns: {
      state: string;
      count: number;
      percentage: number;
    }[];
    sizePatterns: {
      size: string;
      count: number;
      percentage: number;
    }[];
  };
  insights: {
    mostActiveContributor: string;
    mostUsedLabel: string;
    averagePRSize: string;
    mergeRate: string;
    reviewActivity: string;
  };
  recommendations: string[];
}

interface SpecificPRAnalysis {
  pr: {
    number: number;
    title: string;
    state: string;
    author: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    mergedAt: string | null;
    labels: string[];
    assignees: string[];
    reviewers: string[];
    stats: {
      commits: number;
      additions: number;
      deletions: number;
      changedFiles: number;
      comments: number;
      reviewComments: number;
    };
    files: {
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      changes: number;
    }[];
  };
  analysis: {
    prType: string;
    impact: string;
    complexity: string;
    riskLevel: string;
    reviewStatus: string;
    description: string;
    suggestions: string[];
  };
}

export const prSummaryTool = createTool({
  id: "pr-summary",
  description: "Analyze pull requests in a GitHub repository to provide insights about PR patterns, contributors, and review activity",
  inputSchema: z.object({
    repoUrl: z
      .string()
      .describe(
        "GitHub repository URL, e.g., https://github.com/vercel/next.js"
      ),
    prNumber: z
      .number()
      .optional()
      .describe(
        "Specific PR number to analyze. If provided, analyzes only this PR. If not provided, analyzes overall PR patterns."
      ),
    analysisType: z
      .enum(["basic", "detailed", "patterns", "contributors"])
      .optional()
      .describe(
        "Type of analysis to perform: basic (summary only), detailed (full analysis), patterns (focus on PR patterns), contributors (focus on contributor analysis). Only applies when prNumber is not provided."
      ),
  }),
  outputSchema: z.union([
    // Repository-wide PR analysis
    z.object({
      repository: z.object({
        name: z.string(),
        fullName: z.string(),
        owner: z.string(),
      }),
      analysisType: z.literal("repository"),
      analysis: z.object({
        summary: z.object({
          totalPRs: z.number(),
          openPRs: z.number(),
          closedPRs: z.number(),
          mergedPRs: z.number(),
          draftPRs: z.number(),
          averagePRSize: z.number(),
          averageTimeToMerge: z.number(),
        }),
        contributors: z.array(
          z.object({
            username: z.string(),
            prs: z.number(),
            percentage: z.number(),
            averageSize: z.number(),
            averageTimeToMerge: z.number(),
          })
        ),
        patterns: z.object({
          labelPatterns: z.array(
            z.object({
              label: z.string(),
              count: z.number(),
              percentage: z.number(),
            })
          ),
          statePatterns: z.array(
            z.object({
              state: z.string(),
              count: z.number(),
              percentage: z.number(),
            })
          ),
          sizePatterns: z.array(
            z.object({
              size: z.string(),
              count: z.number(),
              percentage: z.number(),
            })
          ),
        }),
        insights: z.object({
          mostActiveContributor: z.string(),
          mostUsedLabel: z.string(),
          averagePRSize: z.string(),
          mergeRate: z.string(),
          reviewActivity: z.string(),
        }),
        recommendations: z.array(z.string()),
      }),
    }),
    // Specific PR analysis
    z.object({
      repository: z.object({
        name: z.string(),
        fullName: z.string(),
        owner: z.string(),
      }),
      analysisType: z.literal("pr"),
      pr: z.object({
        number: z.number(),
        title: z.string(),
        state: z.string(),
        author: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        closedAt: z.string().nullable(),
        mergedAt: z.string().nullable(),
        labels: z.array(z.string()),
        assignees: z.array(z.string()),
        reviewers: z.array(z.string()),
        stats: z.object({
          commits: z.number(),
          additions: z.number(),
          deletions: z.number(),
          changedFiles: z.number(),
          comments: z.number(),
          reviewComments: z.number(),
        }),
        files: z.array(
          z.object({
            filename: z.string(),
            status: z.string(),
            additions: z.number(),
            deletions: z.number(),
            changes: z.number(),
          })
        ),
        analysis: z.object({
          prType: z.string(),
          impact: z.string(),
          complexity: z.string(),
          riskLevel: z.string(),
          reviewStatus: z.string(),
          description: z.string(),
          suggestions: z.array(z.string()),
          fileAnalysis: z.object({
            overview: z.string(),
            insights: z.array(z.string()),
            recommendations: z.array(z.string()),
            impactAreas: z.array(z.string()),
            complexity: z.string(),
          }),
        }),
      }),
    }),
  ]),
  execute: async ({ context }) => {
    if (context.prNumber) {
      return await analyzeSpecificPR(context.repoUrl, context.prNumber);
    } else {
      return await analyzePRs(context.repoUrl, context.analysisType || "detailed");
    }
  },
});

export const analyzePRs = async (
  repoUrl: string,
  analysisType: string = "detailed"
): Promise<any> => {
  const { owner, repo } = parseGitHubUrl(repoUrl);

  // Fetch PRs from the repository
  const prs = await fetchRepositoryPRs(owner, repo);
  
  if (prs.length === 0) {
    throw new Error("No pull requests found in the repository.");
  }

  // Perform analysis based on type
  const analysis = await performPRAnalysis(prs, analysisType);

  return {
    repository: {
      name: repo,
      fullName: `${owner}/${repo}`,
      owner: owner,
    },
    analysisType: "repository",
    analysis,
  };
};

export const analyzeSpecificPR = async (
  repoUrl: string,
  prNumber: number
): Promise<any> => {
  const { owner, repo } = parseGitHubUrl(repoUrl);

  // Fetch specific PR details
  const prDetails = await fetchPRDetails(owner, repo, prNumber);
  
  if (!prDetails) {
    throw new Error(`Pull Request #${prNumber} not found in the repository.`);
  }

  // Analyze the specific PR
  const analysis = await analyzePRDetails(prDetails);

  return {
    repository: {
      name: repo,
      fullName: `${owner}/${repo}`,
      owner: owner,
    },
    analysisType: "pr",
    pr: {
      ...prDetails,
      analysis,
    },
  };
};

async function fetchRepositoryPRs(owner: string, repo: string): Promise<PRData[]> {
  const prs: PRData[] = [];
  let page = 1;
  const perPage = 100;
  const maxPages = 5; // Limit to prevent rate limiting

  // Get GitHub token from environment
  const githubToken = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Add authorization header if token is available
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  try {
    while (page <= maxPages) {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=${perPage}&page=${page}`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Repository '${owner}/${repo}' not found.`);
        } else if (response.status === 403) {
          const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
          const rateLimitReset = response.headers.get('x-ratelimit-reset');
          
          if (rateLimitRemaining === '0') {
            const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toLocaleString() : 'unknown time';
            throw new Error(`GitHub API rate limit exceeded. Rate limit resets at ${resetTime}. Consider setting a GITHUB_TOKEN environment variable for higher limits.`);
          } else {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
        } else {
          throw new Error(`Failed to fetch PRs: ${response.status} ${response.statusText}`);
        }
      }

      const pagePRs: PRData[] = await response.json();
      
      if (pagePRs.length === 0) {
        break; // No more PRs
      }

      prs.push(...pagePRs);
      page++;

      // If we got fewer PRs than requested, we've reached the end
      if (pagePRs.length < perPage) {
        break;
      }
    }
  } catch (error) {
    console.error("Error fetching PRs:", error);
    throw error;
  }

  return prs;
}

async function fetchPRDetails(owner: string, repo: string, prNumber: number): Promise<any | null> {
  // Get GitHub token from environment
  const githubToken = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Add authorization header if token is available
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      } else if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        const rateLimitReset = response.headers.get('x-ratelimit-reset');
        
        if (rateLimitRemaining === '0') {
          const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toLocaleString() : 'unknown time';
          throw new Error(`GitHub API rate limit exceeded. Rate limit resets at ${resetTime}. Consider setting a GITHUB_TOKEN environment variable for higher limits.`);
        } else {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
      } else {
        throw new Error(`Failed to fetch PR details: ${response.status} ${response.statusText}`);
      }
    }

    const prData = await response.json();

    // Fetch PR files
    const filesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      { headers }
    );

    let files = [];
    if (filesResponse.ok) {
      files = await filesResponse.json();
    }

    return {
      number: prData.number,
      title: prData.title,
      state: prData.state,
      author: prData.user.login,
      createdAt: prData.created_at,
      updatedAt: prData.updated_at,
      closedAt: prData.closed_at,
      mergedAt: prData.merged_at,
      labels: prData.labels.map((label: any) => label.name),
      assignees: prData.assignees.map((assignee: any) => assignee.login),
      reviewers: prData.requested_reviewers.map((reviewer: any) => reviewer.login),
      stats: {
        commits: prData.commits,
        additions: prData.additions,
        deletions: prData.deletions,
        changedFiles: prData.changed_files,
        comments: prData.comments,
        reviewComments: prData.review_comments,
      },
      files: files.map((file: any) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      })),
    };
  } catch (error) {
    console.error("Error fetching PR details:", error);
    throw error;
  }
}

async function performPRAnalysis(prs: PRData[], analysisType: string): Promise<PRSummary> {
  const totalPRs = prs.length;
  const contributors = new Map<string, { prs: number; totalSize: number; totalTimeToMerge: number; mergedCount: number }>();
  
  // Track patterns
  const labelCounts = new Map<string, number>();
  const stateCounts = new Map<string, number>();
  const sizeCounts = new Map<string, number>();

  let totalSize = 0;
  let totalTimeToMerge = 0;
  let mergedCount = 0;

  // Process each PR
  prs.forEach((pr) => {
    const size = pr.additions + pr.deletions;
    totalSize += size;
    
    // Contributor analysis
    const username = pr.user.login;
    if (!contributors.has(username)) {
      contributors.set(username, { prs: 0, totalSize: 0, totalTimeToMerge: 0, mergedCount: 0 });
    }
    
    const contributor = contributors.get(username)!;
    contributor.prs++;
    contributor.totalSize += size;

    // Calculate time to merge
    if (pr.merged_at) {
      const created = new Date(pr.created_at);
      const merged = new Date(pr.merged_at);
      const timeToMerge = (merged.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
      contributor.totalTimeToMerge += timeToMerge;
      totalTimeToMerge += timeToMerge;
      mergedCount++;
    }

    // Label analysis
    pr.labels.forEach(label => {
      labelCounts.set(label.name, (labelCounts.get(label.name) || 0) + 1);
    });

    // State analysis
    stateCounts.set(pr.state, (stateCounts.get(pr.state) || 0) + 1);

    // Size analysis
    let sizeCategory = "Small";
    if (size > 1000) sizeCategory = "Large";
    else if (size > 100) sizeCategory = "Medium";
    sizeCounts.set(sizeCategory, (sizeCounts.get(sizeCategory) || 0) + 1);
  });

  // Calculate summary statistics
  const openPRs = prs.filter(pr => pr.state === "open").length;
  const closedPRs = prs.filter(pr => pr.state === "closed" && !pr.merged_at).length;
  const mergedPRs = mergedCount;
  const draftPRs = prs.filter(pr => pr.draft).length;
  const averagePRSize = totalSize / totalPRs;
  const averageTimeToMerge = mergedCount > 0 ? totalTimeToMerge / mergedCount : 0;

  // Process contributors
  const contributorArray = Array.from(contributors.entries())
    .map(([username, data]) => ({
      username,
      prs: data.prs,
      percentage: (data.prs / totalPRs) * 100,
      averageSize: data.totalSize / data.prs,
      averageTimeToMerge: data.mergedCount > 0 ? data.totalTimeToMerge / data.mergedCount : 0,
    }))
    .sort((a, b) => b.prs - a.prs);

  // Process patterns
  const labelPatterns = Array.from(labelCounts.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: (count / totalPRs) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  const statePatterns = Array.from(stateCounts.entries())
    .map(([state, count]) => ({
      state,
      count,
      percentage: (count / totalPRs) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  const sizePatterns = Array.from(sizeCounts.entries())
    .map(([size, count]) => ({
      size,
      count,
      percentage: (count / totalPRs) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Generate insights
  const mostActiveContributor = contributorArray[0]?.username || "Unknown";
  const mostUsedLabel = labelPatterns[0]?.label || "None";
  const averagePRSizeDesc = getPRSizeDescription(averagePRSize);
  const mergeRate = `${((mergedPRs / totalPRs) * 100).toFixed(1)}%`;
  const reviewActivity = getReviewActivityDescription(prs);

  // Generate recommendations
  const recommendations = generatePRRecommendations(
    contributorArray,
    labelPatterns,
    sizePatterns,
    averageTimeToMerge,
    mergedPRs / totalPRs
  );

  return {
    summary: {
      totalPRs,
      openPRs,
      closedPRs,
      mergedPRs,
      draftPRs,
      averagePRSize,
      averageTimeToMerge,
    },
    contributors: contributorArray,
    patterns: {
      labelPatterns,
      statePatterns,
      sizePatterns,
    },
    insights: {
      mostActiveContributor,
      mostUsedLabel,
      averagePRSize: averagePRSizeDesc,
      mergeRate,
      reviewActivity,
    },
    recommendations,
  };
}

async function analyzePRDetails(prDetails: any): Promise<any> {
  const { title, state, stats, files, labels } = prDetails;
  
  // Get comprehensive file change analysis
  const fileAnalysis = analyzeFileChanges(files);
  
  // Analyze PR type
  const prType = analyzePRType(title, labels, files);
  
  // Analyze impact
  const impact = analyzePRImpact(stats, files);
  
  // Analyze complexity
  const complexity = analyzePRComplexity(files);
  
  // Analyze risk level
  const riskLevel = analyzePRRisk(title, files, labels);
  
  // Analyze review status
  const reviewStatus = analyzeReviewStatus(stats, state);
  
  // Generate enhanced description with file analysis
  const description = generatePRDescription(prDetails);
  
  // Generate suggestions
  const suggestions = generatePRSuggestions(prDetails);

  return {
    prType,
    impact,
    complexity,
    riskLevel,
    reviewStatus,
    description,
    suggestions,
    fileAnalysis: {
      overview: fileAnalysis.overview,
      insights: fileAnalysis.insights,
      recommendations: fileAnalysis.recommendations,
      impactAreas: fileAnalysis.detailedBreakdown.impactAreas,
      complexity: fileAnalysis.detailedBreakdown.complexity
    },
  };
}

function analyzePRType(title: string, labels: string[], files: any[]): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes("fix") || titleLower.includes("bug")) {
    return "Bug Fix";
  } else if (titleLower.includes("feat") || titleLower.includes("add")) {
    return "Feature Addition";
  } else if (titleLower.includes("refactor")) {
    return "Code Refactoring";
  } else if (titleLower.includes("docs") || titleLower.includes("readme")) {
    return "Documentation Update";
  } else if (titleLower.includes("test")) {
    return "Test Addition/Update";
  } else if (titleLower.includes("style") || titleLower.includes("format")) {
    return "Code Style/Formatting";
  } else if (titleLower.includes("perf") || titleLower.includes("optimize")) {
    return "Performance Improvement";
  } else if (titleLower.includes("chore") || titleLower.includes("ci")) {
    return "Maintenance/Chore";
  } else if (labels.some(label => label.toLowerCase().includes("breaking"))) {
    return "Breaking Change";
  } else if (files.some(f => f.status === "deleted")) {
    return "File Deletion";
  } else if (files.some(f => f.status === "renamed")) {
    return "File Rename";
  } else {
    return "General Update";
  }
}

function analyzePRImpact(stats: any, files: any[]): string {
  const totalChanges = stats.additions + stats.deletions;
  
  if (totalChanges > 2000) {
    return "High Impact - Major changes affecting multiple components";
  } else if (totalChanges > 500) {
    return "Medium-High Impact - Significant changes to core functionality";
  } else if (totalChanges > 100) {
    return "Medium Impact - Notable changes to specific features";
  } else if (totalChanges > 50) {
    return "Low-Medium Impact - Minor feature updates or bug fixes";
  } else {
    return "Low Impact - Small changes, likely cosmetic or documentation";
  }
}

function analyzePRComplexity(files: any[]): string {
  const fileTypes = files.map(f => f.filename.split('.').pop()?.toLowerCase());
  const hasComplexFiles = fileTypes.some(type => 
    ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c'].includes(type || '')
  );
  const hasConfigFiles = fileTypes.some(type => 
    ['json', 'yaml', 'yml', 'toml', 'ini'].includes(type || '')
  );
  
  if (files.length > 15) {
    return "High Complexity - Multiple files changed across different areas";
  } else if (hasComplexFiles && files.length > 8) {
    return "Medium-High Complexity - Significant code changes in multiple files";
  } else if (hasComplexFiles) {
    return "Medium Complexity - Code changes in specific files";
  } else if (hasConfigFiles) {
    return "Low-Medium Complexity - Configuration or setup changes";
  } else {
    return "Low Complexity - Simple changes, likely documentation or minor updates";
  }
}

function analyzePRRisk(title: string, files: any[], labels: string[]): string {
  const titleLower = title.toLowerCase();
  const hasCriticalFiles = files.some(f => 
    f.filename.includes('package.json') || 
    f.filename.includes('requirements.txt') ||
    f.filename.includes('Dockerfile') ||
    f.filename.includes('docker-compose')
  );
  
  if (titleLower.includes("security") || titleLower.includes("vulnerability")) {
    return "High Risk - Security-related changes";
  } else if (hasCriticalFiles) {
    return "Medium-High Risk - Changes to critical configuration files";
  } else if (titleLower.includes("breaking") || labels.some(l => l.toLowerCase().includes("breaking"))) {
    return "Medium-High Risk - Breaking changes or major updates";
  } else if (files.some(f => f.status === "deleted")) {
    return "Medium Risk - File deletions that might affect functionality";
  } else if (titleLower.includes("fix") || titleLower.includes("bug")) {
    return "Low-Medium Risk - Bug fixes, generally safe";
  } else {
    return "Low Risk - Routine changes, likely safe to merge";
  }
}

function analyzeReviewStatus(stats: any, state: string): string {
  if (state === "closed") {
    return "Closed - PR has been closed without merging";
  } else if (state === "open") {
    if (stats.reviewComments > 0) {
      return "Under Review - PR has received review comments";
    } else if (stats.comments > 0) {
      return "Discussion - PR has general comments but no review";
    } else {
      return "Pending Review - PR is open but awaiting review";
    }
  } else {
    return "Unknown Status";
  }
}

function summarizeFileChanges(files: FileChange[]): string {
  return getFileChangeSummary(files);
}

function generatePRDescription(prDetails: any): string {
  const { title, author, stats, files, state } = prDetails;
  const fileCount = files.length;
  const totalChanges = stats.additions + stats.deletions;
  const fileTypes = [...new Set(files.map((f: any) => f.filename.split('.').pop()?.toLowerCase()))];

  let description = `This PR by ${author} includes ${fileCount} file(s) with ${totalChanges} total changes `;
  description += `(${stats.additions} additions, ${stats.deletions} deletions). `;

  if (fileTypes.length > 0) {
    description += `The changes affect ${fileTypes.join(', ')} files. `;
  }

  // Add file change summary
  description += summarizeFileChanges(files) + ' ';

  if (files.some((f: any) => f.status === "deleted")) {
    description += "Some files were deleted. ";
  }
  if (files.some((f: any) => f.status === "renamed")) {
    description += "Some files were renamed. ";
  }

  description += `The PR is currently ${state} and has ${stats.comments} comments and ${stats.reviewComments} review comments.`;
  return description;
}

function generatePRSuggestions(prDetails: any): string[] {
  const suggestions: string[] = [];
  const { title, stats, files, labels } = prDetails;
  
  // Check PR title quality
  if (title.length < 10) {
    suggestions.push("Consider writing a more descriptive PR title");
  }
  
  if (title.length > 100) {
    suggestions.push("Consider making the PR title more concise");
  }
  
  // Check for large PRs
  if (stats.additions + stats.deletions > 1000) {
    suggestions.push("This is a large PR - consider breaking it into smaller, focused PRs");
  }
  
  // Check file diversity
  const fileTypes = files.map((f: any) => f.filename.split('.').pop()?.toLowerCase());
  const uniqueTypes = new Set(fileTypes);
  
  if (uniqueTypes.size > 8) {
    suggestions.push("Multiple file types changed - consider if this should be multiple PRs");
  }
  
  // Check for critical files
  const criticalFiles = files.filter((f: any) => 
    f.filename.includes('package.json') || 
    f.filename.includes('requirements.txt')
  );
  
  if (criticalFiles.length > 0) {
    suggestions.push("Dependency changes detected - ensure compatibility and test thoroughly");
  }
  
  // Check for test files
  const hasTestFiles = files.some((f: any) => 
    f.filename.includes('test') || 
    f.filename.includes('spec') ||
    f.filename.includes('__tests__')
  );
  
  if (!hasTestFiles && stats.additions > 100) {
    suggestions.push("Consider adding tests for the new functionality");
  }
  
  // Check for labels
  if (labels.length === 0) {
    suggestions.push("Consider adding labels to categorize this PR");
  }
  
  return suggestions;
}

function getPRSizeDescription(averageSize: number): string {
  if (averageSize > 500) return "Large PRs - Consider breaking into smaller changes";
  if (averageSize > 200) return "Medium PRs - Good balance of scope and reviewability";
  if (averageSize > 50) return "Small PRs - Easy to review and merge";
  return "Very Small PRs - Quick to review";
}

function getReviewActivityDescription(prs: PRData[]): string {
  const totalComments = prs.reduce((sum, pr) => sum + pr.comments, 0);
  const totalReviewComments = prs.reduce((sum, pr) => sum + pr.review_comments, 0);
  const averageComments = totalComments / prs.length;
  const averageReviewComments = totalReviewComments / prs.length;
  
  if (averageReviewComments > 5) {
    return "High review activity - thorough code review process";
  } else if (averageReviewComments > 2) {
    return "Moderate review activity - good review engagement";
  } else if (averageComments > 3) {
    return "General discussion - more comments than specific reviews";
  } else {
    return "Low review activity - consider encouraging more reviews";
  }
}

function generatePRRecommendations(
  contributors: any[],
  labelPatterns: any[],
  sizePatterns: any[],
  averageTimeToMerge: number,
  mergeRate: number
): string[] {
  const recommendations: string[] = [];

  // Contributor-based recommendations
  if (contributors.length === 1) {
    recommendations.push("Consider encouraging more contributors to submit PRs");
  }
  
  const topContributor = contributors[0];
  if (topContributor && topContributor.percentage > 70) {
    recommendations.push("High dependency on single contributor - consider knowledge sharing");
  }

  // Size-based recommendations
  const largePRs = sizePatterns.find(p => p.size === "Large");
  if (largePRs && largePRs.percentage > 30) {
    recommendations.push("High percentage of large PRs - consider encouraging smaller, focused changes");
  }

  // Merge time recommendations
  if (averageTimeToMerge > 7) {
    recommendations.push("Long merge times detected - consider improving review process");
  }

  // Merge rate recommendations
  if (mergeRate < 0.5) {
    recommendations.push("Low merge rate - consider reviewing PR requirements and process");
  }

  // Label recommendations
  if (labelPatterns.length === 0) {
    recommendations.push("No labels used - consider implementing a labeling system");
  }

  return recommendations;
} 