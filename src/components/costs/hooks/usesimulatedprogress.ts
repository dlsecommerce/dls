import { useCallback, useRef, useState } from "react";

export function useSimulatedProgress() {
  const [percent, setPercent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setPercent(5);

    intervalRef.current = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 90) return prev;
        const step = prev < 50 ? 4 : prev < 75 ? 2 : 1;
        return Math.min(90, prev + step);
      });
    }, 150);
  }, []);

  const finish = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPercent(100);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPercent(0);
  }, []);

  return { percent, start, finish, reset };
}
