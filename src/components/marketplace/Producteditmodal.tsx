"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import ProductDetails from "@/components/marketplace/edit/Compositionmodal";

type Props = {
  id?: string;
  loja?: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductEditModal({ id, loja, onClose, onSaved }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-end bg-black/70">
      <div className="relative z-10 min-h-fit w-full max-w-[1400px] overflow-y-auto bg-[#050505] shadow-2xl animate-in slide-in-from-right duration-200">
        <ProductDetails
          id={id}
          loja={loja}
          onSaved={onSaved}
          onCancel={onClose}
          onCloseModal={onClose}
        />
      </div>
    </div>
  );
}