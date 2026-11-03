"use client";

import { useState, useTransition } from "react";
import { locate } from "@/lib/locate";
import * as Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { FormState } from "./actions";

/**
 * Where Dibby looks, under its latest message, so the crew can steer it in one tap.
 * - `ask`: Dibby didn't know where to look. The area chips show straight away.
 * - `brief`: Dibby searched. Shows what and where it looked, and "Somewhere else?" opens the chips.
 * A chip posts a fresh "@dibby <same search> in <area>" so the chat shows what happened.
 */
export function WhereChips({
  mode,
  query,
  areas,
  lookedIn,
  post,
}: {
  mode: "ask" | "brief";
  query: string;
  /** Areas to offer, latest used first. */
  areas: string[];
  /** For the brief: the area it searched, or null when it searched near the asker. */
  lookedIn?: string | null;
  post: (s: FormState, f: FormData) => Promise<FormState>;
}) {
  const [open, setOpen] = useState(mode === "ask");
  const [pending, start] = useTransition();
  const others = areas.filter((a) => a.toLowerCase() !== (lookedIn ?? "").toLowerCase());

  const send = (where: string | "near") =>
    start(async () => {
      const f = new FormData();
      if (where === "near") {
        const here = await locate({ ask: true });
        if (!here) {
          toast.info("Location's off. Pick an area instead, or name a suburb.");
          return;
        }
        f.set("near_lat", String(here.lat));
        f.set("near_lng", String(here.lng));
        f.set("body", `@dibby ${query} near me`);
      } else {
        f.set("body", `@dibby ${query} in ${where}`);
      }
      const r = await post(undefined, f);
      if (r?.error) toast.error(r.error);
      else setOpen(false);
    });

  return (
    <div className="where">
      {mode === "brief" && (
        <p className="where__brief paragraph-xs">
          <i className="ri-search-line db-icon" aria-hidden="true" />
          <span>
            {query} · {lookedIn ?? "near you"}
          </span>
          {!open && (
            <button type="button" className="where__change" onClick={() => setOpen(true)} disabled={pending}>
              Somewhere else?
            </button>
          )}
        </p>
      )}
      {open && (
        <div className="chip-row where__chips" role="group" aria-label="Where should Dibby look?">
          {lookedIn !== null && (
            <Button.Root type="button" variant="primary" mode="lighter" size="small" disabled={pending} onClick={() => send("near")}>
              <Button.Icon as="i" className="ri-map-pin-line" /> Near me
            </Button.Root>
          )}
          {others.map((a) => (
            <Button.Root key={a} type="button" variant="neutral" mode="stroke" size="small" disabled={pending} onClick={() => send(a)}>
              {a}
            </Button.Root>
          ))}
        </div>
      )}
    </div>
  );
}
