"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);

    // Enlace con flujo PKCE (?code=...): intercambiarlo por una sesión.
    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setLinkError(error.message);
        setReady(true);
      });
      return;
    }

    // Enlace con flujo de OTP (?token_hash=...&type=recovery), el formato
    // que usa Supabase por defecto en el correo de "configura tu contraseña".
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (tokenHash && type === "recovery") {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error }) => {
        if (error) setLinkError(error.message);
        setReady(true);
      });
      return;
    }

    // Enlace con flujo implícito (#access_token=...): supabase-js ya procesa el hash
    // automáticamente y dispara este evento.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    // Si ninguno de los flujos anteriores aplica (o el enlace ya venció),
    // no dejar "Validando el enlace..." girando para siempre.
    const timeout = setTimeout(() => {
      setLinkError("El enlace no es válido o ya venció. Pide que te reenvíen la invitación.");
      setReady(true);
    }, 6000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }
    router.push("/ordenes");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="CM Foodco" className="h-16 w-auto" />
          <h1 className="text-2xl font-semibold text-slate-900">Nueva contraseña</h1>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-slate-500">Validando el enlace...</p>
        ) : linkError ? (
          <p className="text-center text-sm text-red-600">{linkError}</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Contraseña nueva
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={status === "saving"}
              className="mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {status === "saving" ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
