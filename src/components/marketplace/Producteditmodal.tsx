"use client";

import { useEffect } from "react";
import MarketplaceDetails from "@/components/marketplace/edit/Productdetails";

type Props = {
  id?: string;
  channel?: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function MarketplaceEditModal({ id, channel, onClose, onSaved }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-end bg-black/70">
      <div className="relative z-10 min-h-fit w-full max-w-[1400px] overflow-y-auto bg-[#050505] shadow-2xl animate-in slide-in-from-right duration-200">
        <MarketplaceDetails
          id={id}
          channel={channel}
          onSaved={onSaved}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
