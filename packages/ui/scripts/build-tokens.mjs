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
for (const group of ["spacing", "radius", "size"]) {
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
      }${s.textTransform ? ` text-transform: ${s.textTransform};` : ""} }`
    );
  }
}

const css = `/* Generated from tokens.json by scripts/build-tokens.mjs. Do not edit by hand. */
/* Fonts (Bricolage Grotesque, Figtree, DM Mono) are bundled by the app via @fontsource. */

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
