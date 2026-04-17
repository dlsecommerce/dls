#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio};
use std::thread;
use std::env;

fn main() {
    let exe_dir = env::current_exe()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf();

    let node_path = exe_dir.join("bin/node/node.exe");
    let next_server_path = exe_dir.join("bin/next/server.js");

    thread::spawn(move || {
        println!("[Next SSR] Iniciando servidor interno...");

        let result = Command::new(node_path)
            .arg(next_server_path)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn();

        match result {
            Ok(_) => println!("[Next SSR] Servidor iniciado."),
            Err(err) => println!("[Next SSR] Falha ao iniciar servidor: {}", err),
        }
    });

    dls_ecommerce_lib::run();
}
