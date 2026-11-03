# Dibby

Group plans that actually happen. Make a plan, share it to the group chat, vote on where and when, RSVP, then split the bill and settle up by PayID. Dibby, the AI helper in each plan's chat, finds places and drafts options when you tag it.

- **Web app:** [dibby.social](https://dibby.social) (Next.js on Vercel, Sydney)
- **Native app:** iOS and Android from one Expo app, in progress
- Free for everyone. Dibby never holds or moves money.

## Run it

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # leave it blank for the in-memory demo
pnpm dev                                        # web app on http://localhost:3000
pnpm mobile                                     # Expo dev server; scan the QR with Expo Go
```

With no Supabase keys the web app runs on an in-memory store with a fake sign-in, so you can click through every flow locally. Without Google keys, places come from a few made-up Sydney spots and the picker is a plain list. The phone app talks to `https://dibby.social` by default; see [`apps/mobile/README.md`](apps/mobile/README.md) to point it at your laptop.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Web app |
| `pnpm mobile` | Native app (Expo) |
| `pnpm test` | Unit tests for `packages/shared`: bills, plan access, start times, votes, calendar, API shapes (Vitest) |
| `pnpm typecheck` | Every package |
| `pnpm build` | Tokens, then the web app |
| `pnpm tokens` | Regenerates the web and native themes from `packages/ui/tokens.json` |
| `pnpm release-notes` | Sends a release note to opted-in beta users |
| `pnpm email-templates` | Rebuilds the Supabase auth email templates |

## Layout

- `apps/web` — Next.js 16 App Router. Plan pages (`/p/:slug`), the create flow (`/new`), organiser screens, account, server actions, and the `/api/v1/*` routes the phone app reads. `lib/store` is the data layer (Supabase or in-memory); `lib/viewer.ts` works out who is looking at a plan.
- `apps/mobile` — the iOS and Android app (Expo, Expo Router, NativeWind). It never talks to Supabase directly; everything goes through the web app's API, with shapes in `packages/shared/src/api.ts`.
- `packages/shared` — bill maths, plan access, when-it-starts, votes, calendar feed, API types.
- `packages/ui` — Dibby design-system tokens, the generated Tailwind and native themes, Dibby-only `.db-` component CSS, brand book, component docs and logos ([`packages/ui/README.md`](packages/ui/README.md)).
- `packages/email` — the shared email shell, markdown to email HTML, and sending through Resend ([`packages/email/README.md`](packages/email/README.md)).
- `release-notes` — one markdown file per beta update.
- `supabase` — migrations, row-level security, PayID and settle-up functions, auth email templates.
- `design` — the clay crew art brief and screen drafts.

Building UI? Read [`CLAUDE.md`](CLAUDE.md) first: the design-system rules, copy rules and the privacy rules that must not break all live there. Components are AlignUI themed to Dibby (`apps/web/components/ui`, ported to `apps/mobile/components/ui`); open `/ui` in either app to see them all.

## Environment

Everything is in [`apps/web/.env.example`](apps/web/.env.example). In short:

| Variable | For |
| --- | --- |
| `SITE_URL` | Your domain (`https://dibby.social` in production) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Database and sign-in |
| `GUEST_COOKIE_SECRET` | Signs the guest device cookie (`openssl rand -hex 32`) |
| `ANTHROPIC_API_KEY` | Dibby in the chat |
| `GOOGLE_PLACES_API_KEY` | Place search and checking a place is real and open (server) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID` | The map in the place picker (browser, referrer-restricted) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_SENDER_NAME` | Release-note emails |

## Set up Supabase (Sydney)

1. New project in `ap-southeast-2`.
2. SQL editor: paste and run `supabase/setup.sql` (every migration in one go). After that, run new files in `supabase/migrations` as they land.
3. Auth > URL configuration: add `http://localhost:3000/auth/callback` and `https://dibby.social/auth/callback`.
4. Auth > Email templates: use the ones in `supabase/templates` (`pnpm email-templates` rebuilds them).
5. Copy the URL, anon key and service role key into `apps/web/.env.local`.

## Deploy

**Web.** Vercel (Hobby plan), with **Root Directory** set to `apps/web`. Add the env vars above, with `SITE_URL` set to the domain. Functions run in Sydney (`apps/web/vercel.json`). Commits must be authored by `mynameiseeyern`, or Hobby won't deploy them, and Vercel skips a deploy when nothing under `apps/web` or a package it uses changed.

**Phones.** JS-only changes go out over the air with EAS Update; anything native needs a new EAS build and store review. Details in [`apps/mobile/README.md`](apps/mobile/README.md).

## Links

- Build plan: https://claude.ai/artifact/2Lce9vh9ZvGunTKngL6sWX
- Design system: https://claude.ai/artifact/77AdHKZGgDU4j19fqSsYdz
- Linear: project P-ARV-1
