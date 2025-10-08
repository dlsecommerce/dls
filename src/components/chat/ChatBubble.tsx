import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Users, Minimize2, Maximize2, Phone, Video, MoreVertical, Paperclip, Smile, Search, Settings, Image, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import EmojiPicker from "@/components/chat/EmojiPicker";
import MessageItem from "@/components/chat/MessageItem";
import TypingIndicator from "@/components/chat/TypeIndicator";
import FileUploadArea from "@/components/chat/FileUploadArea";
import ChatSettings from "@/components/chat/ChatSettings";

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mensagens, setMensagens] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [digitando, setDigitando] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const loadUser = useCallback(async () => {
    try {
      const user = await User.me();
      setUsuarioAtual(user);
      requestNotificationPermission();
    } catch (error) {
      console.log("Usuário não logado");
    }
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = useCallback((title, body) => {
    if (!notificationsEnabled || isOpen) return;
    
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico"
      });
    }
  }, [notificationsEnabled, isOpen]);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSmH0fPTgjMGHm7A7+OZRQ0PVqvl8LJeGAg+ltryxnIsBS59zvLaizsIGGS57OihUBELTKXh8LhlHAU2kdXzzn0pBSh+zPLZjT0HHnK/7eObRw4OWKzl8LNeGAg+ltryxnIsBS59zvLaizsIGGS57OihUBELTKXh8LhlHAU2kdXzzn0pBSh+zPLZjT0HHnK/7eObRw4OWKzl8LNeGAg+ltryxnIsBS59zvLaizsIGGS57OihUBELTKXh8LhlHAU2kdXzzn0pBSh+zPLZjT0HHnK/7eObRw4OWKzl8LNeGAg+ltryxnIsBS59zvLaizsIGGS57OihUBELTKXh8LhlHAU2kdXzzn0pBSh+zPLZjT0HHnK/7eObRw4OWKzl8LNeGAg+ltryxnIsBS59zvLaizsIGGS57OihUBELTKXh8LhlHAU2kdXzzn0pBSh+zPLZjT0HHnK/7eObRw4OWKzl8A==');
    audio.play().catch(() => {});
  }, [soundEnabled]);

  const loadMensagens = useCallback(async () => {
    const msgs = await Mensagem.list("-created_date", 100);
    
    // Detectar novas mensagens
    const novasMensagens = msgs.filter(m => 
      !mensagens.find(old => old.id === m.id) && 
      m.remetente_id !== usuarioAtual?.id
    );
    
    if (novasMensagens.length > 0 && mensagens.length > 0) {
      novasMensagens.forEach(msg => {
        showNotification(msg.remetente_nome, msg.mensagem);
        playNotificationSound();
      });
    }
    
    setMensagens(msgs);
    
    const naoLidas = msgs.filter(m => 
      !m.lida && m.remetente_id !== usuarioAtual?.id
    ).length;
    setMensagensNaoLidas(naoLidas);
  }, [usuarioAtual, mensagens, showNotification, playNotificationSound]);

  const loadUsuarios = useCallback(async () => {
    const statusList = await StatusUsuario.list("-updated_date");
    setUsuarios(statusList);
  }, []);

  const updateUserStatus = useCallback(async (status) => {
    if (!usuarioAtual) return;
    
    try {
      const statusList = await StatusUsuario.list();
      const statusExistente = statusList.find(s => s.usuario_id === usuarioAtual.id);
      
      if (statusExistente) {
        await StatusUsuario.update(statusExistente.id, {
          status,
          ultima_atividade: new Date().toISOString()
        });
      } else {
        await StatusUsuario.create({
          usuario_id: usuarioAtual.id,
          usuario_nome: usuarioAtual.full_name,
          usuario_email: usuarioAtual.email,
          status,
          ultima_atividade: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  }, [usuarioAtual]);

  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
      const diff = Date.now() - parseInt(lastActivity);
      const minutes = diff / 1000 / 60;
      
      if (minutes > 5) {
        updateUserStatus("ausente");
      } else {
        updateUserStatus("online");
      }
    }
  }, [updateUserStatus]);

  const marcarComoLidas = useCallback(async () => {
    const naoLidas = mensagens.filter(m => 
      !m.lida && m.remetente_id !== usuarioAtual?.id
    );
    
    for (const msg of naoLidas) {
      await Mensagem.update(msg.id, { lida: true });
    }
    
    setMensagensNaoLidas(0);
  }, [mensagens, usuarioAtual]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!usuarioAtual) return;

    loadMensagens();
    loadUsuarios();
    updateUserStatus("online");
    
    const interval = setInterval(() => {
      loadMensagens();
      loadUsuarios();
      checkInactivity();
    }, 3000);

    return () => {
      clearInterval(interval);
      updateUserStatus("offline");
    };
  }, [usuarioAtual, loadMensagens, loadUsuarios, updateUserStatus, checkInactivity]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  useEffect(() => {
    if (isOpen) {
      marcarComoLidas();
    }
  }, [isOpen, marcarComoLidas]);

  const handleActivity = () => {
    localStorage.setItem('lastActivity', Date.now().toString());
    updateUserStatus("online");
  };

  const handleTyping = () => {
    handleActivity();
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing indicator
    }, 1000);
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !usuarioAtual) return;

    await Mensagem.create({
      remetente_id: usuarioAtual.id,
      remetente_nome: usuarioAtual.full_name,
      destinatario_id: usuarioSelecionado?.usuario_id || "",
      mensagem: novaMensagem,
      lida: false,
      tipo: "texto",
      reply_to: replyingTo?.id || null
    });

    setNovaMensagem("");
    setReplyingTo(null);
    handleActivity();
    loadMensagens();
  };

  const handleFileUpload = async (file) => {
    if (!usuarioAtual) return;
    
    setUploadingFile(true);
    try {
      const { file_url } = await UploadFile({ file });
      
      await Mensagem.create({
        remetente_id: usuarioAtual.id,
        remetente_nome: usuarioAtual.full_name,
        destinatario_id: usuarioSelecionado?.usuario_id || "",
        mensagem: file_url,
        lida: false,
        tipo: file.type.startsWith('image/') ? "imagem" : "arquivo"
      });
      
      loadMensagens();
    } catch (error) {
      console.error("Erro ao enviar arquivo:", error);
    }
    setUploadingFile(false);
  };

  const handleReaction = async (mensagemId, emoji) => {
    console.log("Reagir:", mensagemId, emoji);
  };

  const handleEdit = async (mensagemId, novoTexto) => {
    await Mensagem.update(mensagemId, { mensagem: novoTexto });
    loadMensagens();
  };

  const handleDelete = async (mensagemId) => {
    if (window.confirm("Deletar esta mensagem?")) {
      await Mensagem.delete(mensagemId);
      loadMensagens();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online": return "#10b981";
      case "ausente": return "#f59e0b";
      case "offline": return "#6b7280";
      default: return "#6b7280";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "online": return "Online";
      case "ausente": return "Ausente";
      case "offline": return "Offline";
      default: return "Offline";
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "??";
  };

  const mensagensFiltradas = searchTerm 
    ? mensagens.filter(m => m.mensagem.toLowerCase().includes(searchTerm.toLowerCase()))
    : mensagens;

  const chatWidth = isFullscreen ? "w-full h-full" : "w-96 max-h-[600px]";
  const chatPosition = isFullscreen ? "inset-0" : "bottom-6 right-6";

  return (
    <>
      {/* Chat Bubble Button */}
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
            style={{
              boxShadow: "0 8px 32px rgba(38, 153, 254, 0.4)"
            }}
          >
            <MessageCircle className="w-7 h-7 text-white" />
            
            {mensagensNaoLidas > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center"
              >
                <span className="text-white text-xs font-bold">{mensagensNaoLidas}</span>
              </motion.div>
            )}

            <motion.div
              className="absolute inset-0 rounded-full bg-[#2699fe]"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 60 : isFullscreen ? "100vh" : 600
            }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed ${chatPosition} ${chatWidth} bg-[#111111] rounded-2xl shadow-2xl border border-white/10 z-50 flex flex-col overflow-hidden`}
            style={{
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)"
            }}
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
                    style={{ backgroundColor: getStatusColor("online") }}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-white">Chat da Equipe</h3>
                  <p className="text-xs text-white/80">
                    {usuarios.filter(u => u.status === "online").length} online
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
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
                    onClick={() => setShowSearch(!showSearch)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Search className="w-4 h-4 text-white" />
                  </motion.button>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 text-white" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsFullscreen(!isFullscreen)}
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
                  onClick={() => setIsMinimized(!isMinimized)}
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
                        {usuarios.map((user, idx) => (
                          <motion.button
                            key={user.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => setUsuarioSelecionado(user)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`relative group w-full ${
                              usuarioSelecionado?.id === user.id ? 'ring-2 ring-[#2699fe]' : ''
                            } rounded-lg overflow-hidden`}
                          >
                            <Avatar className="w-12 h-12">
                              <AvatarFallback className="bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] text-white font-bold text-xs">
                                {getInitials(user.usuario_nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div 
                              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0a0a0a]"
                              style={{ backgroundColor: getStatusColor(user.status) }}
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[8px] text-white font-medium">
                                {user.usuario_nome.split(' ')[0]}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 flex flex-col">
                      {/* Selected User Info */}
                      {usuarioSelecionado && (
                        <div className="p-3 border-b border-white/10 bg-[#0a0a0a]/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-gradient-to-br from-[#2699fe] to-[#1a7dd9] text-white text-xs">
                                  {getInitials(usuarioSelecionado.usuario_nome)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-white">{usuarioSelecionado.usuario_nome}</p>
                                <div className="flex items-center gap-1.5">
                                  <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: getStatusColor(usuarioSelecionado.status) }}
                                  />
                                  <span className="text-xs text-gray-400">
                                    {getStatusText(usuarioSelecionado.status)}
                                  </span>
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
                          {mensagensFiltradas
                            .filter(m => !usuarioSelecionado || 
                              m.remetente_id === usuarioSelecionado.usuario_id || 
                              m.destinatario_id === usuarioSelecionado.usuario_id
                            )
                            .map((msg, idx) => (
                              <MessageItem
                                key={msg.id}
                                message={msg}
                                currentUser={usuarioAtual}
                                onReply={setReplyingTo}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onReaction={handleReaction}
                                delay={idx * 0.05}
                              />
                            ))}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>

                      {/* Typing indicator */}
                      {digitando.length > 0 && (
                        <TypingIndicator users={digitando} />
                      )}

                      {/* Reply Preview */}
                      {replyingTo && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="px-4 py-2 border-t border-white/10 bg-white/5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-10 bg-[#2699fe] rounded" />
                              <div>
                                <p className="text-xs text-gray-400">Respondendo a {replyingTo.remetente_nome}</p>
                                <p className="text-sm text-white truncate max-w-xs">{replyingTo.mensagem}</p>
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

                      {/* Input */}
                      <div className="p-4 border-t border-white/10 bg-[#0a0a0a]/50">
                        <div className="flex items-end gap-2">
                          <div className="flex-1 relative">
                            <Input
                              value={novaMensagem}
                              onChange={(e) => {
                                setNovaMensagem(e.target.value);
                                handleTyping();
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  enviarMensagem();
                                }
                                handleActivity();
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
                                  if (e.target.files?.[0]) {
                                    handleFileUpload(e.target.files[0]);
                                  }
                                }}
                              />
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile}
                              >
                                {uploadingFile ? (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  >
                                    <Paperclip className="w-4 h-4 text-gray-400" />
                                  </motion.div>
                                ) : (
                                  <Paperclip className="w-4 h-4 text-gray-400" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              >
                                <Smile className="w-4 h-4 text-gray-400" />
                              </Button>
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={enviarMensagem}
                            disabled={!novaMensagem.trim()}
                            className="h-11 w-11 bg-gradient-to-r from-[#2699fe] to-[#1a7dd9] rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#2699fe]/30"
                          >
                            <Send className="w-5 h-5 text-white" />
                          </motion.button>
                        </div>

                        {/* Emoji Picker */}
                        <AnimatePresence>
                          {showEmojiPicker && (
                            <EmojiPicker
                              onSelect={(emoji) => {
                                setNovaMensagem(novaMensagem + emoji);
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}