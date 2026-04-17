#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 🔹 Adiciona o plugin de atualização automática
        .plugin(tauri_plugin_updater::Builder::new().build())

        // 🔹 Adiciona o plugin de diálogo (para perguntar se o usuário quer atualizar)
        .plugin(tauri_plugin_dialog::init())

        // 🔹 Adiciona o plugin de processo (para reiniciar o app após atualizar)
        .plugin(tauri_plugin_process::init())

        // 🔹 Roda o app normalmente
        .run(tauri::generate_context!())
        .expect("erro ao rodar o app");
}
