# @manifest/web

The HALINEST web app (Next.js 16, App Router). Part of the `manifest` pnpm workspace — see the
[root README](../../README.md) and [notes/architecture.md](../../notes/architecture.md).

## Prerequisites

This app talks to the local Supabase stack, so before running it:

1. **Docker Desktop** running.
2. From the repo root: `supabase start` (and `supabase db reset` the first time, to load
   schema + seed).

## Run

```bash
pnpm --filter web dev      # from repo root  → http://localhost:3000
# or, from this folder:
pnpm dev
```

Env lives in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
Seed logins (password `password123`): `admin@halinest.test`, `warungA@halinest.test`, etc.

## Structure

```
src/
  app/
    login/      email/password sign-in            (client)
    orders/     warung's own orders, RLS-scoped    (server)
    shop/       catalog browse + place order       (server + client form)
    admin/      confirm manual payments → split    (server + client list)
  lib/supabase/  browser, server, middleware clients + generated types
  components/    shared client components (sign-out)
  middleware.ts  Supabase session refresh on every request
```

After changing the DB schema, regenerate types:

```bash
# from repo root
supabase gen types typescript --local > apps/web/src/lib/supabase/database.types.ts
```
