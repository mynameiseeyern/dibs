"use client";

import { useEffect, useRef, useState } from "react";
import type { Vibe } from "@dibs/shared/types";
import { askDibbyLine, type AskParts } from "@/lib/copy";
import { DibbyMark } from "@/components/Logo";
import * as Avatar from "@/components/ui/avatar";
import * as Badge from "@/components/ui/badge";

const IDEAS = ["dumplings in Haymarket", "bowling and beers", "bottomless brunch", "ramen near Central", "mini golf", "a rooftop with a view", "cheap tacos in Newtown"];

/** Dibby's chat bubble on the new-plan form: it rewrites itself as you tap and type. */
export function DibbyBubble({ vibe, parts }: { vibe: Vibe; parts: AskParts }) {
  const line = askDibbyLine(vibe, parts);
  const [shown, setShown] = useState(line);
  const [fading, setFading] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (line === shown) return;
    setFading(true);
    clearTimeout(t.current);
    t.current = setTimeout(() => {
      setShown(line);
      setFading(false);
    }, 140);
    return () => clearTimeout(t.current);
  }, [line, shown]);
  return (
    <div className="db-msg db-msg--ai dibby-bubble pop-in" aria-live="polite">
      <Avatar.Root size="32" className="bg-transparent" aria-hidden="true">
        <DibbyMark size={32} />
      </Avatar.Root>
      <div>
        <div className="db-msg__name">
          Dibby <Badge.Root color="accent" className="ai-tag">AI</Badge.Root>
        </div>
        <div className={`db-msg__bubble dibby-bubble__text${fading ? " dibby-bubble__text--fading" : ""}`}>{shown}</div>
      </div>
    </div>
  );
}

/** A placeholder that cycles through ideas until you start typing. */
export function useCyclingPlaceholder(active: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setI((n) => (n + 1) % IDEAS.length), 2400);
    return () => clearInterval(id);
  }, [active]);
  return `${IDEAS[i]}…`;
}
