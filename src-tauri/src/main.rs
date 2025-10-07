// Evita abrir uma janela de console no Windows em modo release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    dls_ecommerce_lib::run();
}
