# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start development server (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

There is no test suite configured. The package manager is `pnpm` (see `pnpm-workspace.yaml`).

## Environment

Requires a `DATABASE_URL` environment variable pointing to a PostgreSQL instance. The app will throw at startup if it is missing (`lib/db.ts`).

## Architecture

This is a **Next.js 15 App Router** application implementing a NIST CSF 2.0 cybersecurity risk management workflow for IT assets.

### Route layout

```
app/
  layout.tsx                  # Root layout — wraps everything in AuthProvider + ThemeProvider
  auth/                       # Public auth pages (login, sign-up) — no sidebar/navbar
  (shared-layout)/            # Protected pages — layout adds Navbar + Sidebar
    page.tsx                  # Dashboard (/)
    assessments/              # Risk assessment list + creation form
    assets/                   # IT asset registry
    controls/                 # SCF control recommendations
    threats/                  # Threat catalog
    reports/                  # Reports
    users/                    # User management
    organization/             # Org settings
```

### API routes

There are two parallel API layers that partially overlap:

- **`/api/*`** — Direct DB routes using `lib/db.ts` (pg Pool). Most are not yet connected to the database (return stub responses). Pattern: each route file exports `GET`/`POST` handlers hitting the pool directly.
- **`/api/v1/*`** — Feature-specific routes for the NIST-aligned login flow:
  - `/api/v1/auth/login` and `/api/v1/auth/verify-mfa` — primary login path used by the login page
  - `/api/v1/risk/calculate-login-risk` — scores login attempt risk
  - `/api/v1/audit/log-login-event` — writes audit events

The login page (`app/auth/login/page.tsx`) calls `/api/v1/auth/login`, NOT `/api/login` (which exists but is a simpler stub).

### Authentication

Auth is **client-side only**: `AuthContext` (`app/context/AuthContext.tsx`) stores the user object in `localStorage`. There are no server-side sessions or cookies. Protected pages check `useAuth()` and redirect to `/auth/login` if `user` is null.

Login has NIST-aligned security features built into the client: rate limiting / lockout state stored in `localStorage` (5 attempts → 15 min lockout), login risk scoring via `/api/v1/risk/calculate-login-risk`, audit logging, and optional MFA via `/api/v1/auth/verify-mfa`.

### Database schema

Seven PostgreSQL tables implementing a phased risk assessment pipeline:

1. **`assets`** — IT asset inventory (hardware, software, data, services/people) with criticality, RTO/RPO, and security posture fields
2. **`threat_catalog`** — MITRE ATT&CK-aligned threat library (pre-seeded, ~10 threats)
3. **`threat_asset_type_mapping`** — Pre-maps threats to asset types with applicability scores (used to suggest relevant threats when an asset is selected)
4. **`risk_register`** — Links a specific asset to a specific threat; the core risk record
5. **`risk_analysis`** — 5×5 scoring (likelihood × impact = risk_score 1–25; thresholds: ≤4 Low, ≤9 Medium, ≤16 High, ≥17 Critical)
6. **`scf_controls`** — SCF (Secure Controls Framework) control library (pre-seeded, 25+ controls)
7. **`control_recommendations`** — Links a scored risk to recommended SCF controls with implementation tracking

The assessment workflow flows: Asset → Risk Register → Risk Analysis → Control Recommendations.

### Key library files

- `lib/db.ts` — Exports a singleton `pool` (pg Pool). Import this for all DB queries.
- `lib/scf-mapping.ts` — Static `SCF_NIST_MAPPING` record mapping NIST CSF 2.0 category codes (e.g. `"PR.AA"`) to `SCFControl` objects. Used to derive control recommendations from NIST functions.
- `lib/utils.ts` — Only exports `cn()` (clsx + tailwind-merge).

### UI components

Uses **shadcn/ui** (configured via `components.json`) with Radix UI primitives, Tailwind CSS v4, and Lucide icons. All shadcn components live in `components/ui/`. Custom dashboard/visualization components (Recharts-based) live directly in `components/`.

### Forms

Forms use `react-hook-form` with `zod` resolvers. Schemas are colocated in `app/schemas/` (e.g. `app/schemas/auth.ts`).
