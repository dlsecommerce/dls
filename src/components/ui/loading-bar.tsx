"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";

export interface LoadingBarRef {
  start: () => void;
  finish: () => void;
}

export const LoadingBar = forwardRef<LoadingBarRef>((_, ref) => {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);

  useImperativeHandle(ref, () => ({
    start: () => {
      setActive(true);
      setProgress(10);
    },
    finish: () => {
      setProgress(100);
      setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 500);
    },
  }));

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (active && progress < 90) {
      timer = setTimeout(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 10, 90));
      }, 200);
    }

    return () => clearTimeout(timer);
  }, [active, progress]);

  if (!active && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-[3px] bg-transparent z-[9999]">
      <div
        className="h-[3px] bg-[#2799fe] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
});

LoadingBar.displayName = "LoadingBar";
