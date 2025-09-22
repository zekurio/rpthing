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


