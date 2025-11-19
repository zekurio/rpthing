# Agent Guidelines

## Commands
- **Build:** `bun run build`
- **Lint/Format:** `bun run check` (uses Biome)
- **Database:** `bun run db:push` (Drizzle)
- **Dev Server:** `bun run dev`

## Code Style
- **Frameworks:** Next.js 15 (App Router), tRPC, Drizzle ORM, Tailwind CSS, Radix UI.
- **Language:** TypeScript (Strict). Use `interface` or `type` for definitions.
- **Formatting:** Use Biome. Indent with tabs, double quotes.
- **Imports:** Use `@/` alias for project root imports. Group imports: external, internal.
- **Naming:** camelCase for vars/funcs, PascalCase for components/interfaces.
- **Error Handling:** Use `TRPCError` for API routes. Handle errors gracefully in UI.
- **Components:** Functional components. Use `lucide-react` for icons.
- **State:** React Query (`@tanstack/react-query`) for server state.

## Rules
- **Package Manager:** Use `bun` for all script executions and package management.
- **Database:** Do not modify schema manually; use Drizzle schema files in `server/db/schema`.
- **Styling:** Use Tailwind CSS classes. Avoid inline styles.
