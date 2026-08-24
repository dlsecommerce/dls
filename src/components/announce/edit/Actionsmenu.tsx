"use client";

import { EllipsisVertical } from "lucide-react";

type Props = {
  onOpenComposition: () => void;
};

export default function ActionsMenu({ onOpenComposition }: Props) {
  return (
    <button
      type="button"
      onClick={onOpenComposition}
      aria-label="Composição de custo"
      className="
        inline-flex h-9 cursor-pointer items-center justify-center
        text-white/60
        transition-all duration-200
        hover:text-white
        active:scale-[0.98]
      "
    >
      <EllipsisVertical className="h-5 w-5" />
    </button>
  );
}
