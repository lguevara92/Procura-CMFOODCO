import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { ROLES_QUE_CREAN_ORDENES } from "@/lib/constants";
import { OrdenForm } from "./OrdenForm";

export default async function NuevaOrdenPage() {
  const profile = await requireProfile();
  if (!ROLES_QUE_CREAN_ORDENES.includes(profile.rol)) {
    redirect("/ordenes");
  }

  const supabase = await createClient();
  const [{ data: proveedores }, { data: operaciones }] = await Promise.all([
    supabase.from("proveedores").select("*").eq("tipo", "compra").order("nombre"),
    supabase.from("operaciones").select("*").order("nombre"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Nueva orden de compra</h1>
      <OrdenForm proveedores={proveedores ?? []} operaciones={operaciones ?? []} />
    </div>
  );
}
