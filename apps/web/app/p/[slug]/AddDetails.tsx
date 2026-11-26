"use client";

import { useState, useTransition } from "react";
import * as Button from "@/components/ui/button";
import * as LinkButton from "@/components/ui/link-button";
import * as Textarea from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

const MAX = 500;

/**
 * "Add details" under a plan's title, for hosts while it has none. Making a plan is one question a
 * screen and doesn't ask, so this is where details go in (Edit has them too).
 */
export function AddDetails({ save }: { save: (v: string) => Promise<{ error?: string }> }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  const [pending, start] = useTransition();
  if (!open)
    return (
      <LinkButton.Root type="button" variant="primary" size="small" onClick={() => setOpen(true)}>
        <i className="ri-add-line db-icon" aria-hidden="true" />
        Add details
      </LinkButton.Root>
    );
  return (
    <form
      className="db-stack"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await save(v.trim());
          if (res.error) toast.error(res.error);
          else setOpen(false);
        });
      }}
    >
      <Textarea.Root
        name="description"
        aria-label="Details"
        value={v}
        onChange={(e) => setV(e.target.value)}
        maxLength={MAX}
        rows={3}
        placeholder="What to bring, where to meet…"
        autoFocus
      >
        <Textarea.CharCounter current={v.length} max={MAX} />
      </Textarea.Root>
      <p className="paragraph-xs muted">Anyone with the link sees this, like the name.</p>
      <div className="db-row">
        <Button.Root type="submit" size="small" disabled={pending || !v.trim()}>
          {pending ? "Saving…" : "Save"}
        </Button.Root>
        <Button.Root type="button" variant="neutral" mode="ghost" size="small" onClick={() => setOpen(false)}>
          Cancel
        </Button.Root>
      </div>
    </form>
  );
}
