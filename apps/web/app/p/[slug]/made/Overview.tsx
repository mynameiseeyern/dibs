"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";
import * as Textarea from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { FieldError } from "@/components/Field";
import { DayStrip, sydneyToday } from "@/components/DateTime";
import { PlacePicker, pickArg } from "@/components/PlacePicker";
import { BigTime } from "../../../new/BigTime";
import { setDescription, setPlace, setTitle, setWhen } from "../manage/actions";
import "../../../new/plan-flow.css";
import "./overview.css";

type Sheet = "title" | "when" | "note" | null;

/**
 * The plan just made, in edit mode: tap a line to change it in a sheet. Saving changes the
 * plan straight away (quietly, while nobody else is on it). The rest lives in Edit plan.
 */
export function Overview({
  slug,
  title,
  whenLocal,
  whenLabel,
  where,
  whereNote,
  placeSet,
  description,
}: {
  slug: string;
  title: string;
  /** "2026-10-30T19:00" in Sydney time, or "". */
  whenLocal: string;
  whenLabel: string | null;
  where: string | null;
  /** "Anyone going adds places · closes Fri 6pm" while it's a vote. */
  whereNote: string | null;
  /** A place is set, so tapping it opens the map. A vote is changed in Edit plan. */
  placeSet: boolean;
  description: string | null;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [picking, setPicking] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(title);
  const [date, setDate] = useState<string | null>(whenLocal ? whenLocal.slice(0, 10) : null);
  const [time, setTime] = useState(whenLocal ? whenLocal.slice(11, 16) : "19:00");
  const [note, setNote] = useState(description ?? "");

  const open = (s: Sheet) => {
    setError(null);
    setName(title);
    setDate(whenLocal ? whenLocal.slice(0, 10) : sydneyToday());
    setTime(whenLocal ? whenLocal.slice(11, 16) : "19:00");
    setNote(description ?? "");
    setSheet(s);
  };
  const save = (run: () => Promise<{ error?: string }>) => {
    // Keyboard away before the sheet closes, so iPhones don't keep its space.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    start(async () => {
      const r = await run();
      if (r.error) return setError(r.error);
      setSheet(null);
      toast.success("Saved");
      router.refresh();
    });
  };

  const pen = <i className="ri-pencil-line ov-row__pen" aria-hidden="true" />;

  return (
    <>
      <p className="ov-pill">
        <i className="ri-check-line" aria-hidden="true" /> Saved. Tap anything to change it
      </p>

      <div className="ov-card">
        <button type="button" className="ov-row ov-row--title" onClick={() => open("title")} aria-label={`Name: ${title}. Change it`}>
          <span className="ov-row__val">{title}</span>
          {pen}
        </button>
        <button type="button" className="ov-row" onClick={() => open("when")} aria-label={`When: ${whenLabel ?? "to be decided"}. Change it`}>
          <i className="ri-calendar-line ov-row__ico" aria-hidden="true" />
          <span className="ov-row__val">
            {whenLabel ?? <span className="muted">Time to be decided</span>}
            {whenLabel && <small>Sydney time</small>}
          </span>
          {pen}
        </button>
        {placeSet ? (
          <button type="button" className="ov-row" onClick={() => setPicking(true)} aria-label={`Where: ${where}. Change it`}>
            <i className="ri-map-pin-line ov-row__ico" aria-hidden="true" />
            <span className="ov-row__val">{where}</span>
            {pen}
          </button>
        ) : (
          <a className="ov-row" href={`/p/${slug}/manage`}>
            <i className="ri-bar-chart-2-line ov-row__ico" aria-hidden="true" />
            <span className="ov-row__val">
              {where ?? "Up for a vote"}
              {whereNote && <small>{whereNote}</small>}
            </span>
            <i className="ri-arrow-right-s-line ov-row__pen" aria-hidden="true" />
          </a>
        )}
        <button type="button" className="ov-row" onClick={() => open("note")} aria-label={description ? "Change the note for the crew" : "Add a note for the crew"}>
          <i className="ri-sticky-note-line ov-row__ico" aria-hidden="true" />
          <span className={`ov-row__val${description ? "" : " ov-row__val--add"}`}>{description ?? "Add a note for the crew"}</span>
          {description ? pen : <i className="ri-add-line ov-row__pen" aria-hidden="true" />}
        </button>
      </div>

      <Button.Root asChild variant="neutral" mode="ghost" className="ov-more">
        <a href={`/p/${slug}/manage`}>
          <Button.Icon as="i" className="ri-settings-3-line" />
          Plus-ones, spots and extras
        </a>
      </Button.Root>

      <Modal.Root open={sheet !== null} onOpenChange={(o) => !pending && !o && setSheet(null)}>
        <Modal.Content>
          {sheet === "title" && (
            <>
              <Modal.Title asChild>
                <label className="pf-q pf-q--sheet" htmlFor="ov-name">
                  What are we doing?
                </label>
              </Modal.Title>
              <div>
                <input id="ov-name" className="pf-big" value={name} maxLength={80} autoComplete="off" onChange={(e) => setName(e.target.value)} aria-invalid={error ? true : undefined} />
                <FieldError error={error ?? undefined} />
              </div>
            </>
          )}
          {sheet === "when" && (
            <>
              <Modal.Title className="pf-q pf-q--sheet">When are we going?</Modal.Title>
              <DayStrip label="Day" value={date} onChange={setDate} />
              <BigTime value={time} onChange={setTime} dial />
              <FieldError error={error ?? undefined} />
            </>
          )}
          {sheet === "note" && (
            <>
              <Modal.Title asChild>
                <label className="pf-q pf-q--sheet" htmlFor="ov-note">
                  A note for the crew
                </label>
              </Modal.Title>
              <Textarea.Root id="ov-note" value={note} maxLength={500} rows={4} placeholder="What to bring, where to meet, dress code…" onChange={(e) => setNote(e.target.value)} />
              <FieldError error={error ?? undefined} />
            </>
          )}
          <Modal.Footer>
            <Button.Root
              type="button"
              size="large"
              block
              disabled={pending || (sheet === "when" && !date)}
              onClick={() =>
                save(() =>
                  sheet === "title" ? setTitle(slug, name) : sheet === "when" ? setWhen(slug, date ? `${date}T${time}` : "") : setDescription(slug, note),
                )
              }
            >
              {pending ? "Saving…" : "Save"}
            </Button.Root>
            {sheet === "when" && whenLocal && (
              <Button.Root type="button" variant="neutral" mode="ghost" block disabled={pending} onClick={() => save(() => setWhen(slug, ""))}>
                Decide later
              </Button.Root>
            )}
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <PlacePicker
        open={picking}
        onOpenChange={setPicking}
        title="Where's it at?"
        cta="Use this place"
        onPick={(p) =>
          start(async () => {
            const r = await setPlace(slug, pickArg(p));
            if (r.error) return void toast.error(r.error);
            toast.success("Saved");
            router.refresh();
          })
        }
      />
    </>
  );
}
