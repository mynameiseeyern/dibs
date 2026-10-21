# dibs

Plans sorted, money square. Hackathon POC (Linear: Dibs — Hackathon, P-ARV-1).

## Run it

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # leave Supabase blank for the in-memory demo
pnpm dev                                        # http://localhost:3000
pnpm test                                       # bill maths
```

Without Supabase keys the app runs on an in-memory store with a fake sign-in, so you can click through
the whole flow locally. With keys, organisers sign in by magic link and everything is saved.

## Set up Supabase (Sydney)

1. New project in `ap-southeast-2`.
2. SQL editor: paste and run `supabase/setup.sql` (all migrations in one go).
3. Auth > URL configuration: add `http://localhost:3000/auth/callback` and your domain's `/auth/callback`.
4. Copy the URL, anon key and service role key into `apps/web/.env.local`, plus `GUEST_COOKIE_SECRET` (`openssl rand -hex 32`).

## Layout

- `apps/web` — Next.js 16 app (plan pages, organiser screens, server actions)
- `packages/shared` — bill maths (unit tested), plan helpers, types
- `packages/ui` — Dibs design-system tokens and `.db-` components, from the Dibs design system on claude.ai. `pnpm tokens` regenerates `tokens.css` from `tokens.json`. Brand book, component guidelines and logos are in `packages/ui/docs` and `packages/ui/assets` (see `packages/ui/README.md`).
- `supabase/migrations` — schema, row-level security, PayID and settle-up functions

Build plan: https://claude.ai/artifact/2Lce9vh9ZvGunTKngL6sWX

## Deploy on Vercel

Import the GitHub repo, set **Root Directory** to `apps/web` (Vercel picks up pnpm and the workspace),
add the same env vars as `.env.local` with `NEXT_PUBLIC_SITE_URL` set to your domain, and deploy.
Functions run in Sydney (`apps/web/vercel.json`).
