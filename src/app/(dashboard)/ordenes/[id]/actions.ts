"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_STAFF } from "@/lib/constants";
import type { OrdenEstatus } from "@/types/database";

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
