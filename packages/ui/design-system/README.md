Dibs is the friend-group app where a crew talks, decides, turns up and squares up without leaving the group. The system is playful and built phone-first: big type, round shapes, two loud brand colours used sparingly, and copy that sounds like a mate in the group chat.

## Content fundamentals

- Talk like a friend in the chat: casual, warm, a little cheeky. Never corporate, never pushy, never snarky about money.
- Short sentences. Australian spelling and phrasing (“organiser”, “shout”, “colour”).
- Sentence case everywhere; the brand name is always lowercase **dibs**. Eyebrows (`subheading-sm`) are the only capitals.
- Say “you” to the reader and use people’s first names: “You owe Sam $42, tap to pay.”
- Money copy is kind and specific: the amount, who to, one tap. No guilt-tripping, streaks or pressure to open the app.
- Each group picks a vibe, and every string has three versions:
  - Chill (default): “3 of you still haven’t voted, closes Friday 6pm”
  - Extra: emoji welcome, “voting closes at 6 🗳️ don’t be the reason we end up at the worst option 😭”
  - Straight up: no banter, no emoji, “Reminder: voting closes Friday at 6pm.”
- Emoji only in Extra-vibe copy and in chat, never as UI decoration or icons.

## Visual foundations

**Colour.** White `bg-white-0` page, ink `text-strong-950` copy.
- `primary-base` (Dibs violet, from the app icon) is the brand: primary buttons, the current tab, your own chat bubbles, progress. Text on it is always `static-white`.
- `accent-base` (lime, the friend with a hand up) is the “calling dibs” moment: the winning vote, “I’m in”, squared up. Use it once per screen, always with `static-black` text, never white.
- Status families (`success`, `warning`, `error`, `away`, `information`, `verified`, `highlighted`, `feature`, `stable`, `faded`) each come as `-base` (solid, ink text), `-dark` (text), `-light` (border) and `-lighter` (soft fill). Put `-dark` text on `-lighter` fills. Status always comes with a word or icon, never colour alone.
- Every text pair meets 4.5:1 in both Light and Dark themes. `text-soft-400` is for meta on `bg-white-0` and `bg-weak-50` only.

**Type.** Three faces, each with one job.
- Headings `title-*` in Bricolage Grotesque, the wordmark’s face: heavy, a bit quirky.
- Everything else in Figtree (`label-*`, `paragraph-*`, `subheading-*`), with DM Sans as the fallback.
- Money and codes in DM Mono (`number-*`, `code`) so digits line up.
- Body is `paragraph-md` (16px/26px), and reading text on phones is never smaller. Buttons and labels use `label-md`.
- On phones the largest title is `title-h2`, and page titles are `title-h3`.

**Space and layout.**
- Phone first: a 16px gutter (`space-4`), one column, and the main action pinned at the bottom as a `db-btn--lg db-btn--block`.
- From 768px, cards pad `space-5` and sit in a grid with `space-6` gaps.
- Sections are `space-8` apart on phones and `space-12` on desktop.

**Shape.**
- Everything is round. Buttons, badges, tabs and avatars are pills (`radius-full`).
- Inputs and vote options use `radius-md`; cards, chat bubbles and alerts use `radius-lg`; sheets use `radius-xl`.
- The app icon uses `radius-icon` (24%) at any size.

**Depth.**
- Mostly flat. Cards float on `shadow-sm`, and popovers and tooltips on `shadow-md`.
- The playful signature is the **sticker**: a `stroke-strong-950` 2px border plus `shadow-pop` (a hard 4px ink drop). It is only for the one hero action (the Dibs button) and the plan card that matters right now.

**Touch.** Every tappable thing is at least `size-tap` (44px). Default controls are `size-control-md`, and the main phone action is `size-control-lg`.

**Motion.**
- Springy and quick: about 160–240ms with `cubic-bezier(.34,1.56,.64,1)`.
- Presses squash to 96%, switches overshoot slightly, and the sticker button sinks into its shadow.
- Respect `prefers-reduced-motion` by dropping the scale and keeping the colour change.

**Focus.** A solid 2px `focus-ring` outline with a 2px offset on every interactive element.

## Iconography

- Use Remix Icon (as in the source templates), line style by default and the fill style for status icons in alerts and hints.
- Size: 20px in controls, 14px in badges.
- Load it from `https://cdn.jsdelivr.net/npm/remixicon@4.3.0/fonts/remixicon.css`, already imported by `components/bundle.css`, and write `<i class="ri-map-pin-line db-icon" aria-hidden="true">`.
- Icon-only buttons need an `aria-label`. Never use emoji as icons.

## Logo

- Use the V3 “hands up” mark from `assets/Logos/`: three friends, one popping up to call dibs.
- `dibs-app-icon.svg` is the app icon on violet. `dibs-mark-on-dark.svg` goes only on `bg-strong-950`. `dibs-ai-member.svg` is only for the AI member.
- The wordmark is live text: **dibs** in Bricolage Grotesque 800, lowercase.

## Using the components

Link `tokens.css` and then `components/bundle.css`, and write the plain HTML from each component’s preview. Classes are prefixed `db-`.
