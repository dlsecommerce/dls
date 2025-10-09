import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local");
}

export const supabase = createBrowserClient<Database, "public">(url, anon, {
  cookieOptions: {
    name: "sb-access-token",
    path: "/",            
    sameSite: "lax",      
    secure: true,         
    maxAge: 60 * 60 * 24 * 7, 
  },
});
