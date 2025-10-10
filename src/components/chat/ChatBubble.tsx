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

// Opcional: canal global "geral" + 1:1
type Mode = "global" | "direct";

interface MiniUser {
  usuario_id: string;
  usuario_nome: string;
  avatar_url?: string | null;
  status: "online" | "ausente" | "ocupado" | "invisivel" | "offline";
}

export default function ChatBubble() {
  const { profile } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [mode, setMode] = useState<Mode>("global");
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messagesChannelCleanup = useRef<null | (() => void)>(null);

  const myId = profile?.id || "";
  const myName = profile?.name || "User";

  // ==== Conversa Key
  const conversaKey = useMemo(() => {
    if (mode === "global") return "global";
    if (selectedUser?.usuario_id && myId) {
      return supabaseChatService.conversationKeyDirect(myId, selectedUser.usuario_id);
    }
    return "global";
  }, [mode, selectedUser?.usuario_id, myId]);

  // ==== Helpers UI
  const getStatusColor = (status: MiniUser["status"]) => {
    switch (status) {
      case "online": return "#10b981";
      case "ausente": return "#f59e0b";
      case "ocupado": return "#ef4444";
      case "invisivel": return "#6b7280";
      default: return "#6b7280";
    }
  };

  const getStatusText = (status: MiniUser["status"]) => {
    switch (status) {
      case "online": return "Disponível";
      case "ausente": return "Ausente";
      case "ocupado": return "Ocupado";
      case "invisivel": return "Invisível";
      default: return "Offline";
    }
  };

  const getInitials = (name?: string) =>
    name?.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "??";

  const showNotification = useCallback((title: string, body: string) => {
    if (!notificationsEnabled || isOpen) return;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico", badge: "/favicon.ico" });
    }
  }, [notificationsEnabled, isOpen]);

  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSmH0fPTgjMGHm7A7+OZRQ0PVqvl8LJeGAg+ltryxnIsBS59zvLaizsIGGS57OihUBELTKXh8LhlHAU2kdXzzn0pBSh+zPLZjT0HHnK/7eObRw4OWKzl8A==");
    audio.play().catch(() => {});
  }, [soundEnabled]);

  // ==== Carregar usuários do Supabase Profiles ====
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, status");

      if (!error && data) {
        setUsers(
          data
            .filter((u) => u.id !== myId)
            .map((u) => ({
              usuario_id: u.id,
              usuario_nome: (u as any).name || "Usuário",
              avatar_url: (u as any).avatar_url,
              status: ((u as any).status as MiniUser["status"]) || "offline",
            }))
        );
      }
    };
    fetchProfiles();

    const channel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          setUsers((prev) =>
            prev.map((u) =>
              u.usuario_id === (payload.new as any).id
                ? {
                    ...u,
                    status: ((payload.new as any).status as MiniUser["status"]) || u.status,
                    avatar_url: (payload.new as any).avatar_url ?? u.avatar_url,
                    usuario_nome: (payload.new as any).name ?? u.usuario_nome,
                  }
                : u
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId]);

  // ==== Load Messages + Realtime for current conversaKey
  const initMessagesRealtime = useCallback(async () => {
    if (!conversaKey) return;
    messagesChannelCleanup.current?.();

    const list = await supabaseChatService.listMessages(conversaKey, 200);
    setMessages(list.sort((a, b) => a.created_at.localeCompare(b.created_at)));

    const unsub = supabaseChatService.subscribeMessages(conversaKey, (m) => {
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev;
        if (m.remetente_id !== myId) {
          showNotification(m.remetente_nome, m.mensagem);
          playSound();
        }
        const merged = [...prev, m];
        return merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    });
    messagesChannelCleanup.current = unsub;

    typingChannelRef.current?.unsubscribe();
    typingChannelRef.current = supabaseChatService.createTypingChannel(
      conversaKey,
      myId,
      { nome: myName }
    );
    supabaseChatService.onTyping(typingChannelRef.current, setTypingUsers);

    if (isOpen) {
      await supabaseChatService.markAllRead(conversaKey, myId);
      setUnreadCount(0);
    }
  }, [conversaKey, isOpen, myId, myName, showNotification, playSound]);

  useEffect(() => {
    if (!myId) return;
    initMessagesRealtime();
    return () => {
      messagesChannelCleanup.current?.();
      const ch = typingChannelRef.current;
      if (ch) supabase.removeChannel(ch);
    };
  }, [initMessagesRealtime, myId]);

  // ==== Unread counter (sem alterar layout)
  useEffect(() => {
    if (!isOpen) {
      const count = messages.filter((m) => !m.lida && m.remetente_id !== myId).length;
      setUnreadCount(count);
    } else {
      setUnreadCount(0);
    }
  }, [isOpen, messages, myId]);

  // ==== Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ==== Handlers
  const handleTyping = useCallback(() => {
    if (typingChannelRef.current) supabaseChatService.startTyping(typingChannelRef.current);
  }, []);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !myId) return;

    const destinatario_id = mode === "direct" ? (selectedUser?.usuario_id ?? null) : null;

    await supabaseChatService.sendText({
      conversaKey,
      remetente_id: myId,
      remetente_nome: myName,
      destinatario_id,
      mensagem: newMessage.trim(),
      reply_to: replyingTo?.id ?? null,
    });

    setNewMessage("");
    setReplyingTo(null);
  }, [newMessage, myId, myName, mode, selectedUser?.usuario_id, conversaKey, replyingTo]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!myId) return;
    const destinatario_id = mode === "direct" ? (selectedUser?.usuario_id ?? null) : null;

    await supabaseChatService.sendFile({
      conversaKey,
      remetente_id: myId,
      remetente_nome: myName,
      destinatario_id,
      file,
    });

    setUploadOverlay(false);
  }, [myId, myName, mode, selectedUser?.usuario_id, conversaKey]);

  const handleEdit = useCallback(async (messageId: string, novoTexto: string) => {
    await supabaseChatService.editMessage(messageId, novoTexto);
  }, []);

  const handleDelete = useCallback(async (messageId: string) => {
    if (window.confirm("Deletar esta mensagem?")) {
      await supabaseChatService.deleteMessage(messageId);
    }
  }, []);

  // ==== Filtros / Busca (mantendo layout)
  const filteredMessages = useMemo(() => {
    const base = messages;
    const bySearch = searchTerm
      ? base.filter((m) => (m.mensagem || "").toLowerCase().includes(searchTerm.toLowerCase()))
      : base;
    return bySearch;
  }, [messages, searchTerm]);

  // Quantos usuários online (status === "online")
  const onlineCount = useMemo(
    () => users.filter((u) => u.status === "online").length,
    [users]
  );

  // ==== UI sizes
  const chatWidth = isFullscreen ? "w-full h-full" : "w-96 max-h-[600px]";
  const chatPosition = isFullscreen ? "inset-0" : "bottom-6 right-6";

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
                    {mode === "global" ? "Chat da Equipe" : selectedUser?.usuario_nome || "Conversa direta"}
                  </h3>
                  <p className="text-xs text-white/80">
                    {onlineCount} online
                  </p>
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
                        <motion.button
                          key="global"
                          onClick={() => { setMode("global"); setSelectedUser(null); }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative group w-full rounded-lg overflow-hidden ${mode === "global" ? "ring-2 ring-[#2699fe]" : ""}`}
                        >
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] text-white font-bold text-xs">
                              GL
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[8px] text-white font-medium">Geral</span>
                          </div>
                        </motion.button>

                        {users.map((u, idx) => (
                          <motion.button
                            key={u.usuario_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            onClick={() => { setMode("direct"); setSelectedUser(u); }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`relative group w-full ${
                              selectedUser?.usuario_id === u.usuario_id && mode === "direct" ? "ring-2 ring-[#2699fe]" : ""
                            } rounded-lg overflow-hidden`}
                          >
                            <Avatar className="w-12 h-12">
                              {u.avatar_url ? (
                                <AvatarImage src={u.avatar_url} alt={u.usuario_nome} />
                              ) : (
                                <AvatarFallback className="bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] text-white font-bold text-xs">
                                  {getInitials(u.usuario_nome)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div
                              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0a0a0a]"
                              style={{ backgroundColor: getStatusColor(u.status) }}
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[8px] text-white font-medium">{u.usuario_nome.split(" ")[0]}</span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 flex flex-col">
                      {/* Selected User Info */}
                      {mode === "direct" && selectedUser && (
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
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(selectedUser.status) }} />
                                  <span className="text-xs text-gray-400">{getStatusText(selectedUser.status)}</span>
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
                        <div className="space-y-4">
                          {filteredMessages.map((msg, idx) => (
                            <MessageItem
                              key={msg.id}
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
                      </ScrollArea>

                      {/* Typing indicator */}
                      {typingUsers.length > 0 && <TypingIndicator users={typingUsers.map((t) => ({ nome: t.nome }))} />}

                      {/* Reply Preview */}
                      {replyingTo && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-2 border-t border-white/10 bg-white/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-10 bg-[#2699fe] rounded" />
                              <div>
                                <p className="text-xs text-gray-400">Respondendo a {replyingTo.remetente_nome}</p>
                                <p className="text-sm text-white truncate max-w-xs">{replyingTo.mensagem}</p>
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
                              onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                              onKeyDown={async (e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  await handleSend();
                                } else {
                                  handleTyping();
                                }
                              }}
                              placeholder="Digite sua mensagem..."
                              className="bg-white/5 border-white/10 text-white rounded-xl pr-24 h-11 resize-none"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                              <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) setUploadOverlay(true);
                                }}
                              />
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => fileInputRef.current?.click()}>
                                <Paperclip className="w-4 h-4 text-gray-400" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowEmojiPicker((s) => !s)}>
                                <Smile className="w-4 h-4 text-gray-400" />
                              </Button>
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSend}
                            disabled={!newMessage.trim()}
                            className="h-11 w-11 bg-gradient-to-r from-[#2699fe] to-[#1a7dd9] rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#2699fe]/30"
                          >
                            <Send className="w-5 h-5 text-white" />
                          </motion.button>
                        </div>

                        {/* Emoji Picker */}
                        <AnimatePresence>
                          {showEmojiPicker && (
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

            {/* Upload overlay */}
            <AnimatePresence>
              {uploadOverlay && (
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
