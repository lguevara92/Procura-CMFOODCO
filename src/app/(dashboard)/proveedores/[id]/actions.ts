"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_STAFF } from "@/lib/constants";
import type { ProveedorTipo } from "@/types/database";

export async function actualizarProveedor(_prevState: { error: string | null; ok?: boolean } | null, formData: FormData) {
  const profile = await requireProfile();
  if (!ROLES_STAFF.includes(profile.rol)) {
    return { error: "No tienes permiso para editar proveedores." };
  }

  const proveedorId = String(formData.get("proveedor_id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "") as ProveedorTipo;
  const contacto = String(formData.get("contacto") ?? "").trim() || null;

  if (!proveedorId) return { error: "Falta el proveedor." };
  if (!nombre) return { error: "El nombre no puede estar vacío." };
  if (tipo !== "compra" && tipo !== "logistica") return { error: "Selecciona un tipo válido." };

  const supabase = await createClient();
  const { error } = await supabase.from("proveedores").update({ nombre, tipo, contacto }).eq("id", proveedorId);
  if (error) return { error: error.message };

  revalidatePath(`/proveedores/${proveedorId}`);
  revalidatePath("/proveedores");
  return { error: null, ok: true };
}

export async function actualizarDatosBancarios(_prevState: { error: string | null; ok?: boolean } | null, formData: FormData) {
  const profile = await requireProfile();
  if (!ROLES_STAFF.includes(profile.rol)) {
    return { error: "No tienes permiso para editar estos datos." };
  }

  const proveedorId = String(formData.get("proveedor_id") ?? "");
  if (!proveedorId) return { error: "Falta el proveedor." };

  const datos = {
    correo: String(formData.get("correo") ?? "").trim() || null,
    ruc: String(formData.get("ruc") ?? "").trim() || null,
    banco: String(formData.get("banco") ?? "").trim() || null,
    numero_cuenta: String(formData.get("numero_cuenta") ?? "").trim() || null,
    swift: String(formData.get("swift") ?? "").trim() || null,
    direccion_banco: String(formData.get("direccion_banco") ?? "").trim() || null,
    tipo_cuenta: String(formData.get("tipo_cuenta") ?? "").trim() || null,
    direccion_internacional: String(formData.get("direccion_internacional") ?? "").trim() || null,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("proveedores").update(datos).eq("id", proveedorId);
  if (error) return { error: error.message };

  revalidatePath(`/proveedores/${proveedorId}`);
  return { error: null, ok: true };
}
