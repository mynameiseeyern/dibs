# Screen drafts

Phone mockups (iPhone 13 size) for the rest of the POC, drawn with the real design-system CSS.
Regenerate with `python3 gen.py` (writes HTML next to it), then screenshot.

| # | Screen | Linear |
| --- | --- | --- |
| 01 | Organiser tags @dibby; Dibby drafts three spots with "Lock it in" | ARV-22, 23 |
| 02 | Organiser's plan with the vote open and the share button | ARV-19, 42 |
| 03 | WhatsApp preview card (1200 × 630) | ARV-42 |
| 04 | Guest voting, with the plan thread and a Dibby nudge | ARV-16, 19 |
| 05 | Plan locked in | ARV-19, 44 |
| 06 | Wrap-up: organiser ticks who came | ARV-49 |
| 07 | Payer adds a bill, even split preview | ARV-25 |
| 08 | Card roulette: opt-in wheel | ARV-27 |
| 09 | Roulette result: loser pays the lot | ARV-27 |
| 10 | Guest settle-up: PayID details with copy buttons, "I've paid" | ARV-26 |
| 11 | Payer confirms "says paid"; private balances | ARV-26 |
| 12 | All settled, then the recap (stars, best moment, MVP, photos) | ARV-52 |
| 13 | Called off | ARV-16 |

## The real app, light and dark (ARV-13)

`app/` has the built screens captured from the running app at iPhone 13 width (390px), in light and dark, replacing the drafts above as the reference:

| Files | Screen |
| --- | --- |
| 01–02 | Landing |
| 03–06 | New plan: day and time, then vote mode with "Where-ish" |
| 07–12 | Host's plan page: open vote, place picker, three options |
| 13–14 | Plan settings ("Edit the plan"): name, when, where, vote closes, spots, plus-ones, how Dibby talks (vibe), how chatty, call it off |
| 15–18 | Guest: lands on the link, joins with a name, RSVPs and votes |
| 19–20 | Plan chat |
| 21–22 | Locked in |
| 23–24 | Organiser's menu on someone in who's going (co-host or hand over; a guest needs the app first) |
| 25–26 | Your plans |

Bills, card roulette, settle-up and the recap need a plan that has happened, so they're shown state by state on `/ui` (Dibs pieces, ARV-38) rather than here.

Recapture with `capture.js` against `pnpm dev` on the in-memory store (no Supabase env): it signs in, makes a plan, adds places, joins as a guest on a second phone, votes, chats and locks it.
