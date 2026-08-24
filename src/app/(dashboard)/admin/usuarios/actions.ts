"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { requireProfile } from "@/lib/auth";
import type { UserRole } from "@/types/database";

async function requireAdminSistema() {
  const profile = await requireProfile();
  if (profile.rol !== "admin_sistema") throw new Error("No tienes permiso.");
  return profile;
}

export async function crearUsuario(_prevState: { error: string | null; ok?: boolean } | null, formData: FormData) {
  try {
    await requireAdminSistema();
  } catch {
    return { error: "No tienes permiso para crear usuarios." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const rol = String(formData.get("rol") ?? "") as UserRole;
  const operacionId = String(formData.get("operacion_id") ?? "") || null;

  if (!email || !nombre || !rol) {
    return { error: "Completa correo, nombre y rol." };
  }

  const admin = createAdminClient();

  // Password aleatoria: nunca se usa ni se muestra — el usuario la define solo
  // con el correo de "configura tu contraseña" que se manda después.
  const passwordTemporal = crypto.randomUUID() + crypto.randomUUID();

  const { data: creado, error: createError } = await admin.auth.admin.createUser({
    email,
    password: passwordTemporal,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (createError || !creado.user) {
    return { error: `No se pudo crear el usuario: ${createError?.message ?? "error desconocido"}` };
  }

  // El trigger handle_new_user ya creó la fila en public.users con rol "operacion" por defecto.
  const { error: updateError } = await admin
    .from("users")
    .update({ nombre, rol, operacion_id: operacionId })
    .eq("id", creado.user.id);

  if (updateError) {
    return { error: `Usuario creado pero no se pudo asignar el rol: ${updateError.message}` };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`,
  });

  revalidatePath("/admin/usuarios");
  return { error: null, ok: true };
}

export async function actualizarUsuario(userId: string, rol: UserRole, operacionId: string | null) {
  try {
    await requireAdminSistema();
  } catch {
    return { error: "No tienes permiso para editar usuarios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ rol, operacion_id: operacionId }).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/usuarios");
  return { error: null };
}
