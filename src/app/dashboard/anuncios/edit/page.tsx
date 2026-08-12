"use client";

import React, { Suspense } from "react";
import ProductDetails from "@/components/announce/Productedit/ProductDetails";

export const dynamic = "force-dynamic";

export default function EditPage() {
  return (
    <Suspense fallback={null}>
      <ProductDetails />
    </Suspense>
  );
}
