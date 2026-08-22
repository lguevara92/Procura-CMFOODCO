"use client";

import { useState, useTransition } from "react";
import { extraerFactura } from "./factura-actions";
import { extraerPackingList } from "./packing-list-actions";
import { LandedCostForm } from "./LandedCostForm";

interface ArticuloExtraido {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export function LandedCostSection({
  ordenId,
  hayFactura,
  hayPackingList,
}: {
  ordenId: string;
  hayFactura: boolean;
  hayPackingList: boolean;
}) {
  const [facturaPending, startFacturaTransition] = useTransition();
  const [facturaError, setFacturaError] = useState<string | null>(null);
  const [articulos, setArticulos] = useState<ArticuloExtraido[] | null>(null);
  const [fobSugerido, setFobSugerido] = useState<number | undefined>(undefined);

  const [packingPending, startPackingTransition] = useTransition();
  const [packingError, setPackingError] = useState<string | null>(null);
  const [cajasSugeridas, setCajasSugeridas] = useState<number | undefined>(undefined);
  const [cbmSugerido, setCbmSugerido] = useState<number | undefined>(undefined);

  const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "USD" });

  return (
    <div className="flex flex-col gap-3">
      {hayFactura && (
        <div className="rounded-lg border border-dashed border-slate-300 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              Extrae los artículos y costos de las facturas comerciales con IA (si hay más de una, las combina).
            </p>
            <button
              type="button"
              disabled={facturaPending}
              onClick={() =>
                startFacturaTransition(async () => {
                  setFacturaError(null);
                  const res = await extraerFactura(ordenId);
                  if (res.error || !res.data) {
                    setFacturaError(res.error ?? "No se pudo leer la factura.");
                    return;
                  }
                  setArticulos(res.data.articulos);
                  setFobSugerido(res.data.totalFob);
                })
              }
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {facturaPending ? "Leyendo factura..." : "Extraer artículos con IA"}
            </button>
          </div>

          {facturaError && <p className="mt-2 text-xs text-red-600">{facturaError}</p>}

          {articulos && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-1 pr-3">Artículo</th>
                    <th className="py-1 pr-3">Cantidad</th>
                    <th className="py-1">Precio unitario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articulos.map((articulo, i) => (
                    <tr key={i}>
                      <td className="py-1 pr-3">{articulo.nombre}</td>
                      <td className="py-1 pr-3">{articulo.cantidad}</td>
                      <td className="py-1">{fmt(articulo.precio_unitario)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-500">
                Se guardó cada artículo en el histórico de precios del proveedor. El total sugerido de FOB (
                {fobSugerido !== undefined ? fmt(fobSugerido) : "—"}) ya se cargó abajo — puedes ajustarlo si hace
                falta.
              </p>
            </div>
          )}
        </div>
      )}

      {hayPackingList && (
        <div className="rounded-lg border border-dashed border-slate-300 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              Extrae el total de cajas y el CBM del packing list con IA (si hay más de uno, los suma).
            </p>
            <button
              type="button"
              disabled={packingPending}
              onClick={() =>
                startPackingTransition(async () => {
                  setPackingError(null);
                  const res = await extraerPackingList(ordenId);
                  if (res.error || !res.data) {
                    setPackingError(res.error ?? "No se pudo leer el packing list.");
                    return;
                  }
                  setCajasSugeridas(res.data.total_cajas);
                  setCbmSugerido(res.data.cbm_total);
                })
              }
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {packingPending ? "Leyendo packing list..." : "Extraer cajas y CBM con IA"}
            </button>
          </div>

          {packingError && <p className="mt-2 text-xs text-red-600">{packingError}</p>}

          {cajasSugeridas !== undefined && (
            <p className="mt-2 text-xs text-slate-500">
              Se encontraron <strong>{cajasSugeridas}</strong> cajas y <strong>{cbmSugerido} m³</strong> de CBM total —
              ya se cargaron abajo, puedes ajustarlos si hace falta.
            </p>
          )}
        </div>
      )}

      <LandedCostForm ordenId={ordenId} fobInicial={fobSugerido} cajasInicial={cajasSugeridas} cbmInicial={cbmSugerido} />
    </div>
  );
}
