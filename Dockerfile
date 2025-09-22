# syntax=docker/dockerfile:1.7

# 1) Base builder image with Bun
FROM oven/bun:1 as deps
WORKDIR /app

# Install dependencies (cached if lockfile unchanged)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 2) Build application
FROM deps as builder
WORKDIR /app
COPY . .
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Accept build-time env for validation in env.ts (not persisted to final image)
ARG DATABASE_URL
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG DISCORD_CLIENT_ID
ARG DISCORD_CLIENT_SECRET
ARG S3_ACCESS_KEY_ID
ARG S3_SECRET_ACCESS_KEY
ARG S3_BUCKET_NAME
ARG S3_ENDPOINT
ARG PUBLIC_S3_ENDPOINT
ARG NEXT_PUBLIC_S3_ENDPOINT

# Expose as environment during build so Next.js/T3 env parsing succeeds
ENV DATABASE_URL=${DATABASE_URL} \
    BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET} \
    BETTER_AUTH_URL=${BETTER_AUTH_URL} \
    DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID} \
    DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET} \
    S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID} \
    S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY} \
    S3_BUCKET_NAME=${S3_BUCKET_NAME} \
    S3_ENDPOINT=${S3_ENDPOINT} \
    PUBLIC_S3_ENDPOINT=${PUBLIC_S3_ENDPOINT} \
    NEXT_PUBLIC_S3_ENDPOINT=${NEXT_PUBLIC_S3_ENDPOINT}

# Build Next.js (standalone output enabled in next.config)
RUN bunx next build

# 3) Runtime image with Bun (lean)
FROM oven/bun:1 as runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOST=0.0.0.0 \
    PORT=3000

# Copy the minimal standalone server and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Use Bun to run the Next standalone server
CMD ["bun", "server.js"]


