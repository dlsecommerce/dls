"use client";

import { Suspense } from "react";
import ForgotPassword from "@/components/login/ForgotPassword";
import { LoadingBar } from "@/components/ui/loading-bar";

export default function ForgotPasswordPage() {
  return (
    <>
      {/* 🔹 Barra de carregamento global */}
      <LoadingBar />

      {/* 🔹 Suspense protege contra erros de hooks client no SSR */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white">Carregando...</div>}>
        <ForgotPassword />
      </Suspense>
    </>
  );
}
