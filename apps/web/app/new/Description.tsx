"use client";

import { useRef, useState } from "react";
import { DESCRIPTION_MAX } from "@dibs/shared/plans";
import * as Button from "@/components/ui/button";
import * as Label from "@/components/ui/label";
import * as Hint from "@/components/ui/hint";
import * as Textarea from "@/components/ui/textarea";

/** Optional details. Tucked behind a button so the form stays short for a quick plan. */
export function Description() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  if (!open)
    return (
      <Button.Root
        type="button"
        variant="neutral"
        mode="ghost"
        className="self-start"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => area.current?.focus());
        }}
      >
        <Button.Icon as="i" className="ri-add-line" />
        Add a description
      </Button.Root>
    );
  return (
    <div className="flex flex-col gap-2">
      <Label.Root htmlFor="description">
        Description <span className="muted">Optional</span>
      </Label.Root>
      <Textarea.Root
        ref={area}
        id="description"
        name="description"
        placeholder="What to bring, where to meet, dress code…"
        maxLength={DESCRIPTION_MAX}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-describedby="description-hint"
      >
        <Textarea.CharCounter current={text.length} max={DESCRIPTION_MAX} />
      </Textarea.Root>
      <Hint.Root id="description-hint">Anyone with the link sees this, like the name.</Hint.Root>
    </div>
  );
}
