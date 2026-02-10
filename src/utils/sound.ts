"use client";

let cached: HTMLAudioElement | null = null;

export function playImportSuccessSound(volume = 0.4) {
  try {
    if (!cached) {
      cached = new Audio("/sounds/success.mp3");
      cached.preload = "auto";
    }

    cached.pause(); // garante reset limpo
    cached.currentTime = 0;
    cached.volume = volume;

    cached.play().catch(() => {
      // autoplay bloqueado / navegador não permitiu
    });
  } catch {
    // ignora
  }
}
