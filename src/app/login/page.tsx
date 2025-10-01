"use client";

import { Suspense } from "react";
import Login from "@/components/login/Login";
import { LoadingBar } from "@/components/ui/loading-bar";

export default function LoginPage() {
  return (
    <>
      {/* 🔹 Barra de carregamento global */}
      <LoadingBar />

      {/* 🔹 Suspense protege hooks client (useRouter, useSearchParams, etc.) */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white">Carregando...</div>}>
        <div className="relative min-h-screen flex items-center justify-center">
          <Login />
        </div>
      </Suspense>
    </>
  );
}
