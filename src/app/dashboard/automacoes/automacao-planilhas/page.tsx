"use client";

import { Suspense } from "react";
import PlanilhaModelo from "@/components/automacao/modelo/Templatespreadsheet";
import { LoadingBar } from "@/components/ui/loading-bar";

export default function PlanilhaModeloPage() {
  return (
    <>
      {/* 🔹 Barra de carregamento global */}
      <LoadingBar />

      {/* 🔹 Suspense protege hooks client (useRouter, useSearchParams, etc.) */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white"></div>}>
        <div className="relative min-h-screen flex items-center justify-center">
          <PlanilhaModelo />
        </div>
      </Suspense>
    </>
  );
}
