/**
 * GitHub API Utilities
 * --------------------
 * This file contains utilities for interacting with the GitHub API
 * including URL parsing, data fetching, and type definitions.
 */

// Type definitions
export interface GitHubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  owner: {
    login: string;
    type: string;
  };
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  language: string | null;
  license: {
    name: string;
    spdx_id: string;
  } | null;
  pushed_at: string;
  updated_at: string;
  created_at: string;
  private: boolean;
  archived: boolean;
  disabled: boolean;
}

export interface GitHubContributor {
  login: string;
  contributions: number;
  avatar_url: string;
  html_url: string;
}

export interface GitHubPullRequest {
  number: number;
  state: string;
  title: string;
  created_at: string;
  closed_at: string | null;
}

export interface GitHubLanguage {
  [key: string]: number;
}

// Utility functions
export const parseGitHubUrl = (
  url: string
): { owner: string; repo: string } => {
  const githubRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/;
  const match = url.match(githubRegex);

  if (!match) {
    throw new Error(
      "Invalid GitHub repository URL. Please provide a URL in the format: https://github.com/owner/repo"
    );
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""), // Remove .git suffix if present
  };
};

// Fetch repository languages
export const getRepositoryLanguages = async (
  repoUrl: string
): Promise<GitHubLanguage> => {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/languages`
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn("Failed to fetch repository languages:", error);
  }
  return {};
};

// Fetch repository commit activity
export async function getRepoCommitActivity(
  repoUrl: string
): Promise<{ labels: string[]; data: number[] }> {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`
    );
    if (response.ok) {
      const activity = await response.json();
      if (Array.isArray(activity)) {
        const labels: string[] = [];
        const data: number[] = [];
        
        // Get last 52 weeks (1 year)
        const last52Weeks = activity.slice(-52);
        
        last52Weeks.forEach((week, index) => {
          const date = new Date(week.week * 1000);
          labels.push(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
          data.push(week.total);
        });
        
        return { labels, data };
      }
    }
  } catch (error) {
    console.warn("Failed to fetch commit activity:", error);
  }
  return { labels: [], data: [] };
}

// Fetch detailed issue information
export async function fetchIssueDetails(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<any> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error("GitHub token not set in environment variable GITHUB_TOKEN");
  }
  
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    
    if (response.ok) {
      return await response.json();
    } else {
      console.warn(`Failed to fetch issue ${issueNumber}: ${response.status}`);
      return {};
    }
  } catch (error) {
    console.warn(`Error fetching issue ${issueNumber}:`, error);
    return {};
  }
}

/**
 * List all files in a GitHub repository using the Git Trees API
 * @param repoUrl - GitHub repository URL
 * @param branch - Branch name (default: 'main', fallback to 'master')
 * @returns Array of { path: string, url: string }
 */
export async function listRepoFiles(repoUrl: string, branch?: string): Promise<Array<{ path: string; url: string }>> {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const githubToken = process.env.GITHUB_TOKEN;
  let usedBranch = branch || 'main';

  async function fetchTree(branchName: string) {
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branchName}?recursive=1`, {
      headers: githubToken ? {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
      } : undefined,
    });
    if (refRes.ok) {
      const data = await refRes.json();
      if (data.tree && Array.isArray(data.tree)) {
        return data.tree.filter((item: any) => item.type === 'blob').map((item: any) => ({
          path: item.path,
          url: `https://github.com/${owner}/${repo}/blob/${branchName}/${item.path}`
        }));
      }
    }
    return null;
  }

  // Try main, then master if main fails
  let files = await fetchTree(usedBranch);
  if (!files && !branch) {
    files = await fetchTree('master');
    usedBranch = 'master';
  }
  if (!files) throw new Error('Could not list files in the repository.');
  return files;
}

/**
 * Fetch the content of a file from a GitHub repository (raw content)
 * @param repoUrl - GitHub repository URL
 * @param filePath - Path to the file in the repo
 * @param branch - Branch name (default: 'main', fallback to 'master')
 * @param maxLines - Maximum number of lines to fetch (default: 50)
 * @returns File content as a string (truncated if needed)
 */
export async function fetchFileContent(repoUrl: string, filePath: string, branch?: string, maxLines: number = 50): Promise<string> {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  let usedBranch = branch || 'main';

  async function fetchRaw(branchName: string) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branchName}/${filePath}`;
    const res = await fetch(rawUrl);
    if (res.ok) {
      const text = await res.text();
      if (maxLines > 0) {
        return text.split('\n').slice(0, maxLines).join('\n');
      }
      return text;
    }
    return null;
  }

  // Try main, then master if main fails
  let content = await fetchRaw(usedBranch);
  if (!content && !branch) {
    content = await fetchRaw('master');
    usedBranch = 'master';
  }
  if (!content) throw new Error(`Could not fetch file content for ${filePath}`);
  return content;
}
