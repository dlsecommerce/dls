/** @type {import('next').NextConfig} */
const nextConfig = {
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

    // DESATIVA LightningCSS do Next completamente
    optimizeCss: false,
  }
};

module.exports = nextConfig;
