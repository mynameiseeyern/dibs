import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";
import { usingSupabase } from "./store";

export interface Organiser {
  id: string;
  email: string | null;
}

/** Supabase client bound to the request cookies, for magic-link sign-in. */
export async function supabaseAuth() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

const DEMO_COOKIE = "dibs_demo_user";

/** The signed-in organiser, or null. In demo mode (no Supabase) a cookie stands in for the session. */
export async function currentOrganiser(): Promise<Organiser | null> {
  if (!usingSupabase) {
    const id = (await cookies()).get(DEMO_COOKIE)?.value;
    return id ? { id, email: null } : null;
  }
  const { data } = await (await supabaseAuth()).auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

/** Demo mode only: sign in without email. */
export async function demoSignIn(): Promise<void> {
  if (usingSupabase) throw new Error("Demo sign-in is off when Supabase is set up");
  (await cookies()).set(DEMO_COOKIE, randomUUID(), { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function signOut(): Promise<void> {
  if (usingSupabase) await (await supabaseAuth()).auth.signOut();
  else (await cookies()).delete(DEMO_COOKIE);
}
