/**
 * Writes the Supabase sign-in email templates in the dibs look:
 *
 *   pnpm email-templates
 *
 * Then paste each file into Supabase > Authentication > Emails > Templates (subject lines are
 * printed below). Supabase fills in {{ .ConfirmationURL }} and {{ .SiteURL }} when it sends.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { button, h1, muted, para, renderEmail } from "../src/index";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const out = join(repo, "supabase/templates");
mkdirSync(out, { recursive: true });

const sender = {
  site: "{{ .SiteURL }}",
  name: process.env.EMAIL_SENDER_NAME || "dibs, Sydney NSW",
  contact: process.env.EMAIL_REPLY_TO || "hello@dibby.social",
};

const signIn = (heading: string, lead: string) =>
  renderEmail({
    sender,
    title: heading,
    preheader: "Tap to sign in. The link works once and runs out in an hour.",
    body: [
      h1(heading),
      para(lead),
      button("{{ .ConfirmationURL }}", "Sign in to dibs"),
      muted("The link works once and runs out in an hour. Open it on the phone or laptop you want to use dibs on."),
      muted("Didn't ask for this? You can ignore it. Nobody can sign in without this email."),
    ].join("\n"),
    footer: { reason: "You're getting this because someone asked to sign in to dibs with this email." },
  });

const templates = [
  { file: "magic-link.html", supabase: "Magic link", subject: "Your dibs sign-in link", html: signIn("Here's your sign-in link", "Tap the button and you're in. Your plans will be waiting.") },
  { file: "confirm-signup.html", supabase: "Confirm signup", subject: "Welcome to dibs, tap to sign in", html: signIn("Welcome to dibs", "Tap the button to finish signing up. Then make a plan and drop it in the group chat.") },
];

for (const t of templates) {
  writeFileSync(join(out, t.file), t.html);
  console.log(`${t.supabase.padEnd(15)} subject: "${t.subject}"  →  supabase/templates/${t.file}`);
}
