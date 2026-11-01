// Turns tokens.json into the native app's theme (apps/mobile), next to the web one that
// build-tokens.mjs makes. Run by `pnpm tokens`.
//
//   native/theme.cjs   Tailwind (v3, NativeWind) theme: colours point at CSS variables, type styles,
//                      radii, spacing, font families. Loaded by apps/mobile/tailwind.config.js.
//   native/vars.ts     The colour variables for light and dark, applied at the app root with
//                      NativeWind's vars(), and the shadows (React Native boxShadow strings).
//
// Class names match the web theme, so `bg-bg-white-0 text-text-strong-950 text-label-md rounded-lg`
// means the same thing in both apps.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const t = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));
const out = join(root, "native");
mkdirSync(out, { recursive: true });

// ---------- colours ----------
const rgb = (v) => {
  const h = v.match(/^#([0-9a-f]{6})$/i);
  if (h) return [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16)).concat(1);
  const m = v.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(",").map((x) => parseFloat(x));
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  throw new Error(`Can't read colour ${v}`);
};
const rgba = ([r, g, b, a]) => (a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${+a.toFixed(3)})`);
const tint = (v, pct) => {
  const c = rgb(v);
  return rgba([c[0], c[1], c[2], c[3] * (pct / 100)]);
};

const modes = { light: {}, dark: {} };
const colorNames = [];
for (const tok of t.color.tokens) {
  const v = typeof tok.value === "string" ? { light: tok.value, dark: tok.value } : tok.value;
  colorNames.push(tok.name);
  for (const m of ["light", "dark"]) modes[m][`--${tok.name}`] = rgba(rgb(v[m]));
}
// AlignUI's alpha tints, the same ones the web theme mixes with color-mix().
const alphaFrom = { primary: "primary-base", red: "error-base", neutral: "static-black", white: "static-white", black: "static-black" };
for (const [name, from] of Object.entries(alphaFrom)) {
  const tok = t.color.tokens.find((x) => x.name === from);
  const v = typeof tok.value === "string" ? { light: tok.value, dark: tok.value } : tok.value;
  for (const a of [10, 16, 24]) {
    colorNames.push(`${name}-alpha-${a}`);
    for (const m of ["light", "dark"]) modes[m][`--${name}-alpha-${a}`] = tint(v[m], a);
  }
}

// ---------- shadows ----------
// React Native's boxShadow takes the CSS syntax (inset included), so the values carry over.
const shadows = { light: {}, dark: {} };
for (const tok of t.shadow.tokens) {
  const name = tok.name.replace(/^shadow-/, "");
  for (const m of ["light", "dark"]) shadows[m][name] = tok.value[m];
}

// ---------- type ----------
// Custom fonts on Android can't pick a weight, so each style names its exact face.
const faces = {
  display: { 700: "BricolageGrotesque_700Bold", 800: "BricolageGrotesque_800ExtraBold" },
  sans: { 400: "Figtree_400Regular", 500: "Figtree_500Medium", 600: "Figtree_600SemiBold", 700: "Figtree_700Bold" },
  mono: { 400: "DMMono-Regular", 500: "DMMono-Medium" },
};
const px = (v) => parseFloat(v);
const typeStyles = {};
for (const g of t.type.groups) {
  for (const s of g.styles) {
    const face = faces[g.family]?.[s.fontWeight];
    if (!face) throw new Error(`No ${g.family} face for weight ${s.fontWeight} (${s.name})`);
    const size = px(s.fontSize);
    typeStyles[`.text-${s.name}`] = {
      fontFamily: face,
      fontSize: `${size}px`,
      lineHeight: `${px(s.lineHeight)}px`,
      letterSpacing: `${+(parseFloat(s.letterSpacing ?? "0") * size).toFixed(2)}px`,
      ...(s.textTransform ? { textTransform: s.textTransform } : {}),
    };
  }
}
const fontFamily = {
  display: [faces.display[800]],
  "display-bold": [faces.display[700]],
  sans: [faces.sans[400]],
  "sans-medium": [faces.sans[500]],
  "sans-semibold": [faces.sans[600]],
  "sans-bold": [faces.sans[700]],
  mono: [faces.mono[400]],
  "mono-medium": [faces.mono[500]],
};

// ---------- radii, spacing, sizes ----------
const radius = {};
for (const tok of t.radius.tokens) if (tok.value.endsWith("px")) radius[tok.name.replace(/^radius-/, "")] = tok.value;
Object.assign(radius, { 10: radius.sm, 20: radius.lg, none: "0px" });

// Tailwind v4 (the web) allows any step of 4px (min-h-13, w-15); v3 needs them listed.
const spacing = { px: "1px", 0: "0px" };
for (let n = 0.5; n <= 96; n += 0.5) spacing[String(n)] = `${n * 4}px`;

const theme = {
  colors: Object.fromEntries([["transparent", "transparent"], ["current", "currentColor"], ...colorNames.map((n) => [n, `var(--${n})`])]),
  fontFamily,
  borderRadius: radius,
  spacing,
  typeStyles,
  typeNames: t.type.groups.flatMap((g) => g.styles.map((s) => s.name)),
};

const header = "// Generated from tokens.json by scripts/build-native-tokens.mjs. Do not edit by hand.\n";
writeFileSync(join(out, "theme.cjs"), `${header}module.exports = ${JSON.stringify(theme, null, 2)};\n`);
writeFileSync(
  join(out, "vars.ts"),
  `${header}
export const colourVars = ${JSON.stringify(modes, null, 2)} as const;

export const shadows = ${JSON.stringify(shadows, null, 2)} as const;

export type ColourName = ${colorNames.map((n) => JSON.stringify(n)).join(" | ")};
export type ShadowName = keyof (typeof shadows)["light"];
`
);
console.log(`native: ${colorNames.length} colours, ${Object.keys(typeStyles).length} type styles, ${Object.keys(shadows.light).length} shadows`);
