import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import { ClientWrapper } from "@/components/client/ClientWrapper";

import SupabaseProvider from "@/components/provider/SupabaseProvider";
import { ThemeProvider } from "next-themes";

// ✅ agora é client
import { ClientToaster } from "@/components/client/ClientToaster";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
          value={{ light: "light", dark: "dark" }}
        >
          <Providers>
            <SupabaseProvider>
              <main className="relative z-10 text-foreground min-h-screen">
                <ClientWrapper>{children}</ClientWrapper>
              </main>

              {/* ✅ Toaster agora monta no client */}
              <ClientToaster />
            </SupabaseProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
