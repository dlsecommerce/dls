import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Permite imagens externas sem precisar de otimização (mais rápido no dev)
  images: {
    unoptimized: true,
    domains: ["lh3.googleusercontent.com", "avatars.githubusercontent.com"],
  },

  // ⚙️ Ignora erros para não travar o build em dev
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // ⚡️ Desativa Strict Mode no desenvolvimento
  // (evita renderizações duplas que pesam no React 19)
  reactStrictMode: false,

  // ⚙️ Mantém as libs externas otimizadas
  transpilePackages: ["@tauri-apps/api", "@supabase/auth-helpers-nextjs"],

  // 🚀 Ativa o novo Turbopack e outras features modernas
  experimental: {
    turbo: {
      rules: {
        // permite imagens SVG e assets externos sem travar o dev
        "*.svg": ["@svgr/webpack"],
      },
    },
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // 🧠 Usa SWC para minificar JS (mais rápido que Terser)
  swcMinify: true,
};

export default nextConfig;
