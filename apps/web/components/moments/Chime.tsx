"use client";

import { useEffect } from "react";
import { play, type SoundName } from "@/lib/feedback";

/**
 * Plays a sound when a server page arrives, for moments that happen on a page load (the plan's
 * made). With `id`, only the first time this browser sees it. Renders nothing.
 */
export function Chime({ sound, id }: { sound: SoundName; id?: string }) {
  useEffect(() => {
    if (id) {
      const key = `dibs:chime:${id}`;
      try {
        if (localStorage.getItem(key) === "1") return;
        localStorage.setItem(key, "1");
      } catch {}
    }
    play(sound, { within: 2000 });
  }, [sound, id]);
  return null;
}
