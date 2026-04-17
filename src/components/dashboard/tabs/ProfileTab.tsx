"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CheckCircle2, Loader, X, Check } from "lucide-react";
import Image from "next/image";
import { useProfile } from "@/context/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { GlassmorphicCard } from "@/components/ui/glassmorphic-card";

export default function ProfileTab() {
  const { profile, updateProfile, refreshProfile } = useProfile();

  const [name, setName] = useState(profile?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 🔹 Atualiza o estado local quando o perfil muda (sem sobrescrever enquanto digita)
  useEffect(() => {
    if (!profile) {
      refreshProfile();
      return;
    }

    if (!isEditingName) {
      setName(profile.name ?? "");
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  const initials =
    name?.trim() !== ""
      ? name
          .split(" ")
          .filter(Boolean)
          .map((n) => n[0]?.toUpperCase())
          .join("")
      : "?";

  const handleUploadClick = () => fileInputRef.current?.click();

  // 🔹 Mostra preview antes do upload
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setShowModal(true);
  }, []);

  // 🔹 Envia imagem ao confirmar no modal
  const handleConfirmUpload = useCallback(async () => {
    if (!previewUrl || !profile || !fileInputRef.current?.files?.[0]) return;
    const file = fileInputRef.current.files[0];

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${profile.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Falha ao obter URL pública do avatar.");

      await updateProfile({ avatar_url: publicUrl });
      setAvatarUrl(publicUrl);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error("Erro ao enviar avatar:", err.message);
    } finally {
      setUploading(false);
      setShowModal(false);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [previewUrl, profile, updateProfile]);

  const handleCancelUpload = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setShowModal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 🔹 Salvar nome do perfil
  const handleSave = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      await updateProfile({ name });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setIsEditingName(false);
    } catch (err: any) {
      console.error("Erro ao salvar perfil:", err.message);
    } finally {
      setSaving(false);
    }
  };

  // 🔹 Quando digita no campo de nome, ativa o modo de edição
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsEditingName(true);
    setName(e.target.value);
  };

  return (
    <>
      <form onSubmit={handleSave} className="space-y-8">
        {/* === Avatar e Nome === */}
        <GlassmorphicCard className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-pink-600 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="w-24 h-24 object-cover rounded-full"
                    unoptimized
                    onError={() => setAvatarUrl(null)}
                  />
                ) : (
                  <span className="text-white text-[28px] font-normal">{initials}</span>
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              {!uploading && (
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="absolute inset-0 w-24 h-24 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Alterar avatar"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
              )}

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex-1">
              <h3 className="text-foreground text-[20px] font-normal">{name}</h3>
              <p className="text-muted-foreground text-[14px]">{profile?.email}</p>
            </div>
          </div>
        </GlassmorphicCard>

        {/* === Campos Editáveis === */}
        <GlassmorphicCard className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[14px] font-medium text-foreground">Nome</label>
            <input
              className="flex w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-2 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-[#2699fe]"
              value={name}
              onChange={handleNameChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[14px] font-medium text-foreground">E-mail</label>
            <input
              type="email"
              value={profile?.email ?? ""}
              disabled
              className="flex w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-2 text-[14px] text-neutral-400 cursor-not-allowed"
            />
          </div>
        </GlassmorphicCard>

        {/* === Botão Salvar === */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#2699fe] text-white px-6 py-2 text-sm font-medium transition-colors cursor-pointer hover:bg-[#1a86e4] disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
              </span>
            ) : (
              "Salvar alterações"
            )}
          </button>
        </div>
      </form>

      {/* === Modal Preview === */}
      {showModal && previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <GlassmorphicCard className="w-[320px] p-6 text-center">
            <h2 className="text-white text-lg mb-4">Pré-visualização do avatar</h2>
            <Image
              src={previewUrl}
              alt="Prévia"
              width={150}
              height={150}
              className="rounded-full object-cover mx-auto mb-4"
            />
            <div className="flex justify-center gap-3">
              <button
                onClick={handleCancelUpload}
                className="flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-md text-sm"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploading}
                className="flex items-center gap-2 bg-[#2699fe] hover:bg-[#1a86e4] text-white px-4 py-2 rounded-md text-sm disabled:opacity-60"
              >
                {uploading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Salvar
                  </>
                )}
              </button>
            </div>
          </GlassmorphicCard>
        </div>
      )}

      {/* === Toast de sucesso === */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 bg-[#111111]/90 border border-white/10 rounded-lg shadow-lg px-4 py-3 text-sm text-white flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          Perfil atualizado com sucesso!
        </div>
      )}
    </>
  );
}
