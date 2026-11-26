"use client";

import * as Button from "@/components/ui/button";

/**
 * "Get the Dibby app" for guests. It goes to /app (the waitlist until the app is in the store).
 * The tap is still counted (web to app, ARV-50): the count gets a moment to land, then we go.
 */
export function GetTheApp({ onTap, slug }: { onTap: () => Promise<void>; slug?: string }) {
  // Back to this plan once the app's in (/app's "Open your plan").
  const href = slug ? `/app?next=${encodeURIComponent(`/p/${slug}`)}` : "/app";
  return (
    <Button.Root asChild variant="neutral" mode="ghost" size="small">
      <a
        href={href}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) return void onTap().catch(() => {});
          e.preventDefault();
          Promise.race([onTap().catch(() => {}), new Promise((r) => setTimeout(r, 600))]).then(() => {
            window.location.href = href;
          });
        }}
      >
        <i className="ri-smartphone-line db-icon" aria-hidden="true" />
        Get the Dibby app, free
      </a>
    </Button.Root>
  );
}
