"use client";

import * as Checkbox from "@/components/ui/checkbox";
import * as Label from "@/components/ui/label";
import { Field, FieldError } from "@/components/Field";

export type Organising = { kind: "account" } | { kind: "guest"; name: string } | { kind: "new" };

/**
 * The "check out as a guest" part of the form, at the end, once the plan's filled in. Your name
 * is all it takes; an email is a nice-to-have that keeps your plans and unlocks the extras.
 */
export function Organiser({ who, errorFor = () => undefined }: { who: Organising; errorFor?: (field: string) => string | undefined }) {
  if (who.kind === "account") return null;
  return (
    <section className="db-card section" aria-labelledby="org-h">
      {who.kind === "new" ? (
        <>
          <div>
            <h2 id="org-h" className="label-lg">
              Who&rsquo;s organising?
            </h2>
            <p className="paragraph-xs muted">No account needed. Your crew sees your name on the plan.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" name="first_name" autoComplete="given-name" maxLength={40} required error={errorFor("first_name")} />
            <Field label="Last name" name="last_name" autoComplete="family-name" maxLength={40} required error={errorFor("last_name")} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <Checkbox.Root name="adult" required data-field="adult" aria-invalid={errorFor("adult") ? true : undefined} />
              <span className="paragraph-sm">I&rsquo;m 18 or over</span>
            </label>
            <FieldError error={errorFor("adult")} />
          </div>
        </>
      ) : (
        <div>
          <h2 id="org-h" className="label-lg">
            Organising as {who.name}
          </h2>
          <p className="paragraph-xs muted">On this browser, no account needed.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Field
          label="Email (optional)"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={200}
          icon="ri-mail-line"
          error={errorFor("email")}
        />
        <Label.Root asChild>
          <span className="paragraph-xs muted">Add it to keep this plan and get:</span>
        </Label.Root>
        <ul className="paragraph-xs muted flex flex-col gap-1">
          <li className="flex items-center gap-2">
            <i className="ri-device-line db-icon" aria-hidden="true" /> Your plans on any phone or laptop
          </li>
          <li className="flex items-center gap-2">
            <i className="ri-price-tag-3-line db-icon" aria-hidden="true" /> Your own categories, saved
          </li>
          <li className="flex items-center gap-2">
            <i className="ri-exchange-dollar-line db-icon" aria-hidden="true" /> Your PayID on bills, so people can pay you back
          </li>
        </ul>
        <p className="paragraph-xs muted">We&rsquo;ll send one sign-in link. No password, no spam.</p>
      </div>

      {who.kind === "new" && (
        <p className="paragraph-xs muted">
          Got an account?{" "}
          <a href="/login?next=/new" className="underline">
            Sign in
          </a>
        </p>
      )}
    </section>
  );
}
