import React from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { MiniUser, UiStatus, UnreadByUser } from "./types";
import { getInitials, getStatusColor } from "./utils";

interface UsersSidebarProps {
  usersOrdered: MiniUser[];
  myId: string;
  onlineIds: Set<string>;
  unreadByUser: UnreadByUser;
  getEffectiveStatus: (u: MiniUser) => UiStatus;
  onSelectUser: (u: MiniUser) => Promise<void> | void;
}

export default function UsersSidebar({
  usersOrdered,
  myId,
  onlineIds,
  unreadByUser,
  getEffectiveStatus,
  onSelectUser,
}: UsersSidebarProps) {
  return (
    <div className="w-24 bg-[#0a0a0a] border-r border-white/10 p-3 overflow-y-auto">
      <p className="text-xs text-gray-500 font-semibold mb-3 uppercase">
        Equipe
      </p>

      <div className="space-y-3">
        {usersOrdered.map((u, idx) => {
          const isMe = u.usuario_id === myId;
          const effStatus = getEffectiveStatus(u);
          const hasDot = (unreadByUser[u.usuario_id] ?? 0) > 0;

          return (
            <motion.button
              key={u.usuario_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => {
                if (isMe) return;
                onSelectUser(u);
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

              {/* ✅ pontinho vermelho (mensagem nova desse usuário) */}
              {!isMe && hasDot && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0a0a0a]" />
              )}

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
  );
}
