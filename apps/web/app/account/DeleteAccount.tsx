"use client";

import { useState, useTransition } from "react";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";
import { FormError } from "@/components/Field";

/** Delete my account (ARV-53), behind a sheet that says exactly what happens. */
export function DeleteAccount({ action }: { action: () => Promise<{ error?: string } | void> }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <>
      <Button.Root type="button" variant="error" mode="ghost" block onClick={() => setOpen(true)}>
        <i className="ri-delete-bin-line db-icon" aria-hidden="true" />
        Delete my account
      </Button.Root>
      <Modal.Root open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <Modal.Content>
          <Modal.Header title="Delete your account?" />
          <Modal.Body>
            <div className="db-stack">
              <p>This can&rsquo;t be undone.</p>
              <ul className="paragraph-sm muted delete-list">
                <li>Your sign-in, email, date of birth and PayID are deleted.</li>
                <li>On plans you were part of, you&rsquo;ll show as &ldquo;Former member&rdquo;, so everyone else&rsquo;s bills still add up.</li>
                <li>Messages you sent stay in those plans&rsquo; chats, under that name.</li>
                <li>Plans you organised stay up for the crew, without a host.</li>
              </ul>
              <FormError error={error} />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button.Root
              type="button"
              variant="error"
              size="large"
              block
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await action();
                  if (res?.error) setError(res.error);
                })
              }
            >
              {pending ? "Deleting…" : "Delete my account"}
            </Button.Root>
            <Modal.Close asChild>
              <Button.Root type="button" variant="neutral" mode="lighter" size="large" block disabled={pending}>
                Keep it
              </Button.Root>
            </Modal.Close>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </>
  );
}
