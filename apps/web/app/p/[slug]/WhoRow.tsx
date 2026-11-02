"use client";

import { useState, type ReactNode } from "react";
import { firstName } from "@dibs/shared/plans";
import type { MonogramColour } from "@dibs/shared/types";
import { Monogram } from "@/components/Monogram";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";

export interface WhoFace {
  id: string;
  display_name: string;
  colour: MonogramColour;
  status: "in" | "maybe" | "waitlist" | "none";
  you: boolean;
  host: boolean;
}

/** Five faces fit across a phone. Past that: four faces and a "+N" tile. */
const FIT = 5;

const BADGE = {
  maybe: { icon: "ri-question-mark", label: "maybe" },
  waitlist: { icon: "ri-time-line", label: "on the waitlist" },
  none: null,
  in: null,
} as const;

/**
 * Who's going, at a glance: a row of faces with first names, never taller than one row.
 * Tap anywhere on it for everyone, in a bottom sheet (where the host menus live).
 */
export function WhoRow({ faces, summary, children }: { faces: WhoFace[]; summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const shown = faces.length <= FIT ? faces : faces.slice(0, FIT - 1);
  const more = faces.length - shown.length;

  return (
    <section className="who-row" aria-labelledby="who-h">
      <div className="section__head">
        <div className="who-row__title">
          <h2 id="who-h" className="title-h5">Who&rsquo;s going</h2>
          <span className="paragraph-sm muted">{summary}</span>
        </div>
        <LinkButton.Root variant="modifiable" size="medium" className="text-primary-dark" onClick={() => setOpen(true)}>
          See all
        </LinkButton.Root>
      </div>

      <button type="button" className="who-row__faces" aria-label={`See everyone: ${summary}`} onClick={() => setOpen(true)}>
        {shown.map((f) => {
          const badge = f.host ? { icon: "ri-star-fill", label: "organiser" } : BADGE[f.status];
          return (
            <span key={f.id} className={`who-row__face${f.status === "in" ? "" : " who-row__face--unsure"}`}>
              <span className="who-row__avatar">
                <Monogram name={f.display_name} colour={f.colour} size="lg" />
                {badge && (
                  <span className={`who-row__badge who-row__badge--${f.host ? "host" : f.status}`}>
                    <i className={`${badge.icon}`} aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className="label-sm who-row__name">{f.you ? "You" : firstName(f.display_name)}</span>
            </span>
          );
        })}
        {more > 0 && (
          <span className="who-row__face">
            <span className="who-row__more title-h6">+{more}</span>
            <span className="label-sm who-row__name">more</span>
          </span>
        )}
      </button>

      <Modal.Root open={open} onOpenChange={setOpen}>
        <Modal.Content>
          <Modal.Header title="Who’s going" description={summary} />
          <div className="who-row__sheet">{children}</div>
        </Modal.Content>
      </Modal.Root>
    </section>
  );
}
