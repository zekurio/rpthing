# RPThing

A modern web application for managing roleplay characters and campaigns. Built with Next.js, TypeScript, and collaborative features for storytelling.

## Features

- **Character Management** - Create detailed characters with custom traits and images
- **Trait System** - Define custom rating systems (numeric or grade-based)
- **Realm Organization** - Group characters within different campaign contexts
- **Collaborative Rating** - Multiple users can rate characters on custom traits
- **Image Upload** - Upload and crop character reference images with S3 storage
- **Real-time Updates** - Live collaboration with tRPC and React Query

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment variables (see .env.example)
cp .env.example .env

# Push database schema
bun db:push

# Start development server
bun dev
```

Visit [http://localhost:3000](http://localhost:3000) to get started.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API routes, tRPC
- **Database**: SQLite with Drizzle ORM
- **Auth**: Better-Auth
- **Storage**: S3-compatible
- **Runtime**: Bun

## Commands

- `bun dev` - Development server
- `bun build` - Build for production
- `bun db:push` - Push schema changes
- `bun db:studio` - Database viewer
- `bun check` - Lint and format
