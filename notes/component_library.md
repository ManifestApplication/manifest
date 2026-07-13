# Manifest / HALINEST — Component Library

The shared UI lives in `packages/ui` — React Native primitives styled with NativeWind v4,
consumed by web (via `react-native-web`) and mobile from one source. This doc defines the
**design tokens** (from `brand guidelines.pdf v1.0`) and the **primitive components** to
build. It's the contract `packages/ui` implements in Phase 5.

> **Implementation status (2026-07-02):** the web app (`apps/web`) is styled with **Tailwind
> v4** via the `@theme` block in `src/app/globals.css`, and the **brand color tokens below are live**
> (`paper` `ink` `margin` `signal` `verified` `parchment` `border`), with **Inter + IBM Plex Mono**
> fonts. Charts are flat CSS bars (no charting lib). The app is **bilingual (EN/ID)** — see the i18n
> note at the end of §3. Still pending: the shared, cross-platform `packages/ui` **React Native
> primitives** (`Button`, `Money`, `Mono`, …) — those don't exist yet; today's web components are
> plain React + Tailwind and reference the semantic tokens directly. See [ai_memory.md §3](ai_memory.md).

> Brand North Star: _ledger paper and ink_. A restrained palette where **Signal blue is the
> only place color does the talking**. Surfaces are warm off-white; text is near-black.

---

## 1. Design tokens

Tokens are defined once in the shared Tailwind/NativeWind preset
(`packages/config/tailwind`) and consumed by both apps.

### Color

| Token            | Hex       | Use                                    |
| ---------------- | --------- | -------------------------------------- |
| `ink`            | `#0A0A0B` | Primary text, wordmark                 |
| `signal`         | `#185FA5` | The dot, links, primary CTAs           |
| `verified`       | `#0F6E56` | Confirmation / success states          |
| `parchment`      | `#F1EFE8` | Card surfaces                          |
| `paper`          | `#FAFAF7` | Page background                        |
| `margin`         | `#5F5E5A` | Secondary text                         |

Derived semantic aliases (map to the above; don't invent new hexes):
`bg` → paper · `surface` → parchment · `text` → ink · `text-muted` → margin ·
`primary` → signal · `success` → verified · `border` → parchment darkened ~8%.

> Rule: components reference **semantic tokens**, never raw hexes. Color beyond Signal/Verified
> requires a brand-team decision — see [project_rules.md](project_rules.md).

### Typography

- **Inter** — display & body. Weight **500** for headings, **400** for body. Tight
  letter-spacing on display sizes only.
- **IBM Plex Mono** — reserved for "on the record" content: audit IDs, SKUs, invoice/trip
  numbers, gateway order IDs, stamps. Use the `<Mono>` variant, never for body copy.

Type scale (rem / sp): `display` 2rem/500 · `h1` 1.5rem/500 · `h2` 1.25rem/500 ·
`body` 1rem/400 · `small` 0.875rem/400 · `mono` 0.875rem (IBM Plex Mono).

### Shape & spacing

- Spacing scale: 4-point grid (`1`=4px … `6`=24px, `8`=32px).
- Radius: `sm` 4px (inputs, chips) · `md` 8px (cards, buttons) · app icon is **square
  corners, flat fill** (per logo rules — do not round the M mark).
- Elevation: surfaces are flat. Separate with the `border` token, not heavy shadows.

---

## 2. Primitive components (`packages/ui`)

Each is written against RN APIs (`View`, `Text`, `Pressable`), styled with NativeWind, and
exported as a named export. Props are typed; variants are discriminated unions, not booleans
stacked together.

| Component   | Variants / key props                                          | Notes |
| ----------- | ------------------------------------------------------------- | ----- |
| `Button`    | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger'`; `size: 'sm'\|'md'`; `loading`; `disabled` | primary = Signal fill; danger = restrained, not loud |
| `Text`      | `as: 'display'\|'h1'\|'h2'\|'body'\|'small'\|'muted'`         | wraps Inter weights |
| `Mono`      | —                                                             | IBM Plex Mono; for IDs/codes/stamps |
| `Input`     | `label`, `error`, `hint`, `type`                              | pairs with react-hook-form; shows error in a quiet tone |
| `Select`    | `options`, `value`, `onChange`                                | native picker on mobile, `<select>` on web (`.web/.native`) |
| `Card`      | `padded`, `as` (pressable?)                                   | Parchment surface, `md` radius, 1px border |
| `Badge`     | `tone: 'neutral'\|'signal'\|'verified'\|'warn'`               | status pills (order/shipment status) |
| `Stamp`     | `label`, `id?`                                                | the "VERIFIED" mark; Mono + bordered box; for confirmed states |
| `Money`     | `amount` (IDR integer)                                        | formats `Rp 48.000`; never renders floats |
| `Field`     | composition: `Input`/`Select` + `label` + `error`            | the form row used by feature forms |
| `EmptyState`| `title`, `body`, `action?`                                    | plainspoken copy, no exclamation marks |
| `Spinner`   | `size`                                                        | used by `Button loading` and route transitions |
| `Toast`     | `tone`, `message`                                             | transient; success uses Verified |

### Status → tone mapping (single source for all status UI)

| Domain status                              | Component        | Tone       |
| ------------------------------------------ | ---------------- | ---------- |
| order `placed`                             | `Badge`          | neutral    |
| order `paid` / payment `confirmed`         | `Badge`/`Stamp`  | verified   |
| order `cancelled` / payment `failed`       | `Badge`          | warn       |
| shipment `in_transit`                      | `Badge`          | signal     |
| shipment `delivered` / `reconciled`        | `Stamp`          | verified   |

---

## 3. Composed patterns (app-level, built from primitives)

These live in `apps/web/src` (mostly `components/` for shared, `app/<route>/` for feature-local),
not in `packages/ui`. All are plain React + Tailwind today. Exported names are exact.

### Shared (`apps/web/src/components/`)

- **LanguageSwitcher** (`language-switcher.tsx`) — EN/ID toggle; sets the `lang` cookie and
  `router.refresh()` so the server re-renders in the new locale (no API route). Active locale
  gets a Signal fill.
- **LocationModalEditor** (`location-modal-editor.tsx`) — compact location summary (lat/lng in
  `Mono`, address) with a "Change location" button that opens a modal holding the map + address
  textarea. `target: 'manufacturer' | 'warung'` picks the write path (manufacturer `origin_*`
  columns via RLS self-write; warung via the `set_my_location` RPC). Used for manufacturer
  ship-from and warung delivery.
- **PasswordInput** (`password-input.tsx`) — password field with a show/hide eye toggle.
- **SignOutButton** (`sign-out-button.tsx`) — signs out and redirects.

### Catalog / product (`app/catalog/`)

- **NewProductForm** (`new-product-form.tsx`) — product fields + repeatable variant rows;
  Rp-prefixed price input and `g`-suffixed weight input, category `<select>` from
  `PRODUCT_CATEGORIES`. Inserts product then all variants.
- **EditableProduct** (`editable-product.tsx`) — inline edit of an existing product + its variants.

### Shop / ordering (`app/shop/`)

- **OrderForm** (`order-form.tsx`) — cart → order flow; composes shipping selection.
- **ShippingOptions** (`shipping-options.tsx`) — per-manufacturer courier rate selection.
  Fetches `/api/shipping/rates`, groups options by manufacturer, radio-selects one courier
  per manufacturer; prices formatted `Rp …`.

### Orders (`app/orders/`)

- **TrackShipment** (`track-shipment.tsx`) — expander that lazy-fetches `/api/shipping/track`
  (Biteship) and renders status + a history timeline.
- **PurchaseAnalytics** (`analytics/purchase-analytics.tsx`) — weekly / monthly / yearly toggle;
  buckets purchases by ISO period and renders flat CSS bars of avg qty per product.

### Admin (`app/admin/`)

- **ConfirmList** (`confirm-list.tsx`) — pending payments awaiting admin confirmation.
- **AssignShipment** (`assign-shipment.tsx`) — assign a shipment to a distributor.
- **ManufacturerFees** (`manufacturer-fees.tsx`) — per-manufacturer platform-fee settings.
- **CourierBooking** (`courier-booking.tsx`) — book couriers (Biteship) for shipments.
- **Shipping label** (`shipments/[id]/label/page.tsx` + `print-button.tsx`) — printable
  HALINEST shipping label (from/to, `Mono` waybill/order IDs, contents, total weight);
  `PrintButton` calls `window.print`. Biteship has no label-PDF endpoint, so we render our own.

### Signup (`app/signup/`)

- **LocationPicker** (`location-picker.tsx`, exports `LatLng`) — Google Maps picker with a
  manual-coordinate fallback and configurable `height`. Reused inside `LocationModalEditor`.

### Still notional (not yet built as named primitives)

- **ProductCard** — `Card` + `Money` (sell price = net × 1.03) + qty stepper.
- **OrderSummary** — line items + subtotal + fee row + total `Money` + payment-instructions
  panel (manual bank transfer; admin confirms receipt).
- **PartyNav** — role-aware navigation; renders only the tabs the role can access.

### i18n (bilingual EN/ID)

All user-facing strings come from a **typed dictionary** in `src/i18n/dictionaries.ts` (English is
the source-of-truth shape; `id` must match it). Client components read copy via `useT()` (and the
active locale via `useLocale()`) from `@/i18n/client`; server components use `getDict()` (and
`getLocale()`) from `@/i18n/server`. Locale is stored in the `lang` cookie, toggled by
`LanguageSwitcher`. **Rule: any new UI text must be added to both the `en` and `id` dictionaries** —
a missing key is a type error. (A few shared components, e.g. `LocationModalEditor`, still carry a
local `COPY` map keyed by locale; new work should prefer the shared dictionary.)

---

## 4. Rules for adding a component

1. Primitive and reusable across ≥2 features → `packages/ui`. Feature-specific → the feature
   package or app.
2. No raw hex/spacing literals — tokens only.
3. Provide both platforms. If behavior must diverge, split `.web.tsx` / `.native.tsx` with an
   identical exported prop signature.
4. Copy follows the brand voice: specific and plain. No "successfully", no marketing adjectives.
5. Accessible by default: labels on inputs, hit targets ≥ 44px on mobile, focus states on web.
