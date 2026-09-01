"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProfileProvider } from "@/context/ProfileContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,        // 30s — dados considerados "frescos"
            gcTime: 5 * 60 * 1000,       // 5min — tempo em cache antes de descartar
            retry: 1,                     // retry único em caso de falha de rede
            refetchOnWindowFocus: false,  // evita refetch ao trocar de aba
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={true}
        disableTransitionOnChange
      >
        <ProfileProvider>{children}</ProfileProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
