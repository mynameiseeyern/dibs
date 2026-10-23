# PlanCard

The plan: the one object everything hangs off. Eyebrow (when), title in the display face, then time, place and who’s coming, then the RSVP action.

- The consumer provides the eyebrow, title, facts (Remix icon plus text) and avatars. On phones it spans the width minus `space-4` gutters.
- Intentional addition: Dibby’s “show up” card, built from the Card shell.

## States

Check them all at `/ui` in dev, in light and dark.

- **Default:** a sticker (`stroke-strong-950` border, `shadow-pop`) with the status badge: Voting (warning), Locked in (success), Wrapped (primary).
- **Called off (disabled):** no sticker, a faded "Called off" badge, and a warning note saying nobody owes anything. Nothing on it can be tapped.
- **Loading:** grey `.skeleton` blocks (badge, title, two lines) in `bg-sub-300`, with `aria-busy`. They pulse, and hold still under reduced motion.
