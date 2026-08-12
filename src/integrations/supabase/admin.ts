// src/lib/supabase/admin.ts

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function validateEnv(): { url: string; serviceRoleKey: string } {
  const missing: string[] = [];

  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `⚠️ Variáveis de ambiente ausentes: ${missing.join(", ")}. ` +
        `Defina-as no arquivo .env.local antes de iniciar o servidor.`
    );
  }

  return {
    url: SUPABASE_URL as string,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY as string,
  };
}

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Retorna a instância singleton do cliente admin do Supabase.
 * A instância é criada uma única vez e reutilizada em todas as
 * chamadas subsequentes, evitando overhead de recriação do client.
 */
function createSupabaseAdminClient(): SupabaseClient<Database> {
  const { url, serviceRoleKey } = validateEnv();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "admin-server-client",
      },
    },
  });
}

/**
 * Cliente ADMIN do Supabase (schema public).
 * Use apenas em contexto server-side. Ignora RLS.
 */
export const supabaseAdmin: SupabaseClient<Database> =
  cachedClient ?? (cachedClient = createSupabaseAdminClient());

/**
 * Valida um token de acesso (JWT) e retorna o usuário autenticado.
 * Retorna `null` se o token for inválido, expirado ou ausente.
 *
 * @param accessToken - Token JWT enviado no header Authorization (Bearer)
 */
export async function getUserFromAccessToken(accessToken: string | null) {
  if (!accessToken) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data.user) return null;

  return data.user;
}

/**
 * Extrai o token Bearer de um header Authorization padrão.
 * Ex: "Bearer eyJhbGci..." -> "eyJhbGci..."
 */
export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  return authorizationHeader.slice(7).trim() || null;
}
