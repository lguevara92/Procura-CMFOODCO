import { ETAPA_LABELS, ETAPA_ORDEN, normalizarEtapa } from "@/lib/trackingmore";

export function TrackingTimeline({ estatus, substatus }: { estatus: string | null; substatus: string | null }) {
  const etapa = normalizarEtapa(estatus, substatus);
  const hayAlerta = etapa === "alerta";
  const indiceActual = hayAlerta ? -1 : ETAPA_ORDEN.indexOf(etapa);

  return (
    <div>
      {hayAlerta && (
        <p className="mb-2 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
          Estatus reportado: {estatus ?? "desconocido"} — revisar, puede estar detenido o con un problema.
        </p>
      )}
      <ol className="flex items-center">
        {ETAPA_ORDEN.map((paso, i) => {
          const completado = !hayAlerta && i <= indiceActual;
          const esActual = !hayAlerta && i === indiceActual;
          return (
            <li key={paso} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    esActual
                      ? "bg-slate-900 text-white"
                      : completado
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {completado && !esActual ? "✓" : i + 1}
                </div>
                <span className={`text-[10px] ${esActual ? "font-semibold text-slate-900" : "text-slate-500"}`}>
                  {ETAPA_LABELS[paso]}
                </span>
              </div>
              {i < ETAPA_ORDEN.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 ${completado ? "bg-emerald-200" : "bg-slate-100"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
