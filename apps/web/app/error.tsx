"use client";

import { useEffect } from "react";
import { CrewWave } from "@/components/Logo";

// Shown instead of the browser's bare "couldn't load" page when something breaks.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="page page--center">
      <section className="empty">
        <CrewWave />
        <h1 className="title-h3">Well, that didn&rsquo;t work</h1>
        <p className="muted">Something went wrong on our end. Give it another go.</p>
        <button className="db-btn db-btn--primary" onClick={() => reset()}>
          Try again
        </button>
        <a className="db-btn db-btn--ghost db-btn--sm" href="/">
          Back to dibs
        </a>
        {error.digest && <p className="small muted">Ref {error.digest}</p>}
      </section>
    </main>
  );
}
