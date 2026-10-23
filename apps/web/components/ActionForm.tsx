"use client";

import { useTransition, type ReactNode } from "react";
import * as Button from "@/components/ui/button";
import { send } from "@/lib/send";

/**
 * A one-button form for a server action (mark paid, confirm), with "Saving…", a retry when the
 * connection drops and a clear message if it fails, instead of the page's error screen (ARV-53).
 */
export function ActionForm({
  action,
  what,
  retry = true,
  icon,
  label,
  block,
  size,
  ariaLabel,
}: {
  action: () => Promise<unknown>;
  /** "that payment": used in "Couldn't save that payment". */
  what?: string;
  retry?: boolean;
  icon?: string;
  label: ReactNode;
  block?: boolean;
  size?: "small" | "medium" | "large";
  ariaLabel?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <form
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await send(action, { retry, what });
        });
      }}
    >
      <Button.Root block={block} size={size} disabled={pending} aria-label={pending ? undefined : ariaLabel} aria-busy={pending}>
        {/* Saving shows a spinner, so it reads as "working", not "can't tap". */}
        {pending ? <i className="ri-loader-4-line db-icon db-spin" aria-hidden="true" /> : icon && <i className={`${icon} db-icon`} aria-hidden="true" />}
        {pending ? "Saving…" : label}
      </Button.Root>
    </form>
  );
}
