"use client";

import { Suspense } from "react";
import ResetPasswordForm from "@/components/login/ResetPassword";
import { LoadingBar } from "@/components/ui/loading-bar";

export default function ResetPasswordPage() {
  return (
    <>
      {/* 🔹 Barra de carregamento global */}
      <LoadingBar />

      {/* 🔹 Suspense garante que useSearchParams funcione sem erro */}
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-white"></div>}>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
