# Dev / Prod separation

Two Supabase cloud projects + two long-lived git branches. Local Docker Supabase
stays as each developer's innermost sandbox.

## Environments

| Env   | Git branch | Supabase project            | App env                         |
| ----- | ---------- | --------------------------- | ------------------------------- |
| local | (any)      | local Docker (`supabase start`) | `apps/web/.env.local` → 127.0.0.1:54321 |
| dev   | `dev`      | **Manifest Dev** (`yqqavavkkmkcwlnahjre`) | `.env.local` → dev project / Vercel Preview |
| prod  | `main`     | **Manifest Project** (`mnxcalicwnrcnxvcnfip`) | Vercel Production env |

- `main` = production. Only merge tested work into it.
- `dev` = integration/day-to-day. Branch feature work off `dev`, PR back into `dev`.
- Promote to prod by merging `dev → main`.

## Database workflow

Migrations are the source of truth; never hand-edit a cloud DB.

```bash
# Point the CLI at a project before running linked commands:
supabase link --project-ref <dev-ref>          # work against DEV
supabase link --project-ref mnxcalicwnrcnxvcnfip   # work against PROD

# Apply pending migrations to the linked project (safe, preserves data):
supabase db push

# Full rebuild of the linked project from migrations (DESTRUCTIVE — wipes data):
supabase db reset --linked
```

Typical flow: create migration locally → `supabase db reset` (local) to test →
`supabase db push` to **DEV** → after merge to `main`, `supabase db push` to
**PROD**.

Seeding is currently **disabled** (`config.toml [db.seed] enabled = false`) — all
envs come up empty until data is entered manually or seed is re-enabled.

## App env

- Copy `apps/web/.env.example` → `.env.local` and fill the values for the
  project you're pointing at (local, dev, or prod).
- Set PROD values in the deploy host (Vercel), not in a committed file.
- Switch the app's Supabase target without hand-editing:
  ```bash
  pnpm env:local   # .env.local → local Docker (http://127.0.0.1:54321)
  pnpm env:dev     # .env.local → cloud DEV project
  ```
  These flip only the two `NEXT_PUBLIC_SUPABASE_*` lines (Biteship/Maps/shipping
  stay put). Restart `next dev` after switching.

## Auth redirect URLs (password reset, etc.)

Each Supabase project must allow the app's redirect URLs:
- Local: `config.toml` `additional_redirect_urls` = `http://localhost:3000/**`,
  `http://127.0.0.1:3000/**`.
- Cloud (dev & prod): dashboard → Authentication → URL Configuration → set Site
  URL + Redirect URLs for that project's domain (e.g. Vercel preview + prod URLs).
