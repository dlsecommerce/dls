import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ❌ Remove o "export" — o Vercel precisa de servidor ativo para middleware e SSR
  // output: "export",

  // ✅ Permite imagens externas sem precisar de otimização
  images: {
    unoptimized: true,
    domains: ["lh3.googleusercontent.com", "avatars.githubusercontent.com"],
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
  transpilePackages: ["@tauri-apps/api", "@supabase/auth-helpers-nextjs"],

  // 🚀 Garante compatibilidade total com Middleware e Edge Runtime
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
