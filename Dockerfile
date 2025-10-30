# syntax=docker/dockerfile:1
# ✅ Use BuildKit for caching (recommended)
# docker buildx build --progress=plain --no-cache=false .

FROM node:lts AS deps

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Disable telemetry
ENV DISABLE_TELEMETRY=true \
  POSTHOG_DISABLED=true \
  MASTRA_TELEMETRY_DISABLED=true \
  DO_NOT_TRACK=1

WORKDIR /app

# Copy only lockfile + manifest for efficient caching
COPY package.json pnpm-lock.yaml ./

# Reduce memory pressure during install
ENV PNPM_NETWORK_CONCURRENCY=1 \
  PNPM_CHILD_CONCURRENCY=2 \
  PNPM_SIDE_EFFECTS_CACHE=false \
  NODE_OPTIONS=--max-old-space-size=1024

# Install all dependencies (cached, low concurrency)
RUN pnpm config set network-concurrency 1 && \
  pnpm config set child-concurrency 2 && \
  pnpm config set side-effects-cache false && \
  pnpm install --frozen-lockfile


# -------------------- Build Stage --------------------
FROM node:lts AS build

RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /pnpm /pnpm
COPY package.json pnpm-lock.yaml ./

# Copy config and source files
COPY next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs ./
COPY src ./src
COPY public ./public

# Build the app
RUN pnpm run build && pnpm prune --prod


# -------------------- Runtime Stage --------------------
FROM node:lts AS runtime

# Create non-root user
RUN groupadd -g 1001 appgroup && \
  useradd -u 1001 -g appgroup -m -d /app -s /bin/false appuser

WORKDIR /app

# Copy production node_modules produced in build stage
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./package.json

# Copy only what’s needed to run
COPY --from=build --chown=appuser:appgroup /app/.next ./.next
COPY --from=build --chown=appuser:appgroup /app/.mastra ./.mastra
COPY --from=build --chown=appuser:appgroup /app/public ./public
COPY --from=build --chown=appuser:appgroup /app/next.config.ts ./next.config.ts

ENV NODE_ENV=production \
  NODE_OPTIONS="--enable-source-maps"

USER appuser

EXPOSE 3000
EXPOSE 4111

CMD ["sh", "-c", "./node_modules/.bin/mastra start & ./node_modules/.bin/next start -p 3000"]
