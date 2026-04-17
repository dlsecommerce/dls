"use client";

import React, { Suspense } from "react";
import PricingDetails from "@/components/marketplaces/tray/details/PricingCalculatorMarketplace";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PricingDetails />
    </Suspense>
  );
}
