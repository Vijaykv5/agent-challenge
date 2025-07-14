# Use official Node.js image for smaller, faster builds
FROM node:20-slim

# Install system dependencies (curl for Ollama if needed, plus build tools for node-gyp)
RUN apt-get update && apt-get install -y \
  curl \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
# Use --frozen-lockfile for reproducible builds
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Expose the port Mastra uses
EXPOSE 8080

# Build the project (if needed, but mastra dev/start auto-builds)
# RUN pnpm run build

# Default command: start the Mastra agent
CMD ["pnpm", "run", "dev"]