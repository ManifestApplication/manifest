# Manifest / HALINEST — Feature Specs

Behavioural specifications per module, derived from [halinest-flow.md](halinest-flow.md) and
[architecture.md](architecture.md). Each feature lists the actor, the user story, behaviour
rules, the data it touches, and acceptance criteria (AC). These are the contract the modules
in §10 of architecture.md (phases 6–10) implement.

> **Implementation status (2026-07-02):** the web app covers the full core loop for the four roles and has grown two areas well past the June baseline: real courier shipping (Biteship) with per-manufacturer multi-origin shipments, and account/i18n plumbing. The live flows are self-service signup (with address + GPS pin), role-aware login, **account self-service** (change sign-in email/password), **forgot/reset password**, **EN/ID language switching**, warung order placement with **per-manufacturer courier selection + shipping fee**, admin manual payment confirmation, admin **Biteship booking/tracking/cancel/return** plus internal distributor shipment assignment, manufacturer catalog management (net + weight; fee is admin-only), analytics pages for all three roles, and distributor shipment status updates. The still-open areas are the Midtrans gateway, contract/admin approval queue, promotions/discount UX, bonus/profit ledgers, richer market information, deeper routes/reconciliation, mobile support, a Biteship webhook, and CI/tests.
>
> Each spec below is tagged **[IMPLEMENTED]**, **[PARTIAL]**, or **[PLANNED]** to mark what ships today vs. what is still a target. The database is intentionally empty (local + cloud); seeding is disabled and data is being re-entered by hand.

Conventions: roles are `admin · manufacturer · warung · distributor`. "Scoped by RLS" means
the Supabase policies already restrict rows; the UI need not re-filter for security
(only for UX). Money is IDR integers. Copy follows the brand voice (plainspoken, specific).

---

## F0 — Accounts & Sessions (all roles) **[IMPLEMENTED]**

Cross-cutting sign-in, self-service, and recovery. These are not tied to one role — every
signed-in party gets them.

### F0.1 Account self-service (change email + password) **[IMPLEMENTED]**
- **Actor:** any signed-in role. **Story:** _As any user I change my sign-in email or password
  without contacting support._
- **Rules:** `/account` (page `app/account/page.tsx`, form `account/account-form.tsx`) drives
  `supabase.auth.updateUser`. Changing the email calls `updateUser({ email })` and tells the user
  to confirm from their inbox ("Email update requested. Check your inbox to confirm."). Changing
  the password calls `updateUser({ password })` after client validation (min 6 chars, both fields
  must match; success copy "Password updated."). Both write `auth.users` directly — no RPC. The
  form's "back" link is role-aware (warung → `/orders`, manufacturer → `/catalog`, distributor →
  `/logistics`, admin → `/admin`).
- **Header pill:** when signed in, the header (`app/layout.tsx`) shows an account pill — an avatar
  (first letter of `full_name`, email fallback) + name — linking to `/account`. The name is read
  server-side from `accounts.full_name`.
- **AC:** (1) A user can change their own email/password; the email change requires inbox
  confirmation. (2) Password mismatch or <6 chars is rejected client-side before the call. (3) The
  pill routes to `/account` only when a session exists.

### F0.2 Forgot / reset password **[IMPLEMENTED]**
- **Actor:** any user who cannot sign in. **Story:** _As a locked-out user I request a reset link
  and set a new password._
- **Flow:** `/forgot-password` calls `supabase.auth.resetPasswordForEmail(email, { redirectTo:
  ${origin}/reset-password })` and always returns a **generic** message ("If an account exists for
  that email, a reset link is on its way…") to avoid email-enumeration. `/reset-password` then
  establishes a recovery session — it auto-detects a recovery token in the URL **hash**, else
  exchanges a **PKCE `?code=`** via `exchangeCodeForSession`, else falls back to `getSession()` —
  and on success calls `updateUser({ password })` (same min-6 / match validation). Invalid or
  expired links render "This reset link is invalid or has expired. Request a new one." with a link
  back to `/forgot-password`; success links to `/login`.
- **AC:** (1) The forgot page never reveals whether an email is registered. (2) A valid hash **or**
  `?code=` link opens the reset form; a consumed/expired link shows the invalid state. (3) The new
  password is set via `updateUser`, after which the user signs in normally.

### F0.3 Self-service location pin **[IMPLEMENTED]**
- **Actor:** warung (delivery pin) and manufacturer (ship-from origin). **Rules:** the shared
  `components/location-modal-editor.tsx` opens a map/coordinate picker + address field. A **warung**
  saves via the `set_my_location(p_lat, p_lng, p_address)` RPC — a `SECURITY DEFINER` function that
  updates **only the caller's own** `accounts` row (lat/lng/address). This is deliberate: `accounts`
  is **SELECT-only** under RLS (rows are minted by the `handle_new_user` trigger), so a blanket
  UPDATE policy would let a user escalate their own `role`; the narrow RPC writes only the two
  coordinate columns + address. A **manufacturer** instead updates its own `manufacturers` row
  (`origin_latitude/longitude/origin_address`) directly, since that table has a self-write policy.
- **Data:** `accounts` (RPC-only writes), `manufacturers.origin_*`.
- **AC:** (1) A user can only move their own pin. (2) A warung can never change its `role` through
  the location path. (3) The manufacturer's ship-from origin feeds the Biteship rate/booking/return
  flows and the printed label (F5).

---

## F1 — Onboarding & Registration (PASSIVE ACTION)

### F1.1 Warung registration **[IMPLEMENTED]**
- **Actor:** prospective warung. **Story:** _As a warung owner, I register for free so I can order
  products._
- **Rules:** free signup (`/signup`, email + password) collects **role, full name, business name
  (labelled "Shop name" for warungs), phone, address, and a GPS pin**. The phone is normalized to
  Indonesian `+62…` client-side (`normalizePhone`: accepts `08…`/`8…`/`+62…`/`62…`, validates
  length, rejects anything else). The GPS pin uses a `LocationPicker` — a Google Maps UI when
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set, otherwise a manual lat/lng fallback with a "use my
  current location" button (map default-centres on Jakarta). All fields ride in
  `supabase.auth.signUp({ options: { data: {…} } })` metadata; the `handle_new_user` DB trigger
  reads that metadata and creates the rows immediately. The trigger **only** honours the three
  self-service roles, so signup can never mint an `admin`. There is still **no** separate
  pending-approval gate in the UI.
- **Data:** `accounts` (role `warung`; now carries `full_name, phone, address, latitude, longitude`),
  `warungs` (`shop_name, address`).
- **AC:** (1) Signup creates exactly one `accounts` + `warungs` row when the trigger runs.
  (2) A newly created warung is routed into the warung surface after login. (3) A malformed phone is
  rejected before submit. (4) Any approval workflow beyond the trigger is not implemented yet.

### F1.2 Manufacturer registration + contract **[PARTIAL]**
- **Actor:** manufacturer. **Story:** _As a manufacturer, I register and accept a contract so
  I can list products._
- **Rules:** signup shares the F1.1 form (company name, phone, address, GPS). The `handle_new_user`
  trigger additionally seeds the manufacturer's **ship-from origin** — `origin_latitude`,
  `origin_longitude`, `origin_address` — from the signup pin, so a new manufacturer can be quoted
  and booked for shipping immediately (F5). The UI still does **not** implement a contract-upload or
  approval queue; those fields remain in the schema for later.
- **Data:** `accounts` (role `manufacturer`), `manufacturers` (`company_name, origin_*`).
- **AC:** (1) A manufacturer can create/edit catalog items after login. (2) Its ship-from origin is
  populated at signup and editable later via the location modal (F0.3). (3) No separate approval
  step exists yet.

### F1.3 Distributor registration **[IMPLEMENTED]**
- **Actor:** distributor. **Rules:** signup captures company name (plus the shared phone/address/pin);
  `kind`, coverage area, and `commission_rate` live on the row and are set/edited outside signup.
  Distributors can be listed and selected for internal shipment assignment (F5.2), but the UI does
  not expose a formal approval board.
- **AC:** an active distributor can be assigned to shipments; the admin page reads the distributor
  list directly from the DB.

### F1.4 Admin approval queue **[PLANNED]**
- **Actor:** admin. **Story:** _As HALINEST, I review and approve/reject new parties._
- **AC:** not implemented. The intended behavior is to review pending parties and record decisions
  in the audit trail once the workflow is added.

---

## F2 — Catalog & Pricing (Manufacturer "Input List")

### F2.1 Manage products & variants **[IMPLEMENTED]**
- **Actor:** manufacturer (own rows, scoped by RLS). **Story:** _As a manufacturer I publish my
  catalog: category, brand, product name, and variants with a net price and shipping weight._
- **Rules:** a product has ≥1 variant; **category is a dropdown from a fixed list**. Each variant
  carries `variant_name`, `net_price`, and `weight` (grams, `default 1000`, used for accurate
  courier rates + booking — F5). Price inputs show an **"Rp"** prefix and weight a **"g"** suffix.
  Soft-toggle via `is_active`. Direct inserts/updates from the catalog page + editable product form.
- **Data:** `products`, `product_variants` (`weight` added by migration `20260701113039`).
- **AC:** (1) Only the owning manufacturer can edit its own catalog rows. (2) Inactive variants are
  hidden from the buyer-facing `catalog` view. (3) `net_price >= 0` and `weight >= 0` enforced by
  DB constraints.

### F2.2 Quantity discounts & promotions **[PLANNED]**
- **Rules:** `quantity_discounts` define `min_qty → discount_pct`; `promotions` are `special`
  or `bonus`, optionally variant-scoped, with a validity window.
- **AC:** the largest applicable qty-discount applies at a given quantity; expired promotions
  never affect price; overlapping promotion + qty-discount resolution order is documented in
  the pricing helper. (Not yet surfaced in the UI.)

### F2.3 Buyer-facing pricing (manufacturer-specific, admin-set fee) **[IMPLEMENTED]**
- **Rule:** the price a warung sees is the `catalog` view's `sell_price = round(net_price × (1 +
  fee_rate))`, where `fee_rate` is **per-manufacturer** and **admin-only**. A
  `manufacturers_guard_fee` BEFORE-UPDATE trigger raises if a non-admin tries to change `fee_rate`
  (RLS is row-level, so this column guard is what keeps manufacturers from editing their own fee);
  a manufacturer may still edit its other fields. The admin sets `fee_rate` in `/admin` (bulk or
  per-manufacturer). The shop derives the fee label by comparing `sell_price` with `net_price`.
- **AC:** (1) Displayed unit price matches the DB-derived `sell_price`. (2) A manufacturer cannot
  change its own fee; only an admin can. (3) Order totals stay server-computed, never trusted from
  the client.

---

## F3 — Search & Discovery (ACTIVE 1–2) **[PARTIAL]**

> The `/shop` page lists the active catalog and lets a warung set quantities; rich text search +
> category/brand filters are still minimal.

- **Actor:** warung. **Story:** _As a warung I search active products, filter by category/brand,
  see discounted prices, and add to a cart._
- **Rules:** search over active catalog (RLS returns only active rows to warungs); filters:
  text (`q`), `category`, `brand`. Special discounts surfaced inline.
- **Data:** `product_variants` + joined `products`/`manufacturers`. **Helper:**
  `catalog.searchVariants`.
- **AC:** (1) Only active variants returned. (2) Each result shows the buyer price (incl. fee +
  any active promo). (3) Out-of-stock vs in-stock reflects `guaranteed_stock`.

---

## F4 — Ordering & Payment (ACTIVE 3)

### F4.1 Place order (with per-manufacturer courier) **[IMPLEMENTED]**
- **Actor:** warung. **Story:** _As a warung I turn my cart into an order and choose how each
  seller's goods ship to me._
- **Rules:** at `/shop` the warung sets quantities, then — because a cart can span several
  manufacturers shipping from different origins — **picks a courier + service per manufacturer**.
  The `ShippingOptions` component (`shop/shipping-options.tsx`) posts the cart lines + the warung's
  destination pin to `/api/shipping/rates`, which returns options **grouped by manufacturer** (F5.3);
  the warung selects one option per group, keyed by `manufacturer_id`. On checkout (`shop/order-form.tsx`):
  the client sends raw lines (`variant_id`, `qty`, `unit_net_price`, `discount_pct`) and triggers
  compute `line_subtotal`, `line_fee`, `subtotal`, `total`. The order row records
  `shipping_fee` = the **sum** of the chosen per-manufacturer fees (plus, for a single-manufacturer
  order, the legacy `shipping_courier`/`shipping_service` columns). One **`order_shipments`** row is
  inserted per manufacturer, each carrying that group's `courier`, `service`, and `fee`.
- **Data:** `orders` (+ `shipping_fee`, `shipping_courier`, `shipping_service`), `order_items`,
  `order_shipments` (one per `(order, manufacturer)`; RLS lets the owning warung insert).
- **AC:** (1) Totals match trigger output, not client math. (2) A warung can only create orders and
  shipments for itself (RLS). (3) `qty > 0` enforced. (4) A multi-manufacturer cart yields one
  `order_shipments` row per manufacturer; `shipping_fee` on the order equals the sum of their fees.

### F4.2 Pay (manual confirmation) **[IMPLEMENTED]**
- **Actor:** warung pays out-of-band; **admin** confirms. **Story:** _As a warung I pay the
  order total plus shipping by bank transfer; an operator confirms it was received._
- **Flow:** order placement creates a `payments` row (`status: pending`, amount = order **total +
  shipping**). The buyer pays out-of-band; the admin page lists pending payments and confirms
  receipt with `status = confirmed`, `confirmed_by`, `confirmed_at`, and a note, which fires the
  settlement split.
- **Rules:** the amount is re-derived server-side, never client-supplied. **Only an admin may
  confirm** (RLS). No Midtrans/gateway yet — the schema is ready for a gateway to replace this
  confirm step (F4.5).
- **Data:** `payments`, `payment_events`.
- **AC:** (1) A client cannot mark its own order paid. (2) Confirming an already-confirmed payment
  is idempotent (no double settlement). (3) A failed/cancelled payment leaves the order re-payable.

### F4.3 Settlement split (incl. shipping leg) **[IMPLEMENTED]**
- **Actor:** system. **Rule:** on payment `confirmed`, `payment_split()` writes `settlements` so the
  split balances to what the buyer actually pays — **net + fee + shipping**:
  - **net → each manufacturer** (that manufacturer's share of the order's `line_subtotal`),
  - **fee → HALINEST** (sum of `line_fee`),
  - **shipping → courier** (`payee_type = 'shipping'`) when `orders.shipping_fee > 0`,
  - **commission → distributor** only when an internal `shipments` row exists **and** the order had
    no external courier fee. The `shipment_fill` trigger sets a distributor's commission to **0**
    when `shipping_fee > 0`, so the two logistics money-flows never stack on one order.
  It then advances the order to `paid`.
- **Data:** `settlements` (`payee_type ∈ manufacturer | halinest | distributor | shipping`),
  `payment_events`.
- **AC:** (1) Sum of settlement amounts equals the payment amount (net + fee + shipping). (2) Each
  manufacturer settlement equals the sum of its lines' `line_subtotal`. (3) A shipping settlement is
  written iff `shipping_fee > 0`. (4) Distributor commission is skipped when an external courier fee
  was charged. (5) Each party reads only its own settlements (RLS).

### F4.4 Re-order **[PLANNED]**
- **Story:** _As a warung I re-order a previous order in one tap._ **AC:** re-order seeds a new
  cart from a past order, re-pricing at current net price + fee (not the historical price).

### F4.5 Payment gateway (Midtrans) **[PLANNED]**
- **Rule:** a real gateway replaces the manual admin confirm step; the same `payments` →
  `payment_split` settlement logic fires on the gateway callback. Schema is already gateway-ready.

---

## F5 — Logistics & Distribution (ACTIVE 4)

There are **two independent shipping paths**, and they never stack on the same order (F4.3): an
**external courier path** built on Biteship with **per-manufacturer, multi-origin** shipments, and
the older **internal distributor path**. Which one an order uses is decided at checkout — if the
warung picked paid couriers, `shipping_fee > 0` and the internal distributor earns no commission.

### F5.1 Ship-from origins & delivery pin **[IMPLEMENTED]**
- **Actor:** manufacturer (origin) + warung (destination). **Rules:** each manufacturer has a
  ship-from origin (`origin_latitude`, `origin_longitude`, `origin_address` on `manufacturers`),
  seeded at signup and editable via the location modal (F0.3). Each warung has a delivery pin on its
  `accounts` row. These coordinates drive rate lookup, booking, the return leg, and the label.
- **AC:** (1) A rate/booking request uses the specific manufacturer's origin (fallback: a hub from
  env — `SHIPPING_ORIGIN_*`). (2) The warung's pin is the delivery coordinate. (3) Each party edits
  only its own location.

### F5.2 External couriers — Biteship (per-manufacturer, multi-origin) **[IMPLEMENTED]**
- **Actor:** warung (selects at checkout), admin (books/cancels/returns), any party (tracks own).
  **Story:** _As HALINEST I book real couriers from each manufacturer's warehouse to the buyer, and
  can track, cancel, and return them._
- **Model:** one **`order_shipments`** row per `(order, manufacturer)` — columns `courier`,
  `service`, `fee`, `tracking_number`, `shipping_order_ref` (Biteship **tracking** id, for
  `GET /v1/trackings/:id`), `shipping_order_id` (Biteship **order** id, for cancel), and the
  reverse-leg columns `return_shipping_order_id`, `return_tracking_number`, `return_status`, plus a
  free-text `status`. RLS: readable by admin, the owning warung, or the manufacturer; insertable by
  the owning warung; full control for admin.
- **API routes** (`app/api/shipping/*`, all keyed off `BITESHIP_API_KEY`):
  - **`/rates` (POST)** — groups the cart by manufacturer and quotes each group **from that
    manufacturer's own origin** via `POST /v1/rates/couriers`; returns options grouped per
    manufacturer. Couriers come from `SHIPPING_COURIERS` (default `jne,jnt,sicepat,anteraja,gojek,
    grab,ninja,pos`).
  - **`/book` (POST, admin)** — books one `order_shipments` row via `POST /v1/orders` from the
    manufacturer origin to the buyer pin (contacts, addresses, coordinates, per-manufacturer items);
    stores `tracking_number` + both Biteship ids and sets `status = 'confirmed'`.
  - **`/track` (GET)** — `GET /v1/trackings/:shipping_order_ref`; returns courier status + history
    and persists the latest `status` back onto the shipment.
  - **`/cancel` (POST, admin)** — `POST /v1/orders/:shipping_order_id/cancel` (with a reason code:
    `change_courier | pickup_delay | change_address | others`); sets `status = 'cancelled'` and
    **clears** the tracking + Biteship ids so the leg can be re-booked.
  - **`/return` (POST, admin)** — books a **reverse leg** (origin = buyer, destination =
    manufacturer) as an independent `POST /v1/orders`; stores `return_*`. Requires the forward leg
    to have shipped and no existing return. The order's own status is untouched.
- **Order status rollup:** the `order_shipment_sync_order_status` trigger aggregates the
  **non-cancelled** legs onto the order (forward-only, never downgrades): order → **`shipped`** once
  every live leg has a `tracking_number`, → **`delivered`** once every live leg is `delivered`.
  Cancelled legs are excluded so a single cancellation can't permanently block the order.
- **Printable label:** `/admin/shipments/[id]/label` renders a self-contained HALINEST label
  (resi/waybill, From = manufacturer origin, To = buyer, this manufacturer's line items, total
  weight, plus a return resi if present) and prints via `window.print()`.
- **AC:** (1) Rates are quoted per manufacturer from its own origin. (2) Booking/cancel/return are
  admin-only; tracking is readable by the parties on the order. (3) Cancel clears the leg's refs and
  the rollup ignores it. (4) The order reaches `shipped`/`delivered` only when **all** live legs do.

### F5.3 Internal distributor shipments **[IMPLEMENTED]**
- **Actor:** distributor. **Story:** _As a distributor I load, transit, and deliver an order, and
  reconcile what was delivered._
- **Rules:** the older single-shipment path. One `shipments` row per order (`unique(order_id)`),
  assigned to a distributor by the admin in `/admin` and advanced by the distributor in
  `/logistics`. Lifecycle `planned → loaded → in_transit → delivered → reconciled` (plus
  `cancelled`). A BEFORE-INSERT trigger fills `commission = subtotal × distributor.commission_rate`
  — but sets it to **0** when the order already carries an external courier fee (F4.3); the
  AFTER-INSERT trigger writes the distributor commission settlement only when commission > 0. A
  `shipment_sync_order_status` trigger moves the order to `shipped` on `loaded`/`in_transit` and
  `delivered` on `delivered`/`reconciled` (external Biteship orders have no `shipments` row, so the
  two paths don't overlap).
- **Data:** `shipments`, `settlements`.
- **AC:** (1) Only admin assigns; only the owning distributor advances (RLS). (2) A warung/
  manufacturer sees the status of shipments on its own order. (3) Commission settles only when a
  shipment exists **and** no external courier fee was charged.

### F5.4 Routes & reconciliation depth **[PLANNED]**
- **Actor:** distributor. **Rules:** named routes (area + ordered stops) grouping shipments for
  "Effective Distribution"; deeper reconciliation. **AC:** only the owning distributor/admin edits.
  Not yet implemented.

### F5.5 Biteship webhook (realtime status) **[PLANNED]**
- **Rule:** today courier status is pulled by `/track`; a webhook would push status updates. Not yet
  implemented.

---

## F6 — Order closeout & facts

### F6.1 Close & roll up to facts **[PARTIAL]**
- **Actor:** system / admin. **Rule:** the analytics read model is served today by the
  `sales_lines` view (`security_invoker`, one row per **paid** order line — qty, `line_subtotal`,
  `line_fee`), which the F7 pages read directly under RLS. A separate materialised `sales_facts`
  close-and-fan-out step (region, promo_discount, re-close idempotency) is still planned.
- **AC:** analytics reflect paid lines per the caller's RLS scope; a dedicated `sales_facts`
  rollup is not yet implemented.

---

## F7 — FREE Analyzes (ACTIVE 5)

### F7.1 Manufacturer analytics **[IMPLEMENTED]**
- **Actor:** manufacturer (own lines via `sales_lines` RLS). **Page:** `/catalog/analytics`.
  **Outputs:** net revenue, units sold, and fee; revenue **by product** (ranked bar).
- **AC:** (1) A manufacturer sees only its own products' lines. (2) Figures derive from paid lines.

### F7.2 Warung analytics **[IMPLEMENTED]**
- **Actor:** warung (own purchases). **Page:** `/orders/analytics`. **Outputs:** purchase patterns
  aggregated **weekly / monthly / yearly**.
- **AC:** computed over the buyer's own order history (RLS-scoped).

### F7.3 Admin / platform analytics **[IMPLEMENTED]**
- **Actor:** admin. **Page:** `/admin/analytics`. **Outputs:** platform GMV, fee, orders, units;
  and rankings — most-bought products, best-selling variant per product type, top manufacturers by
  net sales, top distributors by commission.
- **AC:** admin sees platform-wide figures; rankings computed from paid lines + settlements.

### F7.4 Market Information **[PLANNED]**
- **Actor:** scoped by party. **Rule:** nightly rollup of facts into `market_information` (per
  manufacturer / community / global). **AC:** rollups respect scope on read; global metrics carry no
  party-identifying detail. Not yet implemented.

---

## F8 — Bonuses & Profit (ACTIVE 6) **[PLANNED]**

### F8.1 Black Bonus / community bonuses
- **Actor:** warung (read own). **Rule:** accrual/redemption per `bonus_rules.rule_jsonb` →
  `ledger_bonus` (balance is `accrued − redeemed`).
- **Status:** **formulas undefined** — see ai_memory.md §5. Spec to be completed with business.
- **AC (interim):** a warung reads only its own bonus balance; admin manages rules.

### F8.2 Profit ledgers
- **Rule:** `ledger_profit` accrues per party (manufacturer / halinest / distributor) per period.
- **AC:** each party reads only its own profit; admin reads all; figures reconcile to settlements.

---

## F9 — Admin & Platform **[PARTIAL]**

- **Live today:** manual payment confirmation (F4.2), per-manufacturer fee settings (F2.3),
  Biteship booking/tracking/cancel/return + printable labels (F5.2), internal shipment assignment
  (F5.3), and platform analytics (F7.3).
- **Planned:** parties approval queue (F1.4); settlement oversight surface; Market Information
  (F7.4); an admin-only read-only **audit log** with a trigger writing every mutation on
  orders/payments/shipments/products.
- **AC (target):** admin can trace any order/payment/shipment to an actor + timestamp; non-admins
  cannot read `audit_log`.

---

## F10 — Internationalization (EN / ID) **[IMPLEMENTED]**

- **Actor:** any user. **Story:** _As a user I read the whole app in English or Indonesian._
- **Rules:** cookie-based locale (`lang` cookie, 1-year max-age, `samesite=lax`; supported
  `["en","id"]`, **default English**). The header `LanguageSwitcher` sets the cookie and calls
  `router.refresh()`. On the server, the root `layout.tsx` reads the cookie (`getLocale()`), sets
  `<html lang>`, picks the dictionary (`getDict()` / `dictionaries.ts`, English as source of truth),
  and wraps the tree in an `I18nProvider`. Client components read copy via `useT()` and the active
  code via `useLocale()`. The **entire UI** — every page and component, plus status labels and date
  formatting — is translated.
- **Data:** `lang` cookie; `src/i18n/{config,server,client,dictionaries}`.
- **AC:** (1) Toggling EN/ID persists via cookie and re-renders in the chosen locale. (2) `<html
  lang>` matches the active locale. (3) No hard-coded user-facing strings bypass the dictionary.

---

## Cross-cutting acceptance criteria

- **Security:** every listed read/write is expressible under the §5 RLS matrix for the stated
  role; no screen depends on client-side filtering for security. Notable guards: `accounts` is
  SELECT-only (writes only via the `set_my_location` RPC or the signup trigger), `fee_rate` is
  column-guarded to admin, and signup can never mint an `admin`.
- **Auditability:** payment/shipment money-moving actions leave a trail (`payment_events`,
  settlements, Biteship refs). A generalised admin-only `audit_log` is still **[PLANNED]** (F9).
- **Voice:** all user-facing strings are plainspoken and specific (no "successfully", no "!"), and
  now exist in both EN and ID (F10).
- **Current reality:** the repo is web-first — all screens live in `apps/web`; a mobile app remains
  a future target. Both the local and cloud databases are currently **empty** (seeding disabled),
  with data being re-entered by hand. Still open: Midtrans gateway (F4.5), approval queue (F1.4),
  promotions (F2.2), richer search (F3), routes/reconciliation (F5.4), Biteship webhook (F5.5),
  Market Information (F7.4), bonus/profit ledgers (F8), and CI/tests.
