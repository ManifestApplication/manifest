import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/shipping/return { shipmentId } — admin-only.
// Books the REVERSE leg of a delivered shipment: origin = buyer, destination =
// the manufacturer. It's a brand-new Biteship order tracked independently of the
// forward leg (stored in the return_* columns); the order's own status is left
// untouched.
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
    .select(
      "id, order_id, manufacturer_id, courier, service, tracking_number, return_shipping_order_id",
    )
    .eq("id", shipmentId)
    .single();
  if (!ship)
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  if (!ship.tracking_number)
    return NextResponse.json(
      { error: "Only a shipped shipment can be returned." },
      { status: 400 },
    );
  if (ship.return_shipping_order_id)
    return NextResponse.json(
      { error: "A return is already in progress for this shipment." },
      { status: 400 },
    );

  // Buyer = the RETURN origin (goods start at the warung).
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
  if (!buyer?.phone || buyer.latitude == null || buyer.longitude == null)
    return NextResponse.json(
      { error: "Buyer is missing phone or GPS location." },
      { status: 400 },
    );

  // Manufacturer = the RETURN destination. Coordinates + name live in
  // manufacturers; contact phone/address live in the manufacturer's account.
  const { data: mfr } = await supabase
    .from("manufacturers")
    .select("company_name, origin_latitude, origin_longitude, origin_address")
    .eq("account_id", ship.manufacturer_id)
    .single();
  const { data: mfrAcct } = await supabase
    .from("accounts")
    .select("full_name, phone, address")
    .eq("id", ship.manufacturer_id)
    .single();

  const destPhone = mfrAcct?.phone || process.env.SHIPPING_ORIGIN_CONTACT_PHONE || "";
  const destAddress =
    mfr?.origin_address || mfrAcct?.address || process.env.SHIPPING_ORIGIN_ADDRESS || "";
  if (!destPhone)
    return NextResponse.json(
      { error: "Manufacturer has no contact phone for the return." },
      { status: 400 },
    );

  // This manufacturer's lines in the order — the goods being sent back.
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
      name: `${it.product_variants?.products?.brand ?? ""} ${it.product_variants?.products?.name ?? "Item"}`.trim(),
      value: it.unit_net_price,
      quantity: it.qty,
      weight: it.product_variants?.weight ?? 1000,
    }));

  const payload: Record<string, unknown> = {
    origin_contact_name: buyer.full_name,
    origin_contact_phone: buyer.phone,
    origin_address: buyer.address ?? "",
    origin_coordinate: { latitude: buyer.latitude, longitude: buyer.longitude },
    destination_contact_name: mfr?.company_name || "Manufacturer",
    destination_contact_phone: destPhone,
    destination_address: destAddress,
    courier_company: ship.courier,
    courier_type: ship.service,
    delivery_type: "now",
    items: biteshipItems.length
      ? biteshipItems
      : [{ name: "Return", value: 10000, quantity: 1, weight: 1000 }],
  };
  if (mfr?.origin_latitude != null && mfr?.origin_longitude != null) {
    payload.destination_coordinate = {
      latitude: mfr.origin_latitude,
      longitude: mfr.origin_longitude,
    };
  } else if (process.env.SHIPPING_ORIGIN_LATITUDE && process.env.SHIPPING_ORIGIN_LONGITUDE) {
    payload.destination_coordinate = {
      latitude: Number(process.env.SHIPPING_ORIGIN_LATITUDE),
      longitude: Number(process.env.SHIPPING_ORIGIN_LONGITUDE),
    };
  }

  try {
    const res = await fetch("https://api.biteship.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: key },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data?.success === false)
      return NextResponse.json(
        { error: data?.error ?? "Return booking failed." },
        { status: 200 },
      );

    const tracking =
      data?.courier?.waybill_id || data?.courier?.tracking_id || data?.id || null;

    await supabase
      .from("order_shipments")
      .update({
        return_shipping_order_id: data?.id ?? null,
        return_tracking_number: tracking,
        return_status: "confirmed",
      })
      .eq("id", ship.id);

    return NextResponse.json({ return_tracking_number: tracking });
  } catch (e) {
    return NextResponse.json({ error: `Return error: ${String(e)}` }, { status: 200 });
  }
}
