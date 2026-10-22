# The Dibs crew — clay art from Higgsfield

**Status: done.** Generated 22 Oct 2026 with Nano Banana Pro on Higgsfield (four sheets, 8 credits), keyed and cut in Higgsfield's sandbox (`cut.py` logic: hue/saturation chroma key, background = green connected to the frame edge, per-figure crops padded to 1024 square with feet at the bottom, then 512px for the web). The brief below is kept for regenerating or extending the set.

In the repo (`apps/web/public/crew/`, 512px, transparent): crew `violet lime sun mint tangerine sky coral rose aqua ivory`; props `flag coin tick confetti trophy`; `wheel-frame` (rim, hub and pointer, empty centre, wedges drawn underneath).

Five crew members, one per monogram colour. They replace the plain 3D capsules in the
Three.js moments (pop-up, flag planting, paid, everyone's square) and can also stand in
for monograms later.

## Deliverables

Drop the finished files in `apps/web/public/crew/`, named exactly:

| File | Crew member | Colour (light-mode token) |
|---|---|---|
| `violet.png` | Violet | `primary-light` #DCD3FF body, `primary-base` #6D4AFF details |
| `lime.png` | Lime | `accent-base` #C8F03C body, ink #141216 details |
| `sun.png` | Sun | `away-light` #FFE7A8 body, `away-dark` details |
| `mint.png` | Mint | `success-light` #BDF2D5 body, `success-dark` details |
| `tangerine.png` | Tangerine | `highlighted-light` #FFD1BD body, `highlighted-dark` details |

Each: **1024 × 1024 PNG, transparent background, character centred, feet at the bottom
edge, facing the camera, full body, ~80% of the frame tall.** No ground shadow baked in
(the scene adds one). No text, no props.

Optional for later: `*-wave.png` (one arm up, for "you're in") and `*-cheer.png` (both
arms up, for "everyone's square"). Same framing.

## Style

Clay / vinyl toy. Matte, chunky, soft studio lighting from the top-left, no gloss. Think
the logo's three dots grown a body: a round head on a pill body, stubby arms, no neck,
two small ink dots for eyes and a tiny smile. Friendly, a bit cheeky. Reads at 100px.

## Prompts

Base prompt (swap the colour line per crew member):

> A small vinyl toy character, clay-like matte finish, chunky proportions: round head
> directly on a pill-shaped body, short stubby arms, no visible neck or legs, two tiny
> black dot eyes and a small cheeky smile. Body colour **pale lavender (#DCD3FF)** with
> **vivid violet (#6D4AFF)** accents on the cheeks. Soft studio lighting from the top
> left, subtle ambient occlusion, no gloss, no reflections. Front view, full body,
> centred, feet touching the bottom edge. Isolated on a pure transparent background,
> no shadow, no floor, no text. 1:1.

Colour lines:

- Violet: pale lavender (#DCD3FF) body, vivid violet (#6D4AFF) cheeks
- Lime: bright lime (#C8F03C) body, ink (#141216) cheeks
- Sun: pale yellow (#FFE7A8) body, warm amber cheeks
- Mint: pale mint (#BDF2D5) body, deep green cheeks
- Tangerine: pale peach (#FFD1BD) body, burnt orange cheeks

Negative prompt: glossy, metallic, realistic skin, text, watermark, floor, shadow,
background, multiple characters, legs, neck, hair.

Tips: generate all five from the same seed so they're clearly a set. If Higgsfield won't
give a true transparent background, generate on flat #00FF00 and I'll key it out.

## What the code does with them

`apps/web/components/moments/scene.ts` looks for `/crew/<colour>.png`. If it's there, the
crew member is a textured billboard (always facing the camera) that pops, hops and
tilts; if not, it falls back to the built-in capsule figure. Nothing else to wire up.
