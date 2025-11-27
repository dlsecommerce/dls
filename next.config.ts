import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },

  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  reactStrictMode: false,

  transpilePackages: [
    "@tauri-apps/api",
    "@supabase/auth-helpers-nextjs",
  ],

  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },

  swcMinify: true,

  // ❗ Remove output: "export"
  // ✔ Tauri funciona com standalone
  output: "standalone",
};

export default nextConfig;
