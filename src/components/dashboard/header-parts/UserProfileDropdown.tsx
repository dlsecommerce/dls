"use client";

import { User, Settings, LogOut, Check } from "lucide-react";
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
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ProfileStatus = "disponivel" | "ausente" | "ocupado" | "invisivel";

const statusOptions: Array<{
  key: ProfileStatus;
  label: string;
  dotClass: string;
}> = [
  {
    key: "disponivel",
    label: "Disponível",
    dotClass: "bg-green-500",
  },
  {
    key: "ausente",
    label: "Ausente",
    dotClass: "bg-yellow-500",
  },
  {
    key: "ocupado",
    label: "Ocupado",
    dotClass: "bg-red-500",
  },
  {
    key: "invisivel",
    label: "Invisível",
    dotClass: "bg-neutral-500",
  },
];

const normalizeStatus = (status?: string | null): ProfileStatus => {
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

const getStatusOption = (status?: string | null) => {
  const normalized = normalizeStatus(status);

  return (
    statusOptions.find((item) => item.key === normalized) ?? statusOptions[0]
  );
};

export function UserProfileDropdown() {
  const { profile, loading, refreshProfile } = useProfile();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [localStatus, setLocalStatus] =
    useState<ProfileStatus>("disponivel");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentStatus = useMemo(() => {
    return normalizeStatus(profile?.status ?? localStatus);
  }, [profile?.status, localStatus]);

  const currentStatusOption = useMemo(() => {
    return getStatusOption(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    if (profile?.status) {
      setLocalStatus(normalizeStatus(profile.status));
    }
  }, [profile?.status]);

  useEffect(() => {
    if (!loading && !profile) {
      refreshProfile();
    }
  }, [loading, profile, refreshProfile]);

  useEffect(() => {
    if (!profile?.id) return;

    const touchPresence = async () => {
      try {
        await (supabase as any).rpc("touch_my_profile_presence");
      } catch {
        // Não bloqueia a interface.
      }
    };

    touchPresence();

    const interval = window.setInterval(() => {
      touchPresence();
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-800" />
    );
  }

  if (!profile) {
    return (
      <button
        type="button"
        onClick={() => refreshProfile()}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-700 text-sm text-neutral-400"
        title="Atualizar perfil"
      >
        ?
      </button>
    );
  }

  const avatarUrl =
    profile.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profile.name || "Usuário"
    )}&background=1a1a1a&color=ffffff&size=128`;

  const saveStatusWithRpc = async (nextStatus: ProfileStatus) => {
    const { error } = await (supabase as any).rpc("set_my_profile_status", {
      p_status: nextStatus,
      p_status_message: null,
    });

    if (error) {
      throw error;
    }
  };

  const saveStatusDirectly = async (nextStatus: ProfileStatus) => {
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    const userId = authData.user?.id;

    if (!userId) {
      throw new Error("Usuário autenticado não encontrado.");
    }

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        status: nextStatus,
        status_message: null,
      })
      .eq("id", userId);

    if (error) {
      throw error;
    }
  };

  const handleChangeStatus = async (nextStatus: ProfileStatus) => {
    if (currentStatus === nextStatus) {
      setMenuOpen(false);
      return;
    }

    const previousStatus = currentStatus;

    setChangingStatus(true);
    setErrorMessage(null);
    setLocalStatus(nextStatus);

    try {
      try {
        await saveStatusWithRpc(nextStatus);
      } catch {
        await saveStatusDirectly(nextStatus);
      }

      await refreshProfile();
      setMenuOpen(false);
    } catch (error: any) {
      setLocalStatus(previousStatus);

      const message =
        error?.message ||
        error?.details ||
        error?.hint ||
        "Não foi possível alterar o status.";

      setErrorMessage(message);
    } finally {
      setChangingStatus(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch {
      router.replace("/dashboard");
    }
  };

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 cursor-pointer overflow-visible rounded-full bg-neutral-800 p-0
                     before:absolute before:inset-0 before:rounded-full before:transition-all before:duration-300
                     before:ring-0 hover:before:ring-4 hover:before:ring-white/10"
          title={`Status: ${currentStatusOption.label}`}
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
            className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#111] ${currentStatusOption.dotClass}`}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[calc(100vw-24px)] max-w-72 border-0 bg-transparent p-0 shadow-none sm:w-72"
      >
        <GlassmorphicCard className="rounded-xl p-2">
          <div className="relative flex items-center gap-3 border-b border-white/10 px-3 py-3">
            <div className="relative flex-shrink-0">
              <Image
                src={avatarUrl}
                alt="avatar"
                width={44}
                height={44}
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
                className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#111] ${currentStatusOption.dotClass}`}
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-white">
                {profile.name || "Usuário"}
              </span>

              <span className="truncate text-xs text-neutral-400">
                {profile.email}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="mx-2 mt-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {errorMessage}
            </div>
          )}

          <DropdownMenuItem
            disabled
            className="mt-2 text-[11px] uppercase tracking-wide text-neutral-400"
          >
            Status
          </DropdownMenuItem>

          {statusOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.key}
              onClick={() => handleChangeStatus(opt.key)}
              disabled={changingStatus}
              className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 hover:bg-white/5 focus:bg-white/5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-3 w-3 flex-shrink-0 rounded-full ${opt.dotClass}`}
                />

                <span className="text-sm text-white">{opt.label}</span>
              </div>

              {currentStatus === opt.key && (
                <Check className="h-4 w-4 flex-shrink-0 text-neutral-400" />
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="my-2 bg-white/10" />

          <DropdownMenuItem
            onClick={() => router.push("/dashboard/configuracao?tab=perfil")}
            className="cursor-pointer rounded-md hover:bg-white/5 focus:bg-white/5"
          >
            <User className="mr-2 h-4 w-4 flex-shrink-0" />
            Perfil
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/dashboard/configuracao")}
            className="cursor-pointer rounded-md hover:bg-white/5 focus:bg-white/5"
          >
            <Settings className="mr-2 h-4 w-4 flex-shrink-0" />
            Configurações
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-2 bg-white/10" />

          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer rounded-md text-red-500 hover:bg-red-500/10 focus:bg-red-500/10"
          >
            <LogOut className="mr-2 h-4 w-4 flex-shrink-0" />
            Sair
          </DropdownMenuItem>
        </GlassmorphicCard>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}