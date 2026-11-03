// Turns tokens.json (from the Dibs design system on claude.ai) into src/tokens.css.
// Run with `pnpm tokens` after updating tokens.json.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const t = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));

const light = [];
const dark = [];
const flat = [];

for (const tok of t.color.tokens) {
  if (typeof tok.value === "string") flat.push(`  --${tok.name}: ${tok.value};`);
  else {
    light.push(`  --${tok.name}: ${tok.value.light};`);
    dark.push(`  --${tok.name}: ${tok.value.dark};`);
  }
}
for (const tok of t.shadow.tokens) {
  light.push(`  --${tok.name}: ${tok.value.light};`);
  dark.push(`  --${tok.name}: ${tok.value.dark};`);
}
for (const group of ["spacing", "radius", "size", "motion", "fontWidth"]) {
  for (const tok of t[group].tokens) flat.push(`  --${tok.name}: ${tok.value};`);
}
for (const [k, v] of Object.entries(t.type.families)) flat.push(`  --font-${k}: ${v};`);

const typeClasses = [];
for (const g of t.type.groups) {
  for (const s of g.styles) {
    const fam = s.fontFamily ? s.fontFamily : `var(--font-${g.family})`;
    typeClasses.push(
      `.${s.name} { font-family: ${fam}; font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};${
        s.letterSpacing ? ` letter-spacing: ${s.letterSpacing};` : ""
      }${s.fontWidth ? ` font-stretch: var(--${s.fontWidth});` : ""}${s.textTransform ? ` text-transform: ${s.textTransform};` : ""} }`
    );
  }
}

const css = `/* Generated from tokens.json by scripts/build-tokens.mjs. Do not edit by hand. */
/* Fonts (Bricolage Grotesque, Figtree, DM Mono) are bundled by the app via @fontsource. Bricolage is the variable
   font, so optical size follows font-size on its own and title styles set their width with font-stretch. */

:root {
${flat.join("\n")}
${light.join("\n")}
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${dark.map((l) => "  " + l).join("\n")}
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
${dark.join("\n")}
  color-scheme: dark;
}

${typeClasses.join("\n")}
`;

writeFileSync(join(root, "src", "tokens.css"), css);
console.log(`tokens.css: ${t.color.tokens.length} colours, ${typeClasses.length} type styles`);

// ---------- Tailwind v4 theme for the AlignUI components ----------
// AlignUI's class names (bg-bg-white-0, text-text-strong-950, text-label-sm, rounded-10…) resolve to the
// Dibs tokens above, so its components take on the Dibs look. Values point at the CSS variables, so
// light and dark come from tokens.css.
const strip = (name, prefix) => name.replace(new RegExp(`^${prefix}-`), "");
const theme = [];
theme.push("  --color-*: initial;");
for (const tok of t.color.tokens) theme.push(`  --color-${tok.name}: var(--${tok.name});`);
// AlignUI's alpha tints, made from the Dibs colours.
const alpha = (name, from) =>
  [10, 16, 24].map((a) => `  --color-${name}-alpha-${a}: color-mix(in srgb, var(--${from}) ${a}%, transparent);`);
theme.push(...alpha("primary", "primary-base"), ...alpha("red", "error-base"), ...alpha("neutral", "static-black"));
theme.push(...alpha("white", "static-white"), ...alpha("black", "static-black"));

theme.push("  --font-*: initial;");
for (const [k, v] of Object.entries(t.type.families)) theme.push(`  --font-${k}: ${v};`);

theme.push("  --text-*: initial;");
for (const g of t.type.groups) {
  for (const s of g.styles) {
    theme.push(`  --text-${s.name}: ${s.fontSize};`);
    theme.push(`  --text-${s.name}--line-height: ${s.lineHeight};`);
    theme.push(`  --text-${s.name}--font-weight: ${s.fontWeight};`);
    if (s.letterSpacing) theme.push(`  --text-${s.name}--letter-spacing: ${s.letterSpacing};`);
  }
}

theme.push("  --radius-*: initial;");
for (const tok of t.radius.tokens) theme.push(`  --radius-${strip(tok.name, "radius")}: var(--${tok.name});`);
// AlignUI's named radii, mapped onto the Dibs shapes.
theme.push("  --radius-10: var(--radius-sm);", "  --radius-20: var(--radius-lg);");

theme.push("  --shadow-*: initial;");
for (const tok of t.shadow.tokens) theme.push(`  --shadow-${strip(tok.name, "shadow")}: var(--${tok.name});`);
const ring = "0 0 0 2px var(--bg-white-0), 0 0 0 4px var(--focus-ring)";
for (const [name, v] of Object.entries({
  "regular-xs": "var(--shadow-xs)",
  "regular-sm": "var(--shadow-sm)",
  "regular-md": "var(--shadow-md)",
  tooltip: "var(--shadow-md)",
  "toggle-switch": "var(--shadow-xs)",
  "switch-thumb": "var(--shadow-sm)",
  "custom-xs": "var(--shadow-xs)",
  "custom-sm": "var(--shadow-sm)",
  "custom-md": "var(--shadow-md)",
  "custom-lg": "var(--shadow-md)",
  "button-primary-focus": ring,
  "button-important-focus": ring,
  "button-error-focus": ring,
})) theme.push(`  --shadow-${name}: ${v};`);

theme.push("  --ease-*: initial;");
for (const tok of t.motion.tokens.filter((x) => x.name.startsWith("ease-"))) theme.push(`  --${tok.name}: var(--${tok.name});`);

// Tailwind's text-* utilities can't carry font-stretch, so title widths are plain rules beside the theme.
const widthRules = t.type.groups
  .flatMap((g) => g.styles)
  .filter((s) => s.fontWidth)
  .map((s) => `.text-${s.name} { font-stretch: var(--${s.fontWidth}); }`);

const themeCss = `/* Generated from tokens.json by scripts/build-tokens.mjs. Do not edit by hand. */
/* Tailwind v4 theme for the AlignUI components in apps/web/components/ui. Import after "tailwindcss". */

@theme inline {
${theme.join("\n")}
}

${widthRules.join("\n")}

/* dark: follows the same rule as tokens.css: system dark unless data-theme="light", or data-theme="dark". */
@custom-variant dark {
  @media (prefers-color-scheme: dark) {
    &:where(:root:not([data-theme="light"]) *) {
      @slot;
    }
  }
  &:where([data-theme="dark"], [data-theme="dark"] *) {
    @slot;
  }
}
`;
writeFileSync(join(root, "src", "tailwind-theme.css"), themeCss);
console.log(`tailwind-theme.css: ${theme.length} theme values`);
