# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ConstruAP is a construction management and real estate (imobiliário) SPA for the Portuguese market. It covers obras (construction projects), imobiliário (real estate), finance, RH (human resources), payroll, compras (procurement), and reporting. The UI language is Portuguese (PT-BR).

## Commands

```bash
npm run dev            # Start Vite dev server
npm run build          # TypeScript check + Vite production build
npm run typecheck      # TypeScript only (tsc --noEmit)
npm run lint           # ESLint (zero warnings enforced)
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier format src/**
npm run test           # Run all tests (vitest run)
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report (70% threshold)
```

Run a single test file: `npx vitest run src/path/to/file.test.ts`

## Architecture

**Stack:** React 19 + TypeScript + Vite 7 + Supabase + Tailwind CSS 3

**Feature-based structure** — each business domain is self-contained under `src/features/`:

```
src/
├── app/                   # Providers (QueryClient, Auth), router, AppLayout
├── features/              # Business modules (auth, dashboard, obras, imobiliario,
│                          #   finance, rh, payroll, compras, relatorios, admin)
├── components/ui/         # shadcn/ui primitives (new-york style, Lucide icons)
├── services/              # Supabase query functions (one file per domain)
├── lib/                   # Supabase clients, React Query config, export utils
├── hooks/                 # Shared custom hooks
├── types/                 # database.types.ts (Supabase-generated), type declarations
└── tests/                 # Test setup (jsdom, vitest globals)
```

Each feature module contains pages (`*Page.tsx`), hooks (`use*.ts`), components, and utils as needed.

**Data flow:** Service functions (`src/services/*.ts`) call Supabase directly → consumed by React Query hooks in feature modules → rendered in page components.

**Routing:** React Router v7 with lazy-loaded feature pages, nested under `RequireAuth` and `RequirePermission` guards. Route config is in `src/app/router.tsx`.

### Auth & Permissions

- Supabase Auth for authentication (JWT sessions)
- Custom roles/permissions system in the database (`custom_roles`, `role_permissions`, `permissions` tables)
- Permission keys follow `module.action` pattern: `obras.view`, `finance.manage`, `rh.manage`, `admin.manage`, etc.
- `RequireAuth` wraps all protected routes; `RequirePermission` gates specific features
- `src/lib/supabaseAdmin.ts` uses the service role key (for admin-only operations like user creation)
- `usePermissions()` hook provides the current user's permission set

### Multi-Tenancy

All data is tenant-scoped via Supabase RLS policies. The `tenants` table is the root, and most tables include a `tenant_id` foreign key with row-level security enforced at the database level.

### Database

Supabase PostgreSQL with migrations in `supabase/migrations/` (33 files). Key patterns:
- `has_permission()` SQL function for permission checks in RLS policies
- TypeScript types auto-generated in `src/types/database.types.ts`

## Key Libraries & Patterns

| Concern | Library |
|---|---|
| Forms | React Hook Form + Zod validation |
| Tables | TanStack React Table |
| Server state | TanStack React Query (retry: 2, no retry on 4xx) |
| Client state | Zustand (available), React Context (auth) |
| Styling | Tailwind CSS + CSS variables for theming + CVA for variants |
| Notifications | Sonner (toast) |
| Charts | Recharts |
| PDF export | jsPDF + jsPDF-autotable |
| i18n | i18next + react-i18next |
| Icons | Lucide React |

## Code Style

- **Path alias:** `@/` maps to `src/`
- **shadcn/ui:** New-york style, add components via `npx shadcn@latest add <component>`
- **Prettier:** 2 spaces, single quotes, no semicolons, trailing commas, 100 char width
- **ESLint:** Strict TypeScript checking, no `any`, no unused vars (except `_` prefix), no floating promises
- **Commits:** Conventional commits enforced via commitlint — `type(scope): Subject in sentence case` (types: feat, fix, docs, style, refactor, test, chore, perf, ci, revert)

## Environment Variables

Required in `.env.local`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_SERVICE_ROLE_KEY=   # admin operations only
```
