"use client";

import { useTransition } from "react";
import * as Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/** People you've blocked, and the way back. Only there when there's someone on it. */
export function BlockedPeople({ people, unblock }: { people: { person: string; name: string }[]; unblock: (person: string) => Promise<{ error?: string }> }) {
  const [pending, start] = useTransition();
  if (people.length === 0) return null;
  return (
    <section className="db-card section" aria-labelledby="blocked-h">
      <h2 id="blocked-h" className="label-lg">People you&rsquo;ve blocked</h2>
      <ul className="flex flex-col gap-2">
        {people.map((p) => (
          <li key={p.person} className="flex items-center justify-between gap-3">
            <span className="paragraph-md">{p.name}</span>
            <Button.Root
              variant="neutral"
              mode="stroke"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await unblock(p.person);
                  if (res.error) toast.error(res.error);
                })
              }
            >
              Unblock
            </Button.Root>
          </li>
        ))}
      </ul>
    </section>
  );
}
