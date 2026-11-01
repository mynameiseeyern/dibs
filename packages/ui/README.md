# @dibs/ui

The Dibby design system in code. The published copy, with live previews of every component, is on claude.ai: https://claude.ai/artifact/77AdHKZGgDU4j19fqSsYdz

## What's here

- `tokens.json`: every token (colours in light and dark, type, spacing, radii, sizes, shadows).
- `src/tokens.css`: generated from `tokens.json` by `pnpm tokens`. Don't edit it by hand.
- `src/tailwind-theme.css`: generated with `tokens.css`. The Tailwind v4 theme that makes the AlignUI components in `apps/web/components/ui` use Dibby colours, type, radii and shadows.
- `native/theme.cjs`, `native/vars.ts`: generated with the files above, for the native app (`apps/mobile`). The same tokens as a Tailwind (NativeWind) theme, light and dark colour variables and shadows, with the same class names as the web.
- `src/components.css`: the `.db-` component classes. Card, plan card, vote option, bill split and chat bubble are still used by the app; the rest are superseded by the AlignUI components. Fonts and icons load in the app layout.
- `docs/brand-book.md`: voice, colour, type, layout, shape, motion and icon rules. Read this first.
- `docs/components/<Name>.md`: when to use each component and what markup it expects.
- `assets/logos/`: the V3 "hands up" logo files and how to use them.
- `fonts/`: DM Mono for amounts and codes.

## Changing tokens

1. Edit `scripts/gen-tokens.py`, which is the source of the token values.
2. Run `python3 scripts/gen-tokens.py`. It rewrites `tokens.json` and checks text contrast in both themes. Any failing pair prints under `FAILS`.
3. Run `pnpm tokens` to rebuild `src/tokens.css`, `src/tailwind-theme.css` and the native theme in `native/`. Web and app pick up the change together.
4. Ask Claude to republish the design system so the claude.ai copy and Figma stay in step.
