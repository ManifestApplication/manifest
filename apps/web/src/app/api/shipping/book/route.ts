import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Books ONE per-manufacturer shipment (order_shipments row) with Biteship,
// shipping from that manufacturer's own origin. Admin-only.
export async function POST(req: Request) {
  const key = process.env.BITESHIP_API_KEY;
  if (!key)
    return NextResponse.json({ error: "Shipping is not configured." }, { status: 400 });

  const { shipmentId } = await req.json().catch(() => ({}));
  if (!shipmentId)
    return NextResponse.json({ error: "Missing shipmentId." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: me } = await supabase
    .from("accounts")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin")
    return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { data: ship } = await supabase
    .from("order_shipments")
    .select("id, order_id, manufacturer_id, courier, service, tracking_number")
    .eq("id", shipmentId)
    .single();
  if (!ship)
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  if (ship.tracking_number)
    return NextResponse.json({ tracking_number: ship.tracking_number, already: true });

  const { data: order } = await supabase
    .from("orders")
    .select("warung_id")
    .eq("id", ship.order_id)
    .single();
  const { data: buyer } = await supabase
    .from("accounts")
    .select("full_name, phone, address, latitude, longitude")
    .eq("id", order?.warung_id ?? "")
    .single();
  if (!buyer?.phone)
    return NextResponse.json({ error: "Buyer has no phone number." }, { status: 400 });
  if (buyer.latitude == null || buyer.longitude == null)
    return NextResponse.json({ error: "Buyer has no GPS location." }, { status: 400 });

  const { data: mfr } = await supabase
    .from("manufacturers")
    .select("company_name, origin_latitude, origin_longitude, origin_address")
    .eq("account_id", ship.manufacturer_id)
    .single();

  // This manufacturer's lines in the order.
  const { data: items } = await supabase
    .from("order_items")
    .select(
      "qty, unit_net_price, product_variants(weight, products(name, brand, manufacturer_id))",
    )
    .eq("order_id", ship.order_id);
  type ItemRow = {
    qty: number;
    unit_net_price: number;
    product_variants: {
      weight: number | null;
      products: { name: string; brand: string; manufacturer_id: string } | null;
    } | null;
  };
  const biteshipItems = ((items ?? []) as unknown as ItemRow[])
    .filter((it) => it.product_variants?.products?.manufacturer_id === ship.manufacturer_id)
    .map((it) => ({
      name:
        `${it.product_variants?.products?.brand ?? ""} ${it.product_variants?.products?.name ?? "Item"}`.trim(),
      value: it.unit_net_price,
      quantity: it.qty,
      weight: it.product_variants?.weight ?? 1000,
    }));

  const payload: Record<string, unknown> = {
    origin_contact_name:
      mfr?.company_name || process.env.SHIPPING_ORIGIN_CONTACT_NAME || "HALINEST Hub",
    origin_contact_phone: process.env.SHIPPING_ORIGIN_CONTACT_PHONE || "",
    origin_address: mfr?.origin_address || process.env.SHIPPING_ORIGIN_ADDRESS || "",
    destination_contact_name: buyer.full_name,
    destination_contact_phone: buyer.phone,
    destination_address: buyer.address ?? "",
    destination_coordinate: { latitude: buyer.latitude, longitude: buyer.longitude },
    courier_company: ship.courier,
    courier_type: ship.service,
    delivery_type: "now",
    items: biteshipItems.length
      ? biteshipItems
      : [{ name: "Order", value: 10000, quantity: 1, weight: 1000 }],
  };
  // Origin: the manufacturer's location, else the hub.
  if (mfr?.origin_latitude != null && mfr?.origin_longitude != null) {
    payload.origin_coordinate = {
      latitude: mfr.origin_latitude,
      longitude: mfr.origin_longitude,
    };
  } else if (process.env.SHIPPING_ORIGIN_LATITUDE && process.env.SHIPPING_ORIGIN_LONGITUDE) {
    payload.origin_coordinate = {
      latitude: Number(process.env.SHIPPING_ORIGIN_LATITUDE),
      longitude: Number(process.env.SHIPPING_ORIGIN_LONGITUDE),
    };
  } else if (process.env.SHIPPING_ORIGIN_POSTAL_CODE) {
    payload.origin_postal_code = Number(process.env.SHIPPING_ORIGIN_POSTAL_CODE);
  }

  try {
    const res = await fetch("https://api.biteship.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: key },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data?.success === false)
      return NextResponse.json({ error: data?.error ?? "Booking failed." }, { status: 200 });

    const tracking =
      data?.courier?.waybill_id || data?.courier?.tracking_id || data?.id || null;
    const ref = data?.courier?.tracking_id ?? data?.id ?? null;
    const orderId = data?.id ?? null; // Biteship order id — needed to cancel later.

    // Update the shipment row; the sync trigger advances the order status.
    await supabase
      .from("order_shipments")
      .update({
        tracking_number: tracking,
        shipping_order_ref: ref,
        shipping_order_id: orderId,
        status: "confirmed",
      })
      .eq("id", ship.id);

    return NextResponse.json({ tracking_number: tracking });
  } catch (e) {
    return NextResponse.json({ error: `Booking error: ${String(e)}` }, { status: 200 });
  }
}
