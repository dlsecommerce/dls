"use client";

import React from "react";
import { Shield, Key, History, Eye, EyeOff } from "lucide-react";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";

interface SecurityTabProps {
  showPasswordForm: boolean;
  setShowPasswordForm: (show: boolean) => void;
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  showNewPassword: boolean;
  setShowNewPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  onChangePassword: (e: React.SyntheticEvent) => Promise<void>;
}

export default function SecurityTab({
  showPasswordForm,
  setShowPasswordForm,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  onChangePassword,
}: SecurityTabProps) {
  return (
    <div className="space-y-8">
      <h3 className="text-[20px] font-normal mb-6">Segurança</h3>

      {/* === Segurança da Conta === */}
      <GlassmorphicCard className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="text-[16px] font-medium text-foreground">Segurança da conta</h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              Gerencie as configurações de segurança da sua conta
            </p>
          </div>
        </div>

        {/* Alterar senha */}
        <div className="space-y-4 ps-0 sm:ps-8">
          <div className="flex items-center justify-between py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#1a1a1a] text-muted-foreground">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[14px] font-normal text-foreground">Alterar a senha</h4>
                <p className="text-[12px] text-muted-foreground">
                  Atualize sua senha regularmente para segurança
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all border border-white/10 bg-[#1a1a1a] text-foreground shadow-sm hover:bg-white/5 h-8 rounded-md gap-1.5 px-3 cursor-pointer"
            >
              {showPasswordForm ? "Cancelar" : "Mudar"}
            </button>
          </div>

          {/* Form de Alteração de Senha */}
          {showPasswordForm && (
            <form onSubmit={onChangePassword} className="space-y-4 pt-4 ps-0 sm:ps-8">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nova senha</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-2 text-sm pe-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition"
                    placeholder="Digite sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar senha</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-2 text-sm pe-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition"
                    placeholder="Confirme sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="submit"
                  className="bg-primary text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition cursor-pointer"
                >
                  Alterar senha
                </button>
              </div>
            </form>
          )}
        </div>
      </GlassmorphicCard>

      {/* === Histórico de Login === */}
      <GlassmorphicCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-muted-foreground" />
            <div>
              <h4 className="text-[14px] font-normal text-foreground">Histórico de login</h4>
              <p className="text-[12px] text-muted-foreground">Veja suas atividades recentes</p>
            </div>
          </div>
          <button className="border border-white/10 bg-[#1a1a1a] px-3 py-1 rounded-md text-sm hover:bg-white/5 transition cursor-pointer">
            Ver
          </button>
        </div>
      </GlassmorphicCard>
    </div>
  );
}
