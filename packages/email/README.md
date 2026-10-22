# @dibs/email

Every dibs email shares one shell: a violet header with the logo, a white card, and a footer that says why you got it, how to stop, and who it's from. Colours come from `packages/ui/tokens.json`, so a token change reaches the emails too.

- `src/layout.ts`: the shell, plus `h1`, `para`, `muted` and `button` for emails written in code
- `src/markdown.ts`: markdown to email-safe HTML (inline styles, because Gmail drops most `<style>`)
- `src/release-note.ts`: release-note files and how they render
- `src/send.ts`: the only file that talks to an email provider (Resend today)

## Release notes to beta users

People join the **beta updates** list by ticking "Send me dibs beta updates" at sign-up (unticked by default) or with the switch on `/account`. Every release note has an unsubscribe link that works without signing in, plus `List-Unsubscribe` headers so Gmail and Apple Mail show their own unsubscribe button. Unsubscribing is instant.

1. Write `release-notes/YYYY-MM-DD-short-name.md`:

   ```md
   ---
   subject: Spin for the bill, now live for the whole crew
   preheader: One line that shows after the subject in the inbox.
   date: 2026-10-23
   ---

   # What's new in dibs
   ...
   ```

2. `pnpm release-notes preview release-notes/<file>.md` writes the HTML to `release-notes/.preview/`. Open it in a browser.
3. `pnpm release-notes test release-notes/<file>.md --to you@example.com` sends you one copy.
4. `pnpm release-notes send release-notes/<file>.md` shows how many people it will go to and asks you to type `send`. Running it again only sends to people who haven't had that note, so it's safe to retry.

## Setup (once)

1. **Database**: run `supabase/migrations/0007_mailing_list.sql` in the Supabase SQL editor.
2. **Resend**: make an account, add the domain `dibby.social`, and add the DNS records it gives you (SPF, DKIM, and a DMARC record if you don't have one). Create an API key with sending access.
3. **Env**: in `apps/web/.env.local` (for the send command) set `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `EMAIL_SENDER_NAME`, and `SITE_URL` to the live site so the logo and unsubscribe links point at it. The web app only needs `SITE_URL` for this.
4. **Sign-in emails**: run `pnpm email-templates`, then paste `supabase/templates/magic-link.html` and `confirm-signup.html` into Supabase > Authentication > Emails > Templates, with the subject lines it prints.
5. Optional: in Supabase > Authentication > Emails > SMTP, use Resend's SMTP details so sign-in emails come from `dibby.social` too, and aren't held to Supabase's built-in email limits.

## Cost

Resend's email API bills per email sent, not per contact, because we keep the list in Supabase ourselves. Free covers 3,000 emails a month but only 100 a day, so a note to more than 100 people needs the $20 plan (50,000 a month). At very high volume Amazon SES is the cheapest option; moving there only means rewriting `src/send.ts`.
