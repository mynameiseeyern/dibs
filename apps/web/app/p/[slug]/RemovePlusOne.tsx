"use client";

import { useTransition } from "react";
import * as Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/** Hosts only: take someone's +1 off the list. Quiet, no chat message; they can add one again. */
export function RemovePlusOne({ label, remove }: { label: string; remove: () => Promise<{ error?: string }> }) {
  const [pending, start] = useTransition();
  return (
    <Button.Root
      type="button"
      variant="neutral"
      mode="ghost"
      size="small"
      iconOnly
      disabled={pending}
      aria-label={`Take ${label} off the list`}
      onClick={() =>
        start(async () => {
          const r = await remove();
          if (r.error) toast.error(r.error);
          else toast.success(`${label} is off the list`);
        })
      }
    >
      <Button.Icon as="i" className="ri-close-line" />
    </Button.Root>
  );
}
