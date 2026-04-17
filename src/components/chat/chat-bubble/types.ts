import type { ChatMessage } from "@/services/supabaseChatService";

export interface MiniUser {
  usuario_id: string;
  usuario_nome: string;
  avatar_url?: string | null;

  // ✅ aceita o valor do banco ("disponivel") + os do chat
  status: "online" | "disponivel" | "ausente" | "ocupado" | "invisivel" | "offline";
}

// ✅ status final que a UI usa
export type UiStatus =
  | "online"
  | "ausente"
  | "ocupado"
  | "invisivel"
  | "offline";

// ✅ mapa de mensagens não lidas por usuário
export type UnreadByUser = Record<string, number>;

// (export mantido caso você queira tipar props depois)
export type { ChatMessage };
