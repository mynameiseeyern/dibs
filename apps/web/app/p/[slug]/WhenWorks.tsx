"use client";

import { useOptimistic, useState, useTransition } from "react";
import * as Badge from "@/components/ui/badge";
import * as Button from "@/components/ui/button";
import { Field } from "@/components/Field";
import { MonogramStack } from "@/components/Monogram";
import type { MonogramColour } from "@dibs/shared/types";
import { toast } from "@/components/ui/toast";

type Person = { id: string; display_name: string; colour: MonogramColour };
export type WhenRow = { id: string; label: string; short: string; free: Person[]; mine: boolean };
type Result = { error?: string };

/**
 * "When works?" (ARV-21). The host puts up to four times to the crew; people going tick the ones
 * they're free for; the time most people can do is called out, and the host goes with it.
 * Maybes and people who haven't replied read along, like the vote.
 */
export function WhenWorks({
  rows,
  bestId,
  outOf,
  me,
  readOnly,
  isHost,
  max,
  startOpen,
  actions,
}: {
  rows: WhenRow[];
  bestId: string | null;
  /** How many people can tick (going, and hosts). */
  outOf: number;
  me: Person | null;
  readOnly: string | null;
  isHost: boolean;
  max: number;
  /** The host came from "Ask the crew" in Edit: open the add form. */
  startOpen?: boolean;
  actions: {
    markFree: (timeId: string) => Promise<Result>;
    add?: (local: string) => Promise<Result>;
    remove?: (timeId: string) => Promise<Result>;
    go?: (timeId: string) => Promise<Result & { label?: string }>;
  };
}) {
  const [shown, toggle] = useOptimistic(rows, (state, id: string) =>
    state.map((r) =>
      r.id !== id || !me ? r : { ...r, mine: !r.mine, free: r.mine ? r.free.filter((p) => p.id !== me.id) : [...r.free, me] }
    )
  );
  const [, startToggle] = useTransition();
  const [busy, startBusy] = useTransition();
  const [adding, setAdding] = useState(Boolean(startOpen) && rows.length === 0);
  const [local, setLocal] = useState("");
  const best = shown.find((r) => r.id === bestId);

  if (rows.length === 0 && !isHost) return null;

  if (rows.length === 0 && !adding) {
    return (
      <Button.Root type="button" variant="neutral" mode="lighter" block onClick={() => setAdding(true)}>
        <i className="ri-calendar-schedule-line db-icon" aria-hidden="true" />
        Not sure when? Ask the crew
      </Button.Root>
    );
  }

  const add = () =>
    startBusy(async () => {
      const res = await actions.add!(local);
      if (res.error) return void toast.error(res.error);
      setLocal("");
      toast.success("Time added. The crew can tick it now.");
    });

  return (
    <section className="db-card section when" id="when" aria-labelledby="when-h">
      <div>
        <h2 id="when-h" className="label-lg">When works?</h2>
        <p className="paragraph-sm muted">
          {rows.length === 0
            ? "Add a few times. The crew ticks the ones they're free for."
            : best
              ? `${best.short} suits the most people so far: ${best.free.length} of ${outOf} going.`
              : isHost
                ? "Waiting on the crew to tick the times they're free."
                : "Tick the times you're free."}
        </p>
      </div>

      {shown.length > 0 && (
        <ul className="when__list">
          {shown.map((r) => (
            <li key={r.id} className="when__row" data-best={r.id === bestId || undefined}>
              <div className="when__top">
                <div className="when__info">
                <span className="label-md">{r.label}</span>
                <span className="when__who">
                  {r.free.length > 0 && <MonogramStack people={r.free} max={4} />}
                  <span className="paragraph-sm muted">{r.free.length === 0 ? "Nobody yet" : `${r.free.length} free`}</span>
                  {r.id === bestId && (
                    <Badge.Root color="primary" variant="lighter">
                      <Badge.Icon as="i" className="ri-thumb-up-line" aria-hidden="true" />
                      Best so far
                    </Badge.Root>
                  )}
                </span>
                </div>
                {me && (
                  <Button.Root
                    type="button"
                    size="medium"
                    variant={r.mine ? "primary" : "neutral"}
                    mode={r.mine ? "filled" : "lighter"}
                    aria-pressed={r.mine}
                    aria-label={`${r.mine ? "You're free" : "I'm free"} ${r.label}`}
                    onClick={() => {
                      if (readOnly) return void toast.info(readOnly);
                      startToggle(async () => {
                        toggle(r.id);
                        const res = await actions.markFree(r.id);
                        if (res.error) toast.error(res.error);
                      });
                    }}
                  >
                    <i className={`${r.mine ? "ri-check-line" : "ri-add-line"} db-icon`} aria-hidden="true" />
                    {r.mine ? "Free" : "I'm free"}
                  </Button.Root>
                )}
              </div>
              {isHost && (
                <div className="when__host">
                {actions.go && (
                  <Button.Root
                    type="button"
                    size="medium"
                    variant={r.id === bestId ? "primary" : "neutral"}
                    mode={r.id === bestId ? "lighter" : "ghost"}
                    disabled={busy}
                    onClick={() =>
                      startBusy(async () => {
                        const res = await actions.go!(r.id);
                        if (res.error) toast.error(res.error);
                        else toast.success(`Time's set: ${res.label ?? r.label}`);
                      })
                    }
                  >
                    Go with this
                  </Button.Root>
                )}
                {actions.remove && (
                  <Button.Root
                    type="button"
                    size="medium"
                    variant="neutral"
                    mode="ghost"
                    iconOnly
                    disabled={busy}
                    aria-label={`Take ${r.label} off`}
                    onClick={() =>
                      startBusy(async () => {
                        const res = await actions.remove!(r.id);
                        if (res.error) toast.error(res.error);
                      })
                    }
                  >
                    <i className="ri-close-line db-icon" aria-hidden="true" />
                  </Button.Root>
                )}
              </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {isHost && actions.add && rows.length < max && (
        <div className="when__add">
          <Field
            label={rows.length === 0 ? "First time" : "Another time"}
            name="when_time"
            type="datetime-local"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            hint={`Up to ${max}. Sydney and Melbourne time.`}
          />
          <Button.Root type="button" variant="neutral" mode="lighter" disabled={!local || busy} onClick={add}>
            <i className="ri-add-line db-icon" aria-hidden="true" />
            {busy ? "Adding…" : "Add this time"}
          </Button.Root>
        </div>
      )}
    </section>
  );
}
