"use client";

import { Suspense } from "react";
import AnnounceTable from "@/components/announce/AnnounceTable/AnnounceTable";
import { LoadingBar } from "@/components/ui/loading-bar";

export default function AnnouncePage() {
  return (
    <>
      <LoadingBar />

      <Suspense
        fallback={
          <div className="p-8">
            <div className="h-[500px] rounded-2xl border border-neutral-800 bg-white/5 animate-pulse" />
          </div>
        }
      >
        <AnnounceTable />
      </Suspense>
    </>
  );
}