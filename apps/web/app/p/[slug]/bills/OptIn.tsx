"use client";

import * as Button from "@/components/ui/button";

/**
 * "I'm in" for a spin: just a tap. (No 18+ tick for now; `needsTick` is ignored.)
 */
export function OptIn({ action, inIt }: { action: (f: FormData) => Promise<void>; inIt: boolean; needsTick?: boolean }) {
  return (
    <form action={action} className="db-stack">
      <Button.Root variant={inIt ? "neutral" : "dibs"} mode={inIt ? "lighter" : "filled"} block>
        {inIt ? "Actually, I'm out" : "I'm in"}
      </Button.Root>
    </form>
  );
}
