// 🔊 Toquezinho de confirmação (sem mp3)
const playDing = (freq = 1200 , durationMs = 80, volume = 0.03) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);

    osc.onended = () => ctx.close();
  } catch {
    // falhou? ignora, não quebra a UI
  }
};
