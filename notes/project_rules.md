# Manifest / HALINEST — Project Rules

Engineering conventions and guardrails for this repo. These are the rules; the _why_ lives
in [architecture.md](architecture.md). Read this before opening a PR.

> Voice (from the brand): confident, specific, plainspoken. This applies to code, commits,
> error messages, and UI copy alike. Say "Three units unaccounted for in this batch", not
> "Some items may be missing".

> **Implementation status (2026-07-02):** the repo is still a plain pnpm workspace rather than
> a fully extracted `packages/*` monorepo. Today the Supabase clients live in
> `apps/web/src/lib/supabase/`, the Next 16 session refresh is `apps/web/src/proxy.ts` (Next 16
> renamed `middleware.ts` → `proxy.ts`), and the generated types still live alongside the web
> app. See [ai_memory.md §3](ai_memory.md) for the actual current state.

---

## 1. Repo & tooling

- **Package manager:** pnpm `>= 11` only. Never `npm`/`yarn`. Use workspace protocol
  (`workspace:*`) for internal deps.
- **Repo shape:** this is currently a plain pnpm workspace (`apps/web`), not yet a full
  `packages/*` monorepo. When shared packages are introduced later, they should follow the
  same naming rules below; today the real app surface is still `apps/web`.
- **Framework:** Next.js 16 App Router with Turbopack. Next 16 renamed the middleware entry
  `middleware.ts` → `proxy.ts`.
- **Styling:** Tailwind v4, brand tokens declared via `@theme`.
- **Supabase clients:** `@supabase/ssr` for both browser and server clients (PKCE flow).
- **Build / typecheck:** `pnpm --filter web build`. `next dev` does NOT typecheck — strict
  TS errors only surface at build, so run the build before pushing.
- **Node:** `>= 20` (see `.nvmrc`).
- **Package naming:** all internal packages are scoped `@manifest/*` (e.g. `@manifest/db`,
  `@manifest/ui`). App packages are `@manifest/web`, `@manifest/mobile`.
- **TS configs:** once packages are added, extend the shared bases in `@manifest/tsconfig`
  (`library.json` for packages, `next.json` / `expo.json` for apps). For now, the app config
  lives directly under the web app and should not be duplicated unnecessarily.
- **Lint/format:** ESLint flat config from `@manifest/eslint-config`; Prettier is the
  formatter (`.prettierrc.json`). `pnpm format:check` must pass in CI.

## 2. TypeScript

- **Strict mode, always.** No `// @ts-ignore` without a one-line reason comment; prefer
  `// @ts-expect-error`.
- **No `any`** in committed code. Use `unknown` + narrowing, or generics. The one tolerated
  exception is generated/placeholder types (e.g. `packages/db/src/types.ts` before
  `gen:types` runs) — and that's flagged in-file.
- **Types over interfaces** for object shapes, except when declaration-merging is needed.
- **No default exports** in packages (named exports only) so re-exports stay greppable.
  Next.js pages/layouts are the exception (the framework requires default exports).
- When shared query modules exist later, imports should use the namespace form: `import {
  catalog } from "@manifest/db"`, then `catalog.searchVariants(...)`. Today the codebase still
  uses direct Supabase access in the web app.

## 3. Database & security

- **RLS is the security boundary — always.** Every table has RLS enabled and explicit
  policies in the Supabase migrations; client-side role checks are only for UX, not for
  security.
- **The service-role key never reaches a client bundle.** It is used only in edge functions
  and server-only code (`createServiceClient`). The anon key is the only key shipped to
  web/mobile.
- **Migrations are append-only and dated:** `YYYYMMDD_NNNN_description.sql`. Never edit a
  migration that has been applied to a shared environment; write a new one.
- **Money math lives in the database**, not the client. Order totals, buyer-facing pricing,
  and settlement splits are computed by triggers so every client agrees. Clients send raw
  lines; they re-read computed totals.
- **Amounts are IDR integers** (no minor units / no floats for currency display). Round at
  the boundary; never sum rounded values.
- **Wrap cross-table RLS checks in `SECURITY DEFINER` helpers** (`auth_role`, `is_admin`,
  `owns_order`, `mfr_in_order`) to avoid RLS recursion.
- **When a table must stay read-only under RLS** (e.g. `accounts` is SELECT-only), expose a
  narrow `SECURITY DEFINER` RPC (e.g. `set_my_location`) instead of a blanket UPDATE policy
  that would let a user self-escalate their role.
- **Always re-specify `security definer set search_path=public`** whenever you use
  `CREATE OR REPLACE FUNCTION`.
- **Apply migrations with `supabase migration up`** and verify with rolled-back psql
  transactions before committing.
- After any schema change: regenerate types (`supabase gen types typescript --local`) — the
  build breaks on stale types. Commit the regenerated types with the migration.

## 4. Multi-tenancy & roles

- Four party types: `admin` · `manufacturer` · `warung` · `distributor`. A user's `role`
  lives on `accounts` and drives both RLS and routing.
- Every query that returns party-scoped data must be expressible under RLS for **all four**
  roles — if a screen needs cross-party data, that's an admin surface or an aggregate
  (`sales_facts`, `market_information`), not a raw table read.
- Don't add a fifth role or a cross-tenant read path without updating the §5 RLS matrix in
  architecture.md in the same PR.

## 5. Cross-platform (web + mobile)

- **Shared business logic is a future target** rather than the current repo shape. Today the
  real implementation lives in `apps/web`; the main goal is to keep that code clear and
  correctly scoped.
- UI primitives and shared feature packages are not fully extracted yet. When they are added,
  the intended model is still the same: thin app shells that compose shared logic.
- Forms in the current app are still simple local component state; shared schema packages are
  not yet the source of truth for every route.
- Server data for the current app uses the web app's Supabase clients directly; ad-hoc client
  setup is acceptable for now until a shared abstraction exists.

## 6. Internationalization (i18n)

- **All user-facing strings live in the typed dictionary** `src/i18n/dictionaries.ts`. EN and
  ID must stay in sync — TypeScript enforces the shape, so a missing key fails the build.
- **Client components** read copy via `useT()` / `useLocale()`; **server components** use
  `getDict()` / `getLocale()`.
- **Never hardcode UI copy.** Add every new string as a key to **both** locales.

## 7. Payments (manual)

- Payments are **manual** for now — no gateway. The buyer pays out-of-band and an operator
  confirms receipt; confirmation flips `payments.status` to `confirmed`.
- **Only an admin may confirm a payment** (enforced by RLS); never mark an order paid from a
  buyer/client. `getPaymentStatus` is for UX feedback only.
- Each status change writes a `payment_events` row (audit trail). The settlement split runs
  in a DB trigger on `confirmed` — confirming twice must not double-settle.
- **Midtrans (Snap) is planned.** When added, the gateway webhook replaces the manual
  confirmation step; the settlement logic stays unchanged.

## 8. Git & PRs

- Branch off `main`; never commit directly to `main`.
- Conventional-ish, plainspoken commit subjects: `area: what changed` (e.g.
  `payments: restrict manual confirmation to admins`). Imperative mood.
- Commit/push only when asked. One logical change per PR; migrations + their generated
  types + RLS changes ship together.
- A PR is mergeable only when `typecheck`, `lint`, `format:check`, and `test` pass.

## 9. Secrets & config

- Never commit real keys. `.env.example` documents every variable; real values live in
  `.env.local` (gitignored) and in Supabase/Vercel/EAS secret stores.
- Public client vars are prefixed `NEXT_PUBLIC_` (web) / `EXPO_PUBLIC_` (mobile) and must be
  genuinely safe to expose. Anything else is server-only.
- **Server-only keys** (never `NEXT_PUBLIC_`): the Biteship API key and the Supabase secret
  key. The Supabase publishable/anon key is browser-safe.
- Env vars: `BITESHIP_API_KEY`, `SHIPPING_ORIGIN_*`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Password-reset redirect URLs must be allow-listed:** `config.toml`
  `additional_redirect_urls` locally; Supabase dashboard URL config for cloud.
- **Current state:** `[db.seed] enabled=false` and both DBs are empty — data must be
  re-entered manually.

## 10. Definition of done

A change is done when: it type-checks and lints clean; new tables have RLS; money/auth paths
have tests; user-facing copy matches the brand voice; docs touched by the change
(architecture/flow/feature specs) are updated in the same PR; and generated types are current.
