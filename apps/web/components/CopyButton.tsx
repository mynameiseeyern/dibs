"use client";

import { useState } from "react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="db-btn db-btn--secondary db-btn--sm"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked: the value is still on screen to copy by hand */
        }
      }}
    >
      <i className={`${done ? "ri-check-line" : "ri-file-copy-line"} db-icon`} aria-hidden="true" />
      {done ? "Copied" : "Copy"}
    </button>
  );
}
