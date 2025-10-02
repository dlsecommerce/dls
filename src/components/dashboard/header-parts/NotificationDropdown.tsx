"use client";

import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Notification {
  id: number;
  type: "payment" | "spending" | "security";
  color: string;
}

export function NotificationDropdown() {
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, type: "payment", color: "bg-green-500" },
    { id: 2, type: "spending", color: "bg-yellow-500" },
    { id: 3, type: "security", color: "bg-red-500" },
  ]);

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications([]);
  };

  // função auxiliar para pegar textos de acordo com tipo
  const getNotificationTexts = (type: Notification["type"]) => {
    switch (type) {
      case "payment":
        return {
          title: t("notifications.payment_received"),
          message: t("notifications.payment_message"),
          time: t("notifications.time_recent"),
        };
      case "spending":
        return {
          title: t("notifications.spending_alert"),
          message: t("notifications.spending_message"),
          time: t("notifications.time_hour"),
        };
      case "security":
        return {
          title: t("notifications.security_alert"),
          message: t("notifications.security_message"),
          time: t("notifications.time_day"),
        };
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative cursor-pointer rounded-md p-2 transition-all 
                     text-dashboard-text-muted hover:text-dashboard-text-primary 
                     hover:bg-white/5"
        >
          <Bell className="w-5 h-5" />
          {notifications.length > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              {notifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 sm:w-80 bg-[#111111]/80 backdrop-blur-xl 
                   border border-white/10 rounded-lg shadow-lg 
                   z-50 max-h-96 overflow-hidden"
      >
        <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm sm:text-base">
            {t("notifications.title")}
          </h3>
          {notifications.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs sm:text-sm font-medium text-[#2799fe] hover:underline hover:text-[#2799fe] cursor-pointer"
            >
              {t("notifications.mark_all")}
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">
              {t("notifications.empty")}
            </div>
          ) : (
            notifications.map((n) => {
              const texts = getNotificationTexts(n.type);
              return (
                <div
                  key={n.id}
                  className="p-3 sm:p-4 border-b border-white/10 hover:bg-white/5 transition-colors flex items-start gap-3"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 ${n.color}`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white text-sm">
                      {texts.title}
                    </h4>
                    <p className="text-gray-400 text-xs mt-1">{texts.message}</p>
                    <p className="text-gray-500 text-[10px] mt-1">{texts.time}</p>
                  </div>
                  <button
                    onClick={() => removeNotification(n.id)}
                    className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    title={t("notifications.remove")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
