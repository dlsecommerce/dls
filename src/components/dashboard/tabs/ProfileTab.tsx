"use client";

import React from "react";
import { Camera } from "lucide-react";
import Image from "next/image";

interface ProfileTabProps {
  name: string;
  email: string;
  avatarUrl: string | null;
  setName: (val: string) => void;
  setAvatarUrl: (val: string | null) => void;
  onSave: (e: React.SyntheticEvent) => void;
  onClickUpload: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ProfileTab({
  name,
  email,
  avatarUrl,
  setName,
  setAvatarUrl,
  onSave,
  onClickUpload,
  fileInputRef,
  onFileChange,
}: ProfileTabProps) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "";

  return (
    <form onSubmit={onSave} className="space-y-8">
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
            <h3 className="text-foreground text-[20px] font-normal">{name}</h3>
            <p className="text-muted-foreground text-[14px]">{email}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#111111] border border-white/10 rounded-[20px] p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-[14px] font-medium text-foreground">Nome</label>
          <input
            className="flex w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-2 text-[14px] text-foreground"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[14px] font-medium text-foreground">E-mail</label>
          <input
            type="email"
            value={email}
            disabled
            className="flex w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-2 text-[14px] text-neutral-400 cursor-not-allowed"
          />
        </div>
      </div>

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
