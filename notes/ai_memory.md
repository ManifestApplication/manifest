# AI Memory — Manifest / HALINEST

Durable context for AI assistants working in this repo. Read this first; it captures
decisions, current state, and gotchas that aren't obvious from the code alone. Keep it
**current** — when a decision changes, update the relevant line here in the same change.

_Last reviewed: 2026-07-02._

---

## 1. What this project is

A cross-platform app (web now; mobile planned) implementing **HALINEST** — a three-sided
B2B distribution marketplace. The repo is named `manifest`; "Manifest" is the product/brand,
"HALINEST" is the business domain from the source flowchart.

- **Buyers:** warungs (small community retailers). **Sellers:** manufacturers (or
  distributor-sellers). **Logistics:** distributors. **Operator:** HALINEST (platform admin).
- **Monetization:** manufacturers set a Net Price; HALINEST adds a fee rate tracked per
  manufacturer (`fee_rate`), which produces the buyer-facing `sell_price`. Shipping fee is
  charged to the buyer and settled to the courier; an internal-distributor **commission** is
  paid only when an order ships internally (skipped when it ships via an external courier).
- Full design: [architecture.md](architecture.md). Business flow: [halinest-flow.md](halinest-flow.md).

## 2. Source of truth

| Topic                    | Authoritative doc / file |
| ------------------------ | ------------------------ |
| Architecture, schema, RLS, phases | [architecture.md](architecture.md) |
| Business / application flow | [halinest-flow.md](halinest-flow.md) |
| Engineering rules        | [project_rules.md](project_rules.md) |
| UI tokens & components   | [component_library.md](component_library.md) |
| Feature behaviour        | [feature_specs.md](feature_specs.md) |
| DB schema (runnable)     | `supabase/migrations/*.sql` (20 migrations; schema · rls · catalog_view · logistics · signup · analytics · fee_admin_only · account_location · order/shipping · multi-origin/cancel/return); `supabase/seed.sql` (retained, **not run** — seeding disabled) |
| Generated TS types       | `apps/web/src/lib/supabase/database.types.ts` (regenerated from the local DB) |
| i18n (EN/ID)             | `apps/web/src/i18n/{config,server,client,dictionaries}.ts(x)` |
| Shipping (Biteship)      | `apps/web/src/app/api/shipping/{rates,book,track,cancel,return}/route.ts`; admin label at `admin/shipments/[id]/label` |
| Web app                  | `apps/web/` (Next.js 16, App Router) — routes: login · signup · forgot/reset-password · account · orders · shop · catalog(+analytics) · admin(+analytics) · logistics |
| Payments                 | manual confirmation, architecture.md §12 (Midtrans deferred) |
| Original brief / brand   | `notes/Readme.md`, `notes/# Brand Guidelines.pdf` |

## 3. Current state (2026-07-02) — full marketplace loop + Biteship shipping + i18n; DBs empty

Runs on a **local** Supabase stack (Docker; project id `manifest`) **and** a **cloud** project
(ref `mnxcalicwnrcnxvcnfip`, "Manifest Project", Seoul) — migrations are in **parity**
local↔cloud. The **frontend is NOT deployed to Vercel** (no linked project); DB is on cloud.

> DB/deploy reality (2026-07-02): **both local and cloud databases are currently EMPTY** —
> freshly wiped (`supabase db reset` / `db reset --linked`). **Seeding is disabled**
> (`config.toml [db.seed] enabled=false`; `seed.sql` retained but not run) because the user is
> re-inputting data manually. `additional_redirect_urls` now allows `http://localhost:3000/**`
> and `http://127.0.0.1:3000/**` (password-reset redirect fix). Local email → Mailpit at
> http://127.0.0.1:54324. Next up: separate dev/prod (Supabase branching).

**Database** (20 timestamped migrations):

- `*_schema.sql` — enums + identity (`communities`, `accounts`, `warungs`, `manufacturers`
  w/ `fee_rate`, `distributors` w/ `type`+`commission_rate`), catalog (`products`,
  `product_variants` w/ `weight`, `quantity_discounts`), `orders`+`order_items` w/ money triggers
  (`order_items_fill` BEFORE, `orders_recompute` AFTER), `payments` (manual) + `settlements` +
  `payment_events` w/ `payment_split` (confirm → net→mfr, fee→halinest).
- `*_rls.sql` — RLS on every table; SECURITY DEFINER helpers (`auth_role`, `is_admin`,
  `owns_order`, `mfr_in_order`); party-scoped policies (**only admin confirms payments**).
- `*_catalog_view.sql` — `catalog` read-model (active variants + `sell_price` = net + that
  manufacturer's fee). The shop reads it to show buyer prices.
- `*_logistics.sql` — internal-distributor `shipments` lifecycle
  (planned→loaded→in_transit→delivered→reconciled/cancelled); `settlements.shipment_id`;
  `shipment_fill`/`shipment_settle` create the distributor commission settlement.
- `*_signup.sql` — `handle_new_user` trigger on `auth.users` (SECURITY DEFINER): reads signup
  metadata (role / full_name / business_name / phone / address / GPS) → creates `accounts` +
  party row; sets manufacturer `origin_latitude/longitude/address`. Allowlists the three party
  roles only (can't mint admin).
- `*_analytics.sql` — `sales_lines` view **`with (security_invoker = true)`** (respects RLS).
- `*_fee_admin_only.sql` — `manufacturers_guard_fee` blocks non-admins changing `fee_rate`.
- `*_account_location.sql` / `*_account_set_location.sql` — `accounts` gains
  `address/latitude/longitude`; `set_my_location(p_lat,p_lng,p_address)` SECURITY DEFINER RPC
  lets a user update **only their own** coords/address (accounts has only a SELECT policy — no
  blanket UPDATE, to prevent role self-escalation).
- Shipping/order migrations (`*_order_shipping`, `*_settlement_shipping_enum`,
  `*_payment_split_shipping`, `*_shipment_skip_commission_when_shipped`, `*_variant_weight`,
  `*_multi_origin_shipping`, `*_order_shipment_status_sync`, `*_shipment_cancel_return`,
  `*_shipment_address_editing`, `*_order_tracking_and_phone`) — `orders` gains
  `shipping_fee/courier/service`; **per-manufacturer** `order_shipments` (multi-origin);
  `payment_split` now also settles shipping_fee→courier (external Biteship) and **skips**
  distributor commission when an order ships externally;
  `order_shipment_sync_order_status` rolls legs up to order `shipped`/`delivered` (forward-only,
  ignores cancelled legs); reverse/return + cancel support. Signup phone normalized to `+62`.

**Web app** (`apps/web`, Next.js 16 Turbopack + **Tailwind v4**, `pnpm --filter web dev` → :3000):

- `@supabase/ssr` clients in `src/lib/supabase/` (browser/server, PKCE); session refresh at
  **`src/proxy.ts`** (Next 16's `proxy` convention).
- **i18n:** cookie-based **EN/ID** (`src/i18n/`), cookie `lang`, default `en`; server
  `getLocale()`/`getDict()`, client `I18nProvider` in root layout + `useT()`/`useLocale()`,
  `LanguageSwitcher` in header (sets cookie + `router.refresh()`). **Entire UI translated.**
- **Auth/accounts:** `/signup` captures role, name, business, phone (+62), address, and GPS via
  Google Maps `LocationPicker` (manual-coord fallback if no `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`).
  `/account` (any role) changes email+password. Forgot-password flow: `/forgot-password`
  (`resetPasswordForEmail` → `/reset-password`) + `/reset-password` (recovery session from hash
  or `?code=`, then `updateUser`). Header shows active account as a pill linking to `/account`;
  landing CTAs switch to "Go to dashboard"/"Account" when signed in.
- **Role-aware login** routes: warung→`/orders`, manufacturer→`/catalog`,
  distributor→`/logistics`, admin→`/admin`.
- **Shipping (Biteship, key server-only):** buyer picks a courier **per manufacturer** at
  checkout; shipping fee charged to buyer, settled to courier. `/api/shipping/rates` (groups cart
  by manufacturer, quotes from each origin, hub env fallback), `/book` (admin books one
  `order_shipment` from its origin), `/track`, `/cancel`, `/return` (reverse leg). Printable
  label at `/admin/shipments/[id]/label` (self-rendered `window.print` — Biteship has no
  universal label PDF). `LocationModalEditor` lets manufacturers edit ship-from origin and warung
  edit delivery pin ("Change location" → popup map + address). Env: `BITESHIP_API_KEY`,
  `SHIPPING_ORIGIN_*` (hub fallback), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- **Styling:** Tailwind v4, brand tokens in `globals.css` (`paper` `parchment` `ink` `margin`
  `signal` `verified` `border`), Inter + IBM Plex Mono. Flat cards; CSS-bar charts.
- Proven loop: signup → login → browse catalog → place order (pick courier per mfr) → pay
  out-of-band → admin confirms payment (fires `payment_split`) → admin books shipment(s) →
  track/deliver → analytics reflect state. RLS scopes every view per party.

**Repo:** pnpm **workspace** (`packages: ["apps/*"]`, `allowBuilds` for
`esbuild`/`sharp`/`unrs-resolver`). Root `src/demo.ts` = standalone typed-client RLS demo
(`pnpm demo`).

**NOT yet done:** Midtrans gateway; CI + tests; mobile (Expo/React Native); Biteship realtime
webhook; onboarding contracts / admin-approval; promotions / quantity discounts (table exists,
unused); **Vercel frontend deploy**; **dev/prod branch separation**.

## 4. Key decisions (don't re-litigate without reason)

1. **Multi-tenant from day one** — four roles on `accounts.role`.
2. **Payments = manual confirmation (IDR), no gateway yet.** Buyer pays out-of-band; an admin
   confirms receipt (RLS-restricted). Settlement split happens in a DB trigger on payment
   `confirmed`. **Midtrans Snap is deferred** — it will replace the confirm step without
   changing the settlement trigger.
3. **Money math + derived values live in the DB** (triggers + views), never the client. The
   buyer price is derived from `manufacturers.fee_rate` (not a hard-coded +3% rule).
4. **RLS is the only security boundary.** Client-side role checks are UX-only; the `secret`
   (service_role) key is server-only and bypasses RLS.
5. **One schema everywhere** is the goal (shared Zod schemas + a `packages/db` client) — *not
   built yet*; today each consumer holds its own generated types.
6. **Brand voice is part of the spec** — plainspoken, specific, no marketing fluff, no "!".
7. **IDR currency**, single platform-wide. Amounts stored as integers (whole rupiah).
8. **Settlements.** Net → manufacturer and fee → HALINEST come from a confirmed **payment**.
   When an order ships via an **external courier (Biteship)**, `payment_split` also settles
   `shipping_fee` → **courier** and **skips** the internal-distributor commission. When it ships
   **internally**, the distributor **commission** (`subtotal × commission_rate`) is its own
   shipment-sourced settlement (`settlements.shipment_id`); exactly one of `payment_id`/
   `shipment_id` is set. Buyer pays **net + fee + shipping_fee**.
9. **Self-service signup creates rows via a DB trigger** on `auth.users`, never client inserts —
   and can never mint an `admin` (the trigger allowlists the three party roles). It also seeds
   the account's address/GPS and the manufacturer ship-from origin.
10. **Location updates go through `set_my_location` (SECURITY DEFINER)**, not a table UPDATE —
    `accounts` has only a SELECT policy, so a user can change only their own coords/address and
    cannot escalate their `role`.
11. **Shipping is multi-origin, per manufacturer.** A cart spanning N manufacturers produces N
    `order_shipments` legs, each booked from that manufacturer's origin; the buyer chooses a
    courier per manufacturer. Order status is aggregated forward-only from the live legs.
12. **UI is bilingual (EN/ID) via a `lang` cookie** — server dict + client provider; no
    per-route locale segments.

## 5. Open questions (need a human)

- **Bonus / Black Bonus formulas** — modelled later as `bonus_rules` + `ledger_bonus`; exact
  accrual/redemption rules **undefined** (business input needed).
- **Fee configurability** — global default vs per-community vs per-contract. Current assumption:
  global default, overridable per `manufacturers.fee_rate`.
- **Midtrans (deferred)** — gateway planned for the next dev phase; sandbox keys + dashboard
  notification URL needed then.
- **Charting** — dashboards use flat CSS bars (no library) for now; revisit if richer charts are
  needed.
- **Auth method** beyond email+password (magic link later).

## 6. Gotchas / things that bite (learned the hard way)

- **Three things must be running, in order:** Docker Desktop → `supabase start` →
  `pnpm --filter web dev`. Docker down → "Failed to fetch" on login; dev server down → blank
  page. Most "it won't run" symptoms were just one of these stopped, not broken code.
- **pnpm 11 blocks dependency build scripts.** Approve them in `pnpm-workspace.yaml` under
  `allowBuilds:` (we needed `esbuild`, `sharp`, `unrs-resolver`). The `pnpm` field in
  `package.json` is **ignored** by pnpm 11.
- **`create-next-app` checks the PARENT dir for writability** — create `apps/` first or it
  errors "path is not writable". It also drops a nested `pnpm-workspace.yaml` + lockfile in the
  app; delete them so the app joins the root workspace. With `--src-dir`, app files belong in
  `src/app/` (not the project root).
- **Next.js workspace-root inference** can wander up to a stray `~/yarn.lock`; pin it via
  `turbopack.root` in `apps/web/next.config.ts`.
- **RLS recursion (`42P17`):** a policy that inline-queries another RLS table which points back
  loops forever. Fix: wrap cross-table lookups in SECURITY DEFINER functions (`owns_order`,
  `mfr_in_order`). Same reason `auth_role`/`is_admin` are DEFINER.
- **Trigger functions that read/write RLS-protected tables must be SECURITY DEFINER** — else
  `order_items_fill` reads a warung-invisible `fee_rate` as 0, and settlement inserts get blocked.
- **BEFORE vs AFTER:** row-filling (`order_items_fill`) must be BEFORE (it assigns `NEW`);
  roll-ups (`orders_recompute`) must be AFTER.
- **Migration filenames:** single 14-digit timestamp prefix; an underscore *inside* the date
  collides every version on the same number.
- **Seeding is currently OFF** (`config.toml [db.seed] enabled=false`) — `db reset` rebuilds a
  clean schema with **no data**; the user re-inputs manually. (Historically: seed logins needed
  `email_confirmed_at` set or sign-in failed.)
- **Password-reset redirect** requires the target URL in `config.toml
  additional_redirect_urls` (now `http://localhost:3000/**` + `http://127.0.0.1:3000/**`), else
  Supabase strips the `redirectTo`. Local reset/confirmation emails land in **Mailpit**
  (http://127.0.0.1:54324), not a real inbox.
- **Biteship key is server-only** — all shipping calls go through `/api/shipping/*` routes; never
  expose `BITESHIP_API_KEY` to the browser. Only `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is public.
- **Views and RLS:** a plain view runs as its owner and **bypasses** the underlying RLS (fine
  for the public `catalog`; a data leak for per-party data). A view that must respect RLS needs
  `create view ... with (security_invoker = true)` (PG 15+) — that's how `sales_lines` scopes to
  each party.
- **`NULL not in (...)` is `NULL`, not `true`.** A guard like `if x not in (...) then return`
  silently falls through when `x` is null — bit us in the signup trigger for seeded users
  (no role metadata). Guard explicitly: `if x is null or x not in (...)`.
- **`docker exec -i`** is required to pipe SQL into the DB container (`docker exec -i …_db_… psql`).
  Without `-i`, stdin is dropped and psql runs with no input (silent no-op).
- **Next 16 renamed `middleware.ts` → `proxy.ts`** (export a `proxy` function). The Supabase
  session helper at `lib/supabase/middleware.ts` is just a helper and keeps its name. Convention
  files only take effect on a dev-server **restart**.
- Migrations are append-only once shipped; local `supabase db reset` and `db reset --linked`
  (cloud) both rebuild from migrations. Keep local↔cloud migrations in parity. dev/prod are
  **not** yet separated (Supabase branching is the next step).

## 7. How to extend

- **New table** → new dated migration; enable RLS + add policies (use DEFINER helpers for any
  cross-table check); add money/audit triggers (SECURITY DEFINER if they touch protected
  tables); `supabase db reset`; regenerate types into
  `apps/web/src/lib/supabase/database.types.ts`; document in `feature_specs.md`.
- **New screen** → a route folder under `apps/web/src/app/`. Server Component for data (use
  `@/lib/supabase/server`), Client Component (`"use client"`) for interactivity (use
  `@/lib/supabase/client`).
- **New user-facing copy** → add keys to `src/i18n/dictionaries.ts` for **both** EN and ID;
  read via `useT()` (client) or `getDict()` (server). Don't hard-code UI strings.
- **New shipping behaviour** → extend a `src/app/api/shipping/*` route (Biteship key stays
  server-only); persist state onto `order_shipments`, not the client.
- Switching users in the browser → sign out via the account pill / `SignOutButton`.
- Always check §4/§5 before an architectural choice.
