"use client";

import { useEffect, useState, type ReactNode } from "react";

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
    <section className="section plan-tabs">
      <div className="db-segmented" role="tablist" aria-label="Plan">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => pick(t.id)}
          >
            {t.label}
            {t.count ? <span className="plan-tabs__count">{t.count}</span> : null}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id} className="section">
          {t.panel}
        </div>
      ))}
    </section>
  );
}
