import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let cachedClient: SupabaseClient<Database> | null = null;

function validateEnv(): {
  url: string;
  serviceRoleKey: string;
} {
  // IMPORTANTE:
  // lê process.env somente quando a função é realmente chamada,
  // não durante o import do módulo.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];

  if (!supabaseUrl) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente ausentes no servidor: ${missing.join(", ")}.`
    );
  }

  return {
    url: supabaseUrl,
    serviceRoleKey,
  };
}

/**
 * Retorna o cliente ADMIN do Supabase.
 *
 * O cliente é criado somente na primeira utilização real,
 * evitando inicialização durante o build do Next.js.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient;
  }

  const { url, serviceRoleKey } = validateEnv();

  cachedClient = createClient<Database>(url, serviceRoleKey, {
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

  return cachedClient;
}

/**
 * Valida um token de acesso e retorna o usuário autenticado.
 */
export async function getUserFromAccessToken(
  accessToken: string | null
) {
  if (!accessToken) return null;

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } =
    await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

/**
 * Extrai o token Bearer do header Authorization.
 */
export function extractBearerToken(
  authorizationHeader: string | null
): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice(7).trim() || null;
}