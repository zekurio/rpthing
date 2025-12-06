# Agent Guidelines

## Commands
- **Build:** `bun run build`
- **Lint/Format:** `bun run check` (uses Biome)
- **Type Check:** `tsc --noEmit`
- **Database:** `bun run db:push` (Drizzle)
- **Database Studio:** `bun run db:studio`
- **Database Generate:** `bun run db:generate`
- **Database Migrate:** `bun run db:migrate`
- **Dev Server:** `bun run dev`
- **Start:** `bun run start`

## Code Style
- **Frameworks:** Next.js 15 (App Router), tRPC, Drizzle ORM, Tailwind CSS, Radix UI, Better Auth
- **Language:** TypeScript (Strict). Use `interface` or `type` for definitions
- **Formatting:** Biome with tabs, double quotes, sorted Tailwind classes
- **Imports:** Use `@/` alias. Group: external libs, internal modules, types, relative imports
- **Naming:** camelCase for vars/funcs, PascalCase for components/interfaces, UPPER_CASE for constants
- **Error Handling:** `TRPCError` for API routes, graceful UI error handling with Sonner
- **Components:** Functional components with `use client` when needed. Use `lucide-react` for icons
- **State:** React Query for server state, React Hook Form with Zod for forms
- **UI Components:** shadcn/ui components in `components/ui/`, use `cn()` utility for className merging

## Rules
- **Package Manager:** Use `bun` for all operations
- **Database:** Only modify schema via Drizzle files in `server/db/schema/`
- **Styling:** Tailwind CSS classes only, no inline styles. Use responsive design patterns
- **Pre-commit:** Husky runs `bun run check` automatically
- **Type Safety:** Strict TypeScript, no `any` types, use proper type imports
