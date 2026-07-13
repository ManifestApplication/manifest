import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/shipping/track?shipmentId=... — courier progress for one shipment.
export async function GET(req: Request) {
  const key = process.env.BITESHIP_API_KEY;
  if (!key)
    return NextResponse.json({ error: "Shipping is not configured." }, { status: 400 });

  const shipmentId = new URL(req.url).searchParams.get("shipmentId");
  if (!shipmentId)
    return NextResponse.json({ error: "Missing shipmentId." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // RLS scopes order_shipments to the buyer (own order), its manufacturer, or admin.
  const { data: ship } = await supabase
    .from("order_shipments")
    .select("id, shipping_order_ref, tracking_number")
    .eq("id", shipmentId)
    .single();
  if (!ship?.shipping_order_ref)
    return NextResponse.json({ error: "Not booked yet." }, { status: 400 });

  try {
    const res = await fetch(
      `https://api.biteship.com/v1/trackings/${ship.shipping_order_ref}`,
      { headers: { Authorization: key } },
    );
    const data = await res.json();
    if (!res.ok || data?.success === false)
      return NextResponse.json({ error: data?.error ?? "Tracking failed." }, { status: 200 });

    // Persist the courier status so the sync trigger can advance the order.
    const courierStatus = String(data.status ?? "").toLowerCase();
    if (courierStatus)
      await supabase
        .from("order_shipments")
        .update({ status: courierStatus })
        .eq("id", ship.id);

    type Hist = { note?: string; status?: string; updated_at?: string };
    return NextResponse.json({
      status: data.status ?? null,
      waybill: data.waybill_id ?? ship.tracking_number ?? null,
      courier: data.courier?.company ?? null,
      driver: data.courier?.driver_name ?? null,
      history: (data.history ?? []).map((h: Hist) => ({
        note: h.note ?? "",
        status: h.status ?? "",
        at: h.updated_at ?? "",
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: `Tracking error: ${String(e)}` }, { status: 200 });
  }
}
