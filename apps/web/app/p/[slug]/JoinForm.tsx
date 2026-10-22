"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

export function JoinForm({ action, signedIn }: { action: (s: FormState, f: FormData) => Promise<FormState>; signedIn: boolean }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="form" aria-describedby={state?.error ? "join-error" : undefined}>
      {!signedIn && (
        <div className="split2">
          <div className="db-field">
            <label className="db-label" htmlFor="first_name">First name</label>
            <div className="db-input">
              <input id="first_name" name="first_name" autoComplete="given-name" required maxLength={40} />
            </div>
          </div>
          <div className="db-field">
            <label className="db-label" htmlFor="last_name">Last name</label>
            <div className="db-input">
              <input id="last_name" name="last_name" autoComplete="family-name" required maxLength={40} />
            </div>
          </div>
        </div>
      )}
      {state?.error && (
        <p id="join-error" className="db-hint db-hint--error" role="alert">
          <i className="ri-error-warning-fill" aria-hidden="true" /> {state.error}
        </p>
      )}
      <button className="db-btn db-btn--primary db-btn--lg db-btn--block" disabled={pending}>
        {pending ? "Joining…" : "Join the plan"}
      </button>
      {!signedIn && <p className="paragraph-sm muted">No app or account needed. We just remember you on this device.</p>}
    </form>
  );
}
