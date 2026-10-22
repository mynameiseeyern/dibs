"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/Field";
import type { FormState } from "./actions";
import { ROULETTE_CAP_CENTS, rouletteAllowed } from "@dibs/shared/bills";
import * as Button from "@/components/ui/button";
import * as Label from "@/components/ui/label";
import * as Hint from "@/components/ui/hint";
import * as Input from "@/components/ui/input";
import * as Checkbox from "@/components/ui/checkbox";
import * as SegmentedControl from "@/components/ui/segmented-control";

type Person = { id: string; name: string };
const MODES = [
  { id: "even", label: "Even", name: "Split evenly" },
  { id: "exclude", label: "Not all", name: "Split evenly, not everyone" },
  { id: "amount", label: "$", name: "Dollar amounts" },
  { id: "percent", label: "%", name: "Percentages" },
  { id: "roulette", label: "Spin", name: "Card roulette" },
] as const;

const cents = (raw: string) => {
  const n = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};
const aud = (c: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(c / 100);

export function AddBill({ action, people, needsPayid }: { action: (s: FormState, f: FormData) => Promise<FormState>; people: Person[]; needsPayid: boolean }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("even");
  const [total, setTotal] = useState("");
  const setTotalSafe = (v: string) => {
    setTotal(v);
    if (mode === "roulette" && !rouletteAllowed(cents(v)) && cents(v) > 0) setMode("even");
  };
  const [on, setOn] = useState<Set<string>>(new Set(people.map((p) => p.id)));
  const [parts, setParts] = useState<Record<string, string>>({});
  const custom = mode === "amount" || mode === "percent";
  const num = (raw: string | undefined) => {
    const n = Number(String(raw ?? "").replace(/[$,%\s]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const partsSum = people.reduce((n, p) => n + num(parts[p.id]), 0);
  const count = mode === "exclude" ? on.size : people.length;
  const each = count ? Math.floor(cents(total) / count) : 0;

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="mode" value={mode} />
      <div className="flex flex-col gap-2">
        <Label.Root htmlFor="title">What for</Label.Root>
        <Input.Root>
          <Input.Wrapper>
            <Input.Input id="title" name="title" placeholder="Dinner" maxLength={80} autoComplete="off" />
          </Input.Wrapper>
        </Input.Root>
      </div>
      <div className="flex flex-col gap-2">
        <Label.Root htmlFor="total">Total</Label.Root>
        <Input.Root>
          <Input.Wrapper>
            <Input.InlineAffix className="money" aria-hidden="true">$</Input.InlineAffix>
            <Input.Input id="total" name="total" inputMode="decimal" placeholder="186.00" value={total} onChange={(e) => setTotalSafe(e.target.value)} className="money" required />
          </Input.Wrapper>
        </Input.Root>
      </div>
      <div className="flex flex-col gap-2">
        <Label.Root asChild>
          <span id="split-l">Split</span>
        </Label.Root>
        <SegmentedControl.Root value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <SegmentedControl.List aria-labelledby="split-l">
            {MODES.map((m) => {
              const tooBig = m.id === "roulette" && cents(total) > ROULETTE_CAP_CENTS;
              return (
                <SegmentedControl.Trigger
                  key={m.id}
                  value={m.id}
                  aria-label={m.name}
                  disabled={tooBig}
                  title={tooBig ? `Roulette is for bills up to ${aud(ROULETTE_CAP_CENTS)}` : m.name}
                  className="disabled:cursor-not-allowed disabled:text-text-disabled-300"
                >
                  {m.label}
                </SegmentedControl.Trigger>
              );
            })}
          </SegmentedControl.List>
        </SegmentedControl.Root>
      </div>

      {cents(total) > ROULETTE_CAP_CENTS && mode !== "roulette" && (
        <p className="paragraph-xs muted">Too big for roulette: the game is for bills up to {aud(ROULETTE_CAP_CENTS)}.</p>
      )}
      {mode === "roulette" ? (
        <p className="paragraph-sm muted">Card roulette: people opt in, you spin, the loser pays the lot. Nobody's on the wheel unless they tap in. 18+ only.</p>
      ) : (
        <div className="db-card">
          <div className="people">
            {people.map((p) => (
              <label key={p.id} className="tick">
                <span className="label-md person__name">{p.name}</span>
                {custom ? (
                  <Input.Root asChild className="split-part">
                    <span>
                      <Input.Wrapper asChild>
                        <span>
                          {mode === "amount" && <Input.InlineAffix className="money" aria-hidden="true">$</Input.InlineAffix>}
                          <Input.Input
                            name={`${mode}:${p.id}`}
                            inputMode="decimal"
                            className="money"
                            placeholder="0"
                            value={parts[p.id] ?? ""}
                            onChange={(e) => setParts((x) => ({ ...x, [p.id]: e.target.value }))}
                            aria-label={`${p.name}'s ${mode === "amount" ? "amount" : "percentage"}`}
                          />
                          {mode === "percent" && <Input.InlineAffix className="money" aria-hidden="true">%</Input.InlineAffix>}
                        </span>
                      </Input.Wrapper>
                    </span>
                  </Input.Root>
                ) : (
                  <span className="money">{mode === "exclude" && !on.has(p.id) ? "—" : cents(total) ? aud(each) : ""}</span>
                )}
                {mode === "exclude" && (
                  <Checkbox.Root
                    name="on"
                    value={p.id}
                    checked={on.has(p.id)}
                    onCheckedChange={() => setOn((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })}
                    aria-label={`${p.name} is on this bill`}
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      )}
      {mode === "amount" && (
        <p className={`paragraph-sm ${cents(total) && Math.round(partsSum * 100) !== cents(total) ? "" : "muted"}`} aria-live="polite">
          Adds up to {aud(Math.round(partsSum * 100))}{cents(total) ? ` of ${aud(cents(total))}` : ""}. Leave anyone who isn&rsquo;t paying blank.
        </p>
      )}
      {mode === "percent" && (
        <p className={`paragraph-sm ${Math.round(partsSum * 100) !== 10000 ? "" : "muted"}`} aria-live="polite">
          Adds up to {Number(partsSum.toFixed(2))}% of 100%. Any leftover cent goes to one person.
        </p>
      )}
      {!custom && mode !== "roulette" && cents(total) % Math.max(count, 1) !== 0 && (
        <p className="paragraph-sm muted">Doesn't split evenly, so one person picks up the extra cent or two.</p>
      )}

      {needsPayid && (
        <div className="flex flex-col gap-2">
          <Label.Root htmlFor="payid">Your PayID</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Icon as="i" className="ri-bank-line" aria-hidden="true" />
              <Input.Input id="payid" name="payid" placeholder="Phone, email or ABN" required />
            </Input.Wrapper>
          </Input.Root>
          <Hint.Root>Only the people on this bill see it.</Hint.Root>
        </div>
      )}
      <FormError error={state?.error} />
      <Button.Root size="large" block disabled={pending}>{pending ? "Saving…" : "Save bill"}</Button.Root>
    </form>
  );
}
