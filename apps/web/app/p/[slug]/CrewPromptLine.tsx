"use client";

import { useEffect, useState } from "react";
import * as LinkButton from "@/components/ui/link-button";

const KEY = "dibs:crewPromptDismissed";

function read(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * "Turn this into a crew?" on the web (ARV-96): crews are app only, so one line pointing there.
 * "Not now" hides it for these same people in this browser.
 */
export function CrewPromptLine({ suggestionKey, who }: { suggestionKey: string; who: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(!read().includes(suggestionKey)), [suggestionKey]);
  if (!shown) return null;
  return (
    <p className="paragraph-xs muted who__cap">
      Same crew again? {who} have been on your plans before. <a href="/app">Make them a crew in the app</a> and every plan&rsquo;s in one spot.{" "}
      <LinkButton.Root
        type="button"
        variant="gray"
        size="small"
        onClick={() => {
          try {
            localStorage.setItem(KEY, JSON.stringify([...read().filter((k) => k !== suggestionKey), suggestionKey].slice(-40)));
          } catch {}
          setShown(false);
        }}
      >
        Not now
      </LinkButton.Root>
    </p>
  );
}
