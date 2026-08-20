"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_QUE_CREAN_ORDENES } from "@/lib/constants";

export async function createOrden(_prevState: { error: string } | null, formData: FormData) {
  const profile = await requireProfile();
  if (!ROLES_QUE_CREAN_ORDENES.includes(profile.rol)) {
    return { error: "No tienes permiso para crear órdenes de compra." };
  }

  const supabase = await createClient();

  let proveedorId = String(formData.get("proveedor_id") ?? "");
  const proveedorNuevo = String(formData.get("proveedor_nuevo") ?? "").trim();
  let operacionId = String(formData.get("operacion_id") ?? "");
  const operacionNueva = String(formData.get("operacion_nueva") ?? "").trim();
  const incoterm = String(formData.get("incoterm") ?? "").trim();
  const moneda = String(formData.get("moneda") ?? "USD").trim();

  if (proveedorId === "__nuevo__" && proveedorNuevo) {
    const { data, error } = await supabase
      .from("proveedores")
      .insert({ nombre: proveedorNuevo, tipo: "compra" })
      .select("id")
      .single();
    if (error) return { error: `No se pudo crear el proveedor: ${error.message}` };
    proveedorId = data.id;
  }

  if (operacionId === "__nuevo__" && operacionNueva) {
    const { data, error } = await supabase
      .from("operaciones")
      .insert({ nombre: operacionNueva })
      .select("id")
      .single();
    if (error) return { error: `No se pudo crear la operación: ${error.message}` };
    operacionId = data.id;
  }

  if (!proveedorId || proveedorId === "__nuevo__" || !operacionId || operacionId === "__nuevo__" || !incoterm) {
    return { error: "Completa proveedor, operación e incoterm." };
  }

  const { data: orden, error } = await supabase
    .from("ordenes_compra")
    .insert({
      proveedor_id: proveedorId,
      operacion_id: operacionId,
      incoterm,
      moneda,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: `No se pudo crear la orden: ${error.message}` };

  redirect(`/ordenes/${orden.id}`);
}
