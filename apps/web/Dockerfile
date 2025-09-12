FROM oven/bun:1.2.21 AS turbo-prune
WORKDIR /repo

# Copy the repository (trimmed by .dockerignore) so prune can copy sources
ADD . .

# Generate a pruned workspace that includes web and the server types it imports
RUN bunx turbo@2.5.4 prune --scope=web --scope=server --docker


FROM oven/bun:1.2.21 AS installer
WORKDIR /app
# Install all deps (incl. dev) for build using pruned manifests + lockfile
COPY --from=turbo-prune /repo/out/json/ ./
RUN bun install --frozen-lockfile


FROM oven/bun:1.2.21 AS builder
WORKDIR /app
COPY --from=installer /app/ ./
# Copy only the source files needed for the web build
COPY --from=turbo-prune /repo/out/full/ ./
WORKDIR /app/apps/web

# Allow passing public envs for Next.js at build time
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

RUN bun run build


FROM node:20-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# Copy Next.js standalone server and static assets only
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

USER node
CMD ["node", "apps/web/server.js"]

