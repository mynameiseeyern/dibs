import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import type { AuthSession, Me } from "@dibs/shared/api";
import { getMe, refresh, setSignedOutHandler, setTokenSource, verifyCode } from "./api";

/**
 * Who's signed in on this phone. The session (from an emailed code) lives in the keychain /
 * keystore, never in plain storage; `api.ts` asks here for a token on every call and this
 * refreshes it a minute before it runs out.
 */

// SecureStore keys allow letters, digits, ".", "-" and "_" only.
const KEY = "dibs.session";

type State =
  | { status: "loading" }
  | { status: "signedOut" }
  /** Signed in. `me` is null when we couldn't reach the server at launch; `me.name` is null until the name step. */
  | { status: "signedIn"; me: Me | null };

type SessionApi = {
  state: State;
  signIn: (email: string, code: string) => Promise<Me>;
  signOut: () => Promise<void>;
  /** After the name step, or anything else that changes `me`. */
  setMe: (me: Me) => void;
};

const Ctx = createContext<SessionApi | null>(null);

async function load(): Promise<AuthSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

async function save(s: AuthSession | null) {
  try {
    if (s) await SecureStore.setItemAsync(KEY, JSON.stringify(s));
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Keychain locked or unavailable: they'll be asked to sign in next time.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const session = useRef<AuthSession | null>(null);
  const refreshing = useRef<Promise<AuthSession | null> | null>(null);

  const clear = useCallback(async () => {
    session.current = null;
    await save(null);
    setState({ status: "signedOut" });
  }, []);

  /** A token good for at least another minute, refreshing (once, however many calls ask) if not. */
  const token = useCallback(async (): Promise<string | null> => {
    const s = session.current;
    if (!s) return null;
    if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
    refreshing.current ??= refresh(s.refresh_token)
      .then(async (fresh) => {
        session.current = fresh;
        await save(fresh);
        return fresh;
      })
      .catch(async () => {
        await clear();
        return null;
      })
      .finally(() => {
        refreshing.current = null;
      });
    return (await refreshing.current)?.access_token ?? null;
  }, [clear]);

  useEffect(() => {
    setTokenSource(token);
    setSignedOutHandler(() => void clear());
    let live = true;
    (async () => {
      session.current = await load();
      if (!session.current) return live && setState({ status: "signedOut" });
      try {
        const me = await getMe();
        if (live) setState({ status: "signedIn", me });
      } catch {
        // Offline at launch: keep the session, show what we can; a 401 already signed them out.
        if (live && session.current) setState({ status: "signedIn", me: null });
      }
    })();
    return () => {
      live = false;
    };
  }, [token, clear]);

  const api = useMemo<SessionApi>(
    () => ({
      state,
      async signIn(email, code) {
        const s = await verifyCode(email, code);
        session.current = s;
        await save(s);
        const me = await getMe();
        setState({ status: "signedIn", me });
        return me;
      },
      signOut: clear,
      setMe: (me) => setState({ status: "signedIn", me }),
    }),
    [state, clear]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}
