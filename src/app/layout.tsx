import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import { ClientWrapper } from "@/components/client/ClientWrapper";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/integrations/supabase/types";
import SupabaseProvider from "@/components/provider/SupabaseProvider";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pikotshop.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "DLS Ecommerce",
  description: "Aplicativo de E-commerce",
  authors: [{ name: "DLS" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: [{ url: "/favicon.png" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "DLS Ecommerce",
    description: "Aplicativo de E-commerce",
    type: "website",
    url: "/",
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090909" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ Agora com await
  const cookieStore = await cookies();

  // ✅ Novo client com suporte oficial a Next 15
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => cookieStore.getAll(),
        setAll: async (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            cookieStore.set(name, value);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser(); // ✅ agora validado com servidor

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <SupabaseProvider initialUser={user}>
            <main className="relative z-10 text-foreground">
              <ClientWrapper>{children}</ClientWrapper>
            </main>
          </SupabaseProvider>
        </Providers>
      </body>
    </html>
  );
}
