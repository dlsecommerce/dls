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
  // ✅ Correto no Next.js 15 — precisa ser await
  const cookieStore = await cookies();

  // ✅ Criação correta do Supabase Server Client
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => cookieStore.getAll(),
        setAll: async (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              // ✅ Agora chamando cookies() novamente (mutável)
              (await cookies()).set(name, value, options);
            }
          } catch (error) {
            console.error("Erro ao definir cookies Supabase:", error);
          }
        },
      },
    }
  );

  // ✅ Recupera o usuário autenticado no servidor
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
