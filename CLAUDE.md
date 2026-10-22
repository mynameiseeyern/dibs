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
- `pnpm tokens` — regenerate `packages/ui/src/tokens.css` from `packages/ui/tokens.json`

## Design system

The source of truth is the Dibs design system on claude.ai (https://claude.ai/artifact/77AdHKZGgDU4j19fqSsYdz).
In this repo: read `packages/ui/docs/brand-book.md` before building UI, and `packages/ui/docs/components/<Name>.md` for each component.
Open `packages/ui/design-system/index.html` in a browser to see every component rendered. Token values come from `packages/ui/scripts/gen-tokens.py` (see `packages/ui/README.md`).

- Use the `.db-` component classes from `packages/ui/src/components.css` and the CSS variables from `tokens.css`. No raw hex values in app code.
- Violet `primary-base` is the brand; lime `accent-base` is the "calling dibs" moment, at most once per screen, always with black text.
- Headings in Bricolage Grotesque, everything else Figtree, money and codes in DM Mono.
- Phone first: 16px gutter, one column, main action pinned at the bottom as `db-btn--lg db-btn--block`. Tap targets at least 44px.
- Icons: Remix Icon (`<i class="ri-… db-icon" aria-hidden="true">`). Never emoji as icons.
- Copy: Australian spelling, sentence case, lowercase **dibs**, sounds like a mate in the group chat. Never pushy about money.
- Logos are in `packages/ui/assets/logos/`. `dibs-ai-member.svg` is only for Dibby.

## Rules that must not break

- Dibs never holds or moves money. Settle-up is PayID details only.
- PayID is shown only to people with a share on that bill who were confirmed at wrap-up (`get_payid`).
- Balances are private: you see your own share; the payer sees their bill; everyone else sees "4 of 6 settled".
- Dibby reads only messages it's tagged in, keeps no memory between plans, and never mentions money owed or anything personal.
- Guests have no account by default: signed device cookie (`lib/guest.ts`), every guest write goes through a server action or route.
- A guest can add an email (`/account`). When someone signs in with it within an hour, or signs in on the browser holding the guest cookie, `store.claimGuests` moves those memberships onto the account (`lib/viewer.ts` `whoIsHere`). Signing out also clears the guest cookie.
- Amounts are integer cents with a currency code (default AUD).

## Layout

- `apps/web` — Next.js 16 App Router. `lib/store` has the data layer (Supabase or in-memory), `lib/viewer.ts` works out who is looking at a plan.
- `packages/shared` — bill maths, plan helpers, types.
- `packages/ui` — tokens, components, design-system copy.
- `supabase/migrations` — schema and row-level security.
