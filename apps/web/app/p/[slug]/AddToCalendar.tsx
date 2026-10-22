"use client";

import { useEffect, useState } from "react";

/**
 * One "Add to calendar" button that opens the phone's own calendar.
 * iPhone, iPad and Mac open a .ics straight into Apple Calendar's add-event sheet;
 * Android has no equivalent for .ics, so it goes to Google Calendar's add-event screen.
 * Everywhere but Android also gets a Google Calendar link. On iPhone it opens in the browser
 * (the Google Calendar app doesn't take add-event links), then syncs to the app.
 */
export function AddToCalendar({ icsHref, googleHref }: { icsHref: string; googleHref: string }) {
  const [platform, setPlatform] = useState<"apple" | "android" | "other">("other");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) setPlatform("android");
    else if (/iphone|ipad|ipod|macintosh/i.test(ua)) setPlatform("apple");
  }, []);

  const href = platform === "android" ? googleHref : icsHref;
  const external = platform === "android";

  return (
    <div className="add-to-calendar">
      <a
        className="db-btn db-btn--secondary db-btn--block"
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        <i className="ri-calendar-event-line db-icon" aria-hidden="true" />
        Add to calendar
      </a>
      {platform !== "android" && (
        <a className="paragraph-sm muted" href={googleHref} target="_blank" rel="noreferrer">
          Use Google Calendar instead
        </a>
      )}
    </div>
  );
}
