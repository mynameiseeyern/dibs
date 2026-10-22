"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Finishes a magic-link sign-in from any browser. The email link lands with the session
 * in the URL fragment (#access_token=…), which works even when it opens in Gmail's or
 * Mail's in-app browser. Mounted in the root layout so it also catches links that fell
 * back to the Site URL.
 */
export function FinishSignIn() {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const h = new URLSearchParams(hash);
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));

    if (h.get("error")) {
      const expired = /expired|invalid/i.test(`${h.get("error_code")} ${h.get("error_description")}`);
      window.location.replace(`/login?error=${expired ? "expired" : "link"}&next=${encodeURIComponent(next)}`);
      return;
    }
    const access_token = h.get("access_token");
    const refresh_token = h.get("refresh_token");
    if (!access_token || !refresh_token) return;

    setBusy(true);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => window.location.replace(error ? `/login?error=link&next=${encodeURIComponent(next)}` : next));
  }, []);

  if (!busy) return null;
  return (
    <div className="signin-overlay" role="status" aria-live="polite">
      <span className="small muted typing">
        Signing you in<span className="dots" aria-hidden="true"><i /><i /><i /></span>
      </span>
    </div>
  );
}

function safeNext(n: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/home";
}
