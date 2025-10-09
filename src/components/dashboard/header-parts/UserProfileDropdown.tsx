"use client";

import {
  User,
  Settings,
  LogOut,
  MessageSquare,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StatusOption {
  key: string;
  label: string;
  color: string;
}

interface UserStatus {
  usuario_id: string;
  usuario_nome: string;
  status: string;
  ultima_atividade: string;
}

const statusOptions: StatusOption[] = [
  { key: "disponivel", label: "Disponível", color: "bg-green-500" },
  { key: "ausente", label: "Ausente", color: "bg-yellow-500" },
  { key: "ocupado", label: "Ocupado", color: "bg-red-500" },
  { key: "invisivel", label: "Invisível", color: "bg-neutral-500" },
];

export function UserProfileDropdown() {
  const { profile, loading, refreshProfile, setStatus, setStatusMessage } = useAuth();
  const router = useRouter();
  const [editMessage, setEditMessage] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<UserStatus[]>([]);

  useEffect(() => {
    if (profile?.status_message) setMessage(profile.status_message);
  }, [profile]);

  useEffect(() => {
    if (!loading && !profile) refreshProfile();
  }, [loading, profile]);

  // Escuta status dos usuários em tempo real
  useEffect(() => {
    const channel = supabase
      .channel("status_usuario_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "status_usuario" },
        (payload) => {
          if (payload.new) {
            setOnlineUsers((prev) => {
              const others = prev.filter((u) => u.usuario_id !== payload.new.usuario_id);
              return [...others, payload.new];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (status: string) => {
    if (!profile) return;
    await supabase.from("status_usuario").upsert({
      usuario_id: profile.id,
      usuario_nome: profile.name,
      status,
      ultima_atividade: new Date().toISOString(),
    });
    setStatus(status);
  };

  const handleSaveMessage = async () => {
    setSaving(true);
    try {
      await setStatusMessage(message);
    } finally {
      setSaving(false);
      setEditMessage(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } catch (err) {
      console.error("Erro ao sair:", err);
      router.replace("/");
    }
  };

  if (loading)
    return <div className="w-10 h-10 rounded-full bg-neutral-800 animate-pulse" />;

  if (!profile)
    return (
      <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400 text-sm">
        ?
      </div>
    );

  const avatar = profile.avatar_url;
  const initials =
    profile.name
      ?.split(" ")
      .map((n: string) => n[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "?";

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative w-10 h-10 rounded-full bg-neutral-800 p-0 cursor-pointer overflow-hidden"
        >
          {avatar ? (
            <Image
              src={avatar}
              alt="avatar"
              width={40}
              height={40}
              className="rounded-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-sm text-white">{initials}</span>
          )}
          <span
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#111] ${
              profile.status === "disponivel"
                ? "bg-green-500"
                : profile.status === "ausente"
                ? "bg-yellow-500"
                : profile.status === "ocupado"
                ? "bg-red-500"
                : "bg-neutral-500"
            }`}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72 bg-[#111]/90 border border-white/10 rounded-xl shadow-xl backdrop-blur-md p-2"
      >
        <div className="flex items-center gap-3 px-3 py-2 border-b border-white/10">
          <Image
            src={avatar || "/default-avatar.png"}
            alt="avatar"
            width={40}
            height={40}
            className="rounded-full object-cover"
            unoptimized
          />
          <div className="flex flex-col">
            <span className="text-white text-sm">{profile.name}</span>
            <span className="text-xs text-neutral-400">{profile.email}</span>
            {profile.status_message && !editMessage && (
              <span className="text-[11px] italic text-neutral-500 line-clamp-1">
                “{profile.status_message}”
              </span>
            )}
          </div>
        </div>

        <DropdownMenuItem disabled className="text-[11px] uppercase text-neutral-400 mt-2">
          Status
        </DropdownMenuItem>

        {statusOptions.map((opt) => (
          <DropdownMenuItem
            key={opt.key}
            onClick={() => updateStatus(opt.key)}
            className="flex items-center justify-between cursor-pointer hover:bg-white/5 rounded-md"
          >
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${opt.color}`} />
              <span>{opt.label}</span>
            </div>
            {profile.status === opt.key && <Check className="w-4 h-4 text-neutral-400" />}
          </DropdownMenuItem>
        ))}

        {!editMessage ? (
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            onClick={() => setEditMessage(true)}
            className="flex items-center gap-2 hover:bg-white/5 rounded-md cursor-pointer mt-1"
          >
            <MessageSquare className="w-4 h-4 text-neutral-400" />
            <span>Definir mensagem de status</span>
          </DropdownMenuItem>
        ) : (
          <div className="p-3 bg-[#1a1a1a] border border-white/10 rounded-md flex flex-col gap-2 mt-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              maxLength={120}
              className="w-full h-20 text-sm p-2 rounded-md bg-[#111] border border-white/10 text-white focus:ring-2 focus:ring-[#2699fe] resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditMessage(false)}
                className="text-xs text-neutral-400 flex items-center gap-1 hover:text-neutral-300"
              >
                <X className="w-3 h-3" /> Cancelar
              </button>
              <button
                onClick={handleSaveMessage}
                disabled={saving}
                className="text-xs text-[#2699fe] flex items-center gap-1 hover:text-[#58b1ff]"
              >
                <Check className="w-3 h-3" /> {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        )}

        <DropdownMenuSeparator className="my-2 bg-white/10" />

        <DropdownMenuItem
          onClick={() => router.push("/dashboard/configuracao?tab=perfil")}
          className="cursor-pointer hover:bg-white/5"
        >
          <User className="w-4 h-4 mr-2" /> Perfil
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => router.push("/dashboard/configuracao")}
          className="cursor-pointer hover:bg-white/5"
        >
          <Settings className="w-4 h-4 mr-2" /> Configurações
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 bg-white/10" />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-500 hover:bg-red-500/10 cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
