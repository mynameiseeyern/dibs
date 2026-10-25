"use client";

import { useActionState } from "react";
import { FormError } from "@/components/Field";
import * as Button from "@/components/ui/button";
import { rejoin, type RejoinState } from "./actions";

export function RejoinForm({ rawKey, label }: { rawKey: string; label: string }) {
  const [state, action, pending] = useActionState<RejoinState, FormData>(rejoin.bind(null, rawKey), undefined);
  return (
    <form action={action} className="db-stack">
      <FormError error={state?.error} />
      <Button.Root size="large" block disabled={pending}>
        {pending ? "Getting your spot…" : label}
      </Button.Root>
    </form>
  );
}
