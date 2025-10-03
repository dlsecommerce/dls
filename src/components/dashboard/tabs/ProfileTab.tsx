"use client";

import React from "react";
import { Camera, User } from "lucide-react";
import Image from "next/image";

type ProfileTabProps = {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  fullName: string;
  setFirstName: React.Dispatch<React.SetStateAction<string>>;
  setLastName: React.Dispatch<React.SetStateAction<string>>;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string | null>>;
  onSave: (e: React.SyntheticEvent) => Promise<void>;
  onClickUpload: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  initials: string;
};

export default function ProfileTab({
  firstName,
  lastName,
  email,
  avatarUrl,
  setFirstName,
  setLastName,
  setAvatarUrl,
  onSave,
  onClickUpload,
  fileInputRef,
  onFileChange,
  initials,
}: ProfileTabProps) {
  return (
    <form onSubmit={onSave} className="space-y-8">
      {/* Card: Avatar */}
      <div className="bg-[#111111] border border-white/10 rounded-[20px] p-6 space-y-6">
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
                <span className="text-white text-[28px] font-normal">
                  {initials}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClickUpload}
              className="absolute inset-0 w-24 h-24 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={onFileChange}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            <h3 className="text-foreground text-[20px] font-normal">
              {firstName} {lastName}
            </h3>
            <p className="text-muted-foreground text-[14px]">{email}</p>
          </div>
        </div>
      </div>

      {/* Card: Informações pessoais */}
      <div className="bg-[#111111] border border-white/10 rounded-[20px] p-6 space-y-6">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="text-[16px] font-medium text-foreground">Informações pessoais</h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              Gerencie suas informações básicas de perfil
            </p>
          </div>
        </div>

        <div className="space-y-6 ps-0 sm:ps-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[14px] font-medium text-foreground">Nome</label>
              <input
                className="flex w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-2 text-[14px] text-foreground"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-medium text-foreground">Sobrenome</label>
              <input
                className="flex w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-2 text-[14px] text-foreground"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[14px] font-medium text-foreground">E-mail</label>
            <input
              type="email"
              className="flex w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-2 text-[14px] text-foreground"
              value={email}
              disabled
            />
          </div>
        </div>
      </div>

      {/* Botão salvar */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="rounded-md bg-[#2699fe] text-white px-6 py-2 text-sm font-medium transition-colors cursor-pointer hover:bg-[#1a86e4]"
        >
          Salvar alterações
        </button>
      </div>
    </form>
  );
}
