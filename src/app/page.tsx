import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

export default async function RootPage() {
  const profile = await requireProfile();
  const tieneDashboard = profile.rol === "administracion" || profile.rol === "admin_sistema";
  redirect(tieneDashboard ? "/dashboard" : "/ordenes");
}
