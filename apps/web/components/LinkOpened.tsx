"use client";

import { useEffect, useRef } from "react";
import { trackLinkOpened } from "@/app/funnel-actions";

const KEY = "dibs:anon";

/** A random ID for this browser, kept so a person counts once per plan. Made fresh if storage is off. */
function anonId(): string {
  const make = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  try {
    const kept = localStorage.getItem(KEY);
    if (kept) return kept;
    const id = make();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return make();
  }
}

/** Logs `plan_link_opened` once when someone not on the plan lands on it. Renders nothing. */
export function LinkOpened({ slug }: { slug: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void trackLinkOpened(slug, anonId()).catch(() => {});
  }, [slug]);
  return null;
}
