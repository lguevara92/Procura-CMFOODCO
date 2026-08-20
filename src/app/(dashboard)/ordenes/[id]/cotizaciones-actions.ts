"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

const ROLES_COTIZACIONES = ["logistica", "admin_sistema"];

export async function addCotizacion(_prevState: { error: string | null } | null, formData: FormData) {
  const profile = await requireProfile();
  if (!ROLES_COTIZACIONES.includes(profile.rol)) {
    return { error: "No tienes permiso para registrar cotizaciones de flete." };
  }

  const supabase = await createClient();
  const ordenId = String(formData.get("orden_id") ?? "");
  let proveedorId = String(formData.get("proveedor_id") ?? "");
  const proveedorNuevoNombre = String(formData.get("proveedor_nuevo_nombre") ?? "").trim();
  const proveedorNuevoEmail = String(formData.get("proveedor_nuevo_email") ?? "").trim();
  const costo = Number(formData.get("costo"));
  const moneda = String(formData.get("moneda") ?? "USD").trim();
  const tiempoTransito = String(formData.get("tiempo_transito") ?? "").trim() || null;
  const ruta = String(formData.get("ruta") ?? "").trim() || null;
  const vigencia = String(formData.get("vigencia") ?? "") || null;

  if (proveedorId === "__nuevo__" && proveedorNuevoNombre) {
    const { data, error } = await supabase
      .from("proveedores")
      .insert({ nombre: proveedorNuevoNombre, tipo: "logistica", contacto: proveedorNuevoEmail || null })
      .select("id")
      .single();
    if (error) return { error: `No se pudo crear el proveedor: ${error.message}` };
    proveedorId = data.id;
  }

  if (!ordenId || !proveedorId || proveedorId === "__nuevo__" || !costo) {
    return { error: "Completa proveedor y costo." };
  }

  const { error } = await supabase.from("cotizaciones_flete").insert({
    orden_id: ordenId,
    proveedor_logistico_id: proveedorId,
    costo,
    moneda,
    tiempo_transito: tiempoTransito,
    ruta,
    vigencia,
  });

  if (error) return { error: error.message };

  revalidatePath(`/ordenes/${ordenId}`);
  return { error: null };
}

export async function elegirCotizacion(ordenId: string, cotizacionId: string, justificacion: string) {
  const profile = await requireProfile();
  if (!ROLES_COTIZACIONES.includes(profile.rol)) {
    return { error: "No tienes permiso para elegir la cotización." };
  }
  if (!justificacion.trim()) {
    return { error: "Escribe una justificación." };
  }

  const supabase = await createClient();

  const { data: cotizaciones, error: fetchError } = await supabase
    .from("cotizaciones_flete")
    .select("id, proveedor:proveedores(nombre, contacto)")
    .eq("orden_id", ordenId);
  if (fetchError) return { error: fetchError.message };

  const { error: resetError } = await supabase
    .from("cotizaciones_flete")
    .update({ elegida: false })
    .eq("orden_id", ordenId);
  if (resetError) return { error: resetError.message };

  const { error: setError } = await supabase
    .from("cotizaciones_flete")
    .update({ elegida: true, justificacion })
    .eq("id", cotizacionId);
  if (setError) return { error: setError.message };

  type CotizacionConProveedor = { id: string; proveedor: { nombre: string; contacto: string | null } | null };
  const lista = (cotizaciones ?? []) as unknown as CotizacionConProveedor[];
  const ganadora = lista.find((c) => c.id === cotizacionId);
  const perdedoras = lista.filter((c) => c.id !== cotizacionId);

  if (ganadora?.proveedor?.contacto) {
    await sendEmail({
      to: ganadora.proveedor.contacto,
      subject: "Tu cotización de flete fue seleccionada — Procura CM Foodco",
      html: `<p>Hola,</p><p>Tu cotización de flete fue seleccionada para esta orden de compra.</p><p><strong>Motivo:</strong> ${justificacion}</p>`,
    });
  }
  for (const perdedora of perdedoras) {
    if (perdedora.proveedor?.contacto) {
      await sendEmail({
        to: perdedora.proveedor.contacto,
        subject: "Resultado de tu cotización de flete — Procura CM Foodco",
        html: "<p>Hola,</p><p>Gracias por tu cotización de flete. En esta ocasión elegimos a otro proveedor logístico para esta orden.</p>",
      });
    }
  }

  revalidatePath(`/ordenes/${ordenId}`);
  return { error: null };
}
