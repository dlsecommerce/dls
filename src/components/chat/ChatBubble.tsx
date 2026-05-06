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

type ManualStatus = "disponivel" | "ausente" | "ocupado" | "invisivel";
type UiStatus = "online" | "ausente" | "ocupado" | "invisivel" | "offline";

interface MiniUser {
  usuario_id: string;
  usuario_nome: string;
  avatar_url?: string | null;
  status: ManualStatus;
  status_message?: string | null;
  last_seen_at?: string | null;
  status_updated_at?: string | null;
}

type FabPosition = {
  x: number;
  y: number;
};

const FAB_STORAGE_KEY = "chat-fab-position";
const FAB_SIZE = 64;
const FAB_RIGHT = 24;
const FAB_BOTTOM = 24;
const FAB_SAFE = 8;

const PRESENCE_CHANNEL = "presence:site";
const PRESENCE_TOUCH_INTERVAL_MS = 60_000;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const normalizeManualStatus = (status?: string | null): ManualStatus => {
  if (
    status === "disponivel" ||
    status === "ausente" ||
    status === "ocupado" ||
    status === "invisivel"
  ) {
    return status;
  }

  return "disponivel";
};

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

const getStatusPriority = (status: UiStatus) => {
  switch (status) {
    case "online":
      return 0;
    case "ocupado":
      return 1;
    case "ausente":
      return 2;
    case "invisivel":
      return 3;
    default:
      return 4;
  }
};

export default function ChatBubble() {
  const { profile } = useProfile();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<MiniUser | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<MiniUser[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<any[]>([]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [uploadOverlay, setUploadOverlay] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});

  const [fabPosition, setFabPosition] = useState<FabPosition>({ x: 0, y: 0 });
  const [isDraggingFab, setIsDraggingFab] = useState(false);

  const fabDragRef = useRef({
    active: false,
    moved: false,
    startPointerX: 0,
    startPointerY: 0,
    startX: 0,
    startY: 0,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const messagesChannelCleanup = useRef<null | (() => void)>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const inboxChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const conversaIdRef = useRef<string>("");

  const myId = profile?.id || "";
  const myName = profile?.name || "User";
  const myManualStatus = normalizeManualStatus(profile?.status);

  const selectedUserLive = useMemo(() => {
    if (!selectedUser?.usuario_id) return null;

    return (
      users.find((u) => u.usuario_id === selectedUser.usuario_id) ??
      selectedUser
    );
  }, [users, selectedUser]);

  const conversaId = useMemo(() => {
    if (!selectedUserLive?.usuario_id || !myId) return "";
    if (selectedUserLive.usuario_id === myId) return "";

    return supabaseChatService.conversationKeyDirect(
      myId,
      selectedUserLive.usuario_id
    );
  }, [selectedUserLive?.usuario_id, myId]);

  const hasConversationSelected = Boolean(
    conversaId && selectedUserLive?.usuario_id
  );

  useEffect(() => {
    conversaIdRef.current = conversaId || "";
  }, [conversaId]);

  const getEffectiveStatus = useCallback(
    (u: MiniUser): UiStatus => {
      const manualStatus = normalizeManualStatus(u.status);
      const isPresent = onlineIds.has(u.usuario_id);

      if (manualStatus === "invisivel") return "invisivel";
      if (!isPresent) return "offline";
      if (manualStatus === "ocupado") return "ocupado";
      if (manualStatus === "ausente") return "ausente";

      return "online";
    },
    [onlineIds]
  );

  const hasAnyUnread = useMemo(
    () => Object.values(unreadByUser).some((n) => n > 0),
    [unreadByUser]
  );

  const getFabBounds = useCallback(() => {
    if (typeof window === "undefined") {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    return {
      minX: -(window.innerWidth - FAB_SIZE - FAB_SAFE),
      maxX: -(FAB_RIGHT - FAB_SAFE),
      minY: -(window.innerHeight - FAB_SIZE - FAB_SAFE),
      maxY: -(FAB_BOTTOM - FAB_SAFE),
    };
  }, []);

  const clampFabPosition = useCallback(
    (next: FabPosition): FabPosition => {
      const { minX, maxX, minY, maxY } = getFabBounds();

      return {
        x: clamp(next.x, minX, maxX),
        y: clamp(next.y, minY, maxY),
      };
    },
    [getFabBounds]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem(FAB_STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        setFabPosition(
          clampFabPosition({
            x: Number.isFinite(parsed?.x) ? parsed.x : 0,
            y: Number.isFinite(parsed?.y) ? parsed.y : 0,
          })
        );
      } catch {
        localStorage.removeItem(FAB_STORAGE_KEY);
      }
    }

    const handleResize = () => {
      setFabPosition((prev) => clampFabPosition(prev));
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [clampFabPosition]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!fabDragRef.current.active) return;

      const deltaX = e.clientX - fabDragRef.current.startPointerX;
      const deltaY = e.clientY - fabDragRef.current.startPointerY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        fabDragRef.current.moved = true;
      }

      const next = clampFabPosition({
        x: fabDragRef.current.startX + deltaX,
        y: fabDragRef.current.startY + deltaY,
      });

      setFabPosition(next);
    };

    const handleMouseUp = () => {
      if (!fabDragRef.current.active) return;

      fabDragRef.current.active = false;
      setIsDraggingFab(false);

      localStorage.setItem(FAB_STORAGE_KEY, JSON.stringify(fabPosition));

      setTimeout(() => {
        fabDragRef.current.moved = false;
      }, 120);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!fabDragRef.current.active) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - fabDragRef.current.startPointerX;
      const deltaY = touch.clientY - fabDragRef.current.startPointerY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        fabDragRef.current.moved = true;
      }

      const next = clampFabPosition({
        x: fabDragRef.current.startX + deltaX,
        y: fabDragRef.current.startY + deltaY,
      });

      setFabPosition(next);
    };

    const handleTouchEnd = () => {
      if (!fabDragRef.current.active) return;

      fabDragRef.current.active = false;
      setIsDraggingFab(false);

      localStorage.setItem(FAB_STORAGE_KEY, JSON.stringify(fabPosition));

      setTimeout(() => {
        fabDragRef.current.moved = false;
      }, 120);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [fabPosition, clampFabPosition]);

  const ensureConversationParticipants = useCallback(async () => {
    if (!conversaId || !myId || !selectedUserLive?.usuario_id) return;

    const { error } = await supabase.rpc("ensure_dm_participants", {
      p_conversa_id: conversaId,
      p_other_user: selectedUserLive.usuario_id,
    });

    if (error) {
      console.error("[chat] ensure_dm_participants error:", error);
      throw error;
    }
  }, [conversaId, myId, selectedUserLive?.usuario_id]);

  const getInitials = (name?: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "??";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const showNotification = useCallback(
    (title: string, body: string) => {
      if (typeof window === "undefined") return;
      if (!notificationsEnabled) return;
      if (isOpen && !isMinimized) return;

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
        });
      }
    },
    [notificationsEnabled, isOpen, isMinimized]
  );

  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    if (typeof window === "undefined") return;

    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSmH0fPTgjMGHm7A7+OZRQ0PVqvl8LJeGAg+ltryxnIsBS59zvLaizsIGGS57OihUBELTKXh8LhlHAU2kdXzzn0pBSh+zPLZjT0HHnK/7eObRw4OWKzl8A=="
    );

    audio.play().catch(() => {});
  }, [soundEnabled]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, name, avatar_url, status, status_message, last_seen_at, status_updated_at"
        )
        .order("name", { ascending: true });

      if (error) {
        console.error("[profiles] select error:", error);
        return;
      }

      setUsers(
        ((data ?? []) as any[]).map((u) => ({
          usuario_id: u.id,
          usuario_nome: u.name || "Usuário",
          avatar_url: u.avatar_url,
          status: normalizeManualStatus(u.status),
          status_message: u.status_message ?? null,
          last_seen_at: u.last_seen_at ?? null,
          status_updated_at: u.status_updated_at ?? null,
        }))
      );
    };

    fetchProfiles();

    const channel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          const newRow: any = payload.new;
          if (!newRow?.id) return;

          const mapped: MiniUser = {
            usuario_id: newRow.id,
            usuario_nome: newRow.name || "Usuário",
            avatar_url: newRow.avatar_url,
            status: normalizeManualStatus(newRow.status),
            status_message: newRow.status_message ?? null,
            last_seen_at: newRow.last_seen_at ?? null,
            status_updated_at: newRow.status_updated_at ?? null,
          };

          setUsers((prev) => {
            const exists = prev.some(
              (u) => u.usuario_id === mapped.usuario_id
            );

            if (!exists) return [mapped, ...prev];

            return prev.map((u) =>
              u.usuario_id === mapped.usuario_id ? { ...u, ...mapped } : u
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!myId) return;

    const touchPresence = async () => {
      try {
        await supabase.rpc("touch_my_profile_presence");
      } catch (error) {
        console.warn("[presence] touch_my_profile_presence error:", error);
      }
    };

    touchPresence();

    const interval = window.setInterval(
      touchPresence,
      PRESENCE_TOUCH_INTERVAL_MS
    );

    return () => window.clearInterval(interval);
  }, [myId]);

  useEffect(() => {
    if (!myId) return;

    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }

    if (myManualStatus === "invisivel") {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        next.delete(myId);
        return next;
      });

      return;
    }

    const presence = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: myId } },
    });

    presence
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState();
        const ids = new Set<string>();

        Object.keys(state).forEach((key) => {
          const user = users.find((u) => u.usuario_id === String(key));
          if (user?.status === "invisivel") return;
          ids.add(String(key));
        });

        setOnlineIds(ids);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        const id = String(key);
        const user = users.find((u) => u.usuario_id === id);

        if (user?.status === "invisivel") return;

        setOnlineIds((prev) => new Set([...prev, id]));
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        const id = String(key);

        setOnlineIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });

    presence.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;

      await presence.track({
        id: myId,
        nome: myName,
        status: myManualStatus,
        at: new Date().toISOString(),
      });
    });

    presenceChannelRef.current = presence;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [myId, myName, myManualStatus, users]);

  useEffect(() => {
    if (!myId) return;

    if (inboxChannelRef.current) {
      supabase.removeChannel(inboxChannelRef.current);
      inboxChannelRef.current = null;
    }

    const ch = supabase
      .channel(`inbox:${myId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens",
          filter: `destinatario_id=eq.${myId}`,
        },
        async (payload) => {
          const m: any = payload.new;

          if (!m) return;
          if (m.remetente_id === myId) return;

          const currentOpenConversation = conversaIdRef.current || "";
          const isThisConversationOpen =
            Boolean(currentOpenConversation) &&
            m.conversa_id === currentOpenConversation;

          if (!isThisConversationOpen) {
            setUnreadByUser((prev) => ({
              ...prev,
              [m.remetente_id]: (prev[m.remetente_id] ?? 0) + 1,
            }));

            showNotification(
              m.remetente_nome ?? "Mensagem",
              m.mensagem ?? m.conteudo ?? ""
            );

            playSound();
          } else {
            try {
              await supabaseChatService.markAllRead(m.conversa_id, myId);
            } catch {}
          }
        }
      )
      .subscribe();

    inboxChannelRef.current = ch;

    return () => {
      if (inboxChannelRef.current) {
        supabase.removeChannel(inboxChannelRef.current);
        inboxChannelRef.current = null;
      }
    };
  }, [myId, showNotification, playSound]);

  const safeSortMessages = useCallback((list: ChatMessage[]) => {
    const getTime = (m: any) =>
      String(
        m?.created_at ??
          m?.createdAt ??
          m?.created_on ??
          m?.createdOn ??
          m?.data ??
          m?.criado_em ??
          ""
      );

    return [...list].sort((a: any, b: any) =>
      getTime(a).localeCompare(getTime(b))
    );
  }, []);

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
        return safeSortMessages([...prev, m]);
      });
    });

    messagesChannelCleanup.current = unsub;

    typingChannelRef.current?.unsubscribe();

    typingChannelRef.current = supabaseChatService.createTypingChannel(
      conversaId,
      myId,
      {
        nome: myName,
      }
    );

    supabaseChatService.onTyping(typingChannelRef.current, setTypingUsers);

    if (selectedUserLive?.usuario_id && selectedUserLive.usuario_id !== myId) {
      setUnreadByUser((prev) => {
        if (!prev[selectedUserLive.usuario_id]) return prev;

        const next = { ...prev };
        delete next[selectedUserLive.usuario_id];

        return next;
      });

      try {
        await supabaseChatService.markAllRead(conversaId, myId);
      } catch {}
    }
  }, [
    conversaId,
    myId,
    myName,
    safeSortMessages,
    selectedUserLive?.usuario_id,
  ]);

  useEffect(() => {
    if (!myId) return;

    initMessagesRealtime();

    return () => {
      messagesChannelCleanup.current?.();

      const ch = typingChannelRef.current;
      if (ch) supabase.removeChannel(ch);
    };
  }, [initMessagesRealtime, myId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleTyping = useCallback(() => {
    if (typingChannelRef.current) {
      supabaseChatService.startTyping(typingChannelRef.current);
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !myId) return;
    if (!selectedUserLive?.usuario_id || !conversaId) return;

    try {
      await ensureConversationParticipants();

      await supabaseChatService.sendText({
        conversaKey: conversaId,
        conversa_id: conversaId,
        conversa_id_: conversaId,
        remetente_id: myId,
        remetente_nome: myName,
        destinatario_id: selectedUserLive.usuario_id,
        mensagem: newMessage.trim(),
        reply_to: (replyingTo as any)?.id ?? null,
      } as any);

      setNewMessage("");
      setReplyingTo(null);
    } catch (e) {
      console.error("[chat] sendText error:", e);
      alert("Não foi possível enviar a mensagem. Veja o console (F12) para o erro.");
    }
  }, [
    newMessage,
    myId,
    myName,
    selectedUserLive?.usuario_id,
    conversaId,
    replyingTo,
    ensureConversationParticipants,
  ]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!myId) return;
      if (!selectedUserLive?.usuario_id || !conversaId) return;

      try {
        await ensureConversationParticipants();

        await supabaseChatService.sendFile({
          conversaKey: conversaId,
          conversa_id: conversaId,
          remetente_id: myId,
          remetente_nome: myName,
          destinatario_id: selectedUserLive.usuario_id,
          file,
        } as any);

        setUploadOverlay(false);
      } catch (e) {
        console.error("[chat] sendFile error:", e);
        alert("Não foi possível enviar o arquivo. Veja o console (F12) para o erro.");
      }
    },
    [
      myId,
      myName,
      selectedUserLive?.usuario_id,
      conversaId,
      ensureConversationParticipants,
    ]
  );

  const handleEdit = useCallback(
    async (messageId: string, novoTexto: string) => {
      try {
        await supabaseChatService.editMessage(messageId, novoTexto);
      } catch (e) {
        console.error("[chat] editMessage error:", e);
      }
    },
    []
  );

  const handleDelete = useCallback(async (messageId: string) => {
    if (!window.confirm("Deletar esta mensagem?")) return;

    try {
      await supabaseChatService.deleteMessage(messageId);
    } catch (e) {
      console.error("[chat] deleteMessage error:", e);
    }
  }, []);

  const startFabMouseDrag = (e: React.MouseEvent<HTMLButtonElement>) => {
    fabDragRef.current.active = true;
    fabDragRef.current.moved = false;
    fabDragRef.current.startPointerX = e.clientX;
    fabDragRef.current.startPointerY = e.clientY;
    fabDragRef.current.startX = fabPosition.x;
    fabDragRef.current.startY = fabPosition.y;
    setIsDraggingFab(true);
  };

  const startFabTouchDrag = (e: React.TouchEvent<HTMLButtonElement>) => {
    const touch = e.touches[0];
    if (!touch) return;

    fabDragRef.current.active = true;
    fabDragRef.current.moved = false;
    fabDragRef.current.startPointerX = touch.clientX;
    fabDragRef.current.startPointerY = touch.clientY;
    fabDragRef.current.startX = fabPosition.x;
    fabDragRef.current.startY = fabPosition.y;
    setIsDraggingFab(true);
  };

  const handleFabOpen = () => {
    if (fabDragRef.current.moved) return;
    setIsOpen(true);
  };

  const selectUser = useCallback(
    async (u: MiniUser) => {
      if (u.usuario_id === myId) return;

      setSelectedUser(u);

      setUnreadByUser((prev) => {
        if (!prev[u.usuario_id]) return prev;

        const next = { ...prev };
        delete next[u.usuario_id];

        return next;
      });

      try {
        const key = supabaseChatService.conversationKeyDirect(
          myId,
          u.usuario_id
        );

        await supabaseChatService.markAllRead(key, myId);
      } catch {}
    },
    [myId]
  );

  const filteredMessages = useMemo(() => {
    const base = messages;

    return searchTerm
      ? base.filter((m: any) =>
          String(m.mensagem || m.conteudo || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      : base;
  }, [messages, searchTerm]);

  const onlineCount = useMemo(() => {
    return users.filter((u) => {
      const status = getEffectiveStatus(u);
      return status !== "offline" && status !== "invisivel";
    }).length;
  }, [users, getEffectiveStatus]);

  const chatWidth = isFullscreen ? "w-full h-full" : "w-96 max-h-[600px]";
  const chatPosition = isFullscreen ? "inset-0" : "bottom-6 right-6";

  const usersOrdered = useMemo(() => {
    const me = users.find((u) => u.usuario_id === myId) || null;

    const others = users
      .filter((u) => u.usuario_id !== myId)
      .sort((a, b) => {
        const unreadA = (unreadByUser[a.usuario_id] ?? 0) > 0 ? 0 : 1;
        const unreadB = (unreadByUser[b.usuario_id] ?? 0) > 0 ? 0 : 1;

        if (unreadA !== unreadB) return unreadA - unreadB;

        const statusA = getEffectiveStatus(a);
        const statusB = getEffectiveStatus(b);

        const priorityA = getStatusPriority(statusA);
        const priorityB = getStatusPriority(statusB);

        if (priorityA !== priorityB) return priorityA - priorityB;

        return (a.usuario_nome || "").localeCompare(b.usuario_nome || "");
      });

    return me ? [me, ...others] : others;
  }, [users, myId, unreadByUser, getEffectiveStatus]);

  const selectedEffectiveStatus = useMemo((): UiStatus => {
    if (!selectedUserLive) return "offline";

    return getEffectiveStatus(selectedUserLive);
  }, [selectedUserLive, getEffectiveStatus]);

  const typingForUI = useMemo(() => {
    return typingUsers
      .map((t: any) => ({
        nome: t?.nome || t?.name || t?.full_name || t?.user_name || "Alguém",
      }))
      .filter((x: any) => x.nome);
  }, [typingUsers]);

  const selectedTitle = selectedUserLive?.usuario_nome || "Selecione um usuário";
  const selectedStatusLabel = getStatusText(selectedEffectiveStatus);
  const selectedStatusColor = getStatusColor(selectedEffectiveStatus);

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <>
            <motion.button
              initial={{ scale: 0, opacity: 0, y: 16 }}
              animate={{
                scale: 1,
                opacity: 1,
                x: fabPosition.x,
                y: fabPosition.y,
              }}
              exit={{ scale: 0, opacity: 0, y: 16 }}
              whileTap={{ scale: 0.94 }}
              onMouseDown={startFabMouseDrag}
              onTouchStart={startFabTouchDrag}
              onClick={handleFabOpen}
              className="chat-fab-draggable fixed right-5 z-[99999] flex h-14 w-14 items-center justify-center rounded-full bg-[#2699fe] shadow-2xl md:hidden"
              style={{
                bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
                boxShadow: "0 10px 30px rgba(38, 153, 254, 0.45)",
                cursor: isDraggingFab ? "grabbing" : "grab",
                touchAction: "none",
              }}
            >
              <MessageCircle className="relative z-10 h-6 w-6 text-white" />

              {hasAnyUnread && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-[#0a0a0a] bg-red-500"
                />
              )}

              <motion.div
                className="pointer-events-none absolute inset-0 rounded-full bg-[#2699fe]"
                animate={{ scale: [1, 1.28, 1], opacity: [0.35, 0, 0.35] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.button>

            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                x: fabPosition.x,
                y: fabPosition.y,
              }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onMouseDown={startFabMouseDrag}
              onTouchStart={startFabTouchDrag}
              onClick={handleFabOpen}
              className="chat-fab-draggable fixed bottom-6 right-6 z-[99999] hidden h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] shadow-2xl group md:flex"
              style={{
                boxShadow: "0 8px 32px rgba(38, 153, 254, 0.4)",
                cursor: isDraggingFab ? "grabbing" : "grab",
              }}
            >
              <MessageCircle className="h-7 w-7 text-white" />

              {hasAnyUnread && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full border-2 border-[#0a0a0a] bg-red-500"
                />
              )}

              <motion.div
                className="pointer-events-none absolute inset-0 rounded-full bg-[#2699fe]"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.button>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 32 }}
              className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0a0a0a] md:hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2699fe]">
                      <Users className="h-5 w-5 text-white" />
                    </div>

                    <div
                      className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0a0a0a]"
                      style={{ backgroundColor: "#10b981" }}
                    />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-white">
                      {selectedTitle}
                    </h3>
                    <p className="text-xs text-white/70">
                      {onlineCount} online
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setShowSearch((s) => !s)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#151515] text-white"
                  >
                    <Search className="h-4 w-4" />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setShowSettings((s) => !s)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#151515] text-white"
                  >
                    <Settings className="h-4 w-4" />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setIsOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#151515] text-white"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>

              {showSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-white/10 bg-[#0a0a0a] px-4 pb-3"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar..."
                      className="h-11 rounded-xl border-white/10 bg-[#151515] pl-10 text-white placeholder:text-white/40"
                    />
                  </div>
                </motion.div>
              )}

              {!showSettings && (
                <div className="border-b border-white/10 bg-[#0a0a0a] px-4 py-3">
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {usersOrdered.map((u) => {
                      const isMe = u.usuario_id === myId;
                      const effStatus = getEffectiveStatus(u);
                      const hasDot = (unreadByUser[u.usuario_id] ?? 0) > 0;
                      const isSelected =
                        selectedUserLive?.usuario_id === u.usuario_id;

                      return (
                        <button
                          key={u.usuario_id}
                          disabled={isMe}
                          onClick={() => selectUser(u)}
                          className="flex shrink-0 flex-col items-center gap-1"
                          title={`${isMe ? "Você" : u.usuario_nome} · ${getStatusText(
                            effStatus
                          )}`}
                        >
                          <div
                            className={[
                              "relative rounded-full p-0.5",
                              isSelected ? "bg-[#2699fe]" : "bg-transparent",
                              isMe ? "opacity-60" : "",
                            ].join(" ")}
                          >
                            <Avatar className="h-12 w-12 rounded-full">
                              {u.avatar_url ? (
                                <AvatarImage
                                  className="rounded-full"
                                  src={u.avatar_url}
                                  alt={u.usuario_nome}
                                />
                              ) : (
                                <AvatarFallback className="rounded-full bg-[#151515] text-xs font-bold text-white">
                                  {getInitials(u.usuario_nome)}
                                </AvatarFallback>
                              )}
                            </Avatar>

                            {!isMe && hasDot && (
                              <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-[#0a0a0a] bg-red-500" />
                            )}

                            <div
                              className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0a0a0a]"
                              style={{
                                backgroundColor: getStatusColor(effStatus),
                              }}
                            />
                          </div>

                          <span className="max-w-[58px] truncate text-[10px] text-white/70">
                            {isMe ? "Você" : u.usuario_nome.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {showSettings ? (
                <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
                  <ChatSettings
                    notificationsEnabled={notificationsEnabled}
                    setNotificationsEnabled={setNotificationsEnabled}
                    soundEnabled={soundEnabled}
                    setSoundEnabled={setSoundEnabled}
                    onClose={() => setShowSettings(false)}
                  />
                </div>
              ) : (
                <>
                  {selectedUserLive && selectedUserLive.usuario_id !== myId && (
                    <div className="border-b border-white/10 bg-[#0a0a0a] px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar className="h-9 w-9 shrink-0">
                            {selectedUserLive.avatar_url ? (
                              <AvatarImage
                                src={selectedUserLive.avatar_url}
                                alt={selectedUserLive.usuario_nome}
                              />
                            ) : (
                              <AvatarFallback className="bg-[#2699fe] text-xs text-white">
                                {getInitials(selectedUserLive.usuario_nome)}
                              </AvatarFallback>
                            )}
                          </Avatar>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {selectedUserLive.usuario_nome}
                            </p>

                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: selectedStatusColor }}
                              />
                              <span className="text-xs text-white/50">
                                {selectedStatusLabel}
                              </span>
                            </div>

                            {selectedUserLive.status_message && (
                              <p className="mt-0.5 max-w-[220px] truncate text-[11px] italic text-white/35">
                                “{selectedUserLive.status_message}”
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Phone className="h-4 w-4 text-white/50" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Video className="h-4 w-4 text-white/50" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4 text-white/50" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <ScrollArea className="flex-1 bg-[#0a0a0a] px-4 py-4">
                    {!hasConversationSelected ? (
                      <div className="flex h-full min-h-[300px] w-full items-center justify-center">
                        <div className="px-6 text-center">
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#151515]">
                            <MessageCircle className="h-7 w-7 text-white/70" />
                          </div>

                          <p className="font-medium text-white">
                            Selecione um usuário para conversar
                          </p>

                          <p className="mt-1 text-xs text-white/45">
                            O status manual é respeitado e a presença mostra
                            quem está no site.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 pb-2">
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

                  {typingForUI.length > 0 && hasConversationSelected && (
                    <TypingIndicator users={typingForUI as any} />
                  )}

                  {replyingTo && hasConversationSelected && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-t border-white/10 bg-[#111111] px-4 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="h-10 w-1 rounded bg-[#2699fe]" />

                          <div className="min-w-0">
                            <p className="text-xs text-white/45">
                              Respondendo a{" "}
                              {(replyingTo as any).remetente_nome}
                            </p>

                            <p className="truncate text-sm text-white">
                              {(replyingTo as any).mensagem}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(null)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4 text-white/70" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  <div
                    className="border-t border-white/10 bg-[#0a0a0a] px-4 pt-3"
                    style={{
                      paddingBottom:
                        "calc(0.75rem + env(safe-area-inset-bottom))",
                    }}
                  >
                    <div className="flex items-end gap-2">
                      <div className="relative flex-1">
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
                          placeholder={
                            hasConversationSelected
                              ? "Digite sua mensagem..."
                              : "Selecione um usuário..."
                          }
                          className="h-12 rounded-2xl border-white/10 bg-[#151515] pr-24 text-white placeholder:text-white/40 disabled:opacity-60"
                        />

                        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                              if (!hasConversationSelected) return;

                              const file = e.target.files?.[0];
                              if (!file) return;

                              await handleFileSelect(file);
                              e.target.value = "";
                            }}
                          />

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={!hasConversationSelected}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Paperclip className="h-4 w-4 text-white/50" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={!hasConversationSelected}
                            onClick={() => setShowEmojiPicker((s) => !s)}
                          >
                            <Smile className="h-4 w-4 text-white/50" />
                          </Button>
                        </div>
                      </div>

                      <motion.button
                        whileTap={{ scale: hasConversationSelected ? 0.94 : 1 }}
                        onClick={handleSend}
                        disabled={!hasConversationSelected || !newMessage.trim()}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2699fe] shadow-lg shadow-[#2699fe]/25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="h-5 w-5 text-white" />
                      </motion.button>
                    </div>

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
                </>
              )}

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
              className={`fixed ${chatPosition} ${chatWidth} hidden flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-2xl z-50 md:flex`}
              style={{ boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)" }}
            >
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
                    <h3 className="font-bold text-white">{selectedTitle}</h3>
                    <p className="text-xs text-white/80">
                      {onlineCount} online
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {showSearch ? (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 200, opacity: 1 }}
                      className="relative"
                    >
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
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4 text-white" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-white" />
                    )}
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
                      <div className="w-24 bg-[#0a0a0a] border-r border-white/10 p-3 overflow-y-auto">
                        <p className="text-xs text-gray-500 font-semibold mb-3 uppercase">
                          Equipe
                        </p>

                        <div className="space-y-3">
                          {usersOrdered.map((u, idx) => {
                            const isMe = u.usuario_id === myId;
                            const effStatus = getEffectiveStatus(u);
                            const hasDot =
                              (unreadByUser[u.usuario_id] ?? 0) > 0;

                            return (
                              <motion.button
                                key={u.usuario_id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                onClick={() => selectUser(u)}
                                disabled={isMe}
                                whileHover={{ scale: isMe ? 1 : 1.05 }}
                                whileTap={{ scale: isMe ? 1 : 0.95 }}
                                className={[
                                  "relative group w-12 h-12 flex items-center justify-center rounded-full",
                                  isMe ? "opacity-90 cursor-not-allowed" : "",
                                ].join(" ")}
                                title={
                                  isMe
                                    ? `Você · ${getStatusText(effStatus)}`
                                    : `${u.usuario_nome} · ${getStatusText(
                                        effStatus
                                      )}`
                                }
                              >
                                <Avatar className="w-12 h-12 rounded-full">
                                  {u.avatar_url ? (
                                    <AvatarImage
                                      className="rounded-full"
                                      src={u.avatar_url}
                                      alt={u.usuario_nome}
                                    />
                                  ) : (
                                    <AvatarFallback className="rounded-full bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] text-white font-bold text-xs">
                                      {getInitials(u.usuario_nome)}
                                    </AvatarFallback>
                                  )}
                                </Avatar>

                                {!isMe && hasDot && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0a0a0a]" />
                                )}

                                <div
                                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0a0a0a]"
                                  style={{
                                    backgroundColor: getStatusColor(effStatus),
                                  }}
                                />

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

                      <div className="flex-1 flex flex-col">
                        {selectedUserLive &&
                          selectedUserLive.usuario_id !== myId && (
                            <div className="p-3 border-b border-white/10 bg-[#0a0a0a]/50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-8 h-8">
                                    {selectedUserLive.avatar_url ? (
                                      <AvatarImage
                                        src={selectedUserLive.avatar_url}
                                        alt={selectedUserLive.usuario_nome}
                                      />
                                    ) : (
                                      <AvatarFallback className="bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] text-white text-xs">
                                        {getInitials(
                                          selectedUserLive.usuario_nome
                                        )}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>

                                  <div>
                                    <p className="text-sm font-medium text-white">
                                      {selectedUserLive.usuario_nome}
                                    </p>

                                    <div className="flex items-center gap-1.5">
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                          backgroundColor: selectedStatusColor,
                                        }}
                                      />

                                      <span className="text-xs text-gray-400">
                                        {selectedStatusLabel}
                                      </span>
                                    </div>

                                    {selectedUserLive.status_message && (
                                      <p className="mt-0.5 max-w-[220px] truncate text-[11px] italic text-gray-500">
                                        “{selectedUserLive.status_message}”
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Phone className="w-4 h-4 text-gray-400" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Video className="w-4 h-4 text-gray-400" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreVertical className="w-4 h-4 text-gray-400" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                        <ScrollArea className="flex-1 p-4">
                          {!hasConversationSelected ? (
                            <div className="h-full w-full flex items-center justify-center">
                              <div className="text-center">
                                <p className="text-white font-medium">
                                  Selecione um usuário para conversar
                                </p>

                                <p className="text-xs text-gray-400 mt-1">
                                  O status manual é respeitado e a presença
                                  mostra quem está no site.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {filteredMessages.map((msg, idx) => (
                                <MessageItem
                                  key={(msg as any).id ?? `${idx}`}
                                  message={msg as any}
                                  currentUser={
                                    { id: myId, full_name: myName } as any
                                  }
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

                        {typingForUI.length > 0 && hasConversationSelected && (
                          <TypingIndicator users={typingForUI as any} />
                        )}

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
                                  <p className="text-xs text-gray-400">
                                    Respondendo a{" "}
                                    {(replyingTo as any).remetente_nome}
                                  </p>

                                  <p className="text-sm text-white truncate max-w-xs">
                                    {(replyingTo as any).mensagem}
                                  </p>
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(null)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        )}

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
                                placeholder={
                                  hasConversationSelected
                                    ? "Digite sua mensagem..."
                                    : "Selecione um usuário..."
                                }
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
                              whileHover={{
                                scale: hasConversationSelected ? 1.05 : 1,
                              }}
                              whileTap={{
                                scale: hasConversationSelected ? 0.95 : 1,
                              }}
                              onClick={handleSend}
                              disabled={
                                !hasConversationSelected || !newMessage.trim()
                              }
                              className="h-11 w-11 bg-gradient-to-r from-[#2699fe] to-[#1a7dd9] rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#2699fe]/30"
                            >
                              <Send className="w-5 h-5 text-white" />
                            </motion.button>
                          </div>

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
          </>
        )}
      </AnimatePresence>
    </>
  );
}