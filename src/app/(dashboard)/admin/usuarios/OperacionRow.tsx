"use client";

import { useState, useTransition } from "react";
import { actualizarOrdenanteOperacion } from "./actions";
import { CLICKUP_ORDENANTES } from "@/lib/constants";
import type { Operacion } from "@/types/database";

export function OperacionRow({ operacion }: { operacion: Operacion }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1 text-xs">
      <span className="font-medium text-slate-700">{operacion.nombre}</span>
      <select
        defaultValue={operacion.clickup_ordenante ?? ""}
        disabled={pending}
        onChange={(e) => {
          setError(null);
          const valor = e.target.value || null;
          startTransition(async () => {
            const result = await actualizarOrdenanteOperacion(operacion.id, valor);
            if (result?.error) setError(result.error);
          });
        }}
        className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs text-slate-700"
      >
        <option value="">— Sin asignar —</option>
        {CLICKUP_ORDENANTES.map((ordenante) => (
          <option key={ordenante} value={ordenante}>
            {ordenante}
          </option>
        ))}
      </select>
      {error && <span className="text-red-600">{error}</span>}
    </div>
  );
}
