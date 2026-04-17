"use client";

import { Suspense } from "react";
import CostTable from "@/components/costtable/CostTable";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <div className="h-[500px] rounded-2xl border border-neutral-800 bg-white/5 animate-pulse" />
        </div>
      }
    >
      <CostTable />
    </Suspense>
  );
}