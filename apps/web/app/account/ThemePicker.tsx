"use client";

import { useEffect, useState } from "react";
import * as SegmentedControl from "@/components/ui/segmented-control";
import { THEME_KEY, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { id: ThemeChoice; label: string; icon: string }[] = [
  { id: "system", label: "Auto", icon: "ri-smartphone-line" },
  { id: "light", label: "Light", icon: "ri-sun-line" },
  { id: "dark", label: "Dark", icon: "ri-moon-line" },
];

/** Light, dark, or match the phone. Saved on this browser and applied straight away. */
export function ThemePicker() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY);
      if (t === "light" || t === "dark") setChoice(t);
    } catch {}
  }, []);

  const pick = (v: string) => {
    const t = v as ThemeChoice;
    setChoice(t);
    const root = document.documentElement;
    if (t === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
    try {
      if (t === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, t);
    } catch {}
  };

  return (
    <SegmentedControl.Root value={choice} onValueChange={pick}>
      <SegmentedControl.List aria-label="Appearance">
        {OPTIONS.map((o) => (
          <SegmentedControl.Trigger key={o.id} value={o.id}>
            <i className={`${o.icon} db-icon`} aria-hidden="true" />
            {o.label}
          </SegmentedControl.Trigger>
        ))}
      </SegmentedControl.List>
      {OPTIONS.map((o) => (
        <SegmentedControl.Content key={o.id} value={o.id} className="sr-only">
          {o.id === "system" ? "Matches your phone's light or dark setting." : `Always ${o.label.toLowerCase()}.`}
        </SegmentedControl.Content>
      ))}
    </SegmentedControl.Root>
  );
}
