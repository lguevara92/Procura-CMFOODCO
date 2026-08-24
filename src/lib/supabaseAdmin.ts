import { createClient } from "@supabase/supabase-js";

// Cliente con privilegios de administrador (salta RLS). Solo usar en server
// actions/rutas ya protegidas por rol — nunca exponer al navegador.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
