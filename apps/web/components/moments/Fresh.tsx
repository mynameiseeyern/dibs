"use client";

import { useEffect, useRef } from "react";
import { play, type SoundName } from "@/lib/feedback";

/**
 * Marks children that arrived since this page was first drawn, so new cards and
 * messages spring in (pop-in) while the ones already there stay put. Works with the
 * 3-second live refresh: anything with a `data-fresh-id` not seen before gets `.pop-in`.
 * With `sounds`, a new item with `data-fresh-sound` ("receive", "dibby") plays it, once per batch.
 */
export function Fresh({ children, sounds = false }: { children: React.ReactNode; sounds?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const mark = () => {
      const items = root.querySelectorAll<HTMLElement>("[data-fresh-id]");
      if (!seen.current) {
        seen.current = new Set([...items].map((e) => e.dataset.freshId!));
        return;
      }
      let sound: SoundName | null = null;
      for (const e of items) {
        const id = e.dataset.freshId!;
        if (!seen.current.has(id)) {
          seen.current.add(id);
          e.classList.add("pop-in");
          // Dibby replying wins over someone else's message in the same refresh.
          const s = e.dataset.freshSound as SoundName | undefined;
          if (s && sound !== "dibby") sound = s;
        }
      }
      if (sounds && sound) play(sound, { within: 600 });
    };
    mark();
    const mo = new MutationObserver(mark);
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [sounds]);

  return <div ref={ref} className="db-stack fresh">{children}</div>;
}
