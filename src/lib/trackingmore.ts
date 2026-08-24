const BASE_URL = "https://api.trackingmore.com/v4";

function apiKey() {
  const key = process.env.TRACKINGMORE_API_KEY;
  if (!key) throw new Error("TRACKINGMORE_API_KEY no configurada");
  return key;
}

async function request(path: string, method: "GET" | "POST" | "PUT", body?: unknown) {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Tracking-Api-Key": apiKey(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.meta?.message || `TrackingMore respondió ${res.status}`);
  }
  return json;
}

export interface CourierCandidato {
  courier_code: string;
  courier_name: string;
}

// Adivina la paquetería/naviera a partir del número de guía.
export async function detectarPaqueteria(trackingNumber: string): Promise<CourierCandidato[]> {
  const json = await request("couriers/detect", "POST", { tracking_number: trackingNumber });
  return json?.data ?? [];
}

export async function crearTracking(trackingNumber: string, courierCode: string, ordenId: string) {
  const json = await request("trackings/create", "POST", {
    tracking_number: trackingNumber,
    courier_code: courierCode,
    order_number: ordenId,
  });
  return json?.data;
}

export async function consultarTracking(trackingNumber: string, courierCode: string) {
  const json = await request(
    `trackings/get?${new URLSearchParams({ tracking_numbers: trackingNumber, courier_code: courierCode })}`,
    "GET",
  );
  const data = json?.data;
  return Array.isArray(data) ? data[0] : data;
}

export type EtapaTracking = "recolectado" | "en_transito" | "en_aduana" | "en_reparto" | "entregado" | "alerta";

export const ETAPA_LABELS: Record<EtapaTracking, string> = {
  recolectado: "Recolectado",
  en_transito: "En tránsito",
  en_aduana: "En aduana",
  en_reparto: "En reparto",
  entregado: "Entregado",
  alerta: "Alerta",
};

export const ETAPA_ORDEN: EtapaTracking[] = ["recolectado", "en_transito", "en_aduana", "en_reparto", "entregado"];

// TrackingMore normaliza a un status/substatus propio por transportista;
// aqui lo mapeamos a las 5 etapas del flujo que pide la especificacion.
// NOTA: si al conectar el webhook real los valores de status/substatus no
// coinciden con estos, ajustar aqui — se guarda el payload crudo en
// tracking.raw_data para poder revisarlo.
export function normalizarEtapa(status: string | null, substatus: string | null): EtapaTracking {
  const s = (status ?? "").toLowerCase();
  const sub = (substatus ?? "").toLowerCase();

  if (["exception", "undelivered", "expired", "notfound"].includes(s)) return "alerta";
  if (s === "delivered") return "entregado";
  if (sub.includes("custom")) return "en_aduana";
  if (s === "pickup" || sub.includes("outfordelivery")) return "en_reparto";
  if (s === "transit") return "en_transito";
  return "recolectado";
}

// Extrae, de forma defensiva, la ubicación más reciente del payload de TrackingMore.
export function extraerUbicacionActual(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null;
  const destino = data.destination_info as { trackinfo?: { location?: string }[] } | undefined;
  const origen = data.origin_info as { trackinfo?: { location?: string }[] } | undefined;
  const ultimoDestino = destino?.trackinfo?.[0]?.location;
  const ultimoOrigen = origen?.trackinfo?.[0]?.location;
  return ultimoDestino || ultimoOrigen || null;
}
