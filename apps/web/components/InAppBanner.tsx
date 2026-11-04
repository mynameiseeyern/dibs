"use client";

import { useEffect, useState } from "react";
import * as Alert from "@/components/ui/alert";
import * as Button from "@/components/ui/button";
import { openByHand, openInBrowserHref, type InApp } from "@dibs/shared/inapp";

const KEY = "dibs:inapp-dismissed";

/**
 * Shown when the page opened inside Messenger, Instagram and co. Their browser keeps its own
 * cookies, so someone signed in (or on the plan as a guest) in Safari or Chrome shows up as a
 * stranger. A slim, dismissible nudge on plan pages; on sign-in it stays, since a sign-in link
 * from email opens in the real browser and never comes back here.
 */
export function InAppBanner({ inApp, context }: { inApp: InApp; context: "plan" | "login" }) {
  const browser = inApp.os === "ios" ? "Safari" : "your browser";
  const [hidden, setHidden] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (context !== "plan") return;
    try {
      if (sessionStorage.getItem(KEY)) setHidden(true);
    } catch {}
  }, [context]);

  if (hidden) return null;

  const open = () => {
    const href = openInBrowserHref(window.location.href, inApp.os);
    setTried(true);
    if (href) window.location.href = href;
  };
  const dismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
  };

  return (
    <Alert.Root status="information" className="inapp" role="status">
      <Alert.Icon as="i" className="ri-external-link-line" aria-hidden="true" />
      <div className="inapp__body">
        <strong>{context === "login" ? `Sign in from ${browser}` : `Opened in ${inApp.app}?`}</strong>
        <span className="paragraph-sm">
          {context === "login"
            ? `${inApp.app} has its own browser, and your sign-in link will open in ${browser}, not here.`
            : `Open this in ${browser} so you stay signed in and don't show up twice.`}
        </span>
        {(tried || inApp.os === "other") && <span className="paragraph-xs muted">{openByHand(inApp.app, inApp.os)}</span>}
        <div className="inapp__actions">
          {inApp.os !== "other" && (
            <Button.Root size="small" onClick={open}>
              Open in {inApp.os === "ios" ? "Safari" : "browser"}
            </Button.Root>
          )}
          {context === "plan" && (
            <Button.Root size="small" mode="ghost" variant="neutral" onClick={dismiss}>
              Not now
            </Button.Root>
          )}
        </div>
      </div>
    </Alert.Root>
  );
}
