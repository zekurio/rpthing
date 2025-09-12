FROM oven/bun:1.2.21
WORKDIR /app
ADD . .
RUN bun install
WORKDIR /app/apps/server
RUN bun run build
ENV DATABASE_URL="file:/app/apps/server/local.db"
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "run", "start"]