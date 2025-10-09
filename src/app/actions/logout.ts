"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

export async function logoutAction() {
  // Cria cliente Supabase com cookies do Next
  const supabase = createServerActionClient<Database>({ cookies });

  // Finaliza a sessão (remove tokens e cookies httpOnly)
  await supabase.auth.signOut();

  // Redireciona o usuário de volta à página inicial
  redirect("/inicio");
}
