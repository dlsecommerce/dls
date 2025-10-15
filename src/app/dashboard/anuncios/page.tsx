"use client";

import AnnounceTable from "@/components/announce/AnnounceTable";
import { LoadingBar } from "@/components/ui/loading-bar";

export default function AnnouncePage() {
  return (
    <>
      {/* 🔹 Barra de carregamento global */}
      <LoadingBar />
        <AnnounceTable />
    </>
  );
}
