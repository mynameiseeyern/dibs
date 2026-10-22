"use client";

import { useActionState, useState } from "react";
import { FormError } from "@/components/Field";
import type { FormState } from "./actions";

type Person = { id: string; first: string; initials: string; colour: string };

export function RecapForm({
  action,
  people,
  initial,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  people: Person[];
  initial: { stars: number | null; best: string | null; mvp: string | null };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [stars, setStars] = useState(initial.stars ?? 0);

  return (
    <form action={formAction} className="db-card section">
      <h2 className="title-h4">How was it?</h2>

      <fieldset className="stars" aria-label="Rate the night out of 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="stars__star">
            <input type="radio" name="stars" value={n} checked={stars === n} onChange={() => setStars(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} />
            <i className={n <= stars ? "ri-star-fill" : "ri-star-line"} aria-hidden="true" />
          </label>
        ))}
      </fieldset>

      <div className="db-field">
        <label className="db-label" htmlFor="best_moment">Best moment</label>
        <div className="db-input">
          <input id="best_moment" name="best_moment" defaultValue={initial.best ?? ""} maxLength={280} placeholder="Tom losing roulette on his birthday week" autoComplete="off" />
        </div>
      </div>

      {people.length > 0 && (
        <fieldset className="db-field">
          <legend className="db-label">MVP</legend>
          <div className="mvp">
            {people.map((p) => (
              <label key={p.id} className="mvp__pick">
                <input type="radio" name="mvp" value={p.id} defaultChecked={initial.mvp === p.id} />
                <span>
                  <span className={`db-avatar db-avatar--${p.colour}`} aria-hidden="true">{p.initials}</span>
                  {p.first}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <FormError error={state?.error} />
      {state?.saved && (
        <p className="db-hint" role="status"><i className="ri-check-line" aria-hidden="true" /> Saved to the diary.</p>
      )}
      <button className="db-btn db-btn--primary db-btn--lg db-btn--block" disabled={pending}>
        {pending ? "Saving…" : initial.stars || initial.best || initial.mvp ? "Update my answers" : "Save to the diary"}
      </button>
    </form>
  );
}
