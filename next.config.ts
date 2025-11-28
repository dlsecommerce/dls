import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },

  typescript: { ignoreBuildErrors: true },

  reactStrictMode: false,

  transpilePackages: [
    "@tauri-apps/api",
    "@supabase/auth-helpers-nextjs",
  ],

  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  }
};

export default nextConfig;
