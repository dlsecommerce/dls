// ======================================================
// src/services/supabaseChatService.ts
// ======================================================

import { supabase } from "@/integrations/supabase/client";

export type MessageType = "texto" | "imagem" | "arquivo" | "emoji" | "sistema";

export interface ChatMessage {
  id: string;
  conversa_id: string;
  remetente_id: string;
  remetente_nome: string;
  destinatario_id: string | null;
  mensagem: string;
  tipo: MessageType;
  lida: boolean;
  reply_to?: string | null;
  created_at: string;
  created_date?: string;
  editado?: boolean;
}

export interface UserStatusRow {
  usuario_id: string;
  usuario_nome: string;
  status: "disponivel" | "ausente" | "ocupado" | "invisivel" | "offline";
  ultima_atividade: string | null;
  atualizado_em: string | null;
}

function deterministicDirectConversa(a: string, b: string) {
  return [a, b].sort().join(":");
}

export const supabaseChatService = {
  // ======================================================
  // UPLOAD DE ARQUIVOS
  // ======================================================
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

  // ======================================================
  // STATUS / PRESENÇA (opcional - você está usando profiles no ChatBubble)
  // ======================================================
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

  // ======================================================
  // TYPING (Digitando...)
  // ✅ Corrigido para NÃO perder o "nome"
  // ======================================================
  createTypingChannel(conversaKey: string, currentUserId: string, payload: { nome: string }) {
    const channel = supabase.channel(`typing:${conversaKey}`, {
      config: { presence: { key: currentUserId } },
    });

    channel.on("presence", { event: "sync" }, () => {});

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // registra presença com nome sempre
        // @ts-ignore
        await channel.track({ ...payload, typing: false });
      }
    });

    // guarda o payload no próprio channel (pra startTyping reutilizar)
    // @ts-ignore
    channel.__typingPayload = payload;

    return channel;
  },

  async startTyping(channel: ReturnType<typeof supabase.channel>) {
    try {
      // @ts-ignore
      const base = channel.__typingPayload || {};
      // @ts-ignore
      await channel.track({ ...base, typing: true });

      setTimeout(async () => {
        try {
          // @ts-ignore
          const base2 = channel.__typingPayload || base || {};
          // @ts-ignore
          await channel.track({ ...base2, typing: false });
        } catch {}
      }, 1200);
    } catch {}
  },

  onTyping(channel: ReturnType<typeof supabase.channel>, onTypingUsers: (list: any[]) => void) {
    channel.on("presence", { event: "sync" }, () => {
      // @ts-ignore
      const state = channel.presenceState();
      const users = Object.values(state).flat() as any[];
      const typingNow = users.filter((u) => u?.typing);
      onTypingUsers(typingNow);
    });
  },

  // ======================================================
  // MENSAGENS
  // ======================================================
  async listMessages(conversaKey: string, limit = 100): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from("mensagens")
      .select("*")
      .eq("conversa_id", conversaKey)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data?.map((m: any) => ({ ...m, created_date: m.created_at })) || [];
  },

  subscribeMessages(conversaKey: string, onMessage: (m: ChatMessage) => void) {
    const channel = supabase
      .channel(`mensagens:${conversaKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mensagens",
          filter: `conversa_id=eq.${conversaKey}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            onMessage({ ...(payload.old as any), tipo: "sistema", mensagem: "Mensagem excluída" });
            return;
          }

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

  // ======================================================
  // ENVIAR MENSAGENS
  // ======================================================
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

  // ======================================================
  // EDITAR / DELETAR
  // ======================================================
  async editMessage(messageId: string, novoTexto: string) {
    const { error } = await supabase.from("mensagens").update({ mensagem: novoTexto, editado: true }).eq("id", messageId);
    if (error) throw error;
  },

  async deleteMessage(messageId: string) {
    const { error } = await supabase.from("mensagens").delete().eq("id", messageId);
    if (error) throw error;
  },

  // ======================================================
  // MARCAR COMO LIDA
  // ======================================================
  async markAllRead(conversaKey: string, currentUserId: string) {
    const { error } = await supabase
      .from("mensagens")
      .update({ lida: true })
      .eq("conversa_id", conversaKey)
      .neq("remetente_id", currentUserId);

    if (error) throw error;
  },

  // ======================================================
  // REAÇÕES
  // ======================================================
  async addReaction(messageId: string, usuario_id: string, emoji: string) {
    const { error } = await supabase.from("reacoes").upsert({
      mensagem_id: messageId,
      usuario_id,
      emoji,
    });
    if (error) throw error;
  },

  async removeReaction(messageId: string, usuario_id: string, emoji: string) {
    const { error } = await supabase
      .from("reacoes")
      .delete()
      .eq("mensagem_id", messageId)
      .eq("usuario_id", usuario_id)
      .eq("emoji", emoji);

    if (error) throw error;
  },

  subscribeReactions(messageId: string, onReaction: (data: any) => void) {
    const channel = supabase
      .channel(`reacoes:${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reacoes",
          filter: `mensagem_id=eq.${messageId}`,
        },
        (payload) => onReaction(payload)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  // ======================================================
  // CONVERSA DIRETA
  // ======================================================
  conversationKeyDirect(a: string, b: string) {
    return deterministicDirectConversa(a, b);
  },
};
