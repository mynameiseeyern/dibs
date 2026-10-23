"use client";

import { useState } from "react";
import * as Button from "@/components/ui/button";

/**
 * "Get the Dibby app" for guests. There's no app yet, so the tap is counted (web to app, ARV-50)
 * and the button says so honestly instead of pretending to go somewhere.
 */
export function GetTheApp({ onTap }: { onTap: () => Promise<void> }) {
  const [tapped, setTapped] = useState(false);
  if (tapped) {
    return (
      <p className="paragraph-sm muted" role="status">
        Legend. The app&rsquo;s not out yet, but you&rsquo;re counted in. Your plans will be waiting when it lands.
      </p>
    );
  }
  return (
    <Button.Root
      type="button"
      variant="neutral"
      mode="ghost"
      size="small"
      onClick={() => {
        setTapped(true);
        onTap().catch(() => {});
      }}
    >
      <i className="ri-smartphone-line db-icon" aria-hidden="true" />
      Get the Dibby app
    </Button.Root>
  );
}
