"use client";

import { useEffect, useState, type ReactNode } from "react";
import * as SegmentedControl from "@/components/ui/segmented-control";

export type PlanTab = { id: string; label: string; count?: number; panel: ReactNode };

/** Vote / Chat / Who's in. Remembers the last tab for this plan in this browser tab. */
export function PlanTabs({ tabs, initial, storageKey }: { tabs: PlanTab[]; initial: string; storageKey: string }) {
  const [current, setCurrent] = useState(initial);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved && tabs.some((t) => t.id === saved)) setCurrent(saved);
    } catch {}
    // Only on first load: later refreshes keep what's on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (id: string) => {
    setCurrent(id);
    try {
      sessionStorage.setItem(storageKey, id);
    } catch {}
  };
  const active = tabs.some((t) => t.id === current) ? current : tabs[0]?.id;

  return (
    <SegmentedControl.Root asChild value={active} onValueChange={pick}>
      <section className="section plan-tabs">
        <SegmentedControl.List aria-label="Plan">
          {tabs.map((t) => (
            <SegmentedControl.Trigger key={t.id} value={t.id}>
              {t.label}
              {t.count ? <span className="plan-tabs__count">{t.count}</span> : null}
            </SegmentedControl.Trigger>
          ))}
        </SegmentedControl.List>
        {tabs.map((t) => (
          // Panels stay mounted (live chat, half-typed options) and are just hidden when not picked.
          <SegmentedControl.Content key={t.id} value={t.id} forceMount hidden={active !== t.id} className="section">
            {t.panel}
          </SegmentedControl.Content>
        ))}
      </section>
    </SegmentedControl.Root>
  );
}
