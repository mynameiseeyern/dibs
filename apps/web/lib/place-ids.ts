// Dibby's messages carry the place IDs it put on the vote (in `template`, next to its search
// memo), so the chat can show those places as tiles. Only Google place IDs: those are the one
// thing from Places we're allowed to keep.

export const withPlaces = (template: object | null | undefined, placeIds: (string | null)[]): object | undefined => {
  const places = placeIds.filter((id): id is string => Boolean(id)).slice(0, 8);
  if (!places.length) return template ?? undefined;
  return { ...(template ?? {}), places };
};

export const placesOf = (template: unknown): string[] => {
  const p = template && typeof template === "object" ? (template as { places?: unknown }).places : null;
  return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string").slice(0, 8) : [];
};
