"use client";

import React from "react";
import { useInitialRedirect } from "@/hooks/useInitialRedirect";

/**
 * Componente cliente global:
 * - Redireciona automaticamente usuários logados para /dashboard
 * - Impede usuários não logados de acessarem /dashboard
 * - Mantém o comportamento profissional tipo YouTube/Spotify
 */
export function ClientWrapper({ children }: { children: React.ReactNode }) {
  useInitialRedirect();
  return <>{children}</>;
}
