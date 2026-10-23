"use client";

import { useEffect, useState } from "react";
import * as Alert from "@/components/ui/alert";

/** Says so when the phone goes offline, so a tap that doesn't land isn't a mystery (ARV-53). */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="offline-banner">
      <Alert.Root status="warning" role="status">
        <Alert.Icon as="i" className="ri-wifi-off-line" aria-hidden="true" />
        <div>You&rsquo;re offline. Anything you tap will send when you&rsquo;re back.</div>
      </Alert.Root>
    </div>
  );
}
