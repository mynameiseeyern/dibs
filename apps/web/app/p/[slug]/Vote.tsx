"use client";

import { useActionState } from "react";
import type { PlanOption } from "@dibs/shared/types";
import type { FormState } from "./actions";
import { Fresh } from "@/components/moments/Fresh";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import * as Input from "@/components/ui/input";

export interface VoteRow extends PlanOption {
  votes: number;
  mine: boolean;
}

export function VoteList({
  rows,
  canVote,
  open,
  vote,
  add,
}: {
  rows: VoteRow[];
  canVote: boolean;
  open: boolean;
  vote: (optionId: string) => Promise<void>;
  add: (s: FormState, f: FormData) => Promise<FormState>;
}) {
  const total = rows.reduce((n, r) => n + r.votes, 0);
  const top = Math.max(0, ...rows.map((r) => r.votes));
  const [state, addAction, adding] = useActionState(add, undefined);

  return (
    <Fresh>
      {rows.length === 0 && <p className="paragraph-sm muted">No options yet. Add one, or ask Dibby.</p>}
      {rows.map((r) => {
        const share = total ? Math.round((r.votes / total) * 100) : 0;
        const winning = top > 0 && r.votes === top;
        return (
          <button
            key={r.id}
            type="button"
            className={`db-vote${winning ? " db-vote--winning" : ""}`}
            data-fresh-id={r.id}
            aria-pressed={r.mine}
            disabled={!canVote || !open}
            onClick={() => vote(r.id)}
          >
            <span className="db-vote__title">{r.label}</span>
            <span className="db-vote__meta">
              {r.votes} {r.votes === 1 ? "vote" : "votes"}
              {r.mine ? " · you voted" : ""}
              {r.note ? ` · ${r.note}` : ""}
            </span>
            <span className="db-vote__count">{r.votes}</span>
            <span className="db-vote__bar">
              <span style={{ width: `${share}%` }} />
            </span>
          </button>
        );
      })}
      {canVote && open && (
        <form action={addAction} className="add-option">
          <label htmlFor="label" className="sr-only">
            Add an option
          </label>
          <Input.Root className="flex-1">
            <Input.Wrapper>
              <Input.Icon as="i" className="ri-add-line" aria-hidden="true" />
              <Input.Input id="label" name="label" placeholder="Add an option" maxLength={80} autoComplete="off" />
            </Input.Wrapper>
          </Input.Root>
          <Button.Root variant="neutral" mode="lighter" disabled={adding}>
            Add
          </Button.Root>
        </form>
      )}
      {state?.error && (
        <Hint.Root hasError role="alert">
          {state.error}
        </Hint.Root>
      )}
    </Fresh>
  );
}
