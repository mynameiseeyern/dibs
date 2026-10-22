"use client";

import { useMemo, useState } from "react";
import * as Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

const TZ = "Australia/Sydney";
export const TIMES = [
  { id: "11:00", label: "Brunch" },
  { id: "12:30", label: "Lunch" },
  { id: "15:00", label: "Arvo" },
  { id: "18:00", label: "Drinks" },
  { id: "19:00", label: "Dinner" },
  { id: "21:00", label: "Late" },
] as const;
export const SPENDS = [
  { id: 1, label: "Cheap and cheerful", name: "Cheap" },
  { id: 2, label: "Mid-range", name: "Mid-range" },
  { id: 3, label: "Treat ourselves", name: "Fancy" },
] as const;

/** "today", "tomorrow" or "Sat 24", for Dibby's line. */
export function dayWord(days: { id: string; label: string }[], id: string | null): string | null {
  const d = days.find((x) => x.id === id);
  return d ? d.label.toLowerCase() : null;
}
export const timeWord = (id: string | null) => TIMES.find((t) => t.id === id)?.label.toLowerCase() ?? null;

/** Today and the next six days in Sydney: { id: "2026-10-24", label: "Sat 24" }. */
export function nextDays() {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const short = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short", day: "numeric" });
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400_000);
    return { id: ymd.format(d), label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : short.format(d) };
  });
}

export function Chips<T extends string>({ label, items, value, onChange }: { label: string; items: readonly { id: T; label: string }[]; value: T | null; onChange: (v: T | null) => void }) {
  const id = `chips-${label.toLowerCase().replace(/\W+/g, "-")}`;
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
export function Chip({ on, children, ...rest }: { on: boolean; children: React.ReactNode } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  return (
    <Button.Root type="button" variant={on ? "primary" : "neutral"} mode={on ? "filled" : "lighter"} className="flex-none px-4" aria-pressed={on} {...rest}>
      {children}
    </Button.Root>
  );
}

/** Day and time chips. Anything tapped is a fixed fact; leave both blank and the time stays to be decided. */
export type WhenValue = { date: string | null; time: string | null };
export function WhenChips({ value, onChange }: { value?: WhenValue; onChange?: (v: WhenValue) => void }) {
  const days = useMemo(nextDays, []);
  const [own, setOwn] = useState<WhenValue>({ date: null, time: null });
  const { date, time } = value ?? own;
  const set = (v: WhenValue) => (onChange ? onChange(v) : setOwn(v));
  const setDate = (d: string | null) => set({ date: d, time });
  const setTime = (t: string | null) => set({ date, time: t });
  return (
    <>
      <input type="hidden" name="pick_date" value={date ?? ""} />
      <input type="hidden" name="pick_time" value={time ?? ""} />
      <Chips label="When" items={days} value={date} onChange={setDate} />
      <Chips label="Time" items={TIMES} value={time} onChange={setTime} />
      {!date && !time && <p className="paragraph-xs muted">Leave it blank to sort the time out later.</p>}
    </>
  );
}

/** Budget and "near me" chips for Dibby's search. */
export type SearchValue = { spend: 1 | 2 | 3 | null; near: { lat: number; lng: number } | null };
export function SearchChips({ value, onChange }: { value?: SearchValue; onChange?: (v: SearchValue) => void }) {
  const [own, setOwn] = useState<SearchValue>({ spend: null, near: null });
  const { spend, near } = value ?? own;
  const set = (v: SearchValue) => (onChange ? onChange(v) : setOwn(v));
  const setSpend = (sp: 1 | 2 | 3 | null) => set({ spend: sp, near });
  const setNear = (n: { lat: number; lng: number } | null) => set({ spend, near: n });
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
    <>
      <input type="hidden" name="pick_spend" value={spend ?? ""} />
      <input type="hidden" name="near_lat" value={near?.lat ?? ""} />
      <input type="hidden" name="near_lng" value={near?.lng ?? ""} />
      <div className="chip-group">
        <span className="label-sm" id="chips-budget">The damage</span>
        <div className="chip-row" role="group" aria-labelledby="chips-budget">
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
    </>
  );
}
