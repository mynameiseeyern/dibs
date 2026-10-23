"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { RiCalendarLine, RiTimeLine } from "@remixicon/react";
import { Calendar } from "@/components/ui/datepicker";
import * as Popover from "@/components/ui/popover";
import * as Select from "@/components/ui/select";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";

// Date and time pickers built from AlignUI's Datepicker, Popover and Select.
// Values are plain Sydney wall-clock strings: "YYYY-MM-DD" and "HH:mm".

const TZ = "Australia/Sydney";

/** Today in Sydney, "YYYY-MM-DD". */
export const sydneyToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

/** "YYYY-MM-DD" ⇄ a local Date at midnight, which is what the calendar works in. */
const toDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "Sat 1 Nov". */
export const dateLabel = (ymd: string) => toDate(ymd).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

/** "7pm", "7:30pm". */
export function timeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

/** Every half hour from 6am to 11:30pm. */
const SLOTS = Array.from({ length: 36 }, (_, i) => {
  const mins = 6 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

/** A calendar in a popover. Past days are off; up to a year ahead. */
export function DatePopover({
  value,
  onChange,
  children,
}: {
  value: string | null;
  onChange: (ymd: string) => void;
  /** The trigger. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const today = toDate(sydneyToday());
  const max = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Content className="w-[min(352px,calc(100vw-32px))] p-2" align="start" collisionPadding={16}>
        <Calendar
          mode="single"
          selected={value ? toDate(value) : undefined}
          defaultMonth={value ? toDate(value) : today}
          onSelect={(d) => {
            if (!d) return;
            onChange(toYmd(d));
            setOpen(false);
          }}
          disabled={[{ before: today }, { after: max }]}
          fromDate={today}
          toDate={max}
          weekStartsOn={1}
        />
      </Popover.Content>
    </Popover.Root>
  );
}

/** How far ahead the strip goes before you need the calendar. */
const STRIP_DAYS = 21;

const addDays = (ymd: string, n: number) => {
  const d = toDate(ymd);
  d.setDate(d.getDate() + n);
  return toYmd(d);
};
const monthName = (ymd: string) => toDate(ymd).toLocaleDateString("en-AU", { month: "long" });

/**
 * The next three weeks as a swipeable row of day tiles, after the HR template's day picker,
 * with a calendar tile at the end for anything further out. Tap a picked day again to clear it.
 */
export function DayStrip({
  value,
  onChange,
  label,
  bleed = false,
}: {
  value: string | null;
  onChange: (ymd: string | null) => void;
  label: string;
  /** Run the strip edge to edge past the page's 16px gutter. */
  bleed?: boolean;
}) {
  const today = sydneyToday();
  const days = useMemo(() => Array.from({ length: STRIP_DAYS }, (_, i) => addDays(today, i)), [today]);
  const later = value && !days.includes(value) ? value : null;
  const row = useRef<HTMLDivElement>(null);
  const labelId = `strip-${label.toLowerCase().replace(/\W+/g, "-")}`;

  // Keep the picked day in view, including one picked from the calendar.
  useEffect(() => {
    row.current?.querySelector<HTMLElement>("[aria-pressed=true]")?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [value]);

  const first = monthName(days[0]);
  const last = monthName(later ?? days[days.length - 1]);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label-sm" id={labelId}>
          {label}
        </span>
        <span className="paragraph-xs muted">{first === last ? first : `${first} – ${last}`}</span>
      </div>
      <div
        ref={row}
        role="group"
        aria-labelledby={labelId}
        className={cn("flex snap-x gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", bleed && "-mx-4 scroll-px-4 px-4")}
      >
        {days.map((d, i) => (
          <DayTile key={d} ymd={d} on={value === d} top={i === 0 ? "Today" : undefined} onClick={() => onChange(value === d ? null : d)} />
        ))}
        {later && <DayTile ymd={later} on top={toDate(later).toLocaleDateString("en-AU", { month: "short" })} onClick={() => onChange(null)} />}
        <DatePopover value={value} onChange={onChange}>
          <button
            type="button"
            aria-label="More dates"
            className="flex h-14 w-14 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-lg bg-bg-weak-50 text-text-sub-600 transition duration-200 ease-out hover:bg-bg-soft-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <RiCalendarLine className="size-5" aria-hidden="true" />
            <span className="text-paragraph-xs">More</span>
          </button>
        </DatePopover>
      </div>
    </div>
  );
}

/** Weekday over the date, 56px tall; violet when picked. */
function DayTile({ ymd, on, top, onClick }: { ymd: string; on: boolean; top?: string; onClick: () => void }) {
  const d = toDate(ymd);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
      onClick={onClick}
      className={cn(
        "flex h-14 w-12 shrink-0 snap-start select-none flex-col items-center justify-center gap-0.5 rounded-lg",
        "transition duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        on ? "bg-primary-base text-static-white" : "text-text-strong-950 hover:bg-bg-weak-50",
      )}
    >
      <span className={cn("text-paragraph-xs", on ? "text-static-white" : "text-text-sub-600")}>
        {top ?? d.toLocaleDateString("en-AU", { weekday: "short" })}
      </span>
      <span className="text-label-md">{d.getDate()}</span>
    </button>
  );
}

/** AlignUI Select of half-hour times. Keeps an off-the-grid time (7:15pm) if that's what's set. */
export function TimeSelect({
  value,
  onChange,
  placeholder = "Time",
  id,
}: {
  value: string | null;
  onChange: (hhmm: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const slots = useMemo(() => (value && !SLOTS.includes(value) ? [...SLOTS, value].sort() : SLOTS), [value]);
  return (
    <Select.Root value={value ?? ""} onValueChange={onChange}>
      <Select.Trigger id={id}>
        <Select.TriggerIcon as={RiTimeLine} />
        <Select.Value placeholder={placeholder} />
      </Select.Trigger>
      <Select.Content>
        {slots.map((t) => (
          <Select.Item key={t} value={t}>
            {timeLabel(t)}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

/**
 * A date and a time, posted as one "YYYY-MM-DDTHH:mm" field under `name` (empty if unset).
 * Half-filled won't submit: the browser points at it with "Pick a time too".
 */
export function DateTimeField({
  name,
  label,
  hint,
  defaultValue = "",
  required = false,
}: {
  name: string;
  label: string;
  hint?: string;
  /** "YYYY-MM-DDTHH:mm" or "". */
  defaultValue?: string;
  required?: boolean;
}) {
  const [date, setDate] = useState<string | null>(defaultValue ? defaultValue.slice(0, 10) : null);
  const [time, setTime] = useState<string | null>(defaultValue ? defaultValue.slice(11, 16) : null);
  const value = date && time ? `${date}T${time}` : "";
  const check = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const msg =
      date && !time ? "Pick a time too." : time && !date ? "Pick a day too." : required && !value ? "Pick a day and time." : "";
    check.current?.setCustomValidity(msg);
  }, [date, time, value, required]);

  return (
    <div className="flex flex-col gap-2">
      <DayStrip label={label} value={date} onChange={setDate} />
      <TimeSelect value={time} onChange={setTime} placeholder="Pick a time" />
      {/* Carries the value and the half-filled warning. Visually hidden, not display:none, so the browser can point at it. */}
      <input ref={check} name={name} value={value} onChange={() => {}} className="sr-only" tabIndex={-1} aria-hidden="true" />
      {hint && <Hint.Root>{hint}</Hint.Root>}
      {!required && (date || time) && (
        <div>
          <Button.Root
            type="button"
            mode="ghost"
            onClick={() => {
              setDate(null);
              setTime(null);
            }}
          >
            Clear, sort it out later
          </Button.Root>
        </div>
      )}
    </div>
  );
}
