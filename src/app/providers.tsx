"use client";

import { ThemeProvider } from "next-themes";
import { ProfileProvider } from "@/context/ProfileContext";
import { I18nextProvider } from "react-i18next";
import i18n from "@/local/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </I18nextProvider>
    </ProfileProvider>
  );
}
