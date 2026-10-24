"use client";

import { useEffect } from "react";

/** Marks the chat as seen when it opens, and again whenever a new message shows up while it's open. */
export function MarkSeen({ latest, mark }: { latest: string | null; mark: () => Promise<void> }) {
  useEffect(() => {
    mark().catch(() => {});
    // Only when the latest message changes: the page refreshes every few seconds and hands over a new `mark` each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest]);
  return null;
}
