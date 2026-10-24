# VoteOption

One option in a plan’s vote (what, when or where). Tap to vote; the bar shows the share. The leader becomes a sticker (`stroke-strong-950` border, `shadow-pop`) with a lime bar.

- The consumer provides the title, the vote count and share, and `aria-pressed` for the viewer’s own vote.
- Intentional addition: the templates have no vote component; the Dibby plan makes voting the core loop.

## States

In the app the vote is a `vote-card` (`app/p/[slug]/Vote.tsx`): Google's place card or the typed-in name, a tally bar, then Vote, View and (for the host or whoever added it) Delete.

- **Default:** a Vote button (primary, filled).
- **Active (your pick):** the button turns `primary-lighter` with a filled check and reads "Your pick" (`aria-pressed`).
- **Winning:** the leader becomes a sticker with a lime bar.
- **Read only:** maybes, people who haven't replied and the waitlist see the same card; tapping Vote shows why ("You're a maybe…") instead of voting.
- **Disabled (closed):** once the vote's locked, only View is left.
- **Loading:** the place card shows a pulsing photo-and-lines skeleton until Google's card loads, then falls back to the plain name if it can't.
