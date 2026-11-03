"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Dibby } from "@/components/Dibby";
import * as Button from "@/components/ui/button";

// Shown instead of the browser's bare "couldn't load" page when something breaks.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);
  return (
    <main className="page page--center">
      <section className="empty">
        <Dibby mood="oops" size="lg" />
        <h1 className="title-h3">Well, that didn&rsquo;t work</h1>
        <p className="muted">Something went wrong on our end. Give it another go.</p>
        <Button.Root  onClick={() => reset()}>
          Try again
        </Button.Root>
        <Button.Root asChild mode="ghost" size="small">
          <a href="/">
            Back to Dibby
          </a>
        </Button.Root>
        {error.digest && <p className="paragraph-sm muted">Ref {error.digest}</p>}
      </section>
    </main>
  );
}
