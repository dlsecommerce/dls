"use client";

import { ThemeProvider } from "next-themes";
import { ProfileProvider } from "@/context/ProfileContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"           // aplica .light / .dark no <html>
      defaultTheme="dark"         // dark é o padrão
      enableSystem={true}         // respeita o sistema
      disableTransitionOnChange   // evita flickers
    >
      <ProfileProvider>{children}</ProfileProvider>
    </ThemeProvider>
  );
}
