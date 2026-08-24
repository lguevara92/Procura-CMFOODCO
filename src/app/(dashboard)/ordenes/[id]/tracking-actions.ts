"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_TRACKING } from "@/lib/constants";
import { crearTracking, consultarTracking, detectarPaqueteria, extraerUbicacionActual } from "@/lib/trackingmore";

export async function registrarTracking(_prevState: { error: string | null } | null, formData: FormData) {
  const profile = await requireProfile();
  if (!ROLES_TRACKING.includes(profile.rol)) {
    return { error: "No tienes permiso para registrar guías de rastreo." };
  }

  const ordenId = String(formData.get("orden_id") ?? "");
  const numeroGuia = String(formData.get("numero_guia") ?? "").trim();

  if (!ordenId || !numeroGuia) {
    return { error: "Escribe el número de guía." };
  }

  const supabase = await createClient();

  let candidatos;
  try {
    candidatos = await detectarPaqueteria(numeroGuia);
  } catch (err) {
    return { error: `No se pudo detectar la paquetería: ${err instanceof Error ? err.message : "error desconocido"}` };
  }

  if (!candidatos || candidatos.length === 0) {
    return { error: "No se pudo identificar la paquetería/naviera con ese número de guía. Verifícalo." };
  }

  const courier = candidatos[0];

  let creado;
  try {
    creado = await crearTracking(numeroGuia, courier.courier_code, ordenId);
  } catch (err) {
    return { error: `No se pudo registrar el rastreo: ${err instanceof Error ? err.message : "error desconocido"}` };
  }

  const { error } = await supabase.from("tracking").insert({
    orden_id: ordenId,
    numero_guia: numeroGuia,
    courier_code: courier.courier_code,
    transportista: courier.courier_name,
    estatus: creado?.status ?? "pending",
    substatus: creado?.substatus ?? null,
    ubicacion_actual: extraerUbicacionActual(creado),
    fecha_estimada_entrega: creado?.scheduled_delivery_date || null,
    raw_data: creado ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/ordenes/${ordenId}`);
  revalidatePath("/tracking");
  return { error: null };
}

export async function actualizarTracking(trackingId: string, ordenId: string) {
  const profile = await requireProfile();
  if (!ROLES_TRACKING.includes(profile.rol)) {
    return { error: "No tienes permiso para actualizar el rastreo." };
  }

  const supabase = await createClient();
  const { data: tracking } = await supabase.from("tracking").select("*").eq("id", trackingId).single();
  if (!tracking) return { error: "No se encontró ese rastreo." };

  try {
    const actualizado = await consultarTracking(tracking.numero_guia, tracking.courier_code ?? "");
    const { error } = await supabase
      .from("tracking")
      .update({
        estatus: actualizado?.status ?? tracking.estatus,
        substatus: actualizado?.substatus ?? tracking.substatus,
        ubicacion_actual: extraerUbicacionActual(actualizado) ?? tracking.ubicacion_actual,
        fecha_estimada_entrega: actualizado?.scheduled_delivery_date || tracking.fecha_estimada_entrega,
        raw_data: actualizado ?? tracking.raw_data,
        ultima_actualizacion: new Date().toISOString(),
      })
      .eq("id", trackingId);

    if (error) return { error: error.message };
  } catch (err) {
    return { error: `No se pudo consultar TrackingMore: ${err instanceof Error ? err.message : "error desconocido"}` };
  }

  revalidatePath(`/ordenes/${ordenId}`);
  revalidatePath("/tracking");
  return { error: null };
}
