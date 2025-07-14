/**
 * Guided Issues Tool
 * ------------------
 * This tool retrieves beginner-friendly 'good first issues' from a GitHub repository and provides
 * specific, actionable guidance on how to solve each particular issue.
 *
 * Input: { repoUrl: string }
 * Output: List of good first issues and a detailed guide (see outputSchema)
 *
 * Usage: Used to help new contributors not only find issues, but also get step-by-step guidance
 * for solving them.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { parseGitHubUrl, fetchIssueDetails } from "./helpers/github-api-utils";
import { retrieveBeginnerIssues } from "./beginner-issues-tool";

export const guidedIssuesTool = createTool({
  id: "guided-issues",
  description:
    "Retrieves beginner-friendly 'good first issues' from a GitHub repository and provides specific, actionable guidance on how to solve each particular issue.",
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
    guide: z.string(),
  }),
  execute: async ({ context }) => {
    const issuesResult = await retrieveBeginnerIssues(context.repoUrl);
    const guide = await generateIssueSpecificGuide(
      context.repoUrl,
      issuesResult.issues
    );

    return {
      ...issuesResult,
      guide,
    };
  },
});

// Generate issue-specific guidance for each good first issue
async function generateIssueSpecificGuide(
  repoUrl: string,
  issues: Array<{
    title: string;
    url: string;
    labels: string[];
    comments: number;
    number: number;
  }>
): Promise<string> {
  const { owner, repo } = parseGitHubUrl(repoUrl);

  if (issues.length === 0) {
    return `# 📋 No Good First Issues Available

Currently, there are no open "good first issue" labeled issues in the ${repo} repository.

## 💡 What You Can Do:

1. **Check Back Later**: New good first issues are added regularly
2. **Look for Other Labels**: Try searching for issues labeled "help wanted", "documentation", or "bug"
3. **Ask the Community**: Comment on existing issues to express interest in contributing
4. **Create Your Own**: If you find a bug or have an improvement idea, create a new issue

## 🔍 Finding Other Issues to Work On:

- Search for issues with labels like: "help wanted", "documentation", "bug", "enhancement"
- Look for issues with low complexity or that are marked as beginner-friendly
- Check the project's CONTRIBUTING.md file for more guidance

*Keep checking back for new good first issues!* 🌟`;
  }

  let guide = `# 🚀 Good First Issues Guide for ${repo}

## 🎯 Issue-Specific Contribution Plans

Below you'll find detailed, actionable plans for each available good first issue. Each plan includes specific steps tailored to that particular issue.

---

`;

  // Generate specific guidance for each issue
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const issueNumber = issue.number;
    const issueTitle = issue.title;

    // Fetch detailed issue information
    const issueDetails = await fetchIssueDetails(owner, repo, issueNumber);

    guide += `## 📋 **Issue #${issueNumber}: ${issueTitle}**

### 🎯 **Issue Analysis**
${analyzeSpecificIssue(issueDetails)}

### 🛠️ **Specific Action Plan**

${generateSpecificActionPlan(issueDetails, repo)}

### 📁 **Files to Focus On**
${generateSpecificFileSuggestions(issueDetails)}

### 🧪 **Testing Approach**
${generateSpecificTestingStrategy(issueDetails)}

### 📝 **What to Submit**
${generateSpecificDeliverables(issueDetails)}

---

`;
  }

  guide += `## 🚀 **Getting Started**

### Prerequisites:
1. **Fork the Repository**: Go to https://github.com/${owner}/${repo} and click "Fork"
2. **Clone Your Fork**: \`git clone https://github.com/YOUR_USERNAME/${repo}.git\`
3. **Set Up Upstream**: \`git remote add upstream https://github.com/${owner}/${repo}.git\`
4. **Install Dependencies**: Check the project's README for setup instructions

### General Workflow:
1. Create a new branch: \`git checkout -b fix/issue-number-description\`
2. Make your changes following the specific plan above
3. Test your changes thoroughly
4. Commit with a clear message: \`git commit -m "fix: address issue #X - brief description"\`
5. Push to your fork: \`git push origin your-branch-name\`
6. Create a pull request with a detailed description

### 💡 **Tips for Success**
- Read the issue comments for additional context
- Ask questions if anything is unclear
- Follow the project's coding style and conventions
- Test your changes before submitting
- Be patient with the review process

---

**Good luck with your contributions!** 🌟`;

  return guide;
}

// Analyze the specific issue based on its actual content
function analyzeSpecificIssue(issueDetails: any): string {
  const title = issueDetails.title?.toLowerCase() || "";
  const body = issueDetails.body?.toLowerCase() || "";
  const labels =
    issueDetails.labels?.map((l: any) => l.name?.toLowerCase()) || [];

  // Extract key information from the issue
  let analysis = `**Issue Type**: ${determineIssueType(title, body, labels)}\n\n`;

  // Look for specific patterns in the issue
  if (
    body.includes("error") ||
    body.includes("exception") ||
    body.includes("bug")
  ) {
    analysis += `**Problem**: This appears to be a bug or error that needs to be fixed.\n`;
  }

  if (
    body.includes("firefox") ||
    body.includes("chrome") ||
    body.includes("browser")
  ) {
    analysis += `**Browser Specific**: This issue may be browser-specific and needs cross-browser testing.\n`;
  }

  if (
    body.includes("test") ||
    body.includes("spec") ||
    labels.includes("test")
  ) {
    analysis += `**Testing Related**: This involves writing or improving tests.\n`;
  }

  if (
    body.includes("documentation") ||
    body.includes("docs") ||
    labels.includes("documentation")
  ) {
    analysis += `**Documentation**: This requires updating or creating documentation.\n`;
  }

  if (
    body.includes("performance") ||
    body.includes("optimize") ||
    labels.includes("performance")
  ) {
    analysis += `**Performance**: This involves performance improvements or optimizations.\n`;
  }

  // Extract specific requirements
  const requirements = extractRequirements(body);
  if (requirements.length > 0) {
    analysis += `\n**Key Requirements**:\n${requirements.map((req) => `- ${req}`).join("\n")}\n`;
  }

  return analysis;
}

// Determine the type of issue based on content
function determineIssueType(
  title: string,
  body: string,
  labels: string[]
): string {
  if (labels.includes("bug")) return "Bug Fix";
  if (labels.includes("documentation")) return "Documentation";
  if (labels.includes("enhancement")) return "Feature Enhancement";
  if (labels.includes("test")) return "Testing";
  if (labels.includes("performance")) return "Performance";
  if (title.includes("fix") || body.includes("fix")) return "Bug Fix";
  if (title.includes("add") || body.includes("add")) return "Feature Addition";
  if (title.includes("improve") || body.includes("improve"))
    return "Improvement";
  return "General Issue";
}

// Extract specific requirements from issue body
function extractRequirements(body: string): string[] {
  const requirements: string[] = [];

  // Look for common requirement patterns
  if (
    body.includes("should") ||
    body.includes("must") ||
    body.includes("need")
  ) {
    const lines = body.split("\n");
    for (const line of lines) {
      if (
        line.toLowerCase().includes("should") ||
        line.toLowerCase().includes("must") ||
        line.toLowerCase().includes("need")
      ) {
        requirements.push(line.trim());
      }
    }
  }

  return requirements.slice(0, 5); // Limit to 5 requirements
}

// Generate specific action plan based on issue details
function generateSpecificActionPlan(issueDetails: any, repo: string): string {
  const title = issueDetails.title?.toLowerCase() || "";
  const body = issueDetails.body?.toLowerCase() || "";
  const labels = issueDetails.labels?.map((l: any) => l.name?.toLowerCase()) || [];

  let plan = "";

  // Bug fixes
  if (
    title.includes("fix") ||
    body.includes("bug") ||
    body.includes("error") ||
    labels.includes("bug")
  ) {
    plan += `1. **Reproduce the Issue**: First, try to reproduce the bug locally
2. **Identify Root Cause**: Look at the error messages and trace the problem
3. **Write a Test**: Create a test that reproduces the bug (if applicable)
4. **Implement the Fix**: Make the necessary code changes
5. **Test the Fix**: Ensure your fix resolves the issue without breaking other functionality
6. **Update Documentation**: Update any relevant documentation if needed\n\n`;
  }

  // Documentation
  if (
    title.includes("doc") ||
    body.includes("documentation") ||
    labels.includes("documentation")
  ) {
    plan += `1. **Review Existing Docs**: Understand the current documentation structure
2. **Identify Gaps**: Find what information is missing or unclear
3. **Research the Topic**: Gather accurate information about the subject
4. **Write Clear Content**: Create clear, concise documentation
5. **Add Examples**: Include practical examples where helpful
6. **Review for Clarity**: Ensure the documentation is easy to understand\n\n`;
  }

  // Feature additions
  if (
    title.includes("add") ||
    title.includes("implement") ||
    body.includes("feature") ||
    labels.includes("enhancement")
  ) {
    plan += `1. **Understand Requirements**: Clearly understand what the feature should do
2. **Design the Solution**: Plan how to implement the feature
3. **Check Existing Code**: Look for similar implementations in the codebase
4. **Implement the Feature**: Write the necessary code
5. **Add Tests**: Create tests for the new feature
6. **Update Documentation**: Document the new feature\n\n`;
  }

  // Performance improvements
  if (
    title.includes("performance") ||
    body.includes("slow") ||
    body.includes("optimize") ||
    labels.includes("performance")
  ) {
    plan += `1. **Measure Current Performance**: Establish baseline metrics
2. **Identify Bottlenecks**: Find what's causing performance issues
3. **Research Solutions**: Look for optimization techniques
4. **Implement Optimizations**: Apply performance improvements
5. **Measure Improvements**: Verify that performance has improved
6. **Test Thoroughly**: Ensure optimizations don't break functionality\n\n`;
  }

  // Testing
  if (
    title.includes("test") ||
    body.includes("test") ||
    labels.includes("test")
  ) {
    plan += `1. **Understand What to Test**: Identify the specific functionality to test
2. **Review Existing Tests**: Look at similar tests in the codebase
3. **Write Test Cases**: Create comprehensive test cases
4. **Implement Tests**: Write the actual test code
5. **Run Tests**: Ensure all tests pass
6. **Check Coverage**: Make sure the tests cover the important scenarios\n\n`;
  }

  // Generic plan if no specific type is identified
  if (!plan) {
    plan += `1. **Read the Issue Carefully**: Understand exactly what needs to be done
2. **Explore the Codebase**: Familiarize yourself with the relevant code
3. **Plan Your Approach**: Decide how you'll implement the solution
4. **Make the Changes**: Implement your solution
5. **Test Your Changes**: Ensure everything works as expected
6. **Submit Your Work**: Create a pull request with clear description\n\n`;
  }

  return plan;
}

// Generate file suggestions based on issue details
function generateSpecificFileSuggestions(issueDetails: any): string {
  const title = issueDetails.title?.toLowerCase() || "";
  const body = issueDetails.body?.toLowerCase() || "";
  const labels = issueDetails.labels?.map((l: any) => l.name?.toLowerCase()) || [];

  let suggestions = "";

  // Documentation issues
  if (
    title.includes("doc") ||
    body.includes("documentation") ||
    labels.includes("documentation")
  ) {
    suggestions += `- **README.md**: Main project documentation
- **docs/**: Documentation directory (if it exists)
- **CONTRIBUTING.md**: Contribution guidelines
- **API documentation files**: If applicable\n\n`;
  }

  // Test-related issues
  if (
    title.includes("test") ||
    body.includes("test") ||
    labels.includes("test")
  ) {
    suggestions += `- **test/**: Test directory
- **spec/**: Specification files
- **__tests__/**: Jest test directory
- ***.test.js/ts**: Test files
- ***.spec.js/ts**: Specification files\n\n`;
  }

  // Code-related issues
  if (
    title.includes("fix") ||
    title.includes("add") ||
    body.includes("bug") ||
    body.includes("feature")
  ) {
    suggestions += `- **src/**: Source code directory
- **lib/**: Library files
- **components/**: Component files (if applicable)
- **utils/**: Utility functions
- **index files**: Main entry points\n\n`;
  }

  // Generic suggestions
  if (!suggestions) {
    suggestions += `- **Check the issue comments**: Often contains file suggestions
- **Look for similar issues**: See what files were changed in similar PRs
- **Search the codebase**: Look for relevant keywords
- **Check the project structure**: Understand the codebase organization\n\n`;
  }

  return suggestions;
}

// Generate testing strategy based on issue details
function generateSpecificTestingStrategy(issueDetails: any): string {
  const title = issueDetails.title?.toLowerCase() || "";
  const body = issueDetails.body?.toLowerCase() || "";
  const labels = issueDetails.labels?.map((l: any) => l.name?.toLowerCase()) || [];

  let strategy = "";

  // Bug fixes
  if (
    title.includes("fix") ||
    body.includes("bug") ||
    body.includes("error") ||
    labels.includes("bug")
  ) {
    strategy += `1. **Reproduce the Bug**: First, ensure you can reproduce the original issue
2. **Test the Fix**: Verify that your changes resolve the bug
3. **Regression Testing**: Make sure you haven't broken other functionality
4. **Edge Cases**: Test with different inputs and scenarios
5. **Integration Testing**: Test how your fix works with other parts of the system\n\n`;
  }

  // Feature additions
  if (
    title.includes("add") ||
    title.includes("implement") ||
    body.includes("feature") ||
    labels.includes("enhancement")
  ) {
    strategy += `1. **Unit Tests**: Write tests for individual functions/components
2. **Integration Tests**: Test how the feature works with existing code
3. **User Acceptance Testing**: Test from a user's perspective
4. **Performance Testing**: Ensure the feature doesn't impact performance
5. **Cross-browser Testing**: If applicable, test in different browsers\n\n`;
  }

  // Documentation
  if (
    title.includes("doc") ||
    body.includes("documentation") ||
    labels.includes("documentation")
  ) {
    strategy += `1. **Readability Testing**: Have someone else read your documentation
2. **Accuracy Testing**: Verify all information is correct
3. **Link Testing**: Check that all links work correctly
4. **Format Testing**: Ensure proper markdown formatting
5. **Completeness Testing**: Make sure nothing important is missing\n\n`;
  }

  // Generic strategy
  if (!strategy) {
    strategy += `1. **Manual Testing**: Test your changes manually
2. **Automated Testing**: Run existing tests and add new ones if needed
3. **Code Review**: Have someone review your code
4. **Integration Testing**: Test with the broader system
5. **User Testing**: Test from an end-user perspective\n\n`;
  }

  return strategy;
}

// Generate deliverables based on issue details
function generateSpecificDeliverables(issueDetails: any): string {
  const title = issueDetails.title?.toLowerCase() || "";
  const body = issueDetails.body?.toLowerCase() || "";
  const labels = issueDetails.labels?.map((l: any) => l.name?.toLowerCase()) || [];

  let deliverables = "";

  // Bug fixes
  if (
    title.includes("fix") ||
    body.includes("bug") ||
    body.includes("error") ||
    labels.includes("bug")
  ) {
    deliverables += `- **Fixed Code**: The corrected code that resolves the bug
- **Test Cases**: Tests that verify the bug is fixed
- **Description**: Clear explanation of what was wrong and how you fixed it
- **Before/After**: If applicable, show the difference your fix makes\n\n`;
  }

  // Feature additions
  if (
    title.includes("add") ||
    title.includes("implement") ||
    body.includes("feature") ||
    labels.includes("enhancement")
  ) {
    deliverables += `- **New Code**: The implementation of the feature
- **Tests**: Comprehensive tests for the new feature
- **Documentation**: Updated documentation explaining the new feature
- **Examples**: Usage examples if applicable\n\n`;
  }

  // Documentation
  if (
    title.includes("doc") ||
    body.includes("documentation") ||
    labels.includes("documentation")
  ) {
    deliverables += `- **Updated Documentation**: The improved documentation
- **Screenshots**: If applicable, include relevant screenshots
- **Examples**: Practical examples to illustrate concepts
- **Links**: Any relevant links or references\n\n`;
  }

  // Generic deliverables
  if (!deliverables) {
    deliverables += `- **Code Changes**: Any modified or new code files
- **Tests**: Tests to verify your changes work correctly
- **Documentation**: Updated documentation if needed
- **Pull Request**: Well-described pull request with clear title and description
- **Issue Reference**: Link back to the original issue\n\n`;
  }

  return deliverables;
}
