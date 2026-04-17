import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  throw new Error(
    "⚠️ Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local"
  );
}

// ✅ Cria client Supabase com cookies persistentes por 30 dias
export const supabase = createBrowserClient<Database>(url, anon, {
  cookieOptions: {
    path: "/",          
    sameSite: "lax",     
    secure: true,         
    maxAge: 60 * 60 * 24 * 30, 
  },
});
