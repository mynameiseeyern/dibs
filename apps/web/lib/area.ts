// Where Dibby looks. Pure helpers, shared by the server (search) and the chat (area chips).

/** Words people use for the middle of town. On its own, "CBD" could be any city. */
const CITY_WORDS = /^(the\s+)?(cbd|city|city centre|city center|town|downtown|cbd area)$/i;
/** "Near me" typed as an area means the asker's location, not a place called "me". */
const HERE_WORDS = /^(near\s+)?(me|here|us|my place|around here|nearby)$/i;

/**
 * Tidies the area the model gave: blank or "near me" is no area (search around the asker),
 * and a bare "CBD" or "the city" is the plan's city (Sydney for now).
 */
export function qualifyArea(raw: string | null | undefined, city = "Sydney"): string | null {
  const a = (raw ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!a || HERE_WORDS.test(a)) return null;
  if (CITY_WORDS.test(a)) return `${city} CBD`;
  return a;
}

/** Straight-line distance in km. */
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** How far "near you" stretches. Places' bias is only a hint, so anything past this is dropped. */
export const NEAR_KM = 15;

/**
 * Dibby asked where to look. Stored on its message (`ask` in `template`) so the chat can show
 * the areas as chips; tapping one asks again with the same search there.
 */
export interface WhereAsk {
  query: string;
  areas: string[];
}

export const askOf = (template: unknown): WhereAsk | null => {
  const a = template && typeof template === "object" ? (template as { ask?: unknown }).ask : null;
  if (!a || typeof a !== "object") return null;
  const { query, areas } = a as { query?: unknown; areas?: unknown };
  if (typeof query !== "string" || !Array.isArray(areas)) return null;
  return { query: query.slice(0, 120), areas: areas.filter((x): x is string => typeof x === "string").slice(0, 4) };
};

/** Adds Dibby's "where abouts?" to a message template (next to its search memo and places). */
export const withAsk = (template: object | null | undefined, ask: WhereAsk | null): object | undefined =>
  ask ? { ...(template ?? {}), ask } : (template ?? undefined);

/**
 * Areas to offer as chips: ones this plan has already looked in (latest first), the plan's own
 * area, then the CBD as a sensible default. Never more than four, never the same one twice.
 */
export function areaChoices(seen: (string | null | undefined)[], planArea: string | null, city = "Sydney"): string[] {
  const out: string[] = [];
  for (const a of [...seen, planArea, `${city} CBD`]) {
    const q = qualifyArea(a, city);
    if (q && !out.some((o) => o.toLowerCase() === q.toLowerCase())) out.push(q);
    if (out.length === 4) break;
  }
  return out;
}

/**
 * Where Dibby last looked, read off its message (the `SearchMemo` in lib/dibby.ts, which is
 * server-only). Safe to use in the chat.
 */
export const memoOf = (template: unknown): { query: string; area: string | null } | null => {
  if (!template || typeof template !== "object") return null;
  const t = template as { k?: unknown; query?: unknown; area?: unknown };
  if (t.k !== "search" || typeof t.query !== "string") return null;
  return { query: t.query.slice(0, 120), area: typeof t.area === "string" ? t.area : null };
};
