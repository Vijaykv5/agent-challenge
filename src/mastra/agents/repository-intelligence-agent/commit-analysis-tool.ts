/**
 * Commit Analysis Tool
 * --------------------
 * This tool analyzes commits in a GitHub repository to provide insights about
 * commit patterns, contributors, code evolution, and development activity.
 *
 * Input: { repoUrl: string, analysisType?: string }
 * Output: Detailed commit analysis with patterns, insights, and recommendations
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { parseGitHubUrl } from "./helpers/github-api-utils";

// Type definitions for commit analysis
interface CommitData {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  parents: { sha: string }[];
}

interface CommitAnalysis {
  summary: {
    totalCommits: number;
    uniqueContributors: number;
    timeSpan: {
      firstCommit: string;
      lastCommit: string;
      daysActive: number;
    };
    averageCommitsPerDay: number;
  };
  contributors: {
    name: string;
    email: string;
    commits: number;
    percentage: number;
    firstCommit: string;
    lastCommit: string;
  }[];
  patterns: {
    commitMessagePatterns: {
      pattern: string;
      count: number;
      examples: string[];
    }[];
    activityPatterns: {
      dayOfWeek: string;
      commits: number;
      percentage: number;
    }[];
    timePatterns: {
      hour: number;
      commits: number;
      percentage: number;
    }[];
  };
  insights: {
    mostActiveContributor: string;
    busiestDay: string;
    busiestHour: number;
    commitFrequency: string;
    codeEvolution: string;
  };
  recommendations: string[];
}

export const commitAnalysisTool = createTool({
  id: "commit-analysis",
  description: "Analyze commit patterns, contributors, and code evolution in a GitHub repository, or analyze specific commit details",
  inputSchema: z.object({
    repoUrl: z
      .string()
      .describe(
        "GitHub repository URL, e.g., https://github.com/vercel/next.js"
      ),
    commitSha: z
      .string()
      .optional()
      .describe(
        "Specific commit SHA/hash to analyze. If provided, analyzes only this commit. If not provided, analyzes overall commit patterns."
      ),
    analysisType: z
      .enum(["basic", "detailed", "patterns", "contributors"])
      .optional()
      .describe(
        "Type of analysis to perform: basic (summary only), detailed (full analysis), patterns (focus on commit patterns), contributors (focus on contributor analysis). Only applies when commitSha is not provided."
      ),
  }),
  outputSchema: z.union([
    // Repository-wide analysis
    z.object({
      repository: z.object({
        name: z.string(),
        fullName: z.string(),
        owner: z.string(),
      }),
      analysisType: z.literal("repository"),
      analysis: z.object({
        summary: z.object({
          totalCommits: z.number(),
          uniqueContributors: z.number(),
          timeSpan: z.object({
            firstCommit: z.string(),
            lastCommit: z.string(),
            daysActive: z.number(),
          }),
          averageCommitsPerDay: z.number(),
        }),
        contributors: z.array(
          z.object({
            name: z.string(),
            email: z.string(),
            commits: z.number(),
            percentage: z.number(),
            firstCommit: z.string(),
            lastCommit: z.string(),
          })
        ),
        patterns: z.object({
          commitMessagePatterns: z.array(
            z.object({
              pattern: z.string(),
              count: z.number(),
              examples: z.array(z.string()),
            })
          ),
          activityPatterns: z.array(
            z.object({
              dayOfWeek: z.string(),
              commits: z.number(),
              percentage: z.number(),
            })
          ),
          timePatterns: z.array(
            z.object({
              hour: z.number(),
              commits: z.number(),
              percentage: z.number(),
            })
          ),
        }),
        insights: z.object({
          mostActiveContributor: z.string(),
          busiestDay: z.string(),
          busiestHour: z.number(),
          commitFrequency: z.string(),
          codeEvolution: z.string(),
        }),
        recommendations: z.array(z.string()),
      }),
    }),
    // Specific commit analysis
    z.object({
      repository: z.object({
        name: z.string(),
        fullName: z.string(),
        owner: z.string(),
      }),
      analysisType: z.literal("commit"),
      commit: z.object({
        sha: z.string(),
        shortSha: z.string(),
        message: z.string(),
        author: z.object({
          name: z.string(),
          email: z.string(),
          date: z.string(),
        }),
        committer: z.object({
          name: z.string(),
          email: z.string(),
          date: z.string(),
        }),
        parents: z.array(z.string()),
        stats: z.object({
          total: z.number(),
          additions: z.number(),
          deletions: z.number(),
        }),
        files: z.array(
          z.object({
            filename: z.string(),
            status: z.string(),
            additions: z.number(),
            deletions: z.number(),
            changes: z.number(),
            patch: z.string().optional(),
          })
        ),
        analysis: z.object({
          commitType: z.string(),
          impact: z.string(),
          complexity: z.string(),
          riskLevel: z.string(),
          description: z.string(),
          suggestions: z.array(z.string()),
        }),
      }),
    }),
  ]),
  execute: async ({ context }) => {
    if (context.commitSha) {
      return await analyzeSpecificCommit(context.repoUrl, context.commitSha);
    } else {
      return await analyzeCommits(context.repoUrl, context.analysisType || "detailed");
    }
  },
});

export const analyzeCommits = async (
  repoUrl: string,
  analysisType: string = "detailed"
): Promise<any> => {
  const { owner, repo } = parseGitHubUrl(repoUrl);

  // Fetch commits from the repository
  const commits = await fetchRepositoryCommits(owner, repo);
  
  if (commits.length === 0) {
    throw new Error("No commits found in the repository or repository is empty.");
  }

  // Perform analysis based on type
  const analysis = await performCommitAnalysis(commits, analysisType);

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

export const analyzeSpecificCommit = async (
  repoUrl: string,
  commitSha: string
): Promise<any> => {
  const { owner, repo } = parseGitHubUrl(repoUrl);

  // Fetch specific commit details
  const commitDetails = await fetchCommitDetails(owner, repo, commitSha);
  
  if (!commitDetails) {
    throw new Error(`Commit '${commitSha}' not found in the repository.`);
  }

  // Analyze the specific commit
  const analysis = await analyzeCommitDetails(commitDetails);

  return {
    repository: {
      name: repo,
      fullName: `${owner}/${repo}`,
      owner: owner,
    },
    analysisType: "commit",
    commit: {
      ...commitDetails,
      analysis,
    },
  };
};

async function fetchRepositoryCommits(owner: string, repo: string): Promise<CommitData[]> {
  const commits: CommitData[] = [];
  let page = 1;
  const perPage = 100;
  const maxPages = 5; // Reduced to prevent rate limiting

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
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}&page=${page}`,
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
          throw new Error(`Failed to fetch commits: ${response.status} ${response.statusText}`);
        }
      }

      const pageCommits: CommitData[] = await response.json();
      
      if (pageCommits.length === 0) {
        break; // No more commits
      }

      commits.push(...pageCommits);
      page++;

      // If we got fewer commits than requested, we've reached the end
      if (pageCommits.length < perPage) {
        break;
      }
    }
  } catch (error) {
    console.error("Error fetching commits:", error);
    throw error;
  }

  return commits;
}

async function performCommitAnalysis(
  commits: CommitData[],
  analysisType: string
): Promise<CommitAnalysis> {
  // Basic summary calculations
  const totalCommits = commits.length;
  const contributors = new Map<string, { name: string; email: string; commits: number; firstCommit: string; lastCommit: string }>();
  
  // Track commit dates for time analysis
  const commitDates: Date[] = [];
  const dayOfWeekCounts = new Map<string, number>();
  const hourCounts = new Map<number, number>();
  const messagePatterns = new Map<string, { count: number; examples: string[] }>();

  // Process each commit
  commits.forEach((commit) => {
    const commitDate = new Date(commit.author.date);
    commitDates.push(commitDate);
    
    // Contributor analysis
    const contributorKey = `${commit.author.name} <${commit.author.email}>`;
    if (!contributors.has(contributorKey)) {
      contributors.set(contributorKey, {
        name: commit.author.name,
        email: commit.author.email,
        commits: 0,
        firstCommit: commit.author.date,
        lastCommit: commit.author.date,
      });
    }
    
    const contributor = contributors.get(contributorKey)!;
    contributor.commits++;
    if (commit.author.date < contributor.firstCommit) {
      contributor.firstCommit = commit.author.date;
    }
    if (commit.author.date > contributor.lastCommit) {
      contributor.lastCommit = commit.author.date;
    }

    // Day of week analysis
    const dayOfWeek = commitDate.toLocaleDateString("en-US", { weekday: "long" });
    dayOfWeekCounts.set(dayOfWeek, (dayOfWeekCounts.get(dayOfWeek) || 0) + 1);

    // Hour analysis
    const hour = commitDate.getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

    // Message pattern analysis
    const message = commit.message.toLowerCase();
    const patterns = extractCommitMessagePatterns(message);
    patterns.forEach(pattern => {
      if (!messagePatterns.has(pattern)) {
        messagePatterns.set(pattern, { count: 0, examples: [] });
      }
      const patternData = messagePatterns.get(pattern)!;
      patternData.count++;
      if (patternData.examples.length < 3) {
        patternData.examples.push(commit.message);
      }
    });
  });

  // Sort commit dates
  commitDates.sort((a, b) => a.getTime() - b.getTime());
  const firstCommit = commitDates[0];
  const lastCommit = commitDates[commitDates.length - 1];
  const daysActive = Math.ceil((lastCommit.getTime() - firstCommit.getTime()) / (1000 * 60 * 60 * 24));
  const averageCommitsPerDay = totalCommits / Math.max(daysActive, 1);

  // Process contributors
  const contributorArray = Array.from(contributors.values())
    .map(contributor => ({
      ...contributor,
      percentage: (contributor.commits / totalCommits) * 100,
    }))
    .sort((a, b) => b.commits - a.commits);

  // Process patterns
  const activityPatterns = Array.from(dayOfWeekCounts.entries())
    .map(([day, count]) => ({
      dayOfWeek: day,
      commits: count,
      percentage: (count / totalCommits) * 100,
    }))
    .sort((a, b) => b.commits - a.commits);

  const timePatterns = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({
      hour,
      commits: count,
      percentage: (count / totalCommits) * 100,
    }))
    .sort((a, b) => b.commits - a.commits);

  const commitMessagePatterns = Array.from(messagePatterns.entries())
    .map(([pattern, data]) => ({
      pattern,
      count: data.count,
      examples: data.examples,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 patterns

  // Generate insights
  const mostActiveContributor = contributorArray[0]?.name || "Unknown";
  const busiestDay = activityPatterns[0]?.dayOfWeek || "Unknown";
  const busiestHour = timePatterns[0]?.hour || 0;
  
  const commitFrequency = getCommitFrequencyDescription(averageCommitsPerDay);
  const codeEvolution = getCodeEvolutionDescription(commits, daysActive);

  // Generate recommendations
  const recommendations = generateRecommendations(
    contributorArray,
    activityPatterns,
    timePatterns,
    commitMessagePatterns,
    averageCommitsPerDay
  );

  return {
    summary: {
      totalCommits,
      uniqueContributors: contributorArray.length,
      timeSpan: {
        firstCommit: firstCommit.toISOString(),
        lastCommit: lastCommit.toISOString(),
        daysActive,
      },
      averageCommitsPerDay,
    },
    contributors: contributorArray,
    patterns: {
      commitMessagePatterns,
      activityPatterns,
      timePatterns,
    },
    insights: {
      mostActiveContributor,
      busiestDay,
      busiestHour,
      commitFrequency,
      codeEvolution,
    },
    recommendations,
  };
}

function extractCommitMessagePatterns(message: string): string[] {
  const patterns: string[] = [];
  
  // Common commit message patterns
  if (message.includes("fix")) patterns.push("Bug fixes");
  if (message.includes("feat") || message.includes("add")) patterns.push("New features");
  if (message.includes("update") || message.includes("upgrade")) patterns.push("Updates/upgrades");
  if (message.includes("refactor")) patterns.push("Code refactoring");
  if (message.includes("docs") || message.includes("readme")) patterns.push("Documentation");
  if (message.includes("test")) patterns.push("Testing");
  if (message.includes("style") || message.includes("format")) patterns.push("Code style/formatting");
  if (message.includes("perf") || message.includes("optimize")) patterns.push("Performance improvements");
  if (message.includes("chore") || message.includes("ci")) patterns.push("Maintenance/chores");
  if (message.includes("revert")) patterns.push("Reverts");
  
  // If no specific pattern found, categorize as "Other"
  if (patterns.length === 0) {
    patterns.push("Other");
  }
  
  return patterns;
}

function getCommitFrequencyDescription(avgCommitsPerDay: number): string {
  if (avgCommitsPerDay >= 10) return "Very high activity - multiple commits daily";
  if (avgCommitsPerDay >= 5) return "High activity - regular daily commits";
  if (avgCommitsPerDay >= 2) return "Moderate activity - several commits per day";
  if (avgCommitsPerDay >= 0.5) return "Low activity - occasional commits";
  return "Very low activity - infrequent commits";
}

function getCodeEvolutionDescription(commits: CommitData[], daysActive: number): string {
  const commitDensity = commits.length / Math.max(daysActive, 1);
  
  if (commitDensity > 5) {
    return "Rapid development with frequent code changes";
  } else if (commitDensity > 2) {
    return "Active development with regular updates";
  } else if (commitDensity > 0.5) {
    return "Steady development with periodic updates";
  } else {
    return "Slow development with infrequent changes";
  }
}

function generateRecommendations(
  contributors: any[],
  activityPatterns: any[],
  timePatterns: any[],
  commitMessagePatterns: any[],
  averageCommitsPerDay: number
): string[] {
  const recommendations: string[] = [];

  // Contributor-based recommendations
  if (contributors.length === 1) {
    recommendations.push("Consider adding more contributors to distribute development workload");
  }
  
  const topContributor = contributors[0];
  if (topContributor && topContributor.percentage > 80) {
    recommendations.push("High dependency on single contributor - consider knowledge sharing and documentation");
  }

  // Activity pattern recommendations
  const weekendActivity = activityPatterns
    .filter(p => p.dayOfWeek === "Saturday" || p.dayOfWeek === "Sunday")
    .reduce((sum, p) => sum + p.commits, 0);
  
  if (weekendActivity > 0) {
    recommendations.push("Weekend activity detected - consider work-life balance for contributors");
  }

  // Commit frequency recommendations
  if (averageCommitsPerDay > 10) {
    recommendations.push("Very high commit frequency - consider batching commits or using feature branches");
  } else if (averageCommitsPerDay < 0.1) {
    recommendations.push("Low commit frequency - consider more regular development cycles");
  }

  // Message pattern recommendations
  const hasGoodPatterns = commitMessagePatterns.some(p => 
    p.pattern !== "Other" && p.count > 5
  );
  
  if (!hasGoodPatterns) {
    recommendations.push("Consider adopting conventional commit message standards for better project organization");
  }

  // Time pattern recommendations
  const lateNightCommits = timePatterns
    .filter(p => p.hour >= 22 || p.hour <= 6)
    .reduce((sum, p) => sum + p.commits, 0);
  
  if (lateNightCommits > 0) {
    recommendations.push("Late night commits detected - consider setting healthy development hours");
  }

  return recommendations;
}

// Type definitions for specific commit analysis
interface CommitDetails {
  sha: string;
  shortSha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  parents: string[];
  stats: {
    total: number;
    additions: number;
    deletions: number;
  };
  files: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }[];
}

interface SpecificCommitAnalysis {
  commitType: string;
  impact: string;
  complexity: string;
  riskLevel: string;
  description: string;
  suggestions: string[];
}

async function fetchCommitDetails(owner: string, repo: string, commitSha: string): Promise<CommitDetails | null> {
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
      `https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}`,
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
        throw new Error(`Failed to fetch commit details: ${response.status} ${response.statusText}`);
      }
    }

    const commitData = await response.json();

    return {
      sha: commitData.sha,
      shortSha: commitData.sha.substring(0, 7),
      message: commitData.commit.message,
      author: {
        name: commitData.commit.author.name,
        email: commitData.commit.author.email,
        date: commitData.commit.author.date,
      },
      committer: {
        name: commitData.commit.committer.name,
        email: commitData.commit.committer.email,
        date: commitData.commit.committer.date,
      },
      parents: commitData.parents.map((parent: any) => parent.sha),
      stats: {
        total: commitData.stats.total,
        additions: commitData.stats.additions,
        deletions: commitData.stats.deletions,
      },
      files: commitData.files.map((file: any) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      })),
    };
  } catch (error) {
    console.error("Error fetching commit details:", error);
    throw error;
  }
}

async function analyzeCommitDetails(commitDetails: CommitDetails): Promise<SpecificCommitAnalysis> {
  const { message, stats, files } = commitDetails;
  
  // Analyze commit type
  const commitType = analyzeCommitType(message, files);
  
  // Analyze impact
  const impact = analyzeCommitImpact(stats, files);
  
  // Analyze complexity
  const complexity = analyzeCommitComplexity(files);
  
  // Analyze risk level
  const riskLevel = analyzeCommitRisk(message, files);
  
  // Generate description
  const description = generateCommitDescription(commitDetails);
  
  // Generate suggestions
  const suggestions = generateCommitSuggestions(commitDetails);

  return {
    commitType,
    impact,
    complexity,
    riskLevel,
    description,
    suggestions,
  };
}

function analyzeCommitType(message: string, files: any[]): string {
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes("fix") || messageLower.includes("bug")) {
    return "Bug Fix";
  } else if (messageLower.includes("feat") || messageLower.includes("add")) {
    return "Feature Addition";
  } else if (messageLower.includes("refactor")) {
    return "Code Refactoring";
  } else if (messageLower.includes("docs") || messageLower.includes("readme")) {
    return "Documentation Update";
  } else if (messageLower.includes("test")) {
    return "Test Addition/Update";
  } else if (messageLower.includes("style") || messageLower.includes("format")) {
    return "Code Style/Formatting";
  } else if (messageLower.includes("perf") || messageLower.includes("optimize")) {
    return "Performance Improvement";
  } else if (messageLower.includes("chore") || messageLower.includes("ci")) {
    return "Maintenance/Chore";
  } else if (messageLower.includes("revert")) {
    return "Revert";
  } else if (files.some(f => f.status === "deleted")) {
    return "File Deletion";
  } else if (files.some(f => f.status === "renamed")) {
    return "File Rename";
  } else {
    return "General Update";
  }
}

function analyzeCommitImpact(stats: any, files: any[]): string {
  const totalChanges = stats.additions + stats.deletions;
  
  if (totalChanges > 1000) {
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

function analyzeCommitComplexity(files: any[]): string {
  const fileTypes = files.map(f => f.filename.split('.').pop()?.toLowerCase());
  const hasComplexFiles = fileTypes.some(type => 
    ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c'].includes(type || '')
  );
  const hasConfigFiles = fileTypes.some(type => 
    ['json', 'yaml', 'yml', 'toml', 'ini'].includes(type || '')
  );
  
  if (files.length > 10) {
    return "High Complexity - Multiple files changed across different areas";
  } else if (hasComplexFiles && files.length > 5) {
    return "Medium-High Complexity - Significant code changes in multiple files";
  } else if (hasComplexFiles) {
    return "Medium Complexity - Code changes in specific files";
  } else if (hasConfigFiles) {
    return "Low-Medium Complexity - Configuration or setup changes";
  } else {
    return "Low Complexity - Simple changes, likely documentation or minor updates";
  }
}

function analyzeCommitRisk(message: string, files: any[]): string {
  const messageLower = message.toLowerCase();
  const hasCriticalFiles = files.some(f => 
    f.filename.includes('package.json') || 
    f.filename.includes('requirements.txt') ||
    f.filename.includes('Dockerfile') ||
    f.filename.includes('docker-compose')
  );
  
  if (messageLower.includes("security") || messageLower.includes("vulnerability")) {
    return "High Risk - Security-related changes";
  } else if (hasCriticalFiles) {
    return "Medium-High Risk - Changes to critical configuration files";
  } else if (messageLower.includes("breaking") || messageLower.includes("major")) {
    return "Medium-High Risk - Breaking changes or major updates";
  } else if (files.some(f => f.status === "deleted")) {
    return "Medium Risk - File deletions that might affect functionality";
  } else if (messageLower.includes("fix") || messageLower.includes("bug")) {
    return "Low-Medium Risk - Bug fixes, generally safe";
  } else {
    return "Low Risk - Routine changes, likely safe to apply";
  }
}

function generateCommitDescription(commitDetails: CommitDetails): string {
  const { message, stats, files, author } = commitDetails;
  
  const fileCount = files.length;
  const totalChanges = stats.additions + stats.deletions;
  const fileTypes = [...new Set(files.map(f => f.filename.split('.').pop()?.toLowerCase()))];
  
  let description = `This commit by ${author.name} includes ${fileCount} file(s) with ${totalChanges} total changes `;
  description += `(${stats.additions} additions, ${stats.deletions} deletions). `;
  
  if (fileTypes.length > 0) {
    description += `The changes affect ${fileTypes.join(', ')} files. `;
  }
  
  if (files.some(f => f.status === "deleted")) {
    description += "Some files were deleted. ";
  }
  
  if (files.some(f => f.status === "renamed")) {
    description += "Some files were renamed. ";
  }
  
  description += `The commit message indicates: "${message.split('\n')[0]}"`;
  
  return description;
}

function generateCommitSuggestions(commitDetails: CommitDetails): string[] {
  const suggestions: string[] = [];
  const { message, files, stats } = commitDetails;
  
  // Check commit message quality
  if (message.length < 10) {
    suggestions.push("Consider writing a more descriptive commit message");
  }
  
  if (message.length > 200) {
    suggestions.push("Consider breaking this into multiple commits for better traceability");
  }
  
  // Check for large commits
  if (stats.total > 1000) {
    suggestions.push("This is a large commit - consider breaking it into smaller, focused commits");
  }
  
  // Check file diversity
  const fileTypes = files.map(f => f.filename.split('.').pop()?.toLowerCase());
  const uniqueTypes = new Set(fileTypes);
  
  if (uniqueTypes.size > 5) {
    suggestions.push("Multiple file types changed - consider if this should be multiple commits");
  }
  
  // Check for critical files
  const criticalFiles = files.filter(f => 
    f.filename.includes('package.json') || 
    f.filename.includes('requirements.txt')
  );
  
  if (criticalFiles.length > 0) {
    suggestions.push("Dependency changes detected - ensure compatibility and test thoroughly");
  }
  
  // Check for test files
  const hasTestFiles = files.some(f => 
    f.filename.includes('test') || 
    f.filename.includes('spec') ||
    f.filename.includes('__tests__')
  );
  
  if (!hasTestFiles && stats.additions > 100) {
    suggestions.push("Consider adding tests for the new functionality");
  }
  
  return suggestions;
} 