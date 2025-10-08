import React, { useState } from "react";
import { motion } from "framer-motion";
import { MoreVertical, Reply, Edit, Trash2, Copy, ThumbsUp, Heart, Smile } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export default function MessageItem({ message, currentUser, onReply, onEdit, onDelete, onReaction, delay }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.mensagem);
  const [showReactions, setShowReactions] = useState(false);

  const isMine = message.remetente_id === currentUser?.id;

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "??";
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

  const reactions = [
    { emoji: "👍", label: "Like" },
    { emoji: "❤️", label: "Love" },
    { emoji: "😂", label: "Haha" },
    { emoji: "😮", label: "Wow" },
    { emoji: "😢", label: "Sad" },
    { emoji: "🔥", label: "Fire" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2 group`}
    >
      {!isMine && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-gray-700 text-white text-xs">
            {getInitials(message.remetente_nome)}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col relative`}>
        {!isMine && (
          <span className="text-xs text-gray-400 mb-1">{message.remetente_nome}</span>
        )}
        
        <div className="relative">
          {isEditing ? (
            <div className={`rounded-2xl px-4 py-2 ${isMine ? 'bg-gradient-to-r from-[#2699fe] to-[#1a7dd9]' : 'bg-white/5'}`}>
              <input
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleEditSave();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
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
            </div>
          ) : (
            <>
              <div className={`rounded-2xl px-4 py-2 ${
                isMine 
                  ? 'bg-gradient-to-r from-[#2699fe] to-[#1a7dd9] text-white' 
                  : 'bg-white/5 text-white'
              }`}>
                {message.tipo === "imagem" ? (
                  <img 
                    src={message.mensagem} 
                    alt="Imagem" 
                    className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(message.mensagem, '_blank')}
                  />
                ) : message.tipo === "arquivo" ? (
                  <a 
                    href={message.mensagem} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:underline"
                  >
                    <span className="text-sm">📎 Arquivo anexado</span>
                  </a>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">{message.mensagem}</p>
                )}
              </div>

              {/* Reactions Bar */}
              <div className="absolute -bottom-3 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-[#1a1a1a] border border-white/10 rounded-full px-2 py-1 flex gap-1 shadow-lg">
                  {reactions.map((reaction) => (
                    <motion.button
                      key={reaction.emoji}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onReaction(message.id, reaction.emoji)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
                      title={reaction.label}
                    >
                      <span className="text-sm">{reaction.emoji}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-gray-500">
            {format(new Date(message.created_date), 'HH:mm')}
          </span>
          
          {isMine && message.lida && (
            <span className="text-[10px] text-blue-400">✓✓</span>
          )}

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-3 h-3 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a1a1a] border-white/10">
              <DropdownMenuItem onClick={() => onReply(message)} className="cursor-pointer">
                <Reply className="w-4 h-4 mr-2" />
                Responder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </DropdownMenuItem>
              {isMine && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)} className="cursor-pointer">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(message.id)} 
                    className="cursor-pointer text-red-400"
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
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] text-white text-xs">
            {getInitials(currentUser?.full_name || "")}
          </AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
}