"use client";

import { useState, useTransition } from "react";
import { updateEstatus } from "./actions";
import { ESTATUS_LABELS, ESTATUS_ORDER } from "@/lib/constants";
import type { OrdenEstatus } from "@/types/database";

export function EstatusSelect({ ordenId, estatusActual }: { ordenId: string; estatusActual: OrdenEstatus }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={estatusActual}
        disabled={pending}
        onChange={(e) => {
          setError(null);
          startTransition(async () => {
            const res = await updateEstatus(ordenId, e.target.value as OrdenEstatus);
            if (res?.error) setError(res.error);
          });
        }}
        className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
      >
        {ESTATUS_ORDER.map((estatus) => (
          <option key={estatus} value={estatus}>
            {ESTATUS_LABELS[estatus]}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
