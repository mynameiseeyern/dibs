"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/Field";
import type { FormState } from "./actions";
import { ROULETTE_CAP_CENTS, rouletteAllowed } from "@dibs/shared/bills";

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
      <div className="db-field">
        <label className="db-label" htmlFor="title">What for</label>
        <div className="db-input"><input id="title" name="title" placeholder="Dinner" maxLength={80} autoComplete="off" /></div>
      </div>
      <div className="db-field">
        <label className="db-label" htmlFor="total">Total</label>
        <div className="db-input">
          <span className="money muted" aria-hidden="true">$</span>
          <input id="total" name="total" inputMode="decimal" placeholder="186.00" value={total} onChange={(e) => setTotalSafe(e.target.value)} className="money" required />
        </div>
      </div>
      <div className="db-field">
        <span className="db-label" id="split-l">Split</span>
        <div className="db-segmented" role="group" aria-labelledby="split-l">
          {MODES.map((m) => {
            const tooBig = m.id === "roulette" && cents(total) > ROULETTE_CAP_CENTS;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                aria-label={m.name}
                disabled={tooBig}
                title={tooBig ? `Roulette is for bills up to ${aud(ROULETTE_CAP_CENTS)}` : m.name}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            );
          })}
        </div>
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
              <label key={p.id} className="db-check tick">
                <span className="label-md person__name">{p.name}</span>
                {custom ? (
                  <span className="db-input split-part">
                    {mode === "amount" && <span className="money muted" aria-hidden="true">$</span>}
                    <input
                      name={`${mode}:${p.id}`}
                      inputMode="decimal"
                      className="money"
                      placeholder="0"
                      value={parts[p.id] ?? ""}
                      onChange={(e) => setParts((x) => ({ ...x, [p.id]: e.target.value }))}
                      aria-label={`${p.name}'s ${mode === "amount" ? "amount" : "percentage"}`}
                    />
                    {mode === "percent" && <span className="money muted" aria-hidden="true">%</span>}
                  </span>
                ) : (
                  <span className="money">{mode === "exclude" && !on.has(p.id) ? "—" : cents(total) ? aud(each) : ""}</span>
                )}
                {mode === "exclude" && (
                  <input
                    type="checkbox"
                    name="on"
                    value={p.id}
                    checked={on.has(p.id)}
                    onChange={() => setOn((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })}
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
        <div className="db-field">
          <label className="db-label" htmlFor="payid">Your PayID</label>
          <div className="db-input"><i className="ri-bank-line db-icon" aria-hidden="true" /><input id="payid" name="payid" placeholder="Phone, email or ABN" required /></div>
          <p className="db-hint">Only the people on this bill see it.</p>
        </div>
      )}
      <FormError error={state?.error} />
      <button className="db-btn db-btn--primary db-btn--lg db-btn--block" disabled={pending}>{pending ? "Saving…" : "Save bill"}</button>
    </form>
  );
}
