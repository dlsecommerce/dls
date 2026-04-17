import { supabase } from "@/integrations/supabase/client";

type NotificationInput = {
  title: string;
  message: string;
  action: "create" | "update" | "delete" | "status" | "comment";
  entityType?: string;
  entityId?: string;
  link?: string;
};

export async function createNotification(data: NotificationInput) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Erro ao buscar usuário autenticado:", userError);
    }

    let actorName = "Usuário";

    if (user?.id) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Erro ao buscar perfil:", profileError);
      }

      actorName =
        profile?.name ||
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Usuário";
    }

    const payload = {
      title: data.title,
      message: data.message,
      action: data.action,
      entity_type: data.entityType ?? null,
      entity_id: data.entityId ?? null,
      actor_id: user?.id ?? null,
      actor_name: actorName,
      link: data.link ?? null,
    };

    const recentLimit = new Date(Date.now() - 10000).toISOString();

    const { data: existing, error: existingError } = await supabase
      .from("notifications")
      .select("id")
      .eq("title", payload.title)
      .eq("message", payload.message)
      .eq("action", payload.action)
      .eq("entity_type", payload.entity_type)
      .eq("entity_id", payload.entity_id)
      .gte("created_at", recentLimit)
      .limit(1);

    if (existingError) {
      console.error(
        "Erro ao verificar duplicidade de notificação:",
        existingError
      );
    }

    if (existing && existing.length > 0) {
      return existing[0];
    }

    const { data: insertedData, error } = await supabase
      .from("notifications")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar notificação:", error);
      return null;
    }

    return insertedData;
  } catch (err) {
    console.error("Erro inesperado ao criar notificação:", err);
    return null;
  }
}