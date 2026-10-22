"use client";

import { useEffect, useState } from "react";

/** What Dibby's up to while the server drafts: staged, so the wait feels like work, not a spinner. */
export function DibbyWorking({ where }: { where: string | null }) {
  const steps = [`Scouting ${where ?? "around"}…`, "Checking they're open…", "Picking three…"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 1600);
    return () => clearInterval(id);
  }, [steps.length]);
  return (
    <p className="paragraph-sm muted typing" aria-live="polite">
      {steps[i]}
      <span className="dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </p>
  );
}
