# Manifest

> _Every unit, accounted for._

Cross-platform B2B distribution marketplace (**HALINEST**): manufacturers publish a catalog,
warungs (community retailers) order and pay, HALINEST takes a **+3% fee**, distributors fulfil.
Web first; mobile planned.

## Status (2026-06-04)

**Working locally** — the full marketplace loop, built and verified on a local Supabase stack:

- **Database:** schema (identity · catalog · orders · payments · settlements · shipments),
  money-math triggers (+3% fee, line/order roll-ups), the **settlement split** (net → manufacturer,
  fee → HALINEST, **commission → distributor**), Row-Level Security across every table, and seed data.
- **Web app (`apps/web`, Tailwind):** **self-service signup** + role-aware login, and a UI for all
  four parties — **warung** (orders, shop), **manufacturer** (catalog + sales analytics), **admin**
  (confirm payments, assign shipments, platform analytics), **distributor** (advance shipments).
  RLS is enforced end-to-end (each party sees only its own data; only an admin confirms a payment).

**Not built yet:** mobile app, shared `packages/*`, profit/bonus ledgers, tests, CI, cloud deploy
(next up). **Deferred:** Midtrans (Snap) payment gateway.

See [notes/architecture.md](notes/architecture.md) for the full design and
[notes/ai_memory.md](notes/ai_memory.md) for precise current state.

## Stack

- **Web:** Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind
- **Backend:** Supabase (Postgres + Auth + Storage) — local stack via Docker · `@supabase/ssr`
- **Repo:** pnpm workspace (Turborepo planned once a second app lands)
- **Planned:** Expo + React Native (mobile), Resend (email)

## Layout (actual)

```
apps/
  web/                    Next.js 16 app (Tailwind)
    src/app/              routes: login · signup · orders · shop ·
                                  catalog(+analytics) · admin(+analytics) · logistics
    src/lib/supabase/     browser + server + middleware-helper clients, generated types
    src/components/       shared client components (e.g. sign-out)
    src/proxy.ts          session-refresh on every request (Next 16 convention)
supabase/
  migrations/             schema · rls · catalog_view · logistics · signup · analytics (timestamped)
  seed.sql                demo data (dev only)
  config.toml
src/                      standalone typed-client RLS demo (learning scratch)
notes/                    design docs: architecture, flow, specs, rules, ai_memory
```

> Planned (not yet created): `apps/mobile`, `packages/{db,auth,ui,features,utils}`, `turbo.json`.

## Prerequisites

- Node `>= 20` · pnpm `>= 11` · **Docker Desktop** (runs the local Supabase stack) · Supabase CLI

## Run it locally

Three things must be up, in this order — miss one and you'll see "can't connect" / blank page:

```bash
# 1. Start Docker Desktop, then bring up the DB / Auth / API stack:
supabase start

# 2. First time, or after editing migrations/seed — rebuild + reseed:
supabase db reset

# 3. Run the web app (keep this terminal open):
pnpm --filter web dev          # → http://localhost:3000
```

### …or run the web app in Docker (hot reload)

Same backend (Supabase via the CLI, steps 1–2 above), but the Next.js app runs in
a container instead of `pnpm dev`. Requires `apps/web/.env.local` to be filled in
(copy from `.env.example`; the Supabase URL/key come from `supabase status`).

```bash
supabase start                 # (+ `supabase db reset` first run) — same as above
docker compose up web          # build + run the app → http://localhost:3000
```

The container reaches the host's Supabase via `host.docker.internal` while the
browser uses `127.0.0.1` — handled automatically by `SUPABASE_INTERNAL_URL`
(see [docker-compose.yml](docker-compose.yml) and
[apps/web/src/lib/supabase/url.ts](apps/web/src/lib/supabase/url.ts)). Source is
bind-mounted, so edits hot-reload. Stop with `docker compose down`.

**Seed logins** (all password `password123`): `admin@halinest.test`,
`budi@halinest.test` (manufacturer), `warungA@halinest.test`, `warungB@halinest.test`,
`kurir@halinest.test` (distributor).

## Scripts

| Where      | Script            | What it does                                            |
| ---------- | ----------------- | ------------------------------------------------------- |
| root       | `pnpm gen:types`  | Regenerate TS types from the local DB → `src/database.types.ts` |
| root       | `pnpm demo`       | Run the standalone typed-client RLS demo (`src/demo.ts`) |
| `apps/web` | `pnpm dev`        | Next.js dev server                                      |
| `apps/web` | `pnpm build`      | Production build                                        |
| `apps/web` | `pnpm lint`       | Lint the web app                                        |

> Web-app types currently live at `apps/web/src/lib/supabase/database.types.ts` and are
> regenerated with `supabase gen types typescript --local > apps/web/src/lib/supabase/database.types.ts`.
> (Consolidating types into a shared `packages/db` is planned.)

## Documentation

- [Architecture & implementation plan](notes/architecture.md) — directory map, schema, RLS matrix, phases
- [HALINEST application flow](notes/halinest-flow.md) — actors, money model, state machines
- [Feature specs](notes/feature_specs.md) — per-module behaviour, stories, acceptance criteria
- [Project rules](notes/project_rules.md) — engineering conventions and guardrails
- [Component library](notes/component_library.md) — design tokens + UI primitives
- [AI memory](notes/ai_memory.md) — durable context: decisions, current state, gotchas
- [Database migrations](supabase/migrations/) — schema, RLS, catalog view; plus `supabase/seed.sql`
- [Original brief](notes/Readme.md)
