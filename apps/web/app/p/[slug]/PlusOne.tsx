"use client";

import { useOptimistic, useState, useTransition } from "react";
import * as Switch from "@/components/ui/switch";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

/**
 * Under "I'm in": bringing someone. Their name is optional (blank shows as "+ 1") and saves when
 * you leave the field. Plus-ones switched off: you can only take yours off, not add one.
 */
export function PlusOne({
  on,
  name,
  allowed,
  save,
}: {
  on: boolean;
  name: string | null;
  /** Plus-ones welcome on this plan. */
  allowed: boolean;
  save: (on: boolean, name: string) => Promise<{ error?: string }>;
}) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(on);
  const [typed, setTyped] = useState(name ?? "");
  if (!allowed && !on) return null;

  const run = (nextOn: boolean, nextName: string) =>
    start(async () => {
      setShown(nextOn);
      const r = await save(nextOn, nextName);
      if (r.error) toast.error(r.error);
    });

  return (
    <div className="plus-one">
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <span className="flex-1">
          <span className="label-md block">Bringing someone?</span>
          <span className="paragraph-xs muted block">They take a spot, and you cover their share of any bills.</span>
        </span>
        <Switch.Root checked={shown} disabled={pending || (!allowed && !shown)} onCheckedChange={(v: boolean) => run(v, typed)} />
      </label>
      {shown && (
        <div className="flex flex-col gap-2">
          <Label.Root htmlFor="plus-one-name">
            Their first name <span className="muted">Optional</span>
          </Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Input
                id="plus-one-name"
                value={typed}
                maxLength={40}
                autoComplete="off"
                placeholder="Leave it blank and it's just + 1"
                onChange={(e) => setTyped(e.target.value)}
                onBlur={() => typed.trim() !== (name ?? "") && run(true, typed)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
      )}
    </div>
  );
}
