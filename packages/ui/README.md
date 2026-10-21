# @dibs/ui

The Dibs design system in code. The published copy, with live previews of every component, is on claude.ai: https://claude.ai/artifact/77AdHKZGgDU4j19fqSsYdz

## What's here

- `tokens.json`: every token (colours in light and dark, type, spacing, radii, sizes, shadows).
- `src/tokens.css`: generated from `tokens.json` by `pnpm tokens`. Don't edit it by hand.
- `src/components.css`: the `.db-` component classes. Fonts and icons load in the app layout.
- `docs/brand-book.md`: voice, colour, type, layout, shape, motion and icon rules. Read this first.
- `docs/components/<Name>.md`: when to use each component and what markup it expects.
- `assets/logos/`: the V3 "hands up" logo files and how to use them.
- `fonts/`: DM Mono for amounts and codes.

## Changing tokens

1. Edit `scripts/gen-tokens.py`, which is the source of the token values.
2. Run `python3 scripts/gen-tokens.py`. It rewrites `tokens.json` and checks text contrast in both themes. Any failing pair prints under `FAILS`.
3. Run `pnpm tokens` to rebuild `src/tokens.css`.
4. Ask Claude to republish the design system so the claude.ai copy and Figma stay in step.
