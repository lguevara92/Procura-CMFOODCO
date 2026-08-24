"use server";

import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_LANDED_COST } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { LandedCostDocument } from "@/lib/pdf/LandedCostDocument";

export async function calcularLandedCost(_prevState: { error: string | null } | null, formData: FormData) {
  const profile = await requireProfile();
  if (!ROLES_LANDED_COST.includes(profile.rol)) {
    return { error: "No tienes permiso para calcular el landed cost." };
  }

  const ordenId = String(formData.get("orden_id") ?? "");
  const num = (name: string) => Number(formData.get(name) ?? 0) || 0;
  const unidadesRecibidas = num("unidades_recibidas");
  const cajasStr = String(formData.get("cajas") ?? "").trim();
  const cbmStr = String(formData.get("cbm") ?? "").trim();
  const cajas = cajasStr ? Number(cajasStr) : null;
  const cbm = cbmStr ? Number(cbmStr) : null;

  if (!ordenId || unidadesRecibidas <= 0) {
    return { error: "Indica las unidades recibidas (debe ser mayor a 0)." };
  }

  const supabase = await createClient();
  const { data: landed, error } = await supabase
    .from("landed_costs")
    .insert({
      orden_id: ordenId,
      fob: num("fob"),
      flete: num("flete"),
      seguro: num("seguro"),
      aranceles: num("aranceles"),
      honorarios: num("honorarios"),
      gastos_locales: num("gastos_locales"),
      unidades_recibidas: unidadesRecibidas,
      cajas: cajas && cajas > 0 ? cajas : null,
      cbm: cbm && cbm > 0 ? cbm : null,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  const { data: ordenData } = await supabase
    .from("ordenes_compra")
    .select("operacion_id, incoterm, proveedor:proveedores(nombre), operacion:operaciones(nombre)")
    .eq("id", ordenId)
    .single();
  const orden = ordenData as unknown as {
    operacion_id: string;
    incoterm: string;
    proveedor: { nombre: string } | null;
    operacion: { nombre: string } | null;
  } | null;

  const proveedorNombre = orden?.proveedor?.nombre ?? "—";
  const operacionNombre = orden?.operacion?.nombre ?? "—";

  // Genera el PDF del landed cost y lo guarda junto al resto de documentos de la orden.
  let pdfBase64: string | null = null;
  try {
    const pdfBuffer = await renderToBuffer(
      <LandedCostDocument
        landedCost={landed}
        proveedorNombre={proveedorNombre}
        operacionNombre={operacionNombre}
        incoterm={orden?.incoterm ?? "—"}
      />,
    );
    const pdfPath = `${ordenId}/landed-cost-${landed.id}.pdf`;
    const { error: pdfUploadError } = await supabase.storage
      .from("documentos")
      .upload(pdfPath, pdfBuffer, { contentType: "application/pdf" });

    if (!pdfUploadError) {
      await supabase.from("landed_costs").update({ pdf_path: pdfPath }).eq("id", landed.id);
      pdfBase64 = pdfBuffer.toString("base64");
    } else {
      console.error("[landed-cost-pdf] No se pudo subir el PDF:", pdfUploadError.message);
    }
  } catch (err) {
    console.error("[landed-cost-pdf] No se pudo generar el PDF:", err);
  }

  if (orden) {
    const { data: destinatarios } = await supabase
      .from("users")
      .select("email")
      .eq("operacion_id", orden.operacion_id)
      .eq("rol", "operacion");

    const moneda = "USD";
    const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: moneda });

    for (const destinatario of destinatarios ?? []) {
      await sendEmail({
        to: destinatario.email,
        subject: `Landed cost listo — ${proveedorNombre}`,
        html: `
          <p>El landed cost de tu orden con <strong>${proveedorNombre}</strong> ya está calculado. Adjuntamos el reporte en PDF.</p>
          <table cellpadding="4">
            <tr><td>FOB / Factura</td><td>${fmt(landed.fob)}</td></tr>
            <tr><td>Flete internacional</td><td>${fmt(landed.flete)}</td></tr>
            <tr><td>Seguro</td><td>${fmt(landed.seguro)}</td></tr>
            <tr><td>Aranceles</td><td>${fmt(landed.aranceles)}</td></tr>
            <tr><td>Honorarios agente aduanal</td><td>${fmt(landed.honorarios)}</td></tr>
            <tr><td>Gastos locales</td><td>${fmt(landed.gastos_locales)}</td></tr>
            <tr><td><strong>Total</strong></td><td><strong>${fmt(landed.total)}</strong></td></tr>
            <tr><td>Unidades recibidas</td><td>${landed.unidades_recibidas}</td></tr>
            <tr><td><strong>Costo unitario</strong></td><td><strong>${fmt(landed.costo_unitario)}</strong></td></tr>
            ${
              landed.cajas
                ? `<tr><td>Cajas recibidas</td><td>${landed.cajas}</td></tr>
                   <tr><td><strong>Costo por caja</strong></td><td><strong>${fmt(landed.costo_por_caja)}</strong></td></tr>`
                : ""
            }
            ${landed.cbm ? `<tr><td>CBM total</td><td>${landed.cbm} m³</td></tr>` : ""}
          </table>
        `,
        attachments: pdfBase64 ? [{ filename: `landed-cost-${proveedorNombre}.pdf`, content: pdfBase64 }] : undefined,
      });
    }
  }

  revalidatePath(`/ordenes/${ordenId}`);
  return { error: null };
}
