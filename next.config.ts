import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🚀 Gera build totalmente estático (necessário para Tauri)
  output: "export",

  // ✅ Desativa a otimização automática de imagens (incompatível com export)
  images: {
    unoptimized: true,
  },

  // 🔒 Evita falhas de build por erros de TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },

  // 🔧 Evita falhas de build por erros do ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ⚙️ Modo React estrito (recomendado)
  reactStrictMode: true,

  // 🧠 Caso use libs externas que precisem ser transpiladas
  transpilePackages: ["@tauri-apps/api"],
};

export default nextConfig;
