"use client";

import { useEffect, useRef } from "react";

/**
 * Marks children that arrived since this page was first drawn, so new cards and
 * messages spring in (pop-in) while the ones already there stay put. Works with the
 * 3-second live refresh: anything with a `data-fresh-id` not seen before gets `.pop-in`.
 */
export function Fresh({ children }: { children: React.ReactNode }) {
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
      for (const e of items) {
        const id = e.dataset.freshId!;
        if (!seen.current.has(id)) {
          seen.current.add(id);
          e.classList.add("pop-in");
        }
      }
    };
    mark();
    const mo = new MutationObserver(mark);
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  return <div ref={ref} className="db-stack fresh">{children}</div>;
}
