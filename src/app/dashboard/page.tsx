"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export default function DashboardPage() {
  const { profile, loading, setStatus } = useAuth();
  const [open, setOpen] = useState(false);

  // Nome atualizado (name > email > fallback)
  const fullName =
    profile?.name || (loading ? "Carregando..." : profile?.email || "Usuário");

  const statusOptions = [
    {
      value: "online" as const,
      label: "Online",
      dot: "bg-green-500",
      text: "text-green-600",
      bg: "bg-green-500/10 border-green-500/20",
    },
    {
      value: "away" as const,
      label: "Ausente",
      dot: "bg-yellow-500",
      text: "text-yellow-600",
      bg: "bg-yellow-500/10 border-yellow-500/20",
    },
    {
      value: "offline" as const,
      label: "Offline",
      dot: "bg-gray-400",
      text: "text-gray-500",
      bg: "bg-gray-500/10 border-gray-500/20",
    },
  ];

  const currentStatus =
    statusOptions.find((s) => s.value === profile?.status) || statusOptions[0];

  const handleSelectStatus = async (value: "online" | "away" | "offline") => {
    await setStatus(value);
    setOpen(false);
  };

  return (
    <div className="space-y-1 p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <span className="text-[#2699fe]">{fullName}</span>

        {/* Status */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              disabled={loading}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition cursor-pointer",
                currentStatus.bg
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", currentStatus.dot)} />
              <span className={cn(currentStatus.text)}>
                {loading ? "Carregando..." : currentStatus.label}
              </span>
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-40 p-2 space-y-1 bg-gradient-to-b from-[#111111] to-[#0a0a0a] border border-white/10 rounded-xl shadow-lg"
            side="bottom"
            align="start"
          >
            {statusOptions.map((option) => {
              const isActive = option.value === currentStatus.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelectStatus(option.value)}
                  className={cn(
                    "flex items-center justify-between w-full px-2 py-1 rounded text-sm cursor-pointer transition",
                    "hover:bg-white/5",
                    isActive && "bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", option.dot)} />
                    <span className={cn(option.text)}>{option.label}</span>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-muted-foreground" />}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      </h1>

      <p className="text-neutral-400 text-xs">
        Bem-vindo de volta ao seu painel.
      </p>
    </div>
  );
}
