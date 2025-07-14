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
