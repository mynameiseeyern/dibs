"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * A browser Supabase client used only to hear "this plan changed" pings
 * (see supabase/migrations/0025_live_pings.sql). It never reads tables and keeps no
 * session, so it doesn't touch the sign-in cookies. Null in demo mode.
 */
export function realtimeClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && anon ? createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }) : null;
  return client;
}
