"use client";

import { useInitialRedirect } from "@/hooks/useInitialRedirect";

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  useInitialRedirect(); // ✅ ativa a lógica automática de redirecionamento
  return <>{children}</>;
}
