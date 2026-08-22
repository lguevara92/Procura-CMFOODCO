"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENTO_LABELS, DOCUMENTOS_REQUERIDOS } from "@/lib/constants";

export function DocumentoUploadForm({ ordenId }: { ordenId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sube el archivo directo del navegador a Supabase Storage (sin pasar por el
  // servidor de Next.js/Vercel) para no toparse con el límite de tamaño de
  // las Server Actions.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const tipo = String(formData.get("tipo") ?? "");
    const fechaVencimiento = String(formData.get("fecha_vencimiento") ?? "") || null;
    const file = formData.get("archivo") as File | null;

    if (!tipo || !file || file.size === 0) {
      setError("Selecciona el tipo de documento y un archivo.");
      return;
    }

    setPending(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = `${ordenId}/${tipo}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);

    if (uploadError) {
      setError(`No se pudo subir el archivo: ${uploadError.message}`);
      setPending(false);
      return;
    }

    const { error: insertError } = await supabase.from("documentos").insert({
      orden_id: ordenId,
      tipo,
      url_archivo: path,
      usuario_id: user?.id ?? null,
      fecha_vencimiento: fechaVencimiento,
    });

    setPending(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 p-4"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Tipo de documento</label>
        <select name="tipo" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900">
          {DOCUMENTOS_REQUERIDOS.map((tipo) => (
            <option key={tipo} value={tipo}>
              {DOCUMENTO_LABELS[tipo]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Fecha de vencimiento (opcional)</label>
        <input type="date" name="fecha_vencimiento" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Archivo</label>
        <input type="file" name="archivo" required className="text-sm text-slate-700" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Subiendo..." : "Subir documento"}
      </button>

      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
