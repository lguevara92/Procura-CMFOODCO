import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extraerUbicacionActual } from "@/lib/trackingmore";

// TrackingMore no firma sus webhooks; la protección es el secreto en la URL
// que se configura en su dashboard: .../api/webhooks/trackingmore?secret=...
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.TRACKINGMORE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const data = body?.data ?? body;
  const trackingNumber = data?.tracking_number;
  const courierCode = data?.courier_code;

  if (!trackingNumber) {
    return NextResponse.json({ error: "payload sin tracking_number" }, { status: 400 });
  }

  // Se usa la service role porque este endpoint lo llama TrackingMore, no un usuario con sesión.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  let query = supabase.from("tracking").update({
    estatus: data?.delivery_status ?? null,
    substatus: data?.substatus ?? null,
    ubicacion_actual: extraerUbicacionActual(data),
    fecha_estimada_entrega: data?.scheduled_delivery_date || null,
    raw_data: data,
    ultima_actualizacion: new Date().toISOString(),
  });
  query = query.eq("numero_guia", trackingNumber);
  if (courierCode) query = query.eq("courier_code", courierCode);

  const { error } = await query;
  if (error) {
    console.error("[webhook trackingmore] error actualizando:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
