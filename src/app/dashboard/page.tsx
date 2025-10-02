"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { profile, loading, setStatus } = useAuth();
  const [open, setOpen] = useState(false); // controla se o popover está aberto

  // Nome completo reflete alterações feitas no ProfileTab
  const fullName =
    (profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.first_name || profile?.last_name || profile?.name) ||
    (loading ? "Carregando..." : "Usuário");

  const statusOptions = [
    {
      value: "online",
      label: "Online",
      dot: "bg-green-500",
      text: "text-green-600",
      bg: "bg-green-500/10 border-green-500/20",
    },
    {
      value: "away",
      label: "Ausente",
      dot: "bg-yellow-500",
      text: "text-yellow-600",
      bg: "bg-yellow-500/10 border-yellow-500/20",
    },
    {
      value: "offline",
      label: "Offline",
      dot: "bg-gray-400",
      text: "text-gray-500",
      bg: "bg-gray-500/10 border-gray-500/20",
    },
  ];

  // Se não houver profile ainda, assume "online" por padrão
  const currentStatus =
    statusOptions.find((s) => s.value === profile?.status) || statusOptions[0];

  const handleSelectStatus = async (value: "online" | "away" | "offline") => {
    await setStatus(value);
    setOpen(false); // fecha o popover depois de clicar
  };

  return (
    <div className="space-y-1 p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        {/* Nome atualizado em tempo real */}
        <span className="text-[#2699fe]">{fullName}</span>

        {/* Popover de Status */}
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
              <span className={cn(currentStatus.text)}>{currentStatus.label}</span>
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-36 p-2 space-y-1 bg-gradient-to-b from-[#111111] to-[#0a0a0a] border border-white/10 rounded-xl shadow-lg"
            side="bottom"
            align="start"
          >
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelectStatus(option.value as "online" | "away" | "offline")}
                className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-white/5 transition text-sm cursor-pointer"
              >
                <span className={cn("w-2 h-2 rounded-full", option.dot)} />
                <span className={cn(option.text)}>{option.label}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </h1>

      <p className="text-neutral-400 text-xs">Bem-vindo de volta ao seu painel.</p>
    </div>
  );
}
