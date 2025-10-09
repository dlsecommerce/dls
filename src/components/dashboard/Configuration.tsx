"use client";

import React, { useRef, useState, useEffect } from "react";
import { LogOut, User, Shield, Bell, Sliders, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { logoutAction } from "@/app/actions/logout"; // ✅ mesmo padrão SSR

import ProfileTab from "./tabs/ProfileTab";
import SecurityTab from "./tabs/SecurityTab";
import NotificationsTab from "./tabs/NotificationsTab";
import PreferencesTab from "./tabs/PreferencesTab";
import FeedbacksTab from "./tabs/FeedbacksTab"; // 🆕 Nova aba importada

export default function Configuration() {
  const { profile, updateProfile } = useAuth();
  const [tab, setTab] = useState<
    "perfil" | "seguranca" | "notificacoes" | "preferencias" | "feedbacks"
  >("perfil");

  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [tempAvatarFile, setTempAvatarFile] = useState<File | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setEmail(profile.email ?? "");
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  const onClickUpload = () => fileInputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTempAvatarFile(file);
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSave = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let finalAvatarUrl = avatarUrl;

    if (tempAvatarFile) {
      const ext = tempAvatarFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, tempAvatarFile, { upsert: true });

      if (uploadError) {
        alert("Erro no upload da imagem.");
        return;
      }

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      finalAvatarUrl = publicData.publicUrl;
    }

    await updateProfile({
      name: name.trim() || null,
      avatar_url: finalAvatarUrl ?? null,
    });

    alert("Perfil atualizado com sucesso!");
    setTempAvatarFile(null);
  };

  const onChangePassword = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }
    if (newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      alert("Erro ao alterar senha: " + error.message);
    } else {
      alert("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    }
  };

  // ✅ Logout com segurança (SSR + client)
  const handleLogout = async () => {
    try {
      await logoutAction(); // limpa cookies no servidor e termina sessão
      router.replace("/"); // redireciona sem reload
    } catch (err) {
      console.error("Erro ao sair (SSR):", err);
      // fallback se houver erro no action SSR
      await supabase.auth.signOut();
      router.replace("/");
    }
  };

  const tabs = [
    { id: "perfil", label: "Perfil", icon: User },
    { id: "seguranca", label: "Segurança", icon: Shield },
    { id: "notificacoes", label: "Notificações", icon: Bell },
    { id: "preferencias", label: "Preferências", icon: Sliders },
    { id: "feedbacks", label: "Feedbacks", icon: MessageSquare },
  ];

  return (
    <div className="min-h-[100dvh] w-full text-white">
      <div className="w-full p-6 lg:p-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1 bg-[#111111] rounded-[20px] border border-white/10 p-6">
            <nav className="space-y-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    tab === id
                      ? "bg-[#2699fe]/10 text-[#2699fe] border-l-2 border-[#2699fe]"
                      : "text-neutral-400 hover:bg-white/5"
                  }`}
                  onClick={() => {
                    setTab(id as any);
                    router.push(`/dashboard/configuracao?tab=${id}`, {
                      scroll: false,
                    });
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[14px]">{label}</span>
                </button>
              ))}
            </nav>

            {/* 🔹 Botão de sair seguro */}
            <div className="mt-8 pt-8 border-t border-white/10 space-y-2">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                <span className="text-[14px]">Sair</span>
              </button>
            </div>
          </aside>

          {/* Conteúdo */}
          <section className="lg:col-span-3 bg-[#111111] rounded-[20px] border border-white/10 p-6">
            <AnimatePresence mode="wait">
              {tab === "perfil" && (
                <motion.div
                  key="perfil"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProfileTab
                    name={name}
                    email={email}
                    avatarUrl={avatarUrl}
                    setName={setName}
                    setAvatarUrl={setAvatarUrl}
                    onSave={onSave}
                    onClickUpload={onClickUpload}
                    fileInputRef={fileInputRef}
                    onFileChange={onFileChange}
                  />
                </motion.div>
              )}

              {tab === "seguranca" && (
                <motion.div
                  key="seguranca"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <SecurityTab
                    showPasswordForm={showPasswordForm}
                    setShowPasswordForm={setShowPasswordForm}
                    newPassword={newPassword}
                    setNewPassword={setNewPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    showNewPassword={showNewPassword}
                    setShowNewPassword={setShowNewPassword}
                    showConfirmPassword={showConfirmPassword}
                    setShowConfirmPassword={setShowConfirmPassword}
                    onChangePassword={onChangePassword}
                  />
                </motion.div>
              )}

              {tab === "notificacoes" && (
                <motion.div
                  key="notificacoes"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <NotificationsTab />
                </motion.div>
              )}

              {tab === "preferencias" && (
                <motion.div
                  key="preferencias"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <PreferencesTab />
                </motion.div>
              )}

              {tab === "feedbacks" && (
                <motion.div
                  key="feedbacks"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <FeedbacksTab />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </div>
  );
}
