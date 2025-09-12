FROM oven/bun:1.2.21
WORKDIR /app
ADD . .
RUN bun install
WORKDIR /app/apps/web
RUN bun run build
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "run", "start"]

