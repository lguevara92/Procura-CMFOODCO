"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { createAnthropicClient } from "@/lib/anthropic";
import { ROLES_LANDED_COST } from "@/lib/constants";

interface ArticuloExtraido {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
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
    .select("url_archivo")
    .eq("orden_id", ordenId)
    .eq("tipo", "factura_comercial")
    .order("fecha_carga", { ascending: false });

  if (!documentos || documentos.length === 0) {
    return { error: "Esta orden no tiene ninguna factura comercial cargada todavía.", data: null };
  }

  const bloques: Array<
    | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
    | { type: "image"; source: { type: "base64"; media_type: ImageMediaType; data: string } }
  > = [];

  for (const documento of documentos) {
    const extension = documento.url_archivo.split(".").pop()?.toLowerCase() ?? "";
    const esPdf = extension === "pdf";
    const imageMediaType = IMAGE_MEDIA_TYPES[extension];
    if (!esPdf && !imageMediaType) continue; // se ignoran formatos que la IA no puede leer (p. ej. .docx)

    const { data: archivo, error: downloadError } = await supabase.storage
      .from("documentos")
      .download(documento.url_archivo);
    if (downloadError || !archivo) continue;

    const arrayBuffer = await archivo.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    bloques.push(
      esPdf
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
        : { type: "image", source: { type: "base64", media_type: imageMediaType!, data: base64 } },
    );
  }

  if (bloques.length === 0) {
    return { error: "Las facturas cargadas deben ser PDF o imagen (jpg, png, webp) para poder leerlas con IA.", data: null };
  }

  try {
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
            ...bloques,
            {
              type: "text",
              text:
                bloques.length > 1
                  ? "Estas son varias facturas comerciales de la misma orden de compra (pueden ser de distintos proveedores). Extrae todos los artículos (nombre, cantidad, precio unitario) de TODAS las facturas juntas, y suma el total FOB de todas."
                  : "Extrae todos los artículos (nombre, cantidad, precio unitario) y el total FOB de esta factura comercial.",
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return { error: "No se pudo leer la factura.", data: null };
    }

    const resultado = toolUse.input as { articulos: ArticuloExtraido[]; total_fob: number };

    const { data: orden } = await supabase.from("ordenes_compra").select("proveedor_id").eq("id", ordenId).single();
    if (orden && resultado.articulos.length > 0) {
      const filas = resultado.articulos.map((articulo) => ({
        proveedor_id: orden.proveedor_id,
        articulo: articulo.nombre,
        precio: articulo.precio_unitario,
      }));
      await supabase.from("historial_precios").insert(filas);
    }

    return { error: null, data: { articulos: resultado.articulos, totalFob: resultado.total_fob } };
  } catch (err) {
    return { error: `Error al leer la factura: ${err instanceof Error ? err.message : "desconocido"}`, data: null };
  }
}
