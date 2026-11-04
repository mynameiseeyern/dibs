"use client";

import { useActionState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { keepMyPlans } from "../../actions";
import { trackGate } from "../../gate-actions";
import { GateSeen } from "@/components/GateSeen";
import { FieldError } from "@/components/Field";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";

/**
 * Where a guest's composer would be. Chat needs an account, and an email is all it takes:
 * one sign-in link, which brings them back here with their plans moved onto the account.
 */
export function ChatEmailGate({ planId, demo }: { planId: string; demo: boolean }) {
  const next = usePathname();
  const [state, action, pending] = useActionState(keepMyPlans, undefined);
  useEffect(() => {
    if (state?.sent) void trackGate("chat", "converted", planId).catch(() => {});
  }, [state?.sent, planId]);

  return (
    <section className="composer" aria-labelledby="chat-gate-h">
      <GateSeen gate="chat" planId={planId} />
      <div>
        <h2 id="chat-gate-h" className="label-sm">
          {state?.sent ? "Check your email" : "Want to say something?"}
        </h2>
        <p className="paragraph-sm muted">
          {state?.sent ? `Tap the link we sent to ${state.sent} and you'll be back here, ready to chat.` : "Add your email to chat. One sign-in link, no password."}
        </p>
      </div>
      {!state?.sent && (
        <form action={action} className="composer__row">
          <input type="hidden" name="next" value={next} />
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
