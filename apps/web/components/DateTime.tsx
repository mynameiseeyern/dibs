"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RiCalendarLine, RiTimeLine } from "@remixicon/react";
import { Calendar } from "@/components/ui/datepicker";
import * as Popover from "@/components/ui/popover";
import * as Select from "@/components/ui/select";
import * as Button from "@/components/ui/button";
import * as Label from "@/components/ui/label";
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
      <Label.Root htmlFor={`${name}-date`}>{label}</Label.Root>
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2">
        <DatePopover value={date} onChange={setDate}>
          <Button.Root id={`${name}-date`} type="button" variant="neutral" mode="stroke" className="justify-start">
            <Button.Icon as={RiCalendarLine} />
            <span className={date ? undefined : "text-text-sub-600"}>{date ? dateLabel(date) : "Pick a day"}</span>
          </Button.Root>
        </DatePopover>
        <TimeSelect value={time} onChange={setTime} />
      </div>
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
