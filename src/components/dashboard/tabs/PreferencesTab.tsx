"use client";

import React from "react";
import { Globe, Settings, Moon } from "lucide-react";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card"; 

export default function PreferencesTab() {
  return (
    <div className="space-y-8">
      <h3 className="text-[20px] font-normal">Preferências</h3>

      {/* === Card: Idioma e Região === */}
      <GlassmorphicCard className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="text-[16px] font-medium text-foreground">
              Idioma e Região
            </h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              Configurações regionais e de idioma
            </p>
          </div>
        </div>

        <div className="space-y-4 ps-1">
          <div className="flex items-center justify-between py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <div>
                <h4 className="text-[14px] font-normal text-foreground">
                  Linguagem
                </h4>
                <p className="text-[12px] text-muted-foreground">
                  Escolha seu idioma preferido
                </p>
              </div>
            </div>
            <select className="border border-white/10 rounded-md px-3 py-1 text-sm bg-[#1a1a1a] text-white focus:outline-none cursor-pointer hover:border-[#2799fe] transition">
              <option>Português</option>
              <option>Inglês</option>
            </select>
          </div>
        </div>
      </GlassmorphicCard>

      {/* === Card: Preferências de Exibição === */}
      <GlassmorphicCard className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="text-[16px] font-medium text-foreground">
              Preferências de exibição
            </h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              Personalize sua interface
            </p>
          </div>
        </div>

        <div className="space-y-4 ps-1">
          {/* Dark mode */}
          <div className="flex items-center justify-between py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-muted-foreground" />
              <div>
                <h4 className="text-[14px] font-normal text-foreground">
                  Modo escuro
                </h4>
                <p className="text-[12px] text-muted-foreground">
                  Usar tema escuro
                </p>
              </div>
            </div>
            <button className="relative w-12 h-6 rounded-full transition-colors bg-primary cursor-pointer">
              <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm ms-6"></div>
            </button>
          </div>

          {/* Auto save */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <div>
                <h4 className="text-[14px] font-normal text-foreground">
                  Salvamento automático
                </h4>
                <p className="text-[12px] text-muted-foreground">
                  Salve seu trabalho automaticamente
                </p>
              </div>
            </div>
            <button className="relative w-12 h-6 rounded-full transition-colors bg-primary cursor-pointer">
              <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm ms-6"></div>
            </button>
          </div>
        </div>
      </GlassmorphicCard>
    </div>
  );
}
