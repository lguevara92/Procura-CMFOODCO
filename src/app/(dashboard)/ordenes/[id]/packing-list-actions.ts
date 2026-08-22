"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { createAnthropicClient } from "@/lib/anthropic";
import { ROLES_LANDED_COST } from "@/lib/constants";

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const IMAGE_MEDIA_TYPES: Record<string, ImageMediaType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

const EXTRAER_TOOL = {
  name: "reportar_packing_list",
  description: "Reporta el total de cajas/bultos y el CBM total encontrados en el packing list.",
  input_schema: {
    type: "object" as const,
    properties: {
      total_cajas: { type: "number", description: "Suma total de cajas, bultos o cartones de todo el embarque" },
      cbm_total: {
        type: "number",
        description:
          "Volumen total en metros cúbicos (CBM) de todo el embarque. Si el documento da dimensiones por caja (largo x ancho x alto) en vez del CBM ya calculado, conviértelas a metros y multiplica por el número de cajas para obtener el total.",
      },
    },
    required: ["total_cajas", "cbm_total"],
  },
};

export async function extraerPackingList(ordenId: string) {
  const profile = await requireProfile();
  if (!ROLES_LANDED_COST.includes(profile.rol)) {
    return { error: "No tienes permiso para usar el escáner de packing list.", data: null };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "El escáner de documentos no está configurado (falta ANTHROPIC_API_KEY).", data: null };
  }

  const supabase = await createClient();

  const { data: documentos } = await supabase
    .from("documentos")
    .select("url_archivo")
    .eq("orden_id", ordenId)
    .eq("tipo", "packing_list")
    .order("fecha_carga", { ascending: false });

  if (!documentos || documentos.length === 0) {
    return { error: "Esta orden no tiene ningún packing list cargado todavía.", data: null };
  }

  const bloques: Array<
    | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
    | { type: "image"; source: { type: "base64"; media_type: ImageMediaType; data: string } }
  > = [];

  for (const documento of documentos) {
    const extension = documento.url_archivo.split(".").pop()?.toLowerCase() ?? "";
    const esPdf = extension === "pdf";
    const imageMediaType = IMAGE_MEDIA_TYPES[extension];
    if (!esPdf && !imageMediaType) continue;

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
    return {
      error: "El packing list debe ser un PDF o una imagen (jpg, png, webp) para poder leerlo con IA.",
      data: null,
    };
  }

  try {
    const anthropic = createAnthropicClient();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      tools: [EXTRAER_TOOL],
      tool_choice: { type: "tool", name: "reportar_packing_list" },
      messages: [
        {
          role: "user",
          content: [
            ...bloques,
            {
              type: "text",
              text:
                bloques.length > 1
                  ? "Estos son varios packing list de la misma orden de compra. Suma el total de cajas y el CBM total de todos juntos."
                  : "Extrae el total de cajas/bultos y el CBM (volumen) total de este packing list.",
            },
          ],
        },
      ],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return { error: "No se pudo leer el packing list.", data: null };
    }

    const resultado = toolUse.input as { total_cajas: number; cbm_total: number };
    return { error: null, data: resultado };
  } catch (err) {
    return { error: `Error al leer el packing list: ${err instanceof Error ? err.message : "desconocido"}`, data: null };
  }
}
