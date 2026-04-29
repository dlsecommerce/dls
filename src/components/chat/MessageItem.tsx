import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  MoreVertical, Reply, Edit, Trash2, Copy
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export default function MessageItem({
  message,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  delay
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.mensagem);
  const [showReactions, setShowReactions] = useState(false);

  const isMine = message.remetente_id === currentUser?.id;

  const getInitials = (name) => {
    return name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "??";
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.mensagem);
  };

  const handleEditSave = () => {
    if (editedText.trim() && editedText !== message.mensagem) {
      onEdit(message.id, editedText);
    }
    setIsEditing(false);
  };

  const reactions = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`flex ${isMine ? "justify-end" : "justify-start"} gap-2 px-2`}
    >
      {!isMine && (
        <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
          <AvatarFallback className="bg-gray-700 text-white text-[10px]">
            {getInitials(message.remetente_nome)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col relative`}>
        {!isMine && (
          <span className="text-[10px] sm:text-xs text-neutral-400 mb-1">
            {message.remetente_nome}
          </span>
        )}

        {/* BOLHA */}
        <div
          onClick={() => setShowReactions(prev => !prev)}
          className={`relative rounded-2xl px-3 py-2 sm:px-4 sm:py-2 ${
            isMine
              ? "bg-gradient-to-r from-[#2699fe] to-[#1a7dd9] text-white"
              : "bg-white/5 text-white"
          }`}
        >
          {isEditing ? (
            <>
              <input
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="bg-transparent text-white text-sm outline-none w-full"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleEditSave} className="h-6 text-xs">
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-6 text-xs">
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              {message.tipo === "imagem" ? (
                <img
                  src={message.mensagem}
                  alt="Imagem"
                  className="max-w-full rounded-lg"
                />
              ) : message.tipo === "arquivo" ? (
                <a
                  href={message.mensagem}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline"
                >
                  📎 Abrir arquivo
                </a>
              ) : (
                <p className="text-sm break-words">{message.mensagem}</p>
              )}
            </>
          )}

          {/* REACTIONS MOBILE */}
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-white/10 rounded-full px-2 py-1 flex gap-1 shadow-lg z-50"
            >
              {reactions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReaction(message.id, emoji);
                    setShowReactions(false);
                  }}
                  className="text-base p-1 active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] sm:text-[10px] text-neutral-500">
            {format(new Date(message.created_date), "HH:mm")}
          </span>

          {isMine && message.lida && (
            <span className="text-[9px] text-blue-400">✓✓</span>
          )}

          {/* MENU SEM HOVER */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <MoreVertical className="w-4 h-4 text-neutral-400" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="bg-[#1a1a1a] border-white/10">
              <DropdownMenuItem onClick={() => onReply(message)}>
                <Reply className="w-4 h-4 mr-2" />
                Responder
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </DropdownMenuItem>

              {isMine && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => onDelete(message.id)}
                    className="text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Deletar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isMine && (
        <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
          <AvatarFallback className="bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] text-white text-[10px]">
            {getInitials(currentUser?.full_name || "")}
          </AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
}