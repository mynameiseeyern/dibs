# Dibs — notes for Claude Code

Hackathon POC for Dibs, a group plans app: plan → share to WhatsApp → vote and RSVP → bills, PayID, card roulette → recap.
Build plan: https://claude.ai/artifact/2Lce9vh9ZvGunTKngL6sWX · Linear project "Dibs — Hackathon" (P-ARV-1).

## Commits

- Commit as `mynameiseeyern <eeyern.ux@gmail.com>`. Vercel is on the Hobby plan and only deploys commits authored by the account owner.
- Vercel skips a deploy when nothing under `apps/web` (or a package it uses) changed.

## Commands

- `pnpm dev` — web app on :3000 (in-memory demo store if Supabase env is empty)
- `pnpm test` — bill maths (Vitest). Only the bill maths has tests; keep them passing.
- `pnpm build`, `pnpm typecheck`
- `pnpm tokens` — regenerate `packages/ui/src/tokens.css` and `tailwind-theme.css` from `packages/ui/tokens.json`

## Design system

The source of truth is the Dibs design system on claude.ai (https://claude.ai/artifact/77AdHKZGgDU4j19fqSsYdz).
In this repo: read `packages/ui/docs/brand-book.md` before building UI, and `packages/ui/docs/components/<Name>.md` for each component.
Open `packages/ui/design-system/index.html` in a browser to see every component rendered. Token values come from `packages/ui/scripts/gen-tokens.py` (see `packages/ui/README.md`).

- Components are AlignUI (React + Tailwind v4), themed to Dibs: `apps/web/components/ui/*` (`import * as Button from "@/components/ui/button"`). Button, Badge, Avatar, Alert, Input/Label/Hint, Checkbox, Radio, Switch, Segmented control, Tab menu, Progress, Tooltip, Modal (the bottom sheet) and Toast (`toast.success(…)`). See them all at `/ui` in dev.
- Their Tailwind theme (`packages/ui/src/tailwind-theme.css`) is generated from `tokens.json` by `pnpm tokens`, so `bg-primary-base`, `text-label-sm`, `rounded-lg` etc. are Dibs values. To change a component's look, edit its `tv()` styles in `components/ui`, not the app.
- Dibs-only pieces with no AlignUI equivalent stay as `.db-` classes in `packages/ui/src/components.css`: card, plan card, vote option, bill split, chat bubble, stack/row, icon. The other `.db-` classes there are superseded by the components above.
- `.db-` classes and the app's own classes are unlayered, so they beat Tailwind utilities. Don't put a `.db-`/app class and a utility for the same property on one element (e.g. use the `hidden` attribute, not the `hidden` class, on a `.section`).
- No raw hex values in app code.
- Violet `primary-base` is the brand; lime `accent-base` is the "calling dibs" moment, at most once per screen, always with black text.
- Headings in Bricolage Grotesque, everything else Figtree, money and codes in DM Mono.
- Phone first: 16px gutter, one column, main action pinned at the bottom as `<Button.Root size="large" block>`. Tap targets at least 44px.
- Icons: Remix Icon, either the font (`<i className="ri-… db-icon" aria-hidden="true">`, or `<Button.Icon as="i" className="ri-…" />` inside a component) or `@remixicon/react`. Never emoji as icons.
- Copy: Australian spelling, sentence case, lowercase **dibs**, sounds like a mate in the group chat. Never pushy about money.
- Logos are in `packages/ui/assets/logos/`. `dibs-ai-member.svg` is only for Dibby.

## Email

- Every email uses the shell in `packages/email` (header, card, footer). Don't hand-roll email HTML.
- Release notes: `release-notes/*.md`, sent with `pnpm release-notes` (see `packages/email/README.md`).
- Beta updates are opt-in only (unticked at sign-up, switch on `/account`). Every non-sign-in email carries the unsubscribe link and `List-Unsubscribe` headers, and unsubscribing never needs a sign-in.

## Rules that must not break

- Dibs never holds or moves money. Settle-up is PayID details only.
- PayID is shown only to people with a share on that bill who were confirmed at wrap-up (`get_payid`).
- Balances are private: you see your own share; the payer sees their bill; everyone else sees "4 of 6 settled".
- Dibby reads only messages it's tagged in, keeps no memory between plans, and never mentions money owed or anything personal.
- Guests have no account by default: signed device cookie (`lib/guest.ts`), every guest write goes through a server action or route.
- A guest can add an email (`/account`). When someone signs in with it within an hour, or signs in on the browser holding the guest cookie, `store.claimGuests` moves those memberships onto the account (`lib/viewer.ts` `whoIsHere`). Signing out also clears the guest cookie.
- Amounts are integer cents with a currency code (default AUD).
- Every place on a plan (vote options, a set place) is a real, open business picked on the map (`components/PlacePicker.tsx`), and the server checks the place ID with `getPlace` before saving. No typed-in places.

## Layout

- `apps/web` — Next.js 16 App Router. `lib/store` has the data layer (Supabase or in-memory), `lib/viewer.ts` works out who is looking at a plan.
- `packages/shared` — bill maths, plan helpers, types.
- `packages/ui` — tokens (and the generated Tailwind theme), Dibs-only component CSS, design-system copy.
- `apps/web/components/ui` — the AlignUI components, Dibs-themed.
- `supabase/migrations` — schema and row-level security.
