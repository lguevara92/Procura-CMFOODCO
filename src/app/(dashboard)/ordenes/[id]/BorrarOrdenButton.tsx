"use client";

import { useState, useTransition } from "react";
import { borrarOrden } from "./actions";

export function BorrarOrdenButton({ ordenId }: { ordenId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    if (!confirm("¿Borrar esta orden por completo? Se eliminan también sus documentos, landed cost, cotizaciones, tracking y línea de tiempo. Esto no se puede deshacer.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await borrarOrden(ordenId);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Borrando..." : "Borrar orden"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
