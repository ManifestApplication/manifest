# Manifest (HALINEST)

A 3-sided B2B distribution marketplace connecting warung (buyers), manufacturers (sellers), and distributors (logistics), with HALINEST as admin. Built database-first on Supabase (Postgres + Auth + Storage) with Next.js 16 (App Router) + Tailwind v4, in a pnpm monorepo (apps/web). Payments are manual for now (Midtrans planned).

> _Every unit, accounted for_

## Main Features

- Role-based signup/login; signup captures phone (+62), address, and GPS pin via Google Maps. Four role dashboards: warung (/orders + /shop), manufacturer (/catalog), distributor (/logistics), admin (/admin).
- Money engine in the DB: automatic settlement split (net to manufacturer, platform fee to HALINEST, shipping to courier, commission to distributor) via triggers; per-manufacturer admin-set fees; RLS isolating each party's data.
- Catalog with products + variants (weight, net price); buyer sell-price = net + manufacturer fee.
- Ordering with per-manufacturer courier selection (multi-origin); manual payment confirmation by admin.
- Shipping via Biteship: rate quotes per manufacturer origin, admin booking, tracking, cancel, return, and a printable label. An internal distributor shipment path also exists.
- Self-service account page (change email/password) and forgot/reset password flow.
- Internationalization: English / Bahasa Indonesia toggle across the whole app.
- Analytics for warung (buying patterns), manufacturer (sales), and admin (platform rankings).

## Summary

- 3-sided B2B distribution marketplace: warung, manufacturers, distributors, HALINEST admin
- Database-first on Supabase (Postgres + Auth + Storage), Next.js 16 + Tailwind v4, pnpm monorepo
- Four role-based dashboards with RLS data isolation
- DB money engine: trigger-driven settlement split and per-manufacturer fees
- Catalog (products + variants), ordering, and manual admin payment confirmation
- Biteship shipping: rates, booking, tracking, cancel, return, printable label (+ internal distributor path)
- Google Maps GPS capture at signup; account self-service and password reset
- English / Bahasa Indonesia internationalization
- Role-specific analytics (warung, manufacturer, admin)
- DB deployed on Supabase cloud; Vercel frontend deploy pending, seed disabled (manual data re-entry)
