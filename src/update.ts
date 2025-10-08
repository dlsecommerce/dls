import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask } from "@tauri-apps/plugin-dialog";

export async function verificarAtualizacao() {
  try {
    const update = await check();
    if (update?.available) {
      const confirmar = await ask(
        `Nova versão ${update.version} disponível!\n\n${update.body ?? "Deseja atualizar agora?"}`,
        { title: "Atualização disponível", kind: "info" }
      );
      if (confirmar) {
        await update.downloadAndInstall();
        await relaunch();
      }
    } else {
      console.log("✅ Nenhuma atualização disponível");
    }
  } catch (err) {
    console.error("Erro ao verificar atualização:", err);
  }
}
