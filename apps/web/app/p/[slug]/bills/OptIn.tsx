"use client";

import { useEffect, useState } from "react";
import * as Checkbox from "@/components/ui/checkbox";
import * as Button from "@/components/ui/button";

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
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <Checkbox.Root name="adult" checked={adult} onCheckedChange={(v) => remember(v === true)} />
          <span className="paragraph-sm">I&rsquo;m 18 or over</span>
        </label>
      )}
      <Button.Root variant={inIt ? "neutral" : "dibs"} mode={inIt ? "lighter" : "filled"} block disabled={!inIt && needsTick && !adult}>
        {inIt ? "Actually, I'm out" : "I'm in"}
      </Button.Root>
    </form>
  );
}
