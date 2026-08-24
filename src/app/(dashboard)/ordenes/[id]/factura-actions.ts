"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { createAnthropicClient } from "@/lib/anthropic";
import { ROLES_LANDED_COST } from "@/lib/constants";

export interface ArticuloExtraido {
  codigo: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export interface FacturaExtraida {
  documentoId: string;
  fechaCarga: string;
  articulos: ArticuloExtraido[];
  totalFob: number;
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const IMAGE_MEDIA_TYPES: Record<string, ImageMediaType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

const EXTRAER_TOOL = {
  name: "reportar_articulos_factura",
  description: "Reporta los artículos, cantidades, precios y el total encontrados en la factura comercial.",
  input_schema: {
    type: "object" as const,
    properties: {
      articulos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            codigo: { type: "string", description: "Código, SKU o referencia del artículo si aparece; si no, dejar vacío." },
            nombre: { type: "string" },
            cantidad: { type: "number" },
            precio_unitario: { type: "number" },
          },
          required: ["nombre", "cantidad", "precio_unitario"],
        },
      },
      total_fob: { type: "number", description: "Suma total de la factura (valor FOB)" },
    },
    required: ["articulos", "total_fob"],
  },
};

async function leerUnaFactura(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documento: { id: string; url_archivo: string; fecha_carga: string },
): Promise<FacturaExtraida | null> {
  const extension = documento.url_archivo.split(".").pop()?.toLowerCase() ?? "";
  const esPdf = extension === "pdf";
  const imageMediaType = IMAGE_MEDIA_TYPES[extension];
  if (!esPdf && !imageMediaType) return null; // formato que la IA no puede leer (p. ej. .docx)

  const { data: archivo, error: downloadError } = await supabase.storage.from("documentos").download(documento.url_archivo);
  if (downloadError || !archivo) return null;

  const arrayBuffer = await archivo.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const bloque = esPdf
    ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as const)
    : ({ type: "image", source: { type: "base64", media_type: imageMediaType!, data: base64 } } as const);

  const anthropic = createAnthropicClient();
  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    tools: [EXTRAER_TOOL],
    tool_choice: { type: "tool", name: "reportar_articulos_factura" },
    messages: [
      {
        role: "user",
        content: [
          bloque,
          {
            type: "text",
            text: "Extrae todos los artículos (código si aparece, nombre, cantidad, precio unitario) y el total FOB de esta factura comercial.",
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return null;

  const resultado = toolUse.input as { articulos: ArticuloExtraido[]; total_fob: number };
  return {
    documentoId: documento.id,
    fechaCarga: documento.fecha_carga,
    articulos: resultado.articulos,
    totalFob: resultado.total_fob,
  };
}

export async function extraerFactura(ordenId: string) {
  const profile = await requireProfile();
  if (!ROLES_LANDED_COST.includes(profile.rol)) {
    return { error: "No tienes permiso para usar el escáner de facturas.", data: null };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "El escáner de facturas no está configurado (falta ANTHROPIC_API_KEY).", data: null };
  }

  const supabase = await createClient();

  const { data: documentos } = await supabase
    .from("documentos")
    .select("id, url_archivo, fecha_carga")
    .eq("orden_id", ordenId)
    .eq("tipo", "factura_comercial")
    .order("fecha_carga", { ascending: false });

  if (!documentos || documentos.length === 0) {
    return { error: "Esta orden no tiene ninguna factura comercial cargada todavía.", data: null };
  }

  try {
    // Cada factura se lee por separado para poder saber de cuál salió cada artículo
    // (si hay varias, se combinan facturas de distintos proveedores en una sola
    // llamada se pierde esa trazabilidad).
    const resultados = await Promise.all(documentos.map((documento) => leerUnaFactura(supabase, documento)));
    const facturas = resultados.filter((f): f is FacturaExtraida => f !== null);

    if (facturas.length === 0) {
      return {
        error: "Las facturas cargadas deben ser PDF o imagen (jpg, png, webp) para poder leerlas con IA.",
        data: null,
      };
    }

    const { data: orden } = await supabase.from("ordenes_compra").select("proveedor_id").eq("id", ordenId).single();
    if (orden) {
      const filas = facturas.flatMap((factura) =>
        factura.articulos.map((articulo) => ({
          proveedor_id: orden.proveedor_id,
          documento_id: factura.documentoId,
          articulo: articulo.nombre,
          precio: articulo.precio_unitario,
        })),
      );
      if (filas.length > 0) await supabase.from("historial_precios").insert(filas);
    }

    const totalFob = facturas.reduce((suma, f) => suma + f.totalFob, 0);

    return { error: null, data: { facturas, totalFob } };
  } catch (err) {
    return { error: `Error al leer la factura: ${err instanceof Error ? err.message : "desconocido"}`, data: null };
  }
}
