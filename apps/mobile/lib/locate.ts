// Where this person is, rounded to about 100m, like the web's lib/locate.ts: plenty to find spots
// nearby, and the exact spot stays private. Only a search bias for places and Dibby: never saved,
// never sent to the AI (the server drops it before Dibby sees anything).

import * as Location from "expo-location";

export type Coords = { lat: number; lng: number };

let cached: { at: number; coords: Coords } | null = null;
const FRESH = 10 * 60_000;
const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * `ask: true` shows the system prompt if they haven't answered it yet (iOS asks once, ever);
 * `ask: false` only answers when they've already said yes, so nothing pops up uninvited.
 * null when they said no, or it takes too long (we search without it).
 */
export async function locate({ ask }: { ask: boolean }): Promise<Coords | null> {
  if (cached && Date.now() - cached.at < FRESH) return cached.coords;
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted && ask && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    // A recent fix comes back at once; otherwise get one, but don't hold the search up for long.
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: FRESH })) ??
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 6_000)),
      ]));
    if (!pos) return null;
    const coords = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) };
    cached = { at: Date.now(), coords };
    return coords;
  } catch {
    return null;
  }
}

/** Whether they've said no and can't be asked again (then point them to Settings). */
export async function locationBlocked(): Promise<boolean> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    return !perm.granted && !perm.canAskAgain;
  } catch {
    return false;
  }
}
