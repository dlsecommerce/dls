"use client";

let cached: HTMLAudioElement | null = null;
let warmedUp = false;

function getAudio() {
  if (!cached) {
    const audio = new Audio("/sounds/success.wav");
    audio.preload = "auto";

    // logs opcionais (pode remover depois que estiver OK)
    audio.addEventListener("error", () => {
      const err = audio.error;
      console.error("[AUDIO] erro ao carregar/tocar", {
        code: err?.code,
        src: audio.src,
      });
    });

    cached = audio;
  }
  return cached;
}

/**
 * Chame isso no clique do botão "Confirmar" (antes do await pesado)
 * para evitar bloqueio do navegador.
 */
export async function warmupImportSound() {
  try {
    const audio = getAudio();
    audio.volume = 0;         // toca mudo só pra desbloquear
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    warmedUp = true;
  } catch {
    // alguns browsers não deixam mesmo — ok ignorar
  }
}

/**
 * Chame isso quando a importação FINALIZAR com sucesso
 */
export function playImportSuccessSound(volume = 0.4) {
  try {
    const audio = getAudio();

    audio.pause();           // reset limpo
    audio.currentTime = 0;
    audio.volume = volume;

    // se não deu warmup, tenta tocar mesmo assim
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        // autoplay bloqueado / falha silenciosa
      });
    }
  } catch {
    // ignora qualquer erro
  }
}
