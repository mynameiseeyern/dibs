"use client";

import { useActionState, useMemo, useState } from "react";
import { DibbyMark } from "@/components/Logo";
import { FormError } from "@/components/Field";
import { createWithDibby } from "../actions";
import { VibePick } from "@/components/VibePick";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

const TZ = "Australia/Sydney";
const TIMES = [
  { id: "11:00", label: "Brunch" },
  { id: "12:30", label: "Lunch" },
  { id: "15:00", label: "Arvo" },
  { id: "18:00", label: "Drinks" },
  { id: "19:00", label: "Dinner" },
  { id: "21:00", label: "Late" },
] as const;
const SPENDS = [
  { id: 1, label: "$", name: "Cheap" },
  { id: 2, label: "$$", name: "Mid-range" },
  { id: 3, label: "$$$", name: "Fancy" },
] as const;

/** Today and the next six days in Sydney: { id: "2026-10-24", label: "Sat 24" }. */
function nextDays() {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const short = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short", day: "numeric" });
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400_000);
    return { id: ymd.format(d), label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : short.format(d) };
  });
}

/**
 * Ask Dibby to set up a plan. Type what you're after, and tap a day, a time, a budget and
 * "Near me" if you like: anything tapped is fixed, so Dibby never has to guess it.
 */
export function AskDibby() {
  const [state, action, pending] = useActionState(createWithDibby, undefined);
  const days = useMemo(nextDays, []);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [spend, setSpend] = useState<number | null>(null);
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const toggleNear = () => {
    if (near) return setNear(null);
    if (!navigator.geolocation) return toast.error("This browser can't share your location.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        // About 100m is plenty to find spots nearby, and keeps the exact spot private.
        setNear({ lat: Math.round(pos.coords.latitude * 1000) / 1000, lng: Math.round(pos.coords.longitude * 1000) / 1000 });
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location", { description: "Type the suburb instead, like “in Newtown”." });
      },
      { maximumAge: 300_000, timeout: 10_000 }
    );
  };

  return (
    <form action={action} className="db-card section" aria-labelledby="ask-h">
      <div className="db-row">
        <DibbyMark size={36} />
        <h2 id="ask-h" className="title-h4">Ask Dibby</h2>
      </div>
      <label htmlFor="ask" className="sr-only">What are you after?</label>
      <Input.Root>
        <Input.Wrapper>
          <Input.Input id="ask" name="ask" placeholder="Dumplings in Haymarket, bowling, bottomless brunch…" maxLength={500} autoComplete="off" />
        </Input.Wrapper>
      </Input.Root>

      <input type="hidden" name="pick_date" value={date ?? ""} />
      <input type="hidden" name="pick_time" value={time ?? ""} />
      <input type="hidden" name="pick_spend" value={spend ?? ""} />
      <input type="hidden" name="near_lat" value={near?.lat ?? ""} />
      <input type="hidden" name="near_lng" value={near?.lng ?? ""} />

      <Chips label="When" items={days} value={date} onChange={setDate} />
      <Chips label="Time" items={TIMES} value={time} onChange={setTime} />
      <div className="chip-group">
        <span className="label-sm" id="chips-where">Budget and where</span>
        <div className="chip-row" role="group" aria-labelledby="chips-where">
          {SPENDS.map((s) => (
            <Chip key={s.id} on={spend === s.id} onClick={() => setSpend(spend === s.id ? null : s.id)} aria-label={s.name}>
              {s.label}
            </Chip>
          ))}
          <Chip on={Boolean(near)} onClick={toggleNear} disabled={locating}>
            <i className={`${near ? "ri-map-pin-fill" : "ri-map-pin-line"} db-icon`} aria-hidden="true" />
            {locating ? "Finding you…" : "Near me"}
          </Chip>
        </div>
      </div>

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <Label.Root asChild className="mb-2">
          <legend>Vibe</legend>
        </Label.Root>
        <VibePick />
      </fieldset>
      {pending ? (
        <p className="paragraph-sm muted typing" aria-live="polite">
          Dibby&rsquo;s on it<span className="dots" aria-hidden="true"><i /><i /><i /></span>
        </p>
      ) : (
        <p className="paragraph-sm muted">
          Dibby picks three real spots and opens a vote. Anything you tap is locked in; skip the time and it stays to be decided. What you type goes to an AI provider.
        </p>
      )}
      <FormError error={state?.error} />
      <Button.Root block disabled={pending}>
        <i className="ri-sparkling-line db-icon" aria-hidden="true" />
        {pending ? "Drafting…" : "Draft it"}
      </Button.Root>
    </form>
  );
}

function Chips<T extends string>({ label, items, value, onChange }: { label: string; items: readonly { id: T; label: string }[]; value: T | null; onChange: (v: T | null) => void }) {
  const id = `chips-${label.toLowerCase()}`;
  return (
    <div className="chip-group">
      <span className="label-sm" id={id}>
        {label}
      </span>
      <div className="chip-row" role="group" aria-labelledby={id}>
        {items.map((it) => (
          <Chip key={it.id} on={value === it.id} onClick={() => onChange(value === it.id ? null : it.id)}>
            {it.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/** A one-tap toggle. Tap again to clear. */
function Chip({ on, children, ...rest }: { on: boolean; children: React.ReactNode } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  return (
    <Button.Root type="button" variant={on ? "primary" : "neutral"} mode={on ? "filled" : "lighter"} className="flex-none px-4" aria-pressed={on} {...rest}>
      {children}
    </Button.Root>
  );
}
