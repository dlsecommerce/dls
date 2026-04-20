"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Notification = {
  id: number;
  title: string;
  message: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  link: string | null;
  created_at: string;
};

type NotificationRead = {
  notification_id: number;
  user_id: string;
};

type NotificationHidden = {
  notification_id: number;
  user_id: string;
};

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<number[]>([]);
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const [closingIds, setClosingIds] = useState<number[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const visibleNotifications = useMemo(() => {
    return notifications.filter((n) => !hiddenIds.includes(n.id));
  }, [notifications, hiddenIds]);

  const unreadCount = useMemo(() => {
    if (isInitializing) return 0;
    return visibleNotifications.filter((n) => !readIds.includes(n.id)).length;
  }, [visibleNotifications, readIds, isInitializing]);

  useEffect(() => {
    let notificationsChannel: ReturnType<typeof supabase.channel> | null = null;
    let readsChannel: ReturnType<typeof supabase.channel> | null = null;
    let hiddenChannel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      try {
        setIsInitializing(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsInitializing(false);
          return;
        }

        setUserId(user.id);

        const [notificationsResponse, readsResponse, hiddenResponse] =
          await Promise.all([
            supabase
              .from("notifications")
              .select("*")
              .order("created_at", { ascending: false }),

            supabase
              .from("notification_reads")
              .select("notification_id,user_id")
              .eq("user_id", user.id),

            supabase
              .from("notification_hidden")
              .select("notification_id,user_id")
              .eq("user_id", user.id),
          ]);

        if (notificationsResponse.error) {
          console.error(
            "Erro ao carregar notificações:",
            notificationsResponse.error
          );
        } else {
          setNotifications(notificationsResponse.data ?? []);
        }

        if (readsResponse.error) {
          console.error("Erro ao carregar leituras:", readsResponse.error);
        } else {
          setReadIds(
            (readsResponse.data ?? []).map(
              (r: NotificationRead) => r.notification_id
            )
          );
        }

        if (hiddenResponse.error) {
          console.error(
            "Erro ao carregar notificações ocultas:",
            hiddenResponse.error
          );
        } else {
          setHiddenIds(
            (hiddenResponse.data ?? []).map(
              (h: NotificationHidden) => h.notification_id
            )
          );
        }

        notificationsChannel = supabase
          .channel("notifications-global")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
            },
            (payload) => {
              setNotifications((prev) => [payload.new as Notification, ...prev]);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: "notifications",
            },
            (payload) => {
              setNotifications((prev) =>
                prev.filter((n) => n.id !== payload.old.id)
              );
              setReadIds((prev) => prev.filter((id) => id !== payload.old.id));
              setHiddenIds((prev) => prev.filter((id) => id !== payload.old.id));
              setClosingIds((prev) => prev.filter((id) => id !== payload.old.id));
            }
          )
          .subscribe();

        readsChannel = supabase
          .channel("notification-reads-user")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notification_reads",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const newRead = payload.new as NotificationRead;
              setReadIds((prev) =>
                prev.includes(newRead.notification_id)
                  ? prev
                  : [...prev, newRead.notification_id]
              );
            }
          )
          .subscribe();

        hiddenChannel = supabase
          .channel("notification-hidden-user")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notification_hidden",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const newHidden = payload.new as NotificationHidden;
              setHiddenIds((prev) =>
                prev.includes(newHidden.notification_id)
                  ? prev
                  : [...prev, newHidden.notification_id]
              );
              setClosingIds((prev) =>
                prev.filter((id) => id !== newHidden.notification_id)
              );
            }
          )
          .subscribe();
      } finally {
        setIsInitializing(false);
      }
    };

    init();

    return () => {
      if (notificationsChannel) supabase.removeChannel(notificationsChannel);
      if (readsChannel) supabase.removeChannel(readsChannel);
      if (hiddenChannel) supabase.removeChannel(hiddenChannel);
    };
  }, []);

  const markOneAsRead = async (notificationId: number) => {
    if (!userId || readIds.includes(notificationId)) return;

    const { error } = await supabase.from("notification_reads").insert({
      notification_id: notificationId,
      user_id: userId,
    });

    if (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      return;
    }

    setReadIds((prev) =>
      prev.includes(notificationId) ? prev : [...prev, notificationId]
    );
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    const unreadNotifications = visibleNotifications.filter(
      (n) => !readIds.includes(n.id)
    );

    if (unreadNotifications.length === 0) return;

    const payload = unreadNotifications.map((n) => ({
      notification_id: n.id,
      user_id: userId,
    }));

    const { error } = await supabase
      .from("notification_reads")
      .insert(payload);

    if (error) {
      console.error("Erro ao marcar todas como lidas:", error);
      return;
    }

    setReadIds((prev) => [...prev, ...unreadNotifications.map((n) => n.id)]);
  };

  const hideNotification = async (
    e: React.MouseEvent<HTMLButtonElement>,
    notificationId: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) return;
    if (hiddenIds.includes(notificationId)) return;
    if (closingIds.includes(notificationId)) return;

    setClosingIds((prev) => [...prev, notificationId]);

    const previousHiddenIds = hiddenIds;

    setHiddenIds((prev) =>
      prev.includes(notificationId) ? prev : [...prev, notificationId]
    );

    const { error } = await supabase.from("notification_hidden").insert({
      notification_id: notificationId,
      user_id: userId,
    });

    if (error) {
      console.error("Erro ao ocultar notificação:", error);
      setHiddenIds(previousHiddenIds);
    }

    setClosingIds((prev) => prev.filter((id) => id !== notificationId));
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const getActorDisplayName = (notification: Notification) => {
    if (notification.actor_name && notification.actor_name.trim()) {
      return notification.actor_name;
    }

    return "Usuário";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative cursor-pointer rounded-md p-2 transition-all text-dashboard-text-muted hover:text-dashboard-text-primary hover:bg-white/5"
        >
          <Bell className="w-5 h-5" />

          {!isInitializing && unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 z-50 flex h-5 w-5 items-center justify-center bg-red-500 p-0 text-xs text-white">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="center"
        side="bottom"
        sideOffset={10}
        collisionPadding={12}
        className="z-50 w-[min(340px,calc(100vw-24px))] border-0 bg-transparent p-0 shadow-none sm:w-80"
      >
        <GlassmorphicCard className="max-h-96 overflow-hidden rounded-lg border border-white/10 bg-[#111111]/80 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-white sm:text-base">
              Notificações
            </h3>

            {!isInitializing && unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="cursor-pointer text-right text-[11px] font-medium text-[#2799fe] hover:underline sm:text-sm"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {isInitializing ? (
              <div className="p-4 text-center text-sm text-neutral-400">
                Carregando notificações...
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-400">
                Nenhuma notificação
              </div>
            ) : (
              visibleNotifications.map((n) => {
                const isRead = readIds.includes(n.id);
                const actorDisplayName = getActorDisplayName(n);

                const content = (
                  <>
                    <h4 className="text-sm font-medium text-white break-words">
                      {n.title}
                    </h4>

                    <p className="mt-1 text-[11px] font-medium text-[#2799fe] break-words">
                      {actorDisplayName}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-neutral-400 break-words">
                      {n.message}
                    </p>

                    <p className="mt-1 text-[10px] text-neutral-500">
                      {formatDate(n.created_at)}
                    </p>
                  </>
                );

                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 border-b border-white/10 p-3 transition-colors sm:p-4 ${
                      !isRead ? "bg-white/[0.03]" : ""
                    } hover:bg-white/5`}
                  >
                    <div
                      className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${
                        isRead ? "bg-neutral-500" : "bg-blue-500"
                      }`}
                    />

                    <div className="min-w-0 flex-1 pr-1">
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => markOneAsRead(n.id)}
                          className="block cursor-pointer"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div
                          onClick={() => markOneAsRead(n.id)}
                          className="cursor-pointer"
                        >
                          {content}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => hideNotification(e, n.id)}
                      disabled={closingIds.includes(n.id)}
                      className="mt-0.5 flex-shrink-0 cursor-pointer rounded p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      title="Ocultar notificação"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </GlassmorphicCard>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}