"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_QUE_SUBEN_DOCUMENTOS, ROLES_STAFF } from "@/lib/constants";
import type { DocumentoTipo, OrdenEstatus } from "@/types/database";

export async function updateEstatus(ordenId: string, nuevoEstatus: OrdenEstatus) {
  const profile = await requireProfile();
  if (!ROLES_STAFF.includes(profile.rol)) {
    return { error: "No tienes permiso para cambiar el estatus." };
  }

  const { error } = await createClient().then((supabase) =>
    supabase.from("ordenes_compra").update({ estatus: nuevoEstatus }).eq("id", ordenId),
  );

  if (error) return { error: error.message };
  revalidatePath(`/ordenes/${ordenId}`);
  return { error: null };
}

export async function uploadDocumento(_prevState: { error: string | null } | null, formData: FormData) {
  const profile = await requireProfile();
  if (!ROLES_QUE_SUBEN_DOCUMENTOS.includes(profile.rol)) {
    return { error: "No tienes permiso para subir documentos." };
  }

  const ordenId = String(formData.get("orden_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "") as DocumentoTipo;
  const fechaVencimiento = String(formData.get("fecha_vencimiento") ?? "") || null;
  const file = formData.get("archivo") as File | null;

  if (!ordenId || !tipo || !file || file.size === 0) {
    return { error: "Selecciona el tipo de documento y un archivo." };
  }

  const supabase = await createClient();
  const path = `${ordenId}/${tipo}-${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
  if (uploadError) return { error: `No se pudo subir el archivo: ${uploadError.message}` };

  const { error: insertError } = await supabase.from("documentos").insert({
    orden_id: ordenId,
    tipo,
    url_archivo: path,
    usuario_id: profile.id,
    fecha_vencimiento: fechaVencimiento,
  });

  if (insertError) return { error: insertError.message };

  revalidatePath(`/ordenes/${ordenId}`);
  return { error: null };
}
