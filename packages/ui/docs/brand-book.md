Dibby is the friend-group app where a crew talks, decides, turns up and squares up without leaving the group. The system is playful and built phone-first: big type, round shapes, two loud brand colours used sparingly, and copy that sounds like a mate in the group chat.

## Content fundamentals

- Talk like a friend in the chat: casual, warm, a little cheeky. Never corporate, never pushy, never snarky about money.
- Short sentences. Australian spelling and phrasing (“organiser”, “shout”, “colour”).
- Sentence case everywhere. In sentences the name is **Dibby**, capital D, like a person's name. The logo is lowercase **dibby**. Eyebrows (`subheading-sm`) are the only capitals.
- **Dibby is both the app and the AI member in the chat**: one character. App copy can speak as Dibby (“I’ll keep your plans here”). When the copy is about the AI specifically, say “the AI in your chat” or just “Dibby”, never “Dibby’s AI”.
- **dibs** is now a verb, not the name: calling dibs is the lime moment (“Call dibs”, “4 called dibs”). Never use it as the product name.
- Say “you” to the reader and use people’s first names: “You owe Sam $42, tap to pay.”
- Money copy is kind and specific: the amount, who to, one tap. No guilt-tripping, streaks or pressure to open the app.
- Each group picks a vibe, and every string has three versions:
  - Chill (default): “3 of you still haven’t voted, closes Friday 6pm”
  - Extra: emoji welcome, “voting closes at 6 🗳️ don’t be the reason we end up at the worst option 😭”
  - Straight up: no banter, no emoji, “Reminder: voting closes Friday at 6pm.”
- Emoji only in Extra-vibe copy and in chat, never as UI decoration or icons.

## Visual foundations

**Colour.** White `bg-white-0` page, ink `text-strong-950` copy.
- `primary-base` (Dibby violet, from the app icon) is the brand: primary buttons, the current tab, your own chat bubbles, progress. Text on it is always `static-white`.
- `accent-base` (lime, the friend with a hand up) is the “calling dibs” moment: the winning vote, “I’m in”, squared up. Use it once per screen, always with `static-black` text, never white.
- Status families (`success`, `warning`, `error`, `away`, `information`, `verified`, `highlighted`, `feature`, `stable`, `faded`) each come as `-base` (solid, ink text), `-dark` (text), `-light` (border) and `-lighter` (soft fill). Put `-dark` text on `-lighter` fills. Status always comes with a word or icon, never colour alone.
- Every text pair meets 4.5:1 in both Light and Dark themes. `text-soft-400` is for meta on `bg-white-0` and `bg-weak-50` only.

**Type.** Three faces, each with one job.
- Headings `title-*` in Bricolage Grotesque, the wordmark’s face: heavy, a bit quirky.
  - Push it past the default cut. Bricolage is the variable font, so big headings get its display optical size (sharper ink traps) on their own.
  - Titles are slightly condensed: `font-stretch: var(--font-width-title-lg)` (84%) for `title-display` to `title-h3`, `--font-width-title-md` (86%) for `title-h4` and `--font-width-title-sm` (90%) for `title-h5` and `title-h6`. The `title-*` and `text-title-*` classes set this for you; hand-written CSS using `font:` must set `font-stretch` after it, since the shorthand resets it.
  - Keep the tracking gentle (−1% at most). Tighter and the heavy letters touch.
  - The wordmark keeps the normal width. In the native app use `font.title` for titles and `font.display` only for the wordmark.
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
- **Clay**, borrowed from the mascot moments: soft, lit from above, gently shaded at the bottom edge, with a soft violet glow underneath (`shadow-clay` on `bg-sticker`, with a faint 1.5px `stroke-sticker` edge). It's only for the plan card that matters right now and the winning vote; small round controls (the circle actions) get `shadow-clay-sm`. Everything else stays flat. Don't stack clay inside clay.
- The **sticker** (an ink outline plus `shadow-pop`, a hard 4px drop) is now only for the lime “call dibs” button, so that one moment stays loud.
- People can pick Light, Dark or System on their You page. The choice sets `data-theme` on `<html>`; tokens.css already switches on it.

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

- The logo is Dibby waving: a 3D render of the lime friend on violet, `assets/logos/dibby-icon-1024.png`. Rounded with `radius-icon` wherever a platform doesn't round it for us.
- Under 48px (favicons, the OG mark, inline names) use the flat face, `dibby-face.svg`, never the render.
- Dibby's avatar in the chat and member lists is the face cropped from the icon, in a circle (`DibbyMark`). The app icon and the helper are the same character on purpose: one Dibby.
- The wordmark is **dibby** in Bricolage Grotesque 800, lowercase. `dibby-wordmark-light` and `-dark` are the lockups outlined, for anywhere live text can't go.
- Dibby's poses and animations for empty, loading, error and celebration states live in `assets/dibby/` and go in through `<Dibby mood="…" />`.

## Using the components

Link `tokens.css` and then `components/bundle.css`, and write the plain HTML from each component’s preview. Classes are prefixed `db-`.
