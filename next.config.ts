import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // 🚨 ATENÇÃO: Isso permite fazer deploy mesmo com erros de tipagem
    ignoreBuildErrors: true,
  },
  eslint: {
    // (opcional) também ignora erros de ESLint no deploy
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
