# Copilot instructions for this repository

## Quick commands
- Start dev server: `npm run dev` (also works with `pnpm dev`, `yarn dev`, `bun dev`).
- Build production bundle: `npm run build`
- Start production server: `npm run start`
- Lint: `npm run lint` (runs `eslint`).

Run ESLint on a single file:
- `npx eslint path/to/file.tsx`

Tests:
- No repository-level `test` script or test framework detected. If adding tests, common single-test commands:
  - Jest: `npx jest path/to/file.test.ts -t "test name"`
  - Vitest: `npx vitest run path/to/file.test.ts -t "test name"`

## High-level architecture
- Next.js (App Router) TypeScript application (see `app/` directory).
- UI: shadcn/ui + Radix primitives + Tailwind CSS; components in `components/`.
- Forms: `react-hook-form` + `zod` resolvers; schemas colocated in `app/schemas/`.
- DB: PostgreSQL via `pg` and `lib/db.ts` (singleton pool). SQL migrations live under `database/migrations/`.
- Auth: client-side AuthContext (`app/context`) with redirects for protected routes; API routes live under `app/api` and `app/api/v1`.
- Scripts: project-level scripts in `scripts/` (e.g., `migrate.js`, `create-docs.mjs`).
- Environment: `DATABASE_URL` required for DB operations (app may throw if missing).

## Key repository conventions and notes for Copilot sessions
- TypeScript path alias `@/*` is configured in `tsconfig.json` — resolve imports accordingly.
- This repo uses Next.js App Router conventions: server components (default) vs client components — look for `'use client'` at file top when suggesting edits.
- DB access pattern: import the singleton `pool` from `lib/db.ts` for direct SQL. Avoid inventing new DB connection patterns.
- Schemas and validation live alongside UI routes in `app/schemas/`; prefer updating schemas there when changing forms.
- Migrations: modify SQL under `database/migrations/` and update `scripts/migrate.js` when adding automated migration steps.
- Linting: `npm run lint` runs ESLint — prefer fixing ESLint errors via small targeted edits (run ESLint on the specific file to confirm).
- No global test runner configured. Add tests explicitly and document the test command in package.json so Copilot can find it.

## Existing assistant configs to consult
- `CLAUDE.md` (contains architecture and environment notes) — consult before making DB or auth changes.

---
If you want this file adjusted (more detail on CI, testing setup, or step-by-step local DB setup), say which area to expand.