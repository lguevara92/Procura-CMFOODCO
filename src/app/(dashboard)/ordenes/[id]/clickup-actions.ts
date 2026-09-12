"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_STAFF } from "@/lib/constants";
import { crearSolicitudPago, adjuntarArchivoATarea } from "@/lib/clickup";
import type { Documento, Operacion, Proveedor } from "@/types/database";

interface EnviarSolicitudPagoInput {
  monto: number;
  moneda: string;
  descripcionPago: string;
  fechaVencimiento: string | null;
  comentarios: string | null;
}

export async function enviarSolicitudPago(ordenId: string, input: EnviarSolicitudPagoInput) {
  const profile = await requireProfile();
  if (!ROLES_STAFF.includes(profile.rol)) {
    return { error: "No tienes permiso para enviar solicitudes de pago." };
  }

  if (!Number.isFinite(input.monto) || input.monto <= 0) {
    return { error: "El monto debe ser mayor a 0." };
  }

  const listId = process.env.CLICKUP_LIST_ID;
  if (!listId) return { error: "Falta configurar CLICKUP_LIST_ID en el servidor." };

  const supabase = await createClient();
  const { data: orden } = await supabase
    .from("ordenes_compra")
    .select("*, proveedor:proveedores(*), operacion:operaciones(*)")
    .eq("id", ordenId)
    .single();

  if (!orden) return { error: "Orden no encontrada." };

  const proveedor = orden.proveedor as unknown as Proveedor | null;
  const operacion = orden.operacion as unknown as Operacion | null;

  if (!proveedor) return { error: "La orden no tiene proveedor asignado." };
  if (!operacion?.clickup_ordenante) {
    return {
      error: `La operación "${operacion?.nombre ?? "?"}" no tiene una razón social de ClickUp asignada. Configúrala en Usuarios → Operaciones.`,
    };
  }

  let tarea;
  try {
    tarea = await crearSolicitudPago(listId, {
      departamento: "Procura",
      ordenante: operacion.clickup_ordenante,
      nombreProveedor: proveedor.nombre,
      correoProveedor: proveedor.correo,
      banco: proveedor.banco,
      numeroCuenta: proveedor.numero_cuenta,
      swift: proveedor.swift,
      direccionBanco: proveedor.direccion_banco,
      direccionProveedor: proveedor.direccion_internacional,
      ruc: proveedor.ruc,
      tipoCuenta: proveedor.tipo_cuenta,
      monto: input.monto,
      moneda: input.moneda,
      descripcionPago: input.descripcionPago,
      comentarios: input.comentarios,
      fechaVencimiento: input.fechaVencimiento,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error creando la solicitud en ClickUp." };
  }

  const { data: documentos } = await supabase
    .from("documentos")
    .select("*")
    .eq("orden_id", ordenId)
    .eq("tipo", "factura_comercial")
    .order("fecha_carga", { ascending: false })
    .limit(1);

  const factura = ((documentos ?? []) as Documento[])[0];
  if (factura) {
    const { data: archivo } = await supabase.storage.from("documentos").download(factura.url_archivo);
    if (archivo) {
      const buffer = Buffer.from(await archivo.arrayBuffer());
      const nombreArchivo = factura.url_archivo.split("/").pop() ?? "factura.pdf";
      try {
        await adjuntarArchivoATarea(tarea.id, nombreArchivo, buffer, archivo.type || "application/pdf");
      } catch {
        // No bloquear el flujo si falla el adjunto; la tarea ya se creó.
      }
    }
  }

  return { error: null, ok: true, url: tarea.url };
}
