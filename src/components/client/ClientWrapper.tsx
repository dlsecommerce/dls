"use client";

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  // ✅ Wrapper puro — sem lógica de sessão ou redirecionamento
  return <>{children}</>;
}
