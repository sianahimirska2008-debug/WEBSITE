"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AutoRefresh({ everyMs, maxTimes }: { everyMs: number; maxTimes: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      if (++n > maxTimes) return clearInterval(t);
      router.refresh();
    }, everyMs);
    return () => clearInterval(t);
  }, [router, everyMs, maxTimes]);
  return null;
}
