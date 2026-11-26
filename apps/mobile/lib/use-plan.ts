import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { PlanDetail } from "@dibs/shared/api";
import { ApiError, getPlanDetail } from "./api";
import { useSession } from "./session";

/** How often an open plan checks for new votes, RSVPs and messages. */
const EVERY_MS = 8000;

export type PlanState = { kind: "loading" } | { kind: "missing" } | { kind: "error"; message: string } | { kind: "ok"; detail: PlanDetail };

/**
 * A plan as this phone's person sees it, kept fresh while the screen's open. `apply` takes the
 * detail an action sends back (each one returns it), so taps update straight away.
 */
export function usePlan(slug: string) {
  const [state, setState] = useState<PlanState>({ kind: "loading" });
  // Wait until we know who's on this phone (the sign-in and guest pass come out of the keychain),
  // or a cold start from a link loads the plan as a stranger until the next refresh. And load it
  // again whenever that changes (signing in, joining as a guest).
  const { state: auth, hasGuestPass } = useSession();
  const who = auth.status === "loading" ? null : `${auth.status}:${auth.status === "signedIn" ? (auth.me?.id ?? "") : ""}:${hasGuestPass}`;
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      setState({ kind: "ok", detail: await getPlanDetail(slug) });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setState({ kind: "missing" });
      // Offline for a sec: keep showing what we had.
      else setState((prev) => (prev.kind === "ok" ? prev : { kind: "error", message: (e as Error).message }));
    } finally {
      busy.current = false;
    }
  }, [slug]);

  useFocusEffect(
    useCallback(() => {
      if (!who) return;
      refresh();
      const t = setInterval(refresh, EVERY_MS);
      return () => clearInterval(t);
    }, [refresh, who])
  );

  const apply = useCallback((detail: PlanDetail) => setState({ kind: "ok", detail }), []);
  return { state, refresh, apply };
}
