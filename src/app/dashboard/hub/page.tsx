"use client";

import Hub from "@/components/hub/hub";
import { LoadingBar } from "@/components/ui/loading-bar";

export default function AnnouncePage() {
  return (
    <>
      {/* 🔹 Barra de carregamento global */}
      <LoadingBar />
        <Hub />
    </>
  );
}
