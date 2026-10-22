"use client";

import { useActionState, useRef } from "react";
import { setBetaUpdates, type ListState } from "../email-actions";
import * as Hint from "@/components/ui/hint";
import * as Switch from "@/components/ui/switch";

/** Beta updates on or off. Saves as soon as the switch moves. */
export function BetaUpdatesToggle({ initial, email }: { initial: boolean; email: string | null }) {
  const [state, action, pending] = useActionState<ListState, FormData>(setBetaUpdates, { subscribed: initial });
  const form = useRef<HTMLFormElement>(null);
  const on = state?.subscribed ?? initial;

  return (
    <form ref={form} action={action} className="db-stack">
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <Switch.Root
          name="beta_updates"
          defaultChecked={on}
          key={String(on)}
          disabled={pending || !email}
          aria-describedby="beta-updates-hint"
          // Submit on the next frame, once the switch's form value has caught up.
          onCheckedChange={() => requestAnimationFrame(() => form.current?.requestSubmit())}
        />
        Beta updates
      </label>
      <Hint.Root id="beta-updates-hint" aria-live="polite">
        {state?.error
          ? state.error
          : !email
            ? "Add an email to your account to get these."
            : on
              ? `A short email to ${email} when we ship something new.`
              : "Off. Turn it on for a short email when we ship something new."}
      </Hint.Root>
    </form>
  );
}
