"use client";

let audio: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio() {
  if (!audio) {
    audio = new Audio("/sounds/success.mp3");
    audio.preload = "auto";
  }
  return audio;
}

/**
 * ✅ Chamar APENAS em um gesto do usuário (click/tap)
 * Não emite som audível (volume 0).
 */
export async function unlockAudio() {
  try {
    if (unlocked) return;

    const a = getAudio();
    a.volume = 0;
    a.currentTime = 0;

    // tenta tocar mudo só pra "liberar"
    await a.play();
    a.pause();
    a.currentTime = 0;

    unlocked = true;
  } catch {
    // se falhar, tudo bem; pode tentar de novo em outro gesto
  }
}

/**
 * ✅ Som real — chame SOMENTE quando terminar com sucesso.
 */
export function playImportSuccessSound(volume = 0.4) {
  try {
    const a = getAudio();
    a.pause();
    a.currentTime = 0;
    a.volume = volume;
    void a.play();
  } catch {
    // ignora
  }
}
