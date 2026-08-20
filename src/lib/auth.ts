import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/database";

// Perfil (rol + operación) del usuario autenticado, o null si no hay sesión.
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  return profile as UserProfile | null;
}

// Igual que getCurrentProfile pero redirige a /login si no hay sesión.
// Usar en páginas de servidor que requieren estar autenticado.
export async function requireProfile(): Promise<UserProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}
