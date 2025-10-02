"use client";

import React from "react";
import { Bell, Mail, Smartphone } from "lucide-react";

export default function NotificationsTab() {
  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <h3 className="text-[20px] font-normal">Notificações</h3>

      {/* Card de preferências */}
      <div className="bg-[#111111] border border-white/10 rounded-[20px] p-6 space-y-6">
        {/* Header do card */}
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="text-[16px] font-medium text-foreground">
              Preferências de comunicação
            </h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              Controle como você recebe notificações
            </p>
          </div>
        </div>

        {/* Lista de opções */}
        <div className="space-y-4 ps-1">
          {/* Email */}
          <div className="flex items-center justify-between py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <h4 className="text-[14px] font-normal text-foreground">
                  Alertas por e-mail
                </h4>
                <p className="text-[12px] text-muted-foreground">
                  Receba alertas de transações por e-mail
                </p>
              </div>
            </div>
            <button className="relative w-12 h-6 rounded-full transition-colors bg-primary cursor-pointer">
              <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm ms-6"></div>
            </button>
          </div>

          {/* Push */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-muted-foreground" />
              <div>
                <h4 className="text-[14px] font-normal text-foreground">
                  Notificações push
                </h4>
                <p className="text-[12px] text-muted-foreground">
                  Receba atualizações instantâneas no seu dispositivo
                </p>
              </div>
            </div>
            <button className="relative w-12 h-6 rounded-full transition-colors bg-primary cursor-pointer">
              <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm ms-6"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
