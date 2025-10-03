"use client";

import { User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function UserProfileDropdown() {
  const { profile } = useAuth();
  const router = useRouter();

  if (!profile) return null;

  const displayName = profile.first_name || profile.last_name
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : profile.name || profile.email;

  const avatarUrl = profile.avatar_url;
  const initials = getInitials(displayName);

  const handleLogout = async () => {
    // Você pode limpar contexto ou usar o supabase.auth.signOut()
    // caso queira reforçar a saída
    // Aqui só redireciona para login/página inicial
    router.push("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 rounded-md transition-all cursor-pointer hover:bg-white/5"
        >
          {/* Avatar */}
          <div className="relative w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-primary/20 flex items-center justify-center">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={32}
                height={32}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <span className="text-xs font-medium text-foreground">
                {initials}
              </span>
            )}
          </div>

          {/* Nome */}
          <span className="hidden sm:block text-[var(--color-text-primary)] text-sm">
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg"
      >
        <DropdownMenuItem
          onClick={() => router.push("/dashboard/configuracao?tab=perfil")}
          className="cursor-pointer hover:bg-white/5 transition"
        >
          <User className="w-4 h-4 mr-2" /> Perfil
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => router.push("/dashboard/configuracao")}
          className="cursor-pointer hover:bg-white/5 transition"
        >
          <Settings className="w-4 h-4 mr-2" /> Configurações
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => router.push("/login")}
          className="cursor-pointer text-red-500 hover:bg-red-500/10 hover:text-red-400 transition"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
