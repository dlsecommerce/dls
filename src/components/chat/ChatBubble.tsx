"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Users,
  Minimize2,
  Maximize2,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Search,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import EmojiPicker from "@/components/chat/EmojiPicker";
import MessageItem from "@/components/chat/MessageItem";
import TypingIndicator from "@/components/chat/TypeIndicator";
import FileUploadArea from "@/components/chat/FileUploadArea";
import ChatSettings from "@/components/chat/ChatSettings";
import { useProfile } from "@/context/ProfileContext";
import { supabaseChatService, ChatMessage } from "@/services/supabaseChatService";
import { supabase } from "@/integrations/supabase/client";

interface MiniUser {
  usuario_id: string;
  usuario_nome: string;
  avatar_url?: string | null;

  // ✅ aceita o valor do banco ("disponivel") + os do chat
  status: "online" | "disponivel" | "ausente" | "ocupado" | "invisivel" | "offline";
}

// ✅ status final que a UI usa
type UiStatus = "online" | "ausente" | "ocupado" | "invisivel" | "offline";

// ✅ mapeia banco -> UI
const normalizeStatus = (s: MiniUser["status"] | null | undefined): UiStatus => {
  switch (s) {
    case "disponivel":
    case "online":
      return "online";
    case "ausente":
      return "ausente";
    case "ocupado":
      return "ocupado";
    case "invisivel":
      return "invisivel";
    default:
      return "offline";
  }
};

export default function ChatBubble() {
  const { profile } = useProfile();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ✅ Sem “Geral”: só DM
  const [selectedUser, setSelectedUser] = useState<MiniUser | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<MiniUser[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [uploadOverlay, setUploadOverlay] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ✅ Presence: quem está online agora (navegando)
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messagesChannelCleanup = useRef<null | (() => void)>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const myId = profile?.id || "";
  const myName = profile?.name || "User";

  // ✅ conversa_id (no seu banco é conversa_id).
  const conversaId = useMemo(() => {
    if (!selectedUser?.usuario_id || !myId) return "";
    if (selectedUser.usuario_id === myId) return "";
    return supabaseChatService.conversationKeyDirect(myId, selectedUser.usuario_id);
  }, [selectedUser?.usuario_id, myId]);

  const hasConversationSelected = Boolean(conversaId && selectedUser?.usuario_id);

  // ======================================================
  // 🔐 GARANTE PARTICIPANTES (RLS SAFE) - ✅ AJUSTADO p/ RPC
  // ======================================================
  const ensureConversationParticipants = useCallback(async () => {
    if (!conversaId || !myId || !selectedUser?.usuario_id) return;

    // ✅ Chama a função no banco (SECURITY DEFINER) que garante os 2 participantes
    const { error } = await supabase.rpc("ensure_dm_participants", {
      p_conversa_id: conversaId,
      p_other_user: selectedUser.usuario_id,
    });

    if (error) {
      console.error("[chat] ensure_dm_participants error:", error);
      throw error;
    }
  }, [conversaId, myId, selectedUser?.usuario_id]);

  // ===== Helpers UI
  const getStatusColor = (status: UiStatus) => {
    switch (status) {
      case "online":
        return "#10b981";
      case "ausente":
        return "#f59e0b";
      case "ocupado":
        return "#ef4444";
      case "invisivel":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = (status: UiStatus) => {
    switch (status) {
      case "online":
        return "Disponível";
      case "ausente":
        return "Ausente";
      case "ocupado":
        return "Ocupado";
      case "invisivel":
        return "Invisível";
      default:
        return "Offline";
    }
  };

  const getInitials = (name?: string) =>
    name?.split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "??";

  // ✅ Status efetivo:
  // - se marcou invisível => invisível (mesmo com o site aberto)
  // - senão, presença => online
  // - senão, status do banco (normalizado)
  const getEffectiveStatus = useCallback(
    (u: MiniUser): UiStatus => {
      const normalized = normalizeStatus(u.status);

      if (normalized === "invisivel") return "invisivel";
      if (onlineIds.has(u.usuario_id)) return "online";

      return normalized;
    },
    [onlineIds]
  );

  const showNotification = useCallback(
    (title: string, body: string) => {
      if (!notificationsEnabled || isOpen) return;
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: "/favicon.ico", badge: "/favicon.ico" });
      }
    },
    [notificationsEnabled, isOpen]
  );

  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSmH0fPTgjMGHm7A7+OZRQ0PVqvl8LJeGAg+ltryxnIsBS59zvLaizsIGGS57OihUBELTKXh8LhlHAU2kdXzzn0pBSh+zPLZjT0HHnK/7eObRw4OWKzl8A=="
    );
    audio.play().catch(() => {});
  }, [soundEnabled]);

  // ✅ Carregar TODOS os usuários do profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase.from("profiles").select("id, name, avatar_url, status");

      if (error) {
        console.error("[profiles] select error:", error);
        return;
      }

      if (data) {
        setUsers(
          (data as any[]).map((u) => ({
            usuario_id: u.id,
            usuario_nome: u.name || "Usuário",
            avatar_url: u.avatar_url,
            // ✅ aqui pode vir "disponivel", e agora o tipo aceita
            status: (u.status as MiniUser["status"]) || "offline",
          }))
        );
      }
    };

    fetchProfiles();

    // ✅ Realtime: status/nome/foto refletirem no chat
    const channel = supabase
      .channel("profiles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
        const newRow: any = payload.new;
        if (!newRow?.id) return;

        setUsers((prev) => {
          const exists = prev.some((u) => u.usuario_id === newRow.id);

          const mapped: MiniUser = {
            usuario_id: newRow.id,
            usuario_nome: newRow.name || "Usuário",
            avatar_url: newRow.avatar_url,
            status: (newRow.status as MiniUser["status"]) || "offline",
          };

          if (!exists) return [mapped, ...prev];
          return prev.map((u) => (u.usuario_id === newRow.id ? { ...u, ...mapped } : u));
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✅ Presence (online/offline automático enquanto navega)
  useEffect(() => {
    if (!myId) return;

    const presence = supabase.channel("presence:site", {
      config: { presence: { key: myId } },
    });

    presence
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState();
        const ids = new Set<string>();
        Object.keys(state).forEach((k) => ids.add(String(k)));
        setOnlineIds(ids);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        setOnlineIds((prev) => new Set([...prev, String(key)]));
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setOnlineIds((prev) => {
          const next = new Set(prev);
          next.delete(String(key));
          return next;
        });
      });

    presence.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await presence.track({ nome: myName, at: new Date().toISOString() });
    });

    presenceChannelRef.current = presence;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [myId, myName]);

  // ===== Sort seguro (não trava se created_at não existir)
  const safeSortMessages = useCallback((list: ChatMessage[]) => {
    const getTime = (m: any) =>
      String(m?.created_at ?? m?.createdAt ?? m?.created_on ?? m?.createdOn ?? m?.data ?? "");
    return [...list].sort((a: any, b: any) => getTime(a).localeCompare(getTime(b)));
  }, []);

  // ===== Load Messages + Realtime para conversaId
  const initMessagesRealtime = useCallback(async () => {
    if (!conversaId) {
      setMessages([]);
      messagesChannelCleanup.current?.();
      typingChannelRef.current?.unsubscribe?.();
      return;
    }

    messagesChannelCleanup.current?.();

    try {
      const list = await supabaseChatService.listMessages(conversaId, 200);
      setMessages(safeSortMessages(list));
    } catch (e) {
      console.error("[chat] listMessages error:", e);
    }

    const unsub = supabaseChatService.subscribeMessages(conversaId, (m) => {
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev;

        if ((m as any).remetente_id !== myId) {
          showNotification((m as any).remetente_nome ?? "Mensagem", (m as any).mensagem ?? "");
          playSound();
        }

        return safeSortMessages([...prev, m]);
      });
    });
    messagesChannelCleanup.current = unsub;

    typingChannelRef.current?.unsubscribe();
    typingChannelRef.current = supabaseChatService.createTypingChannel(conversaId, myId, { nome: myName });
    supabaseChatService.onTyping(typingChannelRef.current, setTypingUsers);

    if (isOpen) {
      await supabaseChatService.markAllRead(conversaId, myId);
      setUnreadCount(0);
    }
  }, [conversaId, isOpen, myId, myName, showNotification, playSound, safeSortMessages]);

  useEffect(() => {
    if (!myId) return;

    initMessagesRealtime();

    return () => {
      messagesChannelCleanup.current?.();
      const ch = typingChannelRef.current;
      if (ch) supabase.removeChannel(ch);
    };
  }, [initMessagesRealtime, myId]);

  // ===== Unread counter
  useEffect(() => {
    if (!isOpen) {
      const count = messages.filter((m: any) => !m.lida && m.remetente_id !== myId).length;
      setUnreadCount(count);
    } else {
      setUnreadCount(0);
    }
  }, [isOpen, messages, myId]);

  // ===== Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ===== Handlers
  const handleTyping = useCallback(() => {
    if (typingChannelRef.current) supabaseChatService.startTyping(typingChannelRef.current);
  }, []);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !myId) return;
    if (!selectedUser?.usuario_id || !conversaId) return;

    try {
      // ✅ garante participantes antes de enviar (RLS)
      await ensureConversationParticipants();

      await supabaseChatService.sendText({
        conversaKey: conversaId,
        conversa_id: conversaId,
        conversa_id_: conversaId,
        remetente_id: myId,
        remetente_nome: myName,
        destinatario_id: selectedUser.usuario_id,
        mensagem: newMessage.trim(),
        reply_to: (replyingTo as any)?.id ?? null,
      } as any);

      setNewMessage("");
      setReplyingTo(null);
    } catch (e) {
      console.error("[chat] sendText error:", e);
      alert("Não foi possível enviar a mensagem. Veja o console (F12) para o erro.");
    }
  }, [newMessage, myId, myName, selectedUser?.usuario_id, conversaId, replyingTo, ensureConversationParticipants]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!myId) return;
      if (!selectedUser?.usuario_id || !conversaId) return;

      try {
        // ✅ garante participantes antes de enviar (RLS)
        await ensureConversationParticipants();

        await supabaseChatService.sendFile({
          conversaKey: conversaId,
          conversa_id: conversaId,
          remetente_id: myId,
          remetente_nome: myName,
          destinatario_id: selectedUser.usuario_id,
          file,
        } as any);

        setUploadOverlay(false);
      } catch (e) {
        console.error("[chat] sendFile error:", e);
        alert("Não foi possível enviar o arquivo. Veja o console (F12) para o erro.");
      }
    },
    [myId, myName, selectedUser?.usuario_id, conversaId, ensureConversationParticipants]
  );

  const handleEdit = useCallback(async (messageId: string, novoTexto: string) => {
    try {
      await supabaseChatService.editMessage(messageId, novoTexto);
    } catch (e) {
      console.error("[chat] editMessage error:", e);
    }
  }, []);

  const handleDelete = useCallback(async (messageId: string) => {
    if (!window.confirm("Deletar esta mensagem?")) return;
    try {
      await supabaseChatService.deleteMessage(messageId);
    } catch (e) {
      console.error("[chat] deleteMessage error:", e);
    }
  }, []);

  // ===== Filtros / Busca
  const filteredMessages = useMemo(() => {
    const base = messages;
    return searchTerm
      ? base.filter((m: any) => String(m.mensagem || "").toLowerCase().includes(searchTerm.toLowerCase()))
      : base;
  }, [messages, searchTerm]);

  // ✅ Online count via presença
  const onlineCount = useMemo(() => onlineIds.size, [onlineIds]);

  // ===== UI sizes
  const chatWidth = isFullscreen ? "w-full h-full" : "w-96 max-h-[600px]";
  const chatPosition = isFullscreen ? "inset-0" : "bottom-6 right-6";

  // ✅ Você no topo (sem badge “VOCÊ”)
  const usersOrdered = useMemo(() => {
    const me = users.find((u) => u.usuario_id === myId) || null;
    const others = users
      .filter((u) => u.usuario_id !== myId)
      .sort((a, b) => {
        const ra = onlineIds.has(a.usuario_id) ? 0 : 1;
        const rb = onlineIds.has(b.usuario_id) ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return (a.usuario_nome || "").localeCompare(b.usuario_nome || "");
      });

    return me ? [me, ...others] : others;
  }, [users, myId, onlineIds]);

  const selectedEffectiveStatus = useMemo((): UiStatus => {
    if (!selectedUser) return "offline";
    return getEffectiveStatus(selectedUser);
  }, [selectedUser, getEffectiveStatus]);

  // ✅ Typing: nunca undefined
  const typingForUI = useMemo(() => {
    return typingUsers
      .map((t: any) => ({
        nome: t?.nome || t?.name || t?.full_name || t?.user_name || "Alguém",
      }))
      .filter((x: any) => x.nome);
  }, [typingUsers]);

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] rounded-full shadow-2xl flex items-center justify-center z-50 group"
            style={{ boxShadow: "0 8px 32px rgba(38, 153, 254, 0.4)" }}
          >
            <MessageCircle className="w-7 h-7 text-white" />

            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center"
              >
                <span className="text-white text-xs font-bold">{unreadCount}</span>
              </motion.div>
            )}

            <motion.div
              className="absolute inset-0 rounded-full bg-[#2699fe]"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 60 : isFullscreen ? "100vh" : 600,
            }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed ${chatPosition} ${chatWidth} bg-[#111111] rounded-2xl shadow-2xl border border-white/10 z-50 flex flex-col overflow-hidden`}
            style={{ boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2699fe] to-[#1a7dd9] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#2699fe]"
                    style={{ backgroundColor: "#10b981" }}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-white">
                    {selectedUser?.usuario_nome ? selectedUser.usuario_nome : "Selecione um usuário"}
                  </h3>
                  <p className="text-xs text-white/80">{onlineCount} online</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {showSearch ? (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 200, opacity: 1 }} className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar..."
                      className="pl-10 h-8 bg-white/10 border-white/20 text-white placeholder-white/60 rounded-lg"
                    />
                  </motion.div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowSearch((s) => !s)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Search className="w-4 h-4 text-white" />
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSettings((s) => !s)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 text-white" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsFullscreen((f) => !f)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsMinimized((m) => !m)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Minimize2 className="w-4 h-4 text-white" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <>
                {showSettings ? (
                  <ChatSettings
                    notificationsEnabled={notificationsEnabled}
                    setNotificationsEnabled={setNotificationsEnabled}
                    soundEnabled={soundEnabled}
                    setSoundEnabled={setSoundEnabled}
                    onClose={() => setShowSettings(false)}
                  />
                ) : (
                  <div className="flex-1 flex overflow-hidden">
                    {/* Users Sidebar */}
                    <div className="w-24 bg-[#0a0a0a] border-r border-white/10 p-3 overflow-y-auto">
                      <p className="text-xs text-gray-500 font-semibold mb-3 uppercase">Equipe</p>

                      <div className="space-y-3">
                        {usersOrdered.map((u, idx) => {
                          const isMe = u.usuario_id === myId;
                          const effStatus = getEffectiveStatus(u);

                          return (
                            <motion.button
                              key={u.usuario_id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              onClick={() => {
                                if (isMe) return;
                                setSelectedUser(u);
                              }}
                              disabled={isMe}
                              whileHover={{ scale: isMe ? 1 : 1.05 }}
                              whileTap={{ scale: isMe ? 1 : 0.95 }}
                              className={[
                                "relative group w-12 h-12 flex items-center justify-center rounded-full",
                                isMe ? "opacity-90 cursor-not-allowed" : "",
                              ].join(" ")}
                              title={isMe ? "Você" : u.usuario_nome}
                            >
                              <Avatar className="w-12 h-12 rounded-full">
                                {u.avatar_url ? (
                                  <AvatarImage className="rounded-full" src={u.avatar_url} alt={u.usuario_nome} />
                                ) : (
                                  <AvatarFallback className="rounded-full bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] text-white font-bold text-xs">
                                    {getInitials(u.usuario_nome)}
                                  </AvatarFallback>
                                )}
                              </Avatar>

                              {/* bolinha de status */}
                              <div
                                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0a0a0a]"
                                style={{ backgroundColor: getStatusColor(effStatus) }}
                              />

                              {/* overlay redondo no hover */}
                              <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[8px] text-white font-medium">
                                  {isMe ? "" : u.usuario_nome.split(" ")[0]}
                                </span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 flex flex-col">
                      {/* Selected User Info */}
                      {selectedUser && selectedUser.usuario_id !== myId && (
                        <div className="p-3 border-b border-white/10 bg-[#0a0a0a]/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                {selectedUser.avatar_url ? (
                                  <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.usuario_nome} />
                                ) : (
                                  <AvatarFallback className="bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] text-white text-xs">
                                    {getInitials(selectedUser.usuario_nome)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-white">{selectedUser.usuario_nome}</p>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(selectedEffectiveStatus) }} />
                                  <span className="text-xs text-gray-400">{getStatusText(selectedEffectiveStatus)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Phone className="w-4 h-4 text-gray-400" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Video className="w-4 h-4 text-gray-400" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Messages */}
                      <ScrollArea className="flex-1 p-4">
                        {!hasConversationSelected ? (
                          <div className="h-full w-full flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-white font-medium">Selecione um usuário para conversar</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Online aparece automaticamente quando a pessoa estiver com o site aberto.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filteredMessages.map((msg, idx) => (
                              <MessageItem
                                key={(msg as any).id ?? `${idx}`}
                                message={msg as any}
                                currentUser={{ id: myId, full_name: myName } as any}
                                onReply={setReplyingTo as any}
                                onEdit={handleEdit as any}
                                onDelete={handleDelete as any}
                                onReaction={() => {}}
                                delay={idx * 0.03}
                              />
                            ))}
                            <div ref={messagesEndRef} />
                          </div>
                        )}
                      </ScrollArea>

                      {/* Typing indicator */}
                      {typingForUI.length > 0 && hasConversationSelected && <TypingIndicator users={typingForUI as any} />}

                      {/* Reply Preview */}
                      {replyingTo && hasConversationSelected && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="px-4 py-2 border-t border-white/10 bg-white/5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-10 bg-[#2699fe] rounded" />
                              <div>
                                <p className="text-xs text-gray-400">Respondendo a {(replyingTo as any).remetente_nome}</p>
                                <p className="text-sm text-white truncate max-w-xs">{(replyingTo as any).mensagem}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-6 w-6 p-0">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {/* Input */}
                      <div className="p-4 border-t border-white/10 bg-[#0a0a0a]/50">
                        <div className="flex items-end gap-2">
                          <div className="flex-1 relative">
                            <Input
                              value={newMessage}
                              disabled={!hasConversationSelected}
                              onChange={(e) => {
                                setNewMessage(e.target.value);
                                handleTyping();
                              }}
                              onKeyDown={async (e) => {
                                if (!hasConversationSelected) return;

                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  await handleSend();
                                } else {
                                  handleTyping();
                                }
                              }}
                              placeholder={hasConversationSelected ? "Digite sua mensagem..." : "Selecione um usuário..."}
                              className="bg-white/5 border-white/10 text-white rounded-xl pr-24 h-11 resize-none disabled:opacity-60"
                            />

                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                              <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={async (e) => {
                                  if (!hasConversationSelected) return;
                                  const file = e.target.files?.[0];
                                  if (!file) return;

                                  // ✅ (opcional) envia direto ao selecionar
                                  await handleFileSelect(file);
                                  e.target.value = "";
                                }}
                              />

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={!hasConversationSelected}
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <Paperclip className="w-4 h-4 text-gray-400" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={!hasConversationSelected}
                                onClick={() => setShowEmojiPicker((s) => !s)}
                              >
                                <Smile className="w-4 h-4 text-gray-400" />
                              </Button>
                            </div>
                          </div>

                          <motion.button
                            whileHover={{ scale: hasConversationSelected ? 1.05 : 1 }}
                            whileTap={{ scale: hasConversationSelected ? 0.95 : 1 }}
                            onClick={handleSend}
                            disabled={!hasConversationSelected || !newMessage.trim()}
                            className="h-11 w-11 bg-gradient-to-r from-[#2699fe] to-[#1a7dd9] rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#2699fe]/30"
                          >
                            <Send className="w-5 h-5 text-white" />
                          </motion.button>
                        </div>

                        {/* Emoji Picker */}
                        <AnimatePresence>
                          {showEmojiPicker && hasConversationSelected && (
                            <EmojiPicker
                              onSelect={(emoji: string) => {
                                setNewMessage((prev) => prev + emoji);
                                setShowEmojiPicker(false);
                              }}
                              onClose={() => setShowEmojiPicker(false)}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Upload overlay (fica, mas com envio direto acima pode nem ser usado) */}
            <AnimatePresence>
              {uploadOverlay && hasConversationSelected && (
                <FileUploadArea
                  onFileSelect={async (file) => {
                    await handleFileSelect(file);
                  }}
                  onClose={() => setUploadOverlay(false)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
