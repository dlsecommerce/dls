"use client";

import React, { Suspense } from "react";
import ProductDetails from "@/components/announce/edit/ProductDetails";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductDetails />
    </Suspense>
  );
}
