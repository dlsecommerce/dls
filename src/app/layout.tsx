import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import { ClientWrapper } from "@/components/client/ClientWrapper";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/integrations/supabase/types";
import SupabaseProvider from "@/components/provider/SupabaseProvider";

// 🔹 Importa o ThemeProvider do next-themes
import { ThemeProvider } from "next-themes";

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
    { media: "(prefers-color-scheme: light)", color: "#f3f3f3" },
    { media: "(prefers-color-scheme: dark)", color: "#090909" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => cookieStore.getAll(),
        setAll: async (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              (await cookies()).set(name, value, options);
            }
          } catch (error) {
            console.error("Erro ao definir cookies Supabase:", error);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      {/* ⚡ ThemeProvider controla o modo claro/escuro via classe no <body> */}
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"        // aplica 'light' ou 'dark' no body
          defaultTheme="dark"      // 🌑 modo escuro padrão
          enableSystem={false}     // desativa sincronização com o sistema
          disableTransitionOnChange={false} // mantém transição suave
          value={{
            light: "light",        // força classe body.light
            dark: "dark",          // força classe body.dark
          }}
        >
          <Providers>
            <SupabaseProvider initialUser={user}>
              <main className="relative z-10 text-foreground min-h-screen">
                <ClientWrapper>{children}</ClientWrapper>
              </main>
            </SupabaseProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
