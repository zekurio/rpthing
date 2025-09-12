FROM oven/bun:1.2.21 AS turbo-prune
WORKDIR /repo

# Copy the repository (trimmed by .dockerignore) so prune can copy sources
ADD . .

# Generate a pruned workspace for the server app (pin turbo to repo version)
RUN bunx turbo@2.5.4 prune --scope=server --docker

FROM oven/bun:1.2.21 AS installer
WORKDIR /app
# Copy pruned manifests + lockfile; install all deps (incl. dev) for build
COPY --from=turbo-prune /repo/out/json/ ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2.21 AS builder
WORKDIR /app
COPY --from=installer /app/ ./
# Copy only the source files needed for the server build
COPY --from=turbo-prune /repo/out/full/ ./
WORKDIR /app/apps/server
RUN bun run build

FROM oven/bun:1.2.21 AS prod-deps
WORKDIR /app
COPY --from=turbo-prune /repo/out/json/ ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.2.21 AS runner
ENV NODE_ENV=production
WORKDIR /app

# Production dependencies and required package.json files
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=turbo-prune /repo/out/json/package.json ./package.json
COPY --from=turbo-prune /repo/out/json/apps/server/package.json ./apps/server/package.json

# Built server output
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Include SQL migrations into runtime image
COPY --from=turbo-prune /repo/out/full/apps/server/src/db/migrations ./apps/server/src/db/migrations

EXPOSE 3000

WORKDIR /app/apps/server
CMD ["bun", "run", "start"]