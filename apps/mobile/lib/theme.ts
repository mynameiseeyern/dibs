import { useColorScheme } from "react-native";
import tokens from "@dibs/ui/tokens.json";

/**
 * Dibby's colours for the native app, read from the same tokens.json the web theme is generated
 * from, so a token change reaches both. Names match the web (`primary-base`, `text-strong-950`).
 */
type Mode = "light" | "dark";
type ColourName = (typeof tokens.color.tokens)[number]["name"];

function palette(mode: Mode): Record<ColourName, string> {
  const out = {} as Record<ColourName, string>;
  for (const t of tokens.color.tokens) {
    const v = t.value as Record<string, string>;
    out[t.name as ColourName] = v[mode] ?? v.light;
  }
  return out;
}

const PALETTES = { light: palette("light"), dark: palette("dark") };

const px = (v: string) => parseFloat(v);
const pick = (list: { name: string; value: string }[]) => Object.fromEntries(list.map((t) => [t.name, px(t.value)]));
export const space = pick(tokens.spacing.tokens);
export const radius = pick(tokens.radius.tokens.filter((t) => t.value.endsWith("px")));

export const font = {
  display: "BricolageGrotesque_800ExtraBold",
  sans: "Figtree_400Regular",
  sansMedium: "Figtree_500Medium",
  sansBold: "Figtree_600SemiBold",
};

export function useTheme() {
  const mode: Mode = useColorScheme() === "dark" ? "dark" : "light";
  return { mode, colour: PALETTES[mode] };
}
