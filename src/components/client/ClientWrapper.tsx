"use client";

import React from "react";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  // 🔹 O hook roda aqui, em ambiente client
  useAuthRedirect();
  return <>{children}</>;
}
