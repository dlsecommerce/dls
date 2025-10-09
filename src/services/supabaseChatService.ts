// src/services/supabaseChatService.ts
import { supabase } from "@/integrations/supabase/client";

export type MessageType = "texto" | "imagem" | "arquivo" | "emoji" | "sistema";

export interface ChatMessage {
  id: string;
  conversa_id: string | null;            // opcional para canal global
  remetente_id: string;
  remetente_nome: string;
  destinatario_id: string | null;        // null para canal global
  mensagem: string;
  tipo: MessageType;
  lida: boolean;
  reply_to?: string | null;
  created_at: string;
  // compat c/ seu MessageItem
  created_date?: string;                 // mapeado a partir de created_at
}

export interface UserStatusRow {
  usuario_id: string;
  usuario_nome: string | null;
  status: "disponivel" | "ausente" | "ocupado" | "invisivel" | "offline";
  ultima_atividade: string | null;
  atualizado_em: string | null;
}

function deterministicDirectConversa(a: string, b: string) {
  // gera um id determinístico para conversa 1:1 (se você não usa tabela conversas)
  return [a, b].sort().join(":");
}

export const supabaseChatService = {
  // ===== Upload =====
  async uploadFile(file: File) {
    const ext = file.name.split(".").pop() || "bin";
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("chat-uploads").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from("chat-uploads").getPublicUrl(path);
    return { url: data.publicUrl, path };
  },

  // ===== Presence / Status =====
  async upsertStatus(usuario_id: string, usuario_nome: string, status: UserStatusRow["status"]) {
    await supabase.from("status_usuario").upsert({
      usuario_id,
      usuario_nome,
      status,
      ultima_atividade: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    });
  },

  subscribeStatuses(onRow: (row: UserStatusRow) => void) {
    const channel = supabase
      .channel("status_usuario_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "status_usuario" }, (payload) => {
        if (payload.new) onRow(payload.new as UserStatusRow);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  // ===== Typing (canal efêmero) =====
  createTypingChannel(conversaKey: string, currentUserId: string, payload: { nome: string }) {
    const channel = supabase.channel(`typing:${conversaKey}`, {
      config: { presence: { key: currentUserId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      // pode ler channel.presenceState() se precisar
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ ...payload, typing: false });
      }
    });

    return channel;
  },

  async startTyping(channel: ReturnType<typeof supabase.channel>) {
    // marca typing = true por ~2s
    try {
      // @ts-ignore
      await channel.track({ typing: true });
      setTimeout(async () => {
        // @ts-ignore
        await channel.track({ typing: false });
      }, 1500);
    } catch {}
  },

  onTyping(channel: ReturnType<typeof supabase.channel>, onTypingUsers: (list: any[]) => void) {
    channel.on("presence", { event: "sync" }, () => {
      // @ts-ignore
      const state = channel.presenceState();
      const users = Object.values(state).flat() as any[];
      const typingNow = users.filter((u) => u.typing);
      onTypingUsers(typingNow);
    });
  },

  // ===== Mensagens =====
  // Canal global: passe conversaKey = "global"
  // Direto: conversaKey = deterministicDirectConversa(userId, otherId)
  async listMessages(conversaKey: string, limit = 100): Promise<ChatMessage[]> {
    const query = supabase
      .from("mensagens")
      .select("*")
      .eq("conversa_id", conversaKey)
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((m: any) => ({
      ...m,
      created_date: m.created_at,
    }));
  },

  subscribeMessages(conversaKey: string, onMessage: (m: ChatMessage) => void) {
    const channel = supabase
      .channel(`mensagens:${conversaKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mensagens", filter: `conversa_id=eq.${conversaKey}` },
        (payload) => {
          if (payload.new) {
            onMessage({
              ...(payload.new as any),
              created_date: (payload.new as any).created_at,
            });
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  async sendText(params: {
    conversaKey: string;
    remetente_id: string;
    remetente_nome: string;
    destinatario_id: string | null;
    mensagem: string;
    reply_to?: string | null;
  }) {
    const { error } = await supabase.from("mensagens").insert({
      conversa_id: params.conversaKey,
      remetente_id: params.remetente_id,
      remetente_nome: params.remetente_nome,
      destinatario_id: params.destinatario_id,
      mensagem: params.mensagem,
      lida: false,
      tipo: "texto",
      reply_to: params.reply_to ?? null,
    });
    if (error) throw error;
  },

  async sendFile(params: {
    conversaKey: string;
    remetente_id: string;
    remetente_nome: string;
    destinatario_id: string | null;
    file: File;
  }) {
    const { url } = await this.uploadFile(params.file);
    const isImage = params.file.type?.startsWith("image/");
    const { error } = await supabase.from("mensagens").insert({
      conversa_id: params.conversaKey,
      remetente_id: params.remetente_id,
      remetente_nome: params.remetente_nome,
      destinatario_id: params.destinatario_id,
      mensagem: url,
      lida: false,
      tipo: isImage ? "imagem" : "arquivo",
    });
    if (error) throw error;
  },

  async editMessage(messageId: string, novoTexto: string) {
    const { error } = await supabase.from("mensagens").update({ mensagem: novoTexto }).eq("id", messageId);
    if (error) throw error;
  },

  async deleteMessage(messageId: string) {
    const { error } = await supabase.from("mensagens").delete().eq("id", messageId);
    if (error) throw error;
  },

  async markAllRead(conversaKey: string, currentUserId: string) {
    // marca como lidas as msgs não suas nessa conversa
    const { error } = await supabase
      .from("mensagens")
      .update({ lida: true })
      .eq("conversa_id", conversaKey)
      .neq("remetente_id", currentUserId);
    if (error) throw error;
  },

  // helper público
  conversationKeyDirect(a: string, b: string) {
    return deterministicDirectConversa(a, b);
  },
};
