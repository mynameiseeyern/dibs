"use client";

import { useActionState, useEffect, useState } from "react";
import { keepMyPlans } from "../../../actions";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import { FieldError } from "@/components/Field";

/**
 * Asked once the plan exists, not while making it (like Shop's "Connect email" card): a guest
 * can add an email so this plan, and any others, follow them to any phone. One sign-in link,
 * no password. Dismissed for good on this plan with ×.
 */
export function KeepCard({ planId, demo }: { planId: string; demo: boolean }) {
  const key = `dibs:keep-dismissed:${planId}`;
  const [hidden, setHidden] = useState(true);
  const [state, action, pending] = useActionState(keepMyPlans, undefined);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(key) === "1");
    } catch {
      setHidden(false);
    }
  }, [key]);
  if (hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {}
    setHidden(true);
  };

  return (
    <section className="keep-card" aria-labelledby="keep-h">
      <div className="keep-card__head">
        <span className="keep-card__ico" aria-hidden="true">
          <i className={state?.sent ? "ri-mail-check-line" : "ri-mail-line"} />
        </span>
        <div className="keep-card__text">
          <h2 id="keep-h" className="label-md">
            {state?.sent ? "Check your email" : "Keep this plan on any phone"}
          </h2>
          <p className="paragraph-sm muted">{state?.sent ? `Tap the link we sent to ${state.sent}. Your plans will be waiting.` : "One sign-in link. No password."}</p>
        </div>
        <Button.Root type="button" variant="neutral" mode="ghost" iconOnly className="keep-card__x" aria-label="Not now" onClick={dismiss}>
          <Button.Icon as="i" className="ri-close-line" />
        </Button.Root>
      </div>
      {!state?.sent && (
        <form action={action} className="keep-card__row">
          {demo ? (
            <input type="hidden" name="email" value="demo@dibby.social" />
          ) : (
            <Input.Root hasError={Boolean(state?.error)} className="min-w-0 flex-1">
              <Input.Wrapper>
                <Input.Input name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" aria-label="Email" required />
              </Input.Wrapper>
            </Input.Root>
          )}
          <Button.Root disabled={pending}>{pending ? "Sending…" : "Send"}</Button.Root>
        </form>
      )}
      <FieldError error={state?.error} />
    </section>
  );
}
