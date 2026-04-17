"use client";

import { ThemeProvider } from "next-themes";
import { ProfileProvider } from "@/context/ProfileContext";
import { I18nextProvider } from "react-i18next";
import i18n from "@/local/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"           // aplica .light / .dark no <html>
      defaultTheme="dark"         // dark é o padrão
      enableSystem={true}         // respeita o sistema
      disableTransitionOnChange   // evita flickers
    >
      <I18nextProvider i18n={i18n}>
        <ProfileProvider>{children}</ProfileProvider>
      </I18nextProvider>
    </ThemeProvider>
  );
}
