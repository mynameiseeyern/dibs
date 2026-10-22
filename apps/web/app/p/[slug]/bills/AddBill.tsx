"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/Field";
import type { FormState } from "./actions";

type Person = { id: string; name: string };
const MODES = [
  { id: "even", label: "Even" },
  { id: "exclude", label: "Not all" },
  { id: "roulette", label: "Spin" },
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
  const [on, setOn] = useState<Set<string>>(new Set(people.map((p) => p.id)));
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
          <input id="total" name="total" inputMode="decimal" placeholder="186.00" value={total} onChange={(e) => setTotal(e.target.value)} className="money" required />
        </div>
      </div>
      <div className="db-field">
        <span className="db-label" id="split-l">Split</span>
        <div className="db-segmented" role="group" aria-labelledby="split-l">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>
          ))}
        </div>
      </div>

      {mode === "roulette" ? (
        <p className="paragraph-sm muted">Card roulette: people opt in, you spin, the loser pays the lot. Nobody's on the wheel unless they tap in.</p>
      ) : (
        <div className="db-card">
          <div className="people">
            {people.map((p) => (
              <label key={p.id} className="db-check tick">
                <span className="label-md person__name">{p.name}</span>
                <span className="money">{mode === "exclude" && !on.has(p.id) ? "—" : cents(total) ? aud(each) : ""}</span>
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
      {mode !== "roulette" && cents(total) % Math.max(count, 1) !== 0 && (
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
