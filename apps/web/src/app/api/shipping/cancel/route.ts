import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Biteship's accepted cancellation reason codes. Anything else → "others".
const REASON_CODES = new Set([
  "change_courier",
  "pickup_delay",
  "change_address",
  "others",
]);

// POST /api/shipping/cancel { shipmentId, reasonCode?, reason? } — admin-only.
// Cancels ONE booked per-manufacturer shipment with Biteship and clears its
// resi so the admin can re-book it. The sync trigger ignores cancelled legs.
export async function POST(req: Request) {
  const key = process.env.BITESHIP_API_KEY;
  if (!key)
    return NextResponse.json({ error: "Shipping is not configured." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const shipmentId = body.shipmentId as string | undefined;
  if (!shipmentId)
    return NextResponse.json({ error: "Missing shipmentId." }, { status: 400 });

  const reasonCode = REASON_CODES.has(body.reasonCode) ? body.reasonCode : "others";
  const reason = (body.reason as string | undefined)?.trim() || "Cancelled by admin";

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
    .select("id, shipping_order_id")
    .eq("id", shipmentId)
    .single();
  if (!ship)
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  if (!ship.shipping_order_id)
    return NextResponse.json({ error: "This shipment is not booked." }, { status: 400 });

  try {
    const res = await fetch(
      `https://api.biteship.com/v1/orders/${ship.shipping_order_id}/cancel`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: key },
        body: JSON.stringify({
          cancellation_reason_code: reasonCode,
          cancellation_reason: reason,
        }),
      },
    );
    const data = await res.json();
    if (!res.ok || data?.success === false)
      return NextResponse.json(
        { error: data?.error ?? "Cancellation failed." },
        { status: 200 },
      );

    // Clear the resi/refs so the row is bookable again; mark it cancelled so the
    // sync trigger skips it.
    await supabase
      .from("order_shipments")
      .update({
        status: "cancelled",
        tracking_number: null,
        shipping_order_ref: null,
        shipping_order_id: null,
      })
      .eq("id", ship.id);

    return NextResponse.json({ cancelled: true });
  } catch (e) {
    return NextResponse.json({ error: `Cancel error: ${String(e)}` }, { status: 200 });
  }
}
