import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Per-manufacturer rate lookup. Groups the cart by manufacturer and quotes each
// group from that manufacturer's own origin (fallback: the hub in env).
// POST body: { destination: { latitude, longitude }, lines: [{ variant_id, qty }] }
export async function POST(req: Request) {
  const key = process.env.BITESHIP_API_KEY;
  if (!key) return NextResponse.json({ configured: false, groups: [] });

  const body = await req.json().catch(() => ({}));
  const destination = body?.destination ?? null;
  const lines: { variant_id: string; qty: number }[] = Array.isArray(body?.lines)
    ? body.lines
    : [];
  if (destination?.latitude == null || destination?.longitude == null)
    return NextResponse.json({ configured: true, groups: [], error: "No destination location." });
  if (lines.length === 0) return NextResponse.json({ configured: true, groups: [] });

  const supabase = await createClient();
  const { data: variants } = await supabase
    .from("product_variants")
    .select(
      "id, net_price, weight, products(name, brand, manufacturer_id, manufacturers(company_name, origin_latitude, origin_longitude))",
    )
    .in(
      "id",
      lines.map((l) => l.variant_id),
    );

  type VRow = {
    id: string;
    net_price: number;
    weight: number | null;
    products: {
      name: string;
      brand: string;
      manufacturer_id: string;
      manufacturers: {
        company_name: string;
        origin_latitude: number | null;
        origin_longitude: number | null;
      } | null;
    } | null;
  };
  const vmap = new Map<string, VRow>();
  for (const v of (variants ?? []) as unknown as VRow[]) vmap.set(v.id, v);

  type Item = { name: string; value: number; weight: number; quantity: number };
  type Group = {
    manufacturer_id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    items: Item[];
  };
  const groups = new Map<string, Group>();
  for (const l of lines) {
    const v = vmap.get(l.variant_id);
    if (!v?.products) continue;
    const mid = v.products.manufacturer_id;
    const g =
      groups.get(mid) ??
      ({
        manufacturer_id: mid,
        name: v.products.manufacturers?.company_name ?? "Manufacturer",
        lat: v.products.manufacturers?.origin_latitude ?? null,
        lng: v.products.manufacturers?.origin_longitude ?? null,
        items: [],
      } satisfies Group);
    g.items.push({
      name: `${v.products.brand} ${v.products.name}`.trim() || "Item",
      value: v.net_price,
      weight: v.weight ?? 1000,
      quantity: l.qty,
    });
    groups.set(mid, g);
  }

  const couriers =
    process.env.SHIPPING_COURIERS ||
    "jne,jnt,sicepat,anteraja,gojek,grab,ninja,pos";
  const hubLat = process.env.SHIPPING_ORIGIN_LATITUDE;
  const hubLng = process.env.SHIPPING_ORIGIN_LONGITUDE;
  const hubPostal = process.env.SHIPPING_ORIGIN_POSTAL_CODE;

  type Pricing = {
    courier_code: string;
    courier_name: string;
    courier_service_code: string;
    courier_service_name: string;
    description?: string;
    duration?: string;
    price: number;
  };

  const result = [];
  for (const g of groups.values()) {
    const payload: Record<string, unknown> = {
      couriers,
      items: g.items,
      destination_latitude: destination.latitude,
      destination_longitude: destination.longitude,
    };
    if (g.lat != null && g.lng != null) {
      payload.origin_latitude = g.lat;
      payload.origin_longitude = g.lng;
    } else if (hubLat && hubLng) {
      payload.origin_latitude = Number(hubLat);
      payload.origin_longitude = Number(hubLng);
    } else if (hubPostal) {
      payload.origin_postal_code = Number(hubPostal);
    }

    try {
      const res = await fetch("https://api.biteship.com/v1/rates/couriers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: key },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const failed = !res.ok || data?.success === false;
      result.push({
        manufacturer_id: g.manufacturer_id,
        manufacturer_name: g.name,
        options: failed
          ? []
          : (data.pricing ?? []).map((p: Pricing) => ({
              courier: p.courier_code,
              courierName: p.courier_name,
              service: p.courier_service_code,
              serviceName: p.courier_service_name,
              description: p.description ?? "",
              etd: p.duration ?? "",
              price: p.price,
            })),
        error: failed ? (data?.error ?? "Rate lookup failed.") : null,
      });
    } catch (e) {
      result.push({
        manufacturer_id: g.manufacturer_id,
        manufacturer_name: g.name,
        options: [],
        error: String(e),
      });
    }
  }

  return NextResponse.json({ configured: true, groups: result });
}
