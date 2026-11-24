// Place cards for the app (photo, stars, price, open now), loaded through the server the way the
// web loads Google's Places UI Kit cards. Each load is billed, so a card loads once per session
// and only when something asks for it; nothing but the place ID is ever stored (Places terms).

import { useEffect, useState } from "react";
import type { PlaceInfo } from "@dibs/shared/api";
import { getPlaceInfo } from "./api";

const cache = new Map<string, Promise<PlaceInfo | null>>();

export function loadPlace(placeId: string): Promise<PlaceInfo | null> {
  let hit = cache.get(placeId);
  if (!hit) {
    hit = getPlaceInfo(placeId).catch(() => {
      // Let a later look try again (offline, say).
      cache.delete(placeId);
      return null;
    });
    cache.set(placeId, hit);
  }
  return hit;
}

/** The card for a place, or null while it loads or when there's no place (a typed-in spot). */
export function usePlace(placeId: string | null | undefined): PlaceInfo | null {
  const [info, setInfo] = useState<PlaceInfo | null>(null);
  useEffect(() => {
    let live = true;
    setInfo(null);
    if (placeId) loadPlace(placeId).then((p) => live && setInfo(p));
    return () => {
      live = false;
    };
  }, [placeId]);
  return info;
}
