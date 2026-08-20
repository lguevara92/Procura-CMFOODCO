import { ESTATUS_LABELS } from "@/lib/constants";
import type { OrdenEstatus } from "@/types/database";

const CLASSES: Record<OrdenEstatus, string> = {
  cotizando_flete: "bg-slate-100 text-slate-700",
  confirmado: "bg-blue-100 text-blue-700",
  en_transito: "bg-indigo-100 text-indigo-700",
  en_aduana: "bg-amber-100 text-amber-700",
  entregado: "bg-emerald-100 text-emerald-700",
  cerrado: "bg-slate-800 text-white",
};

export function StatusBadge({ estatus }: { estatus: OrdenEstatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASSES[estatus]}`}>
      {ESTATUS_LABELS[estatus]}
    </span>
  );
}
