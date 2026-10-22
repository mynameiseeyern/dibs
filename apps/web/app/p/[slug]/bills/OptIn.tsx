"use client";

import { useEffect, useState } from "react";

/**
 * "I'm in" for a spin. Members with a date of birth on file just tap; guests tick
 * that they're 18+ first (remembered on this device).
 */
export function OptIn({ action, inIt, needsTick }: { action: (f: FormData) => Promise<void>; inIt: boolean; needsTick: boolean }) {
  const [adult, setAdult] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("dibs:adult") === "1") setAdult(true);
    } catch {}
  }, []);
  const remember = (v: boolean) => {
    setAdult(v);
    try {
      localStorage.setItem("dibs:adult", v ? "1" : "0");
    } catch {}
  };
  return (
    <form action={action} className="db-stack">
      {!inIt && needsTick && (
        <label className="db-check">
          <input type="checkbox" name="adult" checked={adult} onChange={(e) => remember(e.target.checked)} />
          <span className="paragraph-sm">I&rsquo;m 18 or over</span>
        </label>
      )}
      <button className={`db-btn db-btn--block ${inIt ? "db-btn--secondary" : "db-btn--dibs"}`} disabled={!inIt && needsTick && !adult}>
        {inIt ? "Actually, I'm out" : "I'm in"}
      </button>
    </form>
  );
}
