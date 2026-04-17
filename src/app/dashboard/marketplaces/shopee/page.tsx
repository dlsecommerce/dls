"use client";

import React, { Suspense } from "react";
import PricingTable from "@/components/marketplaces/shopee/PricingTable";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PricingTable />
    </Suspense>
  );
}
