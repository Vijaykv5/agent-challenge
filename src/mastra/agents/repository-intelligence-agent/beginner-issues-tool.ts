/**
 * Beginner Issues Tool
 * --------------------
 * This tool retrieves beginner-friendly 'good first issues' from a GitHub repository
 * using the GitHub API for new contributors.
 *
 * Input: { repoUrl: string }
 * Output: List of good first issues with basic information
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { parseGitHubUrl } from "./helpers/github-api-utils";

export const beginnerIssuesTool = createTool({
  id: "beginner-issues",
  description:
    "Retrieves beginner-friendly 'good first issues' from a GitHub repository using the GitHub API.",
  inputSchema: z.object({
    repoUrl: z
      .string()
      .describe(
        "GitHub repository URL, e.g., https://github.com/vercel/next.js"
      ),
  }),
  outputSchema: z.object({
    issues: z.array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        labels: z.array(z.string()),
        comments: z.number(),
        number: z.number(),
      })
    ),
    repo: z.string(),
    owner: z.string(),
    message: z.string().optional(),
  }),
  execute: async ({ context }) => {
    return await retrieveBeginnerIssues(context.repoUrl);
  },
});

export async function retrieveBeginnerIssues(repoUrl: string) {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error(
      "GitHub token not set in environment variable GITHUB_TOKEN"
    );
  }
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues?labels=good%20first%20issue&state=open`;
  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) {
      if (response.status === 404) {
        return {
          issues: [],
          repo,
          owner,
          message: `Repository '${owner}/${repo}' not found.`,
        };
      }
      if (response.status === 403) {
        return {
          issues: [],
          repo,
          owner,
          message: `GitHub API rate limit exceeded or access denied.`,
        };
      }
      return {
        issues: [],
        repo,
        owner,
        message: `Failed to fetch issues: ${response.status} ${response.statusText}`,
      };
    }
    const issues = await response.json();
    if (!Array.isArray(issues) || issues.length === 0) {
      return {
        issues: [],
        repo,
        owner,
        message: `There are currently no open 'good first issues' in this repository.`,
      };
    }
    return {
      issues: issues.map((issue: any) => ({
        title: issue.title,
        url: issue.html_url,
        labels: (issue.labels || []).map((l: any) =>
          typeof l === "string" ? l : l.name
        ),
        comments: issue.comments,
        number: issue.number,
      })),
      repo,
      owner,
    };
  } catch (error: any) {
    return {
      issues: [],
      repo,
      owner,
      message: `Error fetching issues: ${error.message}`,
    };
  }
}
