"use client";

import * as Button from "@/components/ui/button";

/**
 * "Get the Dibby app" for guests. It goes to /app (the waitlist until the app is in the store).
 * The tap is still counted (web to app, ARV-50): the count gets a moment to land, then we go.
 */
export function GetTheApp({ onTap }: { onTap: () => Promise<void> }) {
  return (
    <Button.Root asChild variant="neutral" mode="ghost" size="small">
      <a
        href="/app"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) return void onTap().catch(() => {});
          e.preventDefault();
          Promise.race([onTap().catch(() => {}), new Promise((r) => setTimeout(r, 600))]).then(() => {
            window.location.href = "/app";
          });
        }}
      >
        <i className="ri-smartphone-line db-icon" aria-hidden="true" />
        Get the Dibby app, free
      </a>
    </Button.Root>
  );
}
