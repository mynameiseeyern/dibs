# Dibby — notes for Claude Code

Dibby, a group plans app, heading for a web V1 (dibby.social): plan → share to WhatsApp → vote and RSVP → bills, PayID, card roulette → recap.
Build plan: https://claude.ai/artifact/2Lce9vh9ZvGunTKngL6sWX · Linear project "Dibs — Hackathon" (P-ARV-1).

## Commits

- Commit as `mynameiseeyern <eeyern.ux@gmail.com>`. Vercel is on the Hobby plan and only deploys commits authored by the account owner.
- Vercel skips a deploy when nothing under `apps/web` (or a package it uses) changed.

## Commands

- `pnpm mobile` — Expo dev server for the native app (scan the QR with Expo Go)
- `pnpm dev` — web app on :3000 (in-memory demo store if Supabase env is empty)
- `pnpm test` — bill maths, plan start times and RSVP access (Vitest, `packages/shared`). Keep them passing.
- `pnpm build`, `pnpm typecheck`
- `pnpm tokens` — regenerate `packages/ui/src/tokens.css`, `tailwind-theme.css` and the native app's theme (`packages/ui/native/`) from `packages/ui/tokens.json`

## Design system

The source of truth is the Dibby design system on claude.ai (https://claude.ai/artifact/77AdHKZGgDU4j19fqSsYdz).
In this repo: read `packages/ui/docs/brand-book.md` before building UI, and `packages/ui/docs/components/<Name>.md` for each component.
Open `packages/ui/design-system/index.html` in a browser to see every component rendered. Token values come from `packages/ui/scripts/gen-tokens.py` (see `packages/ui/README.md`).

- Components are AlignUI (React + Tailwind v4), themed to Dibby: `apps/web/components/ui/*` (`import * as Button from "@/components/ui/button"`). All 51 from the AlignUI starter are there (Button, Input, Select, Datepicker, Popover, Dropdown, Drawer, Modal (the bottom sheet), Toast `toast.success(…)` and the rest), so use one before hand-building a control. See them all at `/ui` in dev and on preview deploys.
- The native app has the same components, ported to React Native with NativeWind: `apps/mobile/components/ui/*` (same file names and `import * as Button from "@/components/ui/button"` API), and the Dibby-only pieces in `apps/mobile/components/dibby/*`. Same class names as the web (`bg-bg-white-0 text-label-md rounded-lg`), from the theme `pnpm tokens` generates. Strings go inside components or `<Text>`, never bare in a `View`. Icons are `<Icon name="calendar-line" />`. See every one at `/ui` in the dev app. Change a component in both places when it applies to both.
- Picking a day and time: `components/DateTime.tsx` (`DayStrip`, `DatePopover`, `TimeSelect`, `DateTimeField`). Values are Sydney wall-clock strings.
- Their Tailwind theme (`packages/ui/src/tailwind-theme.css`) is generated from `tokens.json` by `pnpm tokens`, so `bg-primary-base`, `text-label-sm`, `rounded-lg` etc. are Dibby values. To change a component's look, edit its `tv()` styles in `components/ui`, not the app.
- Dibby-only pieces with no AlignUI equivalent stay as `.db-` classes in `packages/ui/src/components.css`: card, plan card, vote option, bill split, chat bubble, stack/row, icon. The other `.db-` classes there are superseded by the components above.
- `.db-` classes and the app's own classes are unlayered, so they beat Tailwind utilities. Don't put a `.db-`/app class and a utility for the same property on one element (e.g. use the `hidden` attribute, not the `hidden` class, on a `.section`).
- No raw hex values in app code.
- Violet `primary-base` is the brand; lime `accent-base` is the "calling dibs" moment, at most once per screen, always with black text.
- Headings in Bricolage Grotesque, everything else Figtree, money and codes in DM Mono.
- Phone first: 16px gutter, one column, main action pinned at the bottom as `<Button.Root size="large" block>`. Tap targets at least 44px.
- Icons: Remix Icon, either the font (`<i className="ri-… db-icon" aria-hidden="true">`, or `<Button.Icon as="i" className="ri-…" />` inside a component) or `@remixicon/react`. Never emoji as icons.
- The app is called **Dibby** (capital D in sentences; the logo is lowercase **dibby**). Dibby is the name of the app and of the AI helper in the chat; the next rule says how copy tells them apart. "dibs" is only the verb ("call dibs", the lime moment), never the product name.
- Which Dibby: in running copy, "Dibby" always means the helper, and it gets its face where it's named in the UI (`<DibbyName />`, or `DibbyMark` in the chat). The app isn't called Dibby in running copy: say "the app", "here", or just the action ("it's split for you"). The name means the app only on brand surfaces: the logo, About, emails, legal pages, "Get the Dibby app".
- Internal names keep the old name on purpose: `@dibs/*` packages, `.db-` classes, `variant="dibs"` (the call-dibs button), `dibs:` storage keys, `dibs-*.svg` logo files. Don't rename them: storage keys would reset people's state.
- Copy: Australian spelling, sentence case, sounds like a mate in the group chat. Never pushy about money.
- Logos are in `packages/ui/assets/logos/` (read its README). The logo is Dibby waving, a 3D render (`dibby-icon-1024.png`); under 48px use the flat face (`dibby-face.svg`). Dibby's chat avatar is the face cropped from the icon. Exports and the sizes the app serves are made by `logos/export.py`.

## Email

- Every email uses the shell in `packages/email` (header, card, footer). Don't hand-roll email HTML.
- Release notes: `release-notes/*.md`, sent with `pnpm release-notes` (see `packages/email/README.md`).
- Beta updates are opt-in only (unticked at sign-up, switch on `/account`). Every non-sign-in email carries the unsubscribe link and `List-Unsubscribe` headers, and unsubscribing never needs a sign-in.

## Rules that must not break

- Dibby never holds or moves money. Settle-up is PayID details only.
- PayID is shown only to people with a share on that bill who were confirmed at wrap-up (`get_payid`).
- Balances are private: you see your own share; the payer sees their bill; everyone else sees "4 of 6 settled".
- Dibby reads only messages it's tagged in, keeps no memory between plans, and never mentions money owed or anything personal.
- Guests have no account by default: signed device cookie (`lib/guest.ts`), every guest write goes through a server action or route.
- A guest can add an email (`/account`). When someone signs in with it within an hour, or signs in on the browser holding the guest cookie, `store.claimGuests` moves those memberships onto the account (`lib/viewer.ts` `whoIsHere`). Signing out also clears the guest cookie.
- The organiser can make someone a co-host or hand the plan over from the who's going list (`setHost` in `manage/actions.ts`, `HostMenu`). Only to people going who have an account; handing over makes the old organiser a co-host. Co-hosts can do everything but hand over.
- Hosts can merge a guest's extra spot into another one, the same person in two browsers (`mergeMembers` in `manage/actions.ts`, rules in `packages/shared/src/merge.ts`). Never an account's spot, the organiser's, or anyone on a bill. The answer furthest in wins, votes stay within the plan's limit, and the chat says so.
- In-app browsers (Messenger, Instagram, Facebook…) keep their own cookies. Plan pages and sign-in show `InAppBanner` there (`packages/shared/src/inapp.ts` detects them from the user agent).
- Amounts are integer cents with a currency code (default AUD).
- Only people going (and hosts) vote, chat, react or add places. Maybe, not replied or waitlisted: read only. Can't go: vote, chat and who's in are hidden. `planAccess` in `packages/shared/src/plans.ts`, checked in every server action. Stepping down from going before the plan starts takes your vote back.
- Dibby never makes up a day or a time. Ask Dibby chips (day, time, budget, near me) are fixed facts; `resolveStart` in `packages/shared/src/when.ts` decides the start.
- Dibby searches near the asker by default (`lib/locate.ts`, rounded to ~100m). A place named in the ask, or earlier in that plan's chat (`SearchMemo` on Dibby's message), wins. Coordinates only bias the Places search: never saved, never sent to the AI.
- Every place on a plan (vote options, a set place) comes from the place picker (`components/PlacePicker.tsx`): either a real, open business from the map, which the server checks with `getPlace` before saving, or a place typed in (someone's place, a spot in a park) as a name plus an optional address (`cleanCustomPlace`).
- Place details (photos, stars, reviews, hours) come from Google's Places UI Kit elements (`components/maps/PlaceCard.tsx`, `PlaceDetailsSheet.tsx`). Google renders and attributes them; we only ever store the place ID (Places terms). Cards load when they scroll into view, since each load is billed. Dibby's messages carry the place IDs it added (`places` in `template`, `lib/place-ids.ts`) so the chat shows them as tiles.
- Load Google Maps through `components/maps/GoogleMaps.tsx`, never `APIProvider` directly: the script must load once with one set of options.
- Calendar subscription (`/cal/<token>.ics`, `app/cal/[file]/route.ts`): accounts only, one private token each in `calendar_feeds`, reset from `/account`. It lists plans you're in once they're locked with a time (`feedStatus` in `packages/shared/src/calendar.ts`); called off, can't go or waitlisted drops off. The token is the only key, so never log it or put it in analytics.
- A typed-in place's name is public like any plan detail (page, WhatsApp preview, Dibby). Its address is only shown to people in the plan: plan card, vote options, calendar files. The picker says so on each field and flags a name that looks like an address (`looksLikeAddress`); it never blocks.
- Crews (Linear project P-ARV-2) are app only and accounts only. Rules live in `packages/shared/src/crews.ts`, schema in `0029_crews.sql`; check them in every route and server action, because the server's service key skips row-level security.
- A crew plan is crew only or anyone with the link (`plans.visibility`). Crew-only plans are for the crew alone (`crewPlanAccess`): being on the plan isn't enough, so someone removed from the crew loses them straight away. Anyone else gets the blocked page, the same page as a plan that doesn't exist. Link previews for crew-only plans and invites are generic (`genericPreview`).
- Crew invite links are Discord-style: any member makes one, with an expiry and optional max uses; only the token's hash is stored. A link only gets you to Ask to join; the owner or an admin approves (`canAskToJoin`). Don't call visibility "open" or "close": those mean spot limits.

## Layout

- `apps/mobile` — the iOS and Android app (Expo, Expo Router). It reads data from the web app's `/api/v1/*` routes, never Supabase directly; shapes live in `packages/shared/src/api.ts` (add fields, never rename or remove: old app versions stay installed). Colours come from `packages/ui/tokens.json`. See `apps/mobile/README.md`.
- `apps/web` — Next.js 16 App Router. `lib/store` has the data layer (Supabase or in-memory), `lib/viewer.ts` works out who is looking at a plan.
- `packages/shared` — bill maths, plan helpers, types.
- `packages/ui` — tokens (and the generated Tailwind theme), Dibby-only component CSS, design-system copy.
- `apps/web/components/ui` — the AlignUI components, Dibby-themed.
- `supabase/migrations` — schema and row-level security.
