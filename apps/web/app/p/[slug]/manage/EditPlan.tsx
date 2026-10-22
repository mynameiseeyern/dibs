"use client";

import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import type { DibbyVolume, Vibe } from "@dibs/shared/types";
import type { CustomPlace } from "@dibs/shared/plans";
import { Field, FormError } from "@/components/Field";
import { DateTimeField } from "@/components/DateTime";
import { VibePick, VIBE_OPTIONS } from "@/components/VibePick";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";
import * as Switch from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { PlaceSection } from "./PlaceSection";

type Result = { error?: string };

export interface EditPlanProps {
  status: "voting" | "locked";
  /** "Ask the crew when works" on the plan page, while the plan hasn't started. */
  askWhenHref?: string;
  title: string;
  /** Display values, already formatted on the server. */
  whenLabel: string | null;
  deadlineLabel: string | null;
  /** datetime-local values in Sydney time. */
  whenInput: string;
  deadlineInput: string;
  venue: string | null;
  area: string | null;
  optionCount: number;
  capacity: number;
  going: number;
  plusOnes: boolean;
  vibe: Vibe;
  volume: DibbyVolume;
  actions: {
    setTitle: (v: string) => Promise<Result>;
    setWhen: (v: string) => Promise<Result>;
    setArea: (v: string) => Promise<Result>;
    setVoteDeadline: (v: string) => Promise<Result>;
    setCapacity: (n: number) => Promise<Result>;
    setPlusOnes: (on: boolean) => Promise<Result>;
    setPlace: (pick: string | CustomPlace) => Promise<Result>;
    openVote: () => Promise<Result>;
    setVibe: (v: Vibe) => Promise<void>;
    setVolume: (v: DibbyVolume) => Promise<void>;
    cancel: () => Promise<void>;
  };
}

const VOLUME = {
  quiet: { label: "Quiet", hint: "Just the useful stuff: vote closing, the day before, and wrapping up. One a day at most." },
  normal: { label: "Normal", hint: "Also chases replies and maybes, and says when someone pulls out. Up to three a day." },
  loud: { label: "Loud", hint: "Everything Normal does, up to five a day." },
} as const;

type SheetId = "title" | "when" | "where" | "deadline" | "spots" | "vibe" | "volume" | "cancel";

/**
 * The edit screen as a settings list: each row shows the current value and opens a sheet to
 * change that one thing. Every change saves on its own; there's no Save for the whole page.
 */
export function EditPlan(p: EditPlanProps) {
  const [sheet, setSheet] = useState<SheetId | null>(null);
  const close = () => setSheet(null);
  const voting = p.status === "voting";
  const whereValue = voting
    ? `Vote · ${p.optionCount} ${p.optionCount === 1 ? "place" : "places"}${p.area ? ` around ${p.area}` : ""}`
    : p.venue ?? "Not picked yet";

  return (
    <>
      <Group label="The plan">
        <Row label="Name" value={p.title} onOpen={() => setSheet("title")} />
        <Row label="When" value={p.whenLabel ?? "To be decided"} onOpen={() => setSheet("when")} />
        <Row label="Where" value={whereValue} onOpen={() => setSheet("where")} />
        {voting && <Row label="Vote closes" value={p.deadlineLabel ?? "When you lock it in"} onOpen={() => setSheet("deadline")} />}
      </Group>

      <Group label="Who's coming">
        <Row label="Spots" value={`${p.capacity} · ${p.going} going`} onOpen={() => setSheet("spots")} />
        <PlusOnesRow on={p.plusOnes} save={p.actions.setPlusOnes} />
      </Group>

      <Group label="Dibby">
        <Row label="How Dibby talks" value={VIBE_OPTIONS.find((v) => v.id === p.vibe)?.name ?? "Chill"} onOpen={() => setSheet("vibe")} />
        <Row label="How chatty" value={VOLUME[p.volume].label} onOpen={() => setSheet("volume")} />
      </Group>

      <div className="edit-plan__danger">
        <Button.Root type="button" variant="error" mode="ghost" onClick={() => setSheet("cancel")}>
          Call it off
        </Button.Root>
      </div>

      <TextSheet
        open={sheet === "title"}
        onClose={close}
        title="Name"
        field={{ label: "Name", name: "title", defaultValue: p.title, maxLength: 80, required: true, autoComplete: "off" }}
        save={p.actions.setTitle}
      />
      <TextSheet
        open={sheet === "when"}
        onClose={close}
        title="When"
        name="starts_at"
        extra={
          p.askWhenHref ? (
            <Button.Root asChild variant="neutral" mode="ghost" size="small">
              <a href={p.askWhenHref}>
                <i className="ri-calendar-schedule-line db-icon" aria-hidden="true" />
                Not sure? Ask the crew when works
              </a>
            </Button.Root>
          ) : null
        }
        save={p.actions.setWhen}
      >
        <DateTimeField name="starts_at" label="Day and time" defaultValue={p.whenInput} hint="Sydney and Melbourne time." />
      </TextSheet>
      <TextSheet
        open={sheet === "deadline"}
        onClose={close}
        title="Vote closes"
        body="The top pick locks in then. Dibby gives everyone a heads-up in the last hour."
        name="vote_deadline"
        save={p.actions.setVoteDeadline}
      >
        <DateTimeField name="vote_deadline" label="Closes at" defaultValue={p.deadlineInput} required />
      </TextSheet>
      <TextSheet
        open={sheet === "spots"}
        onClose={close}
        title="Spots"
        body={`${p.going} going now, plus-ones included. Anyone over the limit goes on the waitlist.`}
        field={{ label: "How many spots", name: "capacity", type: "number", inputMode: "numeric", min: 2, max: 20, defaultValue: String(p.capacity), required: true }}
        save={(v) => p.actions.setCapacity(Number(v))}
      />

      <Modal.Root open={sheet === "where"} onOpenChange={(o) => !o && close()}>
        <Modal.Content>
          <Modal.Header title="Where" />
          <Modal.Body>
            <div className="db-stack">
              <PlaceSection
                bare
                status={p.status}
                venue={p.venue}
                area={p.area}
                optionCount={p.optionCount}
                setPlace={p.actions.setPlace}
                openVote={p.actions.openVote}
              />
              {voting && <AreaField area={p.area} save={p.actions.setArea} />}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close asChild>
              <Button.Root variant="neutral" mode="lighter" size="large" block>
                Done
              </Button.Root>
            </Modal.Close>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <Modal.Root open={sheet === "vibe"} onOpenChange={(o) => !o && close()}>
        <Modal.Content>
          <Modal.Header title="How Dibby talks" />
          <Modal.Body>
            <div className="db-stack">
              <p className="paragraph-sm muted">Changes how Dibby and the app talk on this plan, straight away. Dibby&rsquo;s reminders already in the chat change too.</p>
              <VibePick value={p.vibe} onChange={p.actions.setVibe} />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close asChild>
              <Button.Root variant="neutral" mode="lighter" size="large" block>
                Done
              </Button.Root>
            </Modal.Close>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <Modal.Root open={sheet === "volume"} onOpenChange={(o) => !o && close()}>
        <Modal.Content>
          <Modal.Header title="How chatty is Dibby?" />
          <Modal.Body>
            <VolumePick value={p.volume} save={p.actions.setVolume} />
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close asChild>
              <Button.Root variant="neutral" mode="lighter" size="large" block>
                Done
              </Button.Root>
            </Modal.Close>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <Modal.Root open={sheet === "cancel"} onOpenChange={(o) => !o && close()}>
        <Modal.Content>
          <Modal.Header title="Call it off?" />
          <Modal.Body>The plan stays up, marked as called off, so nobody&rsquo;s left wondering. This can&rsquo;t be undone.</Modal.Body>
          <Modal.Footer>
            <form action={p.actions.cancel} className="contents">
              <Button.Root variant="error" size="large" block>
                Yep, call it off
              </Button.Root>
            </form>
            <Modal.Close asChild>
              <Button.Root variant="neutral" mode="lighter" size="large" block>
                Keep it on
              </Button.Root>
            </Modal.Close>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  const id = `group-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section className="edit-plan__group" aria-labelledby={id}>
      <h2 id={id} className="subheading-sm eyebrow">
        {label}
      </h2>
      <div className="db-card edit-plan__list">{children}</div>
    </section>
  );
}

function Row({ label, value, onOpen }: { label: string; value: string; onOpen: () => void }) {
  return (
    <button type="button" className="edit-plan__row" onClick={onOpen}>
      <span className="label-md">{label}</span>
      <span className="edit-plan__value paragraph-sm">{value}</span>
      <i className="ri-arrow-right-s-line db-icon" aria-hidden="true" />
    </button>
  );
}

/** Plus-ones flips straight from the list: there's nothing else to set. */
function PlusOnesRow({ on, save }: { on: boolean; save: (on: boolean) => Promise<Result> }) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(on);
  return (
    <label className="edit-plan__row">
      <span className="label-md">Plus-ones</span>
      <span className="edit-plan__value paragraph-sm">{shown ? "Welcome" : "Off"}</span>
      <Switch.Root
        checked={shown}
        disabled={pending}
        aria-label="Plus-ones welcome"
        onCheckedChange={(v: boolean) =>
          start(async () => {
            setShown(v);
            const r = await save(v);
            if (r.error) toast.error(r.error);
          })
        }
      />
    </label>
  );
}

/** One field in a sheet. Saves on Done; stays open with the reason if it can't. */
function TextSheet({
  open,
  onClose,
  title,
  body,
  extra,
  field,
  name = field?.name ?? "",
  save,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  /** Shown under the field, e.g. another way to set it. */
  extra?: ReactNode;
  /** A plain text field, or pass `name` and your own input as children. */
  field?: Parameters<typeof Field>[0];
  name?: string;
  save: (v: string) => Promise<Result>;
  children?: ReactNode;
}) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <Modal.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setError(undefined);
          onClose();
        }
      }}
    >
      <Modal.Content>
        <form
          className="contents"
          onSubmit={(e) => {
            e.preventDefault();
            const v = String(new FormData(e.currentTarget).get(name) ?? "");
            start(async () => {
              const r = await save(v);
              if (r.error) setError(r.error);
              else {
                setError(undefined);
                onClose();
                toast.success("Saved");
              }
            });
          }}
        >
          <Modal.Header title={title} />
          <Modal.Body>
            <div className="db-stack">
              {body && <p className="paragraph-sm muted">{body}</p>}
              <div key={String(open)} className="contents">{field ? <Field {...field} /> : children}</div>
              <FormError error={error} />
              {extra}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button.Root size="large" block disabled={pending}>
              {pending ? "Saving…" : "Done"}
            </Button.Root>
            <Modal.Close asChild>
              <Button.Root type="button" variant="neutral" mode="lighter" size="large" block>
                Cancel
              </Button.Root>
            </Modal.Close>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}

/** The rough area for a vote, under the place controls in the Where sheet. */
function AreaField({ area, save }: { area: string | null; save: (v: string) => Promise<Result> }) {
  const [pending, start] = useTransition();
  return (
    <form
      className="db-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const v = String(new FormData(e.currentTarget).get("area") ?? "");
        start(async () => {
          const r = await save(v);
          if (r.error) toast.error(r.error);
          else toast.success("Saved");
        });
      }}
    >
      <Field label="Around where?" name="area" defaultValue={area ?? ""} icon="ri-map-pin-line" maxLength={80} autoComplete="off" hint="Dibby and the map search around here." />
      <Button.Root variant="neutral" mode="lighter" block disabled={pending}>
        {pending ? "Saving…" : "Save area"}
      </Button.Root>
    </form>
  );
}

/** Quiet, normal or loud, each with what it means. Saves on tap. */
function VolumePick({ value, save }: { value: DibbyVolume; save: (v: DibbyVolume) => Promise<void> }) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(value);
  return (
    <div className="edit-plan__choices" role="radiogroup" aria-label="How chatty is Dibby?" aria-busy={pending}>
      {(["quiet", "normal", "loud"] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={shown === v}
          className="edit-plan__choice"
          onClick={() =>
            start(async () => {
              setShown(v);
              await save(v);
            })
          }
        >
          <span className="label-md">{VOLUME[v].label}</span>
          <span className="paragraph-sm muted">{VOLUME[v].hint}</span>
        </button>
      ))}
    </div>
  );
}
