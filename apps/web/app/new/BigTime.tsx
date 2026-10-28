"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

/** "19:30" → { h: 7, m: 30, pm: true }. */
function split(hhmm: string) {
  const [H, M] = hhmm.split(":").map(Number);
  return { h: H % 12 === 0 ? 12 : H % 12, m: M, pm: H >= 12 };
}
const join = (h: number, m: number, pm: boolean) => `${String((h % 12) + (pm ? 12 : 0)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
const digits = (v: string) => v.replace(/\D/g, "").slice(0, 2);

/**
 * A big, Android-style time: hour and minute boxes you tap to type into (the number pad comes
 * up), an am/pm switch, and optionally a clock dial. Posts nothing itself: the value is
 * "HH:mm" in 24-hour Sydney wall-clock time, like the rest of the form.
 */
export function BigTime({ value, onChange, dial = false, label = "Time" }: { value: string; onChange: (hhmm: string) => void; dial?: boolean; label?: string }) {
  const { h, m, pm } = split(value);
  // What's in the boxes while you type; the time itself only changes when the box makes sense.
  const [hText, setHText] = useState(String(h));
  const [mText, setMText] = useState(String(m).padStart(2, "0"));
  const [mode, setMode] = useState<"h" | "m">("h");
  const hourRef = useRef<HTMLInputElement>(null);
  useEffect(() => setHText(String(h)), [h]);
  useEffect(() => setMText(String(m).padStart(2, "0")), [m]);

  const typeHour = (v: string) => {
    const t = digits(v);
    setHText(t);
    const n = Number(t);
    if (t && n >= 1 && n <= 12) onChange(join(n, m, pm));
  };
  const typeMin = (v: string) => {
    const t = digits(v);
    setMText(t);
    const n = Number(t);
    if (t.length === 2 && n <= 59) onChange(join(h, n, pm));
  };

  const marks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 * Math.PI) / 180;
    const v = mode === "h" ? (i === 0 ? 12 : i) : i * 5;
    return {
      v,
      label: mode === "h" ? String(v) : String(v).padStart(2, "0"),
      // Percentages of the dial, so it scales with the box.
      left: 50 + 38 * Math.sin(angle),
      top: 50 - 38 * Math.cos(angle),
      on: mode === "h" ? v === h : v === m,
    };
  });
  const handDeg = mode === "h" ? (h % 12) * 30 : m * 6;

  return (
    <div className="bigtime">
      <div className="bigtime__read" role="group" aria-label={label}>
        <input
          ref={hourRef}
          className={cn("bigtime__box", dial && mode === "h" && "bigtime__box--on")}
          inputMode="numeric"
          enterKeyHint="next"
          maxLength={2}
          aria-label="Hour"
          value={hText}
          onFocus={(e) => {
            setMode("h");
            e.currentTarget.select();
          }}
          onChange={(e) => typeHour(e.target.value)}
          onBlur={() => setHText(String(h))}
        />
        <span className="bigtime__colon" aria-hidden="true">
          :
        </span>
        <input
          className={cn("bigtime__box", dial && mode === "m" && "bigtime__box--on")}
          inputMode="numeric"
          maxLength={2}
          aria-label="Minutes"
          value={mText}
          onFocus={(e) => {
            setMode("m");
            e.currentTarget.select();
          }}
          onChange={(e) => typeMin(e.target.value)}
          onBlur={() => setMText(String(m).padStart(2, "0"))}
        />
        <div className="bigtime__ampm" role="group" aria-label="Morning or afternoon">
          <button type="button" aria-pressed={!pm} onClick={() => onChange(join(h, m, false))}>
            am
          </button>
          <button type="button" aria-pressed={pm} onClick={() => onChange(join(h, m, true))}>
            pm
          </button>
        </div>
      </div>

      {dial && (
        <div className="bigtime__dial" role="group" aria-label={mode === "h" ? "Pick the hour" : "Pick the minutes"}>
          <span className="bigtime__hand" style={{ transform: `rotate(${180 + handDeg}deg)` }} aria-hidden="true" />
          <span className="bigtime__hub" aria-hidden="true" />
          {marks.map((k) => (
            <button
              key={k.label}
              type="button"
              className="bigtime__n"
              style={{ left: `${k.left}%`, top: `${k.top}%` }}
              aria-pressed={k.on}
              aria-label={mode === "h" ? `${k.v} o'clock` : `${k.v} minutes`}
              onClick={() => {
                if (mode === "h") {
                  onChange(join(k.v, m, pm));
                  // Like Android: pick the hour, then it flips to minutes.
                  setMode("m");
                } else onChange(join(h, k.v, pm));
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
