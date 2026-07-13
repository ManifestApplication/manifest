# HALINEST — Application Flow

Companion to [architecture.md](architecture.md). This is the end-to-end business/
application flow transcribed from `HALINEST APPS (H) – BASIC FLOW CHART (ver02.00)`
(Ver01 Los Angeles, Sept 11 2024 · Ver02 Jakarta, May 28 2026).

> **Implementation status (2026-07-02):** the core flow is **live locally** in the web app — signup,
> order placement (with per-manufacturer courier selection), manual payment confirmation, settlement
> split (incl. the shipping leg), Biteship shipment booking/tracking, distributor shipment updates,
> and analytics dashboards all work. The still-design-only areas are routes/reconciliation,
> Market Information, and the profit/bonus ledgers. See [ai_memory.md §3](ai_memory.md).

---

## Actors

| Lane | Who | Role in the system |
| ---- | --- | ------------------ |
| **COMMUNITY (W)** | Warungs — small community retailers ("extendable to many communities") | **Buyers**: search, order, pay, receive |
| **HALINEST (H)**  | The platform + central database | **Intermediary**: catalog, payments, BigData, distribution, profit |
| **MANUFACTURER (M)** | Manufacturers "or Distributor" | **Sellers**: publish catalog, fulfill, get paid |
| **DISTRIBUTOR (D)** | 3rd-party or HALINEST-internal logistics | **Fulfillment**: routes, effective distribution, sales management |

## Money model (the core of the business)

- Manufacturer sets a **Net Price** → the admin-set per-manufacturer fee rate (`fee_rate`) derives
  the catalog price (`sell_price = net + manufacturer fee`) → that is the price the community pays per unit.
- **The buyer pays ONE amount = goods total + shipping fee.** On payment confirmation, `payment_split`
  settles automatically so that the **sum of settlements = amount paid**:
  - **net price → each manufacturer** (per-manufacturer, multi-origin),
  - **platform fee → HALINEST**,
  - **shipping fee → courier** (external Biteship shipping), and
  - **delivery commission → distributor** — **only** on the internal-distributor path; the commission is
    **SKIPPED when an external (Biteship) courier is used**.
- **PROFIT** accrues to both M (sales revenue) and H (fee + any commission).
- Incentives flow back to buyers: **Promotion, Bonus, Black Bonus**.

The chart is split into two horizontal bands: **PASSIVE ACTION** (onboarding/setup) and
**ACTIVE ACTION** (the recurring transactional + analytics loop).

---

## Phase A — Onboarding & Catalog (PASSIVE ACTION)

```
Warung:        Download app → FREE Registration (input data)  → [Warungs sub-DB]      → Reg OK → W home page
Manufacturer:  Download app → FREE Registration + Contract     → [Manufacturers sub-DB] → Reg OK → M home page
                                                                          │
Manufacturer publishes the Input List ────────────────────────────────────┘
   Category · Brand · Product Name · Variant · Net Price ·
   Q'tity Discount · Guaranteed Stock · Bank Account · Promotion · Bonus
                                                                          │
                          All records sync into the central H database (via the H UI)
```

Maps to tables: `communities`, `accounts`, `warungs`, `manufacturers`, `products`,
`product_variants`, `quantity_discounts`, `promotions`, `bonus_rules`.

---

## Phase B — Transaction loop (ACTIVE ACTION, steps 1–6)

The numbered nodes on the chart line up across the three lanes:

| # | Community (W) | HALINEST (H) — intermediary | Manufacturer (M) |
|---|---------------|------------------------------|------------------|
| 1 | **Search Products** (sees buyer price from `sell_price`) | Serve catalog · **Special Promotion** | Publish **Input List** / **Special Promotion** |
| 2 | **Special Discount** (qty discounts, promos) | Apply pricing rules | — |
| 3 | **Order & Payment** → creates **Transaction** | Manually **confirm** payment in `/admin`, then `payment_split` fires (net → each M, fee → H, shipping → courier, commission → distributor if internal) | **Order & Payment** received; **Re-Order**; Net Price & Payment |
| 4 | **Delivery** | Book each per-M shipment via Biteship (`/api/shipping/book`) **or** assign an internal distributor; track statuses | Fulfill from **Guaranteed Stock** |
| 5 | **FREE Analyzes** | **BigData** ← all transactions | **FREE Analyzes** |
| 6 | **Black Bonus** (loyalty payout) | **PROFIT** | **PROFIT** |

**Concrete loop (as built):** warung browses the catalog (`/shop`) → sets quantities →
picks a **courier per manufacturer** (multi-origin; rates quoted from each manufacturer's
ship-from origin via Biteship) → **places order** (writes `order` + `order_items` + one
`order_shipments` row per manufacturer; a trigger computes totals) → a **PENDING** payment
for **total + shipping** is created → **admin manually confirms** the payment in `/admin` →
`payment_split` fires → order becomes **`paid`**. **Fulfillment:** admin books each
per-manufacturer shipment with Biteship (`/api/shipping/book`) **or** assigns an internal
distributor shipment; statuses are tracked and the order status **auto-syncs** (`shipped` when
all legs are booked, `delivered` when all delivered). Biteship shipments support cancel/return
and a printable label.

Maps to tables: `orders`, `order_items`, `order_shipments`, `payments`, `settlements`,
`shipments`, `routes`, `ledger_profit`, `ledger_bonus`.

---

## Phase C — Analytics & Distribution loop (the value-add)

```
Transactions ──► BigData ──► Market Information ──► [D sub-DB]
                    │
                    ├──► FREE Analyzes (Community):   Avg Weekly Order/product · Forecast next week (Cash-Out Plan)
                    │
                    ├──► FREE Analyzes (Manufacturer): Total Sales · Sales by Brand/Product/Variant ·
                    │                                  Coverage Area · Pareto Customers · Sales Growth · Total Promotion
                    │
                    └──► Distributor ──► Routes ──► Effective Distribution ──► Sales Management ──► PROFIT
```

The platform's defensible value: aggregate **every** transaction into **BigData**, then
serve it back as free analytics (buyer demand forecasting; seller sales intelligence)
while orchestrating distribution.

Maps to tables/views: `sales_facts` (the analytic grain), `market_information`,
`ledger_bonus`, `ledger_profit`, and the read models in `packages/features/analytics`.

### Analytics → query mapping

| Dashboard output (chart) | Derivation over `sales_facts` |
| ------------------------ | ----------------------------- |
| Total Sales | `SUM(net_revenue)` for manufacturer |
| Sales by Brand / Prod. Name / Variant | `GROUP BY brand / product_id / variant_id` |
| Coverage Area | distinct `region` / `community_id` reached |
| Pareto Customers | cumulative-revenue rank of `warung_id` (80/20) |
| Sales Growth | period-over-period `SUM(net_revenue)` |
| Total Promotion | `SUM(promo_discount)` applied |
| Avg Weekly Order by product (W) | `AVG(qty)` per `variant_id` per warung per ISO week |
| Forecast next week / Cash-Out Plan (W) | moving average of the weekly series |

---

## State machines

**Order**: `cart → placed → paid → shipped → delivered → closed` (or `cancelled`).
`shipped`/`delivered` are driven **automatically** by `order_shipment_sync_order_status` from
the per-manufacturer `order_shipments` (forward-only; cancelled legs ignored).
**Order shipment** (per manufacturer): `(unbooked) → confirmed/booked` (has `tracking_number`)
`→ courier statuses → delivered`; can be `cancelled` (resi cleared, re-bookable); optional
return leg.
**Internal shipment**: `planned → loaded → in_transit → delivered → reconciled` (or `cancelled`).
**Payment** (manual): `pending → confirmed` (by admin).
The buyer pays out-of-band and an admin confirms receipt, flipping the payment to
`confirmed`, which triggers `payment_split`. (A Midtrans Snap gateway is deferred to
the next development phase.) See [architecture.md §12](architecture.md).
**Party registration**: `pending → approved → active` (or `rejected`/`suspended`);
manufacturers additionally carry `contract_signed_at`.

---

## End-to-end sequence (one order)

```
Warung searches → adds variants to cart (price = buyer-facing `sell_price`, less any promo)
   → picks a courier per manufacturer (Biteship rates per ship-from origin)
      → places order (one order_shipments row per manufacturer) → pays total + shipping out-of-band
         → admin confirms payment received → payment_split settles (sum = amount paid):
                                                   net_price  → each manufacturer
                                                   fee        → HALINEST
                                                   shipping   → courier (external Biteship)
                                                   commission → distributor (internal path only; skipped for Biteship)
      → each per-M shipment booked via Biteship OR assigned to an internal distributor
         → statuses tracked; order auto-syncs shipped (all booked) → delivered (all delivered) → closed
            → row written to sales_facts
            → ledgers updated (profit × 3 parties, Black Bonus for warung)
               → BigData rollups refresh both sides' FREE Analyzes + Market Information
```
