import React from "react";
import { motion } from "framer-motion";
import { Bell, Volume2, Moon, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";

export default function ChatSettings({
  notificationsEnabled,
  setNotificationsEnabled,
  soundEnabled,
  setSoundEnabled,
  onClose,
}) {
  return (
    <>
      {/* Mobile */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a0a] px-4 py-5 md:hidden">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="mb-5 text-lg font-bold text-white">
            Configurações do Chat
          </h3>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Bell className="h-5 w-5 shrink-0 text-[#2699fe]" />
                  <div className="min-w-0">
                    <p className="font-medium text-white">Notificações</p>
                    <p className="text-xs text-neutral-400">
                      Receber notificações de novas mensagens
                    </p>
                  </div>
                </div>

                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Volume2 className="h-5 w-5 shrink-0 text-[#2699fe]" />
                  <div className="min-w-0">
                    <p className="font-medium text-white">Sons</p>
                    <p className="text-xs text-neutral-400">
                      Reproduzir som ao receber mensagens
                    </p>
                  </div>
                </div>

                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Moon className="h-5 w-5 shrink-0 text-[#2699fe]" />
                  <div className="min-w-0">
                    <p className="font-medium text-white">Tema Escuro</p>
                    <p className="text-xs text-neutral-400">Sempre ativo</p>
                  </div>
                </div>

                <Switch checked={true} disabled />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <Button
                variant="outline"
                className="h-11 w-full justify-start rounded-xl border-white/10 bg-[#0a0a0a] text-white hover:bg-[#111111]"
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar Conversas
              </Button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#151515] p-4">
              <Button
                variant="outline"
                className="h-11 w-full justify-start rounded-xl border-red-500/30 bg-[#0a0a0a] text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Histórico
              </Button>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="mt-6 h-12 w-full rounded-2xl bg-[#2699fe] text-white hover:bg-[#1a7dd9]"
          >
            Voltar ao Chat
          </Button>
        </motion.div>
      </div>

      {/* Desktop - intacto */}
      <div className="hidden flex-1 overflow-y-auto p-6 md:block">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-xl font-bold text-white mb-6">
            Configurações do Chat
          </h3>

          <div className="space-y-4">
            <GlassmorphicCard className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-[#2699fe]" />
                  <div>
                    <p className="font-medium text-white">Notificações</p>
                    <p className="text-xs text-neutral-400">
                      Receber notificações de novas mensagens
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
            </GlassmorphicCard>

            <GlassmorphicCard className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-[#2699fe]" />
                  <div>
                    <p className="font-medium text-white">Sons</p>
                    <p className="text-xs text-neutral-400">
                      Reproduzir som ao receber mensagens
                    </p>
                  </div>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
            </GlassmorphicCard>

            <GlassmorphicCard className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-[#2699fe]" />
                  <div>
                    <p className="font-medium text-white">Tema Escuro</p>
                    <p className="text-xs text-neutral-400">Sempre ativo</p>
                  </div>
                </div>
                <Switch checked={true} disabled />
              </div>
            </GlassmorphicCard>

            <GlassmorphicCard className="p-4">
              <Button
                variant="outline"
                className="w-full justify-start border-white/10 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Conversas
              </Button>
            </GlassmorphicCard>

            <GlassmorphicCard className="p-4">
              <Button
                variant="outline"
                className="w-full justify-start border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Histórico
              </Button>
            </GlassmorphicCard>
          </div>

          <Button
            onClick={onClose}
            className="w-full mt-6 bg-gradient-to-r from-[#2699fe] to-[#1a7dd9] hover:from-[#1a7dd9] hover:to-[#2699fe]"
          >
            Voltar ao Chat
          </Button>
        </motion.div>
      </div>
    </>
  );
}