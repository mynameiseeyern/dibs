"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";
import * as Button from "@/components/ui/button";
import * as Label from "@/components/ui/label";
import * as Hint from "@/components/ui/hint";
import * as Input from "@/components/ui/input";

export function JoinForm({ action, signedIn, slug }: { action: (s: FormState, f: FormData) => Promise<FormState>; signedIn: boolean; slug: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="form" aria-describedby={state?.error ? "join-error" : undefined}>
      {!signedIn && (
        <div className="split2">
          <div className="flex min-w-0 flex-col gap-2">
            <Label.Root htmlFor="first_name">First name</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input id="first_name" name="first_name" autoComplete="given-name" required maxLength={40} />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <Label.Root htmlFor="last_name">Last name</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input id="last_name" name="last_name" autoComplete="family-name" required maxLength={40} />
              </Input.Wrapper>
            </Input.Root>
          </div>
        </div>
      )}
      {state?.error && (
        <Hint.Root id="join-error" hasError role="alert">
          <Hint.Icon as="i" className="ri-error-warning-fill" aria-hidden="true" /> {state.error}
        </Hint.Root>
      )}
      <Button.Root size="large" block disabled={pending}>
        {pending ? "Joining…" : "Join the plan"}
      </Button.Root>
      {!signedIn && (
        <p className="paragraph-sm muted">
          No app or account needed. We just remember you on this browser.{" "}
          <a href={`/login?next=${encodeURIComponent(`/p/${slug}`)}`}>Added your email on another device? Sign in</a>
        </p>
      )}
    </form>
  );
}
