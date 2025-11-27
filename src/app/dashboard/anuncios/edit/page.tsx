"use client";

import React, { Suspense } from "react";
import DetalhesProduto from "@/components/announce/ProductDetails/ProductDetails";

export const dynamic = "force-dynamic";

export default function EditPage() {
  return (
    <Suspense fallback={null}>
      <DetalhesProduto />
    </Suspense>
  );
}
