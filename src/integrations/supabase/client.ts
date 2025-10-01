// src/integrations/supabase/client.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";
// Se você gerou tipos do Supabase, mantenha este import.
// Senão, remova a linha abaixo.
import type { Database } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  throw new Error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local"
  );
}

export const supabase = createBrowserClient<Database>(url, anon);
