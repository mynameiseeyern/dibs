// Place cards for the app (photo, stars, price, open now), loaded through the server the way the
// web loads Google's Places UI Kit cards. Each load is billed, so a card loads once per session
// and only when something asks for it; nothing but the place ID is ever stored (Places terms).

import { useEffect, useState } from "react";
import type { PlaceInfo } from "@dibs/shared/api";
import { getPlaceInfo } from "./api";

const cache = new Map<string, Promise<PlaceInfo | null>>();

/** `full`: everything the web's Google panel shows (gallery, hours, reviews…), for the place sheet only. */
export function loadPlace(placeId: string, full = false): Promise<PlaceInfo | null> {
  const key = full ? `${placeId}#full` : placeId;
  let hit = cache.get(key);
  if (!hit) {
    hit = getPlaceInfo(placeId, full).catch(() => {
      // Let a later look try again (offline, say).
      cache.delete(key);
      return null;
    });
    cache.set(key, hit);
  }
  return hit;
}

/** The card for a place, or null while it loads or when there's no place (a typed-in spot). */
export function usePlace(placeId: string | null | undefined, full = false): PlaceInfo | null {
  const [info, setInfo] = useState<PlaceInfo | null>(null);
  useEffect(() => {
    let live = true;
    setInfo(null);
    if (placeId) loadPlace(placeId, full).then((p) => live && setInfo(p));
    return () => {
      live = false;
    };
  }, [placeId, full]);
  return info;
}
