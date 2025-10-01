"use client";

import { Suspense } from "react";
import Signup from "@/components/login/Signup";
import { LoadingBar } from "@/components/ui/loading-bar";

export default function SignupPage() {
  return (
    <>
      {/* 🔹 Barra de carregamento global */}
      <LoadingBar />

      {/* 🔹 Suspense garante segurança contra hooks client */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white">Carregando...</div>}>
        <Signup />
      </Suspense>
    </>
  );
}
