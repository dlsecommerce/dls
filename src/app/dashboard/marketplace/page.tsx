"use client";

import React, { Suspense } from "react";
import PricingTable from "@/components/marketplace/Marketplace";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PricingTable />
    </Suspense>
  );
}
