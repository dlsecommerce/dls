import { supabase } from "@/integrations/supabase/client";

export const StatusPresence = {
  subscribe: (onChange) => {
    const channel = supabase
      .channel("status-presence")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "status_usuario" },
        (payload) => {
          onChange && onChange(payload.new || payload.old);
        }
      )
      .subscribe();

    return channel;
  },

  async updateStatus(usuario_id, status) {
    const { data: existing } = await supabase
      .from("status_usuario")
      .select("id")
      .eq("usuario_id", usuario_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("status_usuario")
        .update({
          status,
          atualizado_em: new Date().toISOString(),
          ultima_atividade: new Date().toISOString(),
        })
        .eq("usuario_id", usuario_id);
    } else {
      await supabase.from("status_usuario").insert([
        {
          usuario_id,
          status,
          atualizado_em: new Date().toISOString(),
          ultima_atividade: new Date().toISOString(),
        },
      ]);
    }
  },
};
