"use client";

import { useState } from "react";
import { DESCRIPTION_MAX } from "@dibs/shared/plans";
import * as Label from "@/components/ui/label";
import * as Hint from "@/components/ui/hint";
import * as Textarea from "@/components/ui/textarea";

/**
 * Optional details, straight under the name, like most event apps (WhatsApp, Lex, Reddit
 * events): what it is and what to know, together. Always open but short; it grows as you type.
 */
export function Description() {
  const [text, setText] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <Label.Root htmlFor="description">
        Description <span className="muted">Optional</span>
      </Label.Root>
      <Textarea.Root
        id="description"
        name="description"
        rows={2}
        placeholder="What to bring, where to meet, dress code…"
        maxLength={DESCRIPTION_MAX}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-describedby="description-hint"
        className="description-field"
      >
        {text.length > DESCRIPTION_MAX - 100 && <Textarea.CharCounter current={text.length} max={DESCRIPTION_MAX} />}
      </Textarea.Root>
      <Hint.Root id="description-hint">Anyone with the link sees this, like the name.</Hint.Root>
    </div>
  );
}
