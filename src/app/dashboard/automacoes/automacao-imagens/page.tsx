"use client";

import { Suspense } from "react";
import AtualizarImagensBlingTray from "@/components/automacao/imagens/AtualizarImagensBlingTray";
import { LoadingBar } from "@/components/ui/loading-bar";

export default function AtualizarImagensBlingTrayPage() {
  return (
    <>
      {/* 🔹 Barra de carregamento global */}
      <LoadingBar />

      {/* 🔹 Suspense protege hooks client (useRouter, useSearchParams, etc.) */}
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-white"></div>
        }
      >
        <div className="relative flex min-h-screen items-center justify-center">
          <AtualizarImagensBlingTray />
        </div>
      </Suspense>
    </>
  );
}