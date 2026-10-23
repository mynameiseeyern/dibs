"use client";

export type Coords = { lat: number; lng: number };

let cached: { at: number; coords: Coords } | null = null;

/**
 * Where this person is, rounded to about 100m: plenty to find spots nearby, and the exact spot
 * stays private. Used only as a search bias for Places, never saved and never sent to the AI.
 * `ask: false` only answers when the browser already has permission, so nothing pops up uninvited.
 */
export async function locate({ ask }: { ask: boolean }): Promise<Coords | null> {
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.coords;
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  if (!ask) {
    try {
      const p = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
      if (p?.state !== "granted") return null;
    } catch {
      return null;
    }
  }
  // The browser's own timeout only starts once permission is given, so an ignored prompt would
  // hang forever. Give up after 6s and search without it (the plan's area, or a named place).
  return new Promise((resolve) => {
    const giveUp = setTimeout(() => resolve(null), 6_000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: Math.round(pos.coords.latitude * 1000) / 1000, lng: Math.round(pos.coords.longitude * 1000) / 1000 };
        cached = { at: Date.now(), coords };
        clearTimeout(giveUp);
        resolve(coords);
      },
      () => {
        clearTimeout(giveUp);
        resolve(null);
      },
      { maximumAge: 600_000, timeout: 6_000 }
    );
  });
}
