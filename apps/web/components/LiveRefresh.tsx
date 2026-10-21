"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-fetches the page every few seconds while it's visible, so RSVPs, votes and
 * messages from other phones show up. Swap for Supabase Realtime once it's wired.
 */
export function LiveRefresh({ every = 3000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    let t: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      stop();
      t = setInterval(() => {
        const busy = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
        if (!busy) router.refresh();
      }, every);
    };
    const stop = () => t && clearInterval(t);
    const onVis = () => (document.visibilityState === "visible" ? (router.refresh(), start()) : stop());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router, every]);
  return null;
}
