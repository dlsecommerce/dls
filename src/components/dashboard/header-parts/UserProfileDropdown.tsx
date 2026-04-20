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
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useProfile } from "@/context/ProfileContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseChatService } from "@/services/supabaseChatService";

const statusOptions = [
  { key: "disponivel", label: "Disponível", color: "bg-green-500" },
  { key: "ausente", label: "Ausente", color: "bg-yellow-500" },
  { key: "ocupado", label: "Ocupado", color: "bg-red-500" },
  { key: "invisivel", label: "Invisível", color: "bg-neutral-500" },
];

export function UserProfileDropdown() {
  const { profile, loading, refreshProfile, setStatus, setStatusMessage } =
    useProfile();
  const router = useRouter();
  const [editMessage, setEditMessage] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    if (profile?.status_message) setMessage(profile.status_message);
  }, [profile]);

  useEffect(() => {
    if (profile?.id && profile?.status && profile?.name) {
      supabaseChatService.upsertStatus(profile.id, profile.name, profile.status);
    }
  }, [profile?.id, profile?.status, profile?.name]);

  useEffect(() => {
    if (!loading && !profile) refreshProfile();
  }, [loading, profile, refreshProfile]);

  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full bg-neutral-800 animate-pulse" />
    );
  }

  if (!profile) {
    return (
      <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400 text-sm">
        ?
      </div>
    );
  }

  const avatarUrl =
    profile.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profile.name || "Usuário"
    )}&background=1a1a1a&color=ffffff&size=128`;

  const handleSaveMessage = async () => {
    setSaving(true);
    try {
      await setStatusMessage(message);
    } finally {
      setSaving(false);
      setEditMessage(false);
    }
  };

  const handleChangeStatus = async (nextStatus: string) => {
    if (!profile?.id) return;
    if (profile.status === nextStatus) return;

    setChangingStatus(true);
    try {
      await setStatus(nextStatus);

      await supabaseChatService.upsertStatus(
        profile.id,
        profile.name || "Usuário",
        nextStatus as any
      );

      setMenuOpen(false);
    } catch (e) {
      console.error("[status] erro ao alterar status:", e);
    } finally {
      setChangingStatus(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (err) {
      console.error("Erro ao sair:", err);
      router.replace("/dashboard");
    }
  };

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative w-10 h-10 rounded-full p-0 bg-neutral-800 overflow-visible cursor-pointer
                     before:absolute before:inset-0 before:rounded-full before:transition-all before:duration-300 
                     before:ring-0 hover:before:ring-4 hover:before:ring-white/10"
        >
          <Image
            src={avatarUrl}
            alt="avatar"
            width={40}
            height={40}
            className="rounded-full object-cover"
            unoptimized
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  profile.name || "Usuário"
                )}&background=1a1a1a&color=ffffff&size=128`;
            }}
          />
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
        className="w-[calc(100vw-24px)] max-w-72 border-0 bg-transparent p-0 shadow-none sm:w-72"
      >
        <GlassmorphicCard className="rounded-xl p-2">
          <div className="relative flex items-center gap-3 border-b border-white/10 px-3 py-2">
            <div className="relative flex-shrink-0">
              <Image
                src={avatarUrl}
                alt="avatar"
                width={40}
                height={40}
                className="rounded-full object-cover"
                unoptimized
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      profile.name || "Usuário"
                    )}&background=1a1a1a&color=ffffff&size=128`;
                }}
              />
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
            </div>

            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm text-white">{profile.name}</span>
              <span className="truncate text-xs text-neutral-400">
                {profile.email}
              </span>
              {profile.status_message && !editMessage && (
                <span className="line-clamp-1 text-[11px] italic text-neutral-500">
                  “{profile.status_message}”
                </span>
              )}
            </div>
          </div>

          <DropdownMenuItem
            disabled
            className="mt-2 text-[11px] uppercase text-neutral-400"
          >
            Status
          </DropdownMenuItem>

          {statusOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.key}
              onClick={() => handleChangeStatus(opt.key)}
              disabled={changingStatus}
              className="flex items-center justify-between cursor-pointer rounded-md hover:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${opt.color}`} />
                <span>{opt.label}</span>
              </div>
              {profile.status === opt.key && (
                <Check className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))}

          {!editMessage ? (
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              onClick={() => setEditMessage(true)}
              className="mt-1 flex items-center gap-2 rounded-md cursor-pointer hover:bg-white/5"
            >
              <MessageSquare className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <span>Definir mensagem de status</span>
            </DropdownMenuItem>
          ) : (
            <div className="mt-2 flex flex-col gap-2 rounded-md border border-white/10 bg-[#1a1a1a] p-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                maxLength={120}
                className="w-full h-20 rounded-md border border-white/10 bg-[#111] p-2 text-sm text-white resize-none focus:ring-2 focus:ring-[#2699fe]"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
                <button
                  onClick={() => setEditMessage(false)}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-300 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Cancelar
                </button>
                <button
                  onClick={handleSaveMessage}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs text-[#2699fe] hover:text-[#58b1ff] cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          )}

          <DropdownMenuSeparator className="my-2 bg-white/10" />

          <DropdownMenuItem
            onClick={() => router.push("/dashboard/configuracao?tab=perfil")}
            className="cursor-pointer hover:bg-white/5"
          >
            <User className="w-4 h-4 mr-2 flex-shrink-0" /> Perfil
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/dashboard/configuracao")}
            className="cursor-pointer hover:bg-white/5"
          >
            <Settings className="w-4 h-4 mr-2 flex-shrink-0" /> Configurações
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-2 bg-white/10" />

          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-red-500 hover:bg-red-500/10 cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2 flex-shrink-0" /> Sair
          </DropdownMenuItem>
        </GlassmorphicCard>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}