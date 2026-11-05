"use client";

import { useState } from "react";
import * as Button from "@/components/ui/button";
import { play } from "@/lib/feedback";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button.Root
      type="button"
      variant="neutral"
      mode="lighter"
      size="small"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          play("copy");
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked: the value is still on screen to copy by hand */
        }
      }}
    >
      <i className={`${done ? "ri-check-line" : "ri-file-copy-line"} db-icon`} aria-hidden="true" />
      {done ? "Copied" : "Copy"}
    </Button.Root>
  );
}
