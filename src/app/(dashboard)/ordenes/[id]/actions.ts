"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_STAFF } from "@/lib/constants";
import type { Documento, OrdenEstatus } from "@/types/database";

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

export async function borrarOrden(ordenId: string) {
  const profile = await requireProfile();
  if (profile.rol !== "admin_sistema") {
    return { error: "Solo un administrador del sistema puede borrar órdenes." };
  }

  const supabase = await createClient();

  const [{ data: documentos }, { data: landedCosts }] = await Promise.all([
    supabase.from("documentos").select("url_archivo").eq("orden_id", ordenId),
    supabase.from("landed_costs").select("pdf_path").eq("orden_id", ordenId),
  ]);

  const rutas = [
    ...((documentos ?? []) as Pick<Documento, "url_archivo">[]).map((d) => d.url_archivo),
    ...((landedCosts ?? []) as { pdf_path: string | null }[]).map((lc) => lc.pdf_path).filter((p): p is string => !!p),
  ];
  if (rutas.length > 0) {
    await supabase.storage.from("documentos").remove(rutas);
  }

  const { error } = await supabase.from("ordenes_compra").delete().eq("id", ordenId);
  if (error) return { error: error.message };

  revalidatePath("/ordenes");
  redirect("/ordenes");
}
