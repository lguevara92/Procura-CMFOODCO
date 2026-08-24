import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_STAFF } from "@/lib/constants";
import { ProveedoresList } from "./ProveedoresList";
import type { Proveedor } from "@/types/database";

export default async function ProveedoresPage() {
  const profile = await requireProfile();
  if (!ROLES_STAFF.includes(profile.rol)) redirect("/ordenes");

  const supabase = await createClient();
  const { data } = await supabase.from("proveedores").select("*").order("nombre");
  const proveedores = (data ?? []) as Proveedor[];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Proveedores</h1>
      <ProveedoresList proveedores={proveedores} />
    </div>
  );
}
