# Repository Intelligence Agent

## Description and Purpose

The **Repository Intelligence Agent** is an advanced tool designed to analyze GitHub repositories, providing insights into code quality, repository metrics, pull requests, commit patterns, and more. It can generate detailed reports, visualizations, and actionable recommendations for maintainers and contributors. The agent is built to run as a containerized service, making it easy to deploy in cloud or CI environments, and is compatible with the Nosana decentralized compute network.

## Features
- Repository analysis (code, PRs, commits, metrics)
- Visualization and chart generation
- Code review summaries
- Beginner-friendly issue guidance
- Designed for extensibility and automation

---

## Included Agents and Tools

### Repository Intelligence Agent
- **Purpose:** Analyzes GitHub repositories for code quality, repository metrics, pull requests, commit patterns, and more. Provides actionable insights and visualizations.

### Tools
- **Repository Metrics Tool:** Retrieves comprehensive metrics and statistics about a GitHub repository (stars, forks, issues, contributors, etc.).
- **Chart Generator Tool:** Produces visualizations and charts for repository data, generating markdown reports with embedded visuals.
- **Beginner Issues Tool:** Finds and suggests beginner-friendly issues ("good first issues") in a repository.
- **Guided Issues Tool:** Provides step-by-step guidance and actionable plans for solving beginner-friendly issues.
- **Commit Analysis Tool:** Analyzes commit history for patterns, contributors, development activity, and code evolution.
- **PR Summary Tool:** Analyzes pull requests for patterns, review activity, merge metrics, and provides detailed PR insights.
- **Code Review Tool:** Generates a comprehensive file-by-file summary of the codebase, with clickable links and summaries for each file.
- **Repository Analysis Workflow:** Orchestrates the overall analysis process, combining multiple tools to generate a complete repository report.

---

## Setup Instructions

### 1. Clone the Repository
```sh
git clone <your-repo-url>
cd agent-challenge
```

### 2. Install Dependencies
```sh
pnpm install
```

### 3. Build the Project
```sh
pnpm run build
```

---

## Environment Variables

| Variable                   | Required | Description                                                                 | Example Value                                                                 |
|----------------------------|----------|-----------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| `MODEL_NAME_AT_ENDPOINT`   | Yes      | Name of the LLM model at the endpoint                                       | qwen2.5:7b                                                                    |
| `API_BASE_URL`             | Yes      | Base URL for the LLM API                                                    | https://your-llm-endpoint/api                                                 |
| `BASE_URL`                 | No       | Alternative base URL for the LLM API                                        | https://your-llm-endpoint/api                                                 |
| `OLLAMA_HOST`              | No       | Ollama host override (for custom LLM endpoints)                             | https://your-llm-endpoint                                                     |
| `OLLAMA_ORIGINS`           | No       | Ollama allowed origins (CORS)                                               | https://your-llm-endpoint                                                     |
| `GITHUB_TOKEN`             | Yes      | GitHub Personal Access Token for API access                                 | github_pat_...                                                                |
| `UPSTASH_REDIS_REST_URL`   | Yes      | Redis URL for memory/state storage                                          | https://moved-prawn-57809.upstash.io                                          |
| `UPSTASH_REDIS_REST_TOKEN` | Yes      | Redis access token                                                          | AeHRAAIj...                                                                   |
| `PORT`                     | No       | Port for the agent HTTP server                                              | 8080                                                                          |

**Notes:**
- `MODEL_NAME_AT_ENDPOINT`, `API_BASE_URL`, `GITHUB_TOKEN`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` are typically required for full functionality.
- `OLLAMA_HOST` and `OLLAMA_ORIGINS` are only needed if you are overriding Ollama settings.
- `BASE_URL` is optional and may be used for alternative LLM endpoints.
- `PORT` defaults to 8080 if not set.

### Example `.env` file

```env
# LLM Endpoint Configuration
MODEL_NAME_AT_ENDPOINT=qwen2.5:7b
API_BASE_URL=https://your-llm-endpoint/api
BASE_URL=https://your-llm-endpoint/api

# Optional: Override Ollama settings if needed
OLLAMA_HOST=https://your-llm-endpoint
OLLAMA_ORIGINS=https://your-llm-endpoint

GITHUB_TOKEN=your_github_pat

UPSTASH_REDIS_REST_URL=https://your-upstash-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

PORT=8080
```

---

## Docker Build and Run Commands

### 1. Build the Docker Image (for AMD64)
```sh
docker buildx build --platform linux/amd64 -t <your-dockerhub-username>/agent-challenge:latest --push .
```

### 2. Run the Docker Container
```sh
docker run -p 8080:8080 \
  -e UPSTASH_REDIS_REST_URL=redis://localhost:6379 \
  -e UPSTASH_REDIS_REST_TOKEN=your-redis-token \
  <your-dockerhub-username>/agent-challenge:latest
```

---

## Example Usage

### 1. Local Development
Start the agent locally (after installing dependencies):
```sh
pnpm run dev
```

### 2. Using with Nosana
- Publish your Docker image to Docker Hub.
- Update your `nosana_mastra.json` with the correct image name.
- Post your job to the Nosana network:
```sh
nosana job post --file nosana_mastra.json --market nvidia-3060 --timeout 30
```

### 3. API Endpoints
The agent exposes an HTTP API on port 8080 (see your implementation for available endpoints).


