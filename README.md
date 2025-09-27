# RPThing - a tool to manage your roleplay campaign

A modern web application for creating and managing characters in role-playing scenarios. Built with Next.js, TypeScript, and a full-stack architecture optimized for collaborative storytelling and character development.

## Features

- **Character Creation** - Create detailed characters with custom traits and images
- **Trait System** - Define custom traits with numeric or grade-based ratings
- **Realm Management** - Organize characters within different realms/contexts
- **Image Management** - Upload and crop character reference images with S3 storage
- **Collaborative Rating** - Rate characters on custom traits for group activities
- **Real-time Updates** - Live collaboration with tRPC and React Query
- **TypeScript** - Full type safety across the application
- **Modern UI** - Built with TailwindCSS and shadcn/ui components
- **Authentication** - Secure login with Better-Auth
- **Database** - SQLite with Drizzle ORM for data persistence

## Getting Started

First, install the dependencies:

```bash
bun install
```
## Database Setup

This project uses SQLite with Drizzle ORM for data persistence.

1. Set up your environment variables in the root `.env` file:
```bash
# Database Configuration
DATABASE_URL="file:./dev.db"

# Authentication Configuration (Better-Auth)
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# S3 Storage Configuration (for character images)
S3_ACCESS_KEY_ID="your-s3-access-key-id"
S3_SECRET_ACCESS_KEY="your-s3-secret-access-key"
S3_BUCKET_NAME="your-s3-bucket-name"
S3_REGION="us-east-1"
# Optional: For S3-compatible services (like MinIO, DigitalOcean Spaces, etc.)
# S3_ENDPOINT="https://your-s3-compatible-endpoint.com"
```

2. Apply the database schema:
```bash
bun db:push
```


Then, run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the application.

## Key Features

- **Character Creation**: Build detailed characters with custom traits, descriptions, and reference images
- **Trait System**: Define custom rating systems (numeric or grade-based) for character evaluation
- **Realm Management**: Organize characters within different contexts or game worlds
- **Collaborative Rating**: Multiple users can rate characters on custom traits for group activities
- **Image Management**: Upload and crop character reference images with integrated S3 storage
- **Real-time Updates**: Live collaboration using tRPC and React Query for instant updates

## Tech Stack

- **Frontend**: Next.js 15 with React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API routes with tRPC for type-safe APIs
- **Database**: SQLite with Drizzle ORM
- **Authentication**: Better-Auth for secure user management
- **Storage**: S3-compatible storage for image assets
- **Development**: Bun runtime, Biome for linting, Turbopack for fast development

## Project Structure

```
rpthing/
├── app/             # Next.js app directory with pages and layouts
│   ├── api/         # API routes and authentication
│   ├── realms/      # Realm management pages
│   └── settings/    # User settings pages
├── components/      # Reusable React components
├── hooks/          # Custom React hooks
├── lib/            # Utility libraries and configurations
├── server/         # Backend logic and database schemas
│   ├── auth.ts     # Authentication configuration
│   ├── db/         # Database schemas and migrations
│   ├── routers/    # tRPC API routers
│   └── storage.ts  # S3 storage configuration
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Available Scripts

- `bun dev` - Start the development server with Turbopack
- `bun build` - Build the application for production
- `bun start` - Start the production server
- `bun db:push` - Push database schema changes
- `bun db:studio` - Open Drizzle Studio to view database
- `bun db:generate` - Generate database migration files
- `bun db:migrate` - Run database migrations
- `bun check` - Run Biome linting and formatting
- `bun lint:ci` - Run linting for CI environments
- `bun check-types` - Check TypeScript types across the project
