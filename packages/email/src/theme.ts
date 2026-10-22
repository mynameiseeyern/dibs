import tokens from "@dibs/ui/tokens.json" with { type: "json" };

// Email clients can't read CSS variables, so the email shell takes its colours straight
// from the design system's tokens.json. Change a token there and the emails follow.

type Value = string | { light: string; dark: string };
const byName = new Map<string, Value>(tokens.color.tokens.map((t: { name: string; value: Value }) => [t.name, t.value]));

function pick(name: string, theme: "light" | "dark"): string {
  const v = byName.get(name);
  if (!v) throw new Error(`Unknown colour token: ${name}`);
  if (typeof v === "string") return v;
  const c = v[theme];
  // Dark tints are rgba in the tokens; emails get the solid colour on the dark page instead.
  return c.startsWith("rgba") ? flatten(c, v.dark.startsWith("rgba") ? pick("bg-white-0", "dark") : "#000000") : c;
}

function flatten(rgba: string, over: string): string {
  const [r, g, b, a] = rgba.slice(5, -1).split(",").map((s) => Number(s.trim())) as [number, number, number, number];
  const base = [1, 3, 5].map((i) => parseInt(over.slice(i, i + 2), 16));
  const mix = [r, g, b].map((c, i) => Math.round(c * a + base[i]! * (1 - a)));
  return "#" + mix.map((c) => c.toString(16).padStart(2, "0")).join("");
}

const names = [
  "bg-white-0",
  "bg-weak-50",
  "bg-soft-200",
  "text-strong-950",
  "text-sub-600",
  "text-soft-400",
  "stroke-soft-200",
  "primary-base",
  "primary-dark",
  "primary-lighter",
  "accent-base",
  "static-white",
  "static-black",
] as const;
type Name = (typeof names)[number];

export const light = Object.fromEntries(names.map((n) => [n, pick(n, "light")])) as Record<Name, string>;
export const dark = Object.fromEntries(names.map((n) => [n, pick(n, "dark")])) as Record<Name, string>;

// Single quotes: these go inside style="…" attributes.
// Web fonts don't load in Gmail or Outlook, so each stack ends in something close that does.
export const fonts = {
  display: `'Bricolage Grotesque', 'Helvetica Neue', Arial, sans-serif`,
  sans: `Figtree, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`,
  mono: `'DM Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace`,
};
