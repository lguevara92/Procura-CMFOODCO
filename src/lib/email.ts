const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Procura <onboarding@resend.dev>";

// Notificación best-effort: si falla o no hay API key configurada, se registra
// en consola pero no debe tumbar la acción principal (p. ej. elegir una cotización).
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY no configurada — se omite envío a ${to}: "${subject}"`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });

    if (!res.ok) {
      console.error(`[email] Falló el envío a ${to}: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error(`[email] Error de red enviando a ${to}:`, err);
  }
}
