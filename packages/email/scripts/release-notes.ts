/**
 * Release notes for beta users.
 *
 *   pnpm release-notes preview release-notes/2026-10-23-first-beta-update.md
 *   pnpm release-notes test    release-notes/2026-10-23-first-beta-update.md --to you@example.com
 *   pnpm release-notes send    release-notes/2026-10-23-first-beta-update.md
 *
 * preview  writes the email to release-notes/.preview/ so you can open it in a browser. Sends nothing.
 * test     sends one copy to the address you give, subject starting "[Test]".
 * send     sends to everyone subscribed to beta updates who hasn't had this note yet.
 *          Asks before sending. Safe to run again: people who already got it are skipped.
 *
 * Reads apps/web/.env.local for SITE_URL, Supabase, RESEND_API_KEY and EMAIL_FROM.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { BETA_LIST, emailConfig, listLinks, parseReleaseNote, renderReleaseNote, sendEmail, senderFromEnv } from "../src/index";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const envFile = join(repo, "apps/web/.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const [command, file, ...rest] = process.argv.slice(2);
const flag = (name: string) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? (rest[i + 1] ?? "") : undefined;
};

function usage(): never {
  console.log(`Usage:
  pnpm release-notes preview <file.md>
  pnpm release-notes test <file.md> --to you@example.com
  pnpm release-notes send <file.md> [--yes]`);
  process.exit(1);
}

if (!command || !file || !["preview", "test", "send"].includes(command)) usage();

const path = resolve(process.env.INIT_CWD ?? process.cwd(), file);
if (!existsSync(path)) {
  console.error(`Can't find ${path}`);
  process.exit(1);
}
const note = parseReleaseNote(basename(path, ".md"), readFileSync(path, "utf8"));
const site = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const sender = senderFromEnv(site);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function emailFor(to: string, token: string, subjectPrefix = "") {
  const links = listLinks(site, token);
  const { html, text } = renderReleaseNote(note, sender, links);
  return {
    to,
    subject: subjectPrefix + note.subject,
    html,
    text,
    headers: {
      // Lets Gmail and Apple Mail show their own unsubscribe button, which posts here.
      "List-Unsubscribe": `<${links.oneClickUrl}>, <mailto:${sender.contact}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local to send to the list.");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function needSending() {
  if (!emailConfig().ready) {
    console.error("Set RESEND_API_KEY and EMAIL_FROM in apps/web/.env.local first (see the README in packages/email).");
    process.exit(1);
  }
}

async function preview() {
  const out = join(repo, "release-notes/.preview");
  mkdirSync(out, { recursive: true });
  const { html, text } = emailFor("preview@example.com", "preview-token");
  writeFileSync(join(out, `${note.id}.html`), html);
  writeFileSync(join(out, `${note.id}.txt`), text);
  console.log(`Subject:   ${note.subject}\nPreheader: ${note.preheader}\n\nOpen ${join(out, `${note.id}.html`)}`);
}

async function test() {
  needSending();
  const to = flag("to");
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    console.error("Give an address with --to you@example.com");
    process.exit(1);
  }
  const { id } = await sendEmail(emailFor(to, "test-token", "[Test] "));
  console.log(`Sent a test to ${to} (${id}). The unsubscribe link in a test doesn't do anything.`);
}

async function send() {
  needSending();
  const db = admin();
  const { data: subs, error } = await db
    .from("mailing_list")
    .select("email, token")
    .eq("list", BETA_LIST)
    .is("unsubscribed_at", null);
  if (error) throw error;
  const { data: sent, error: sentErr } = await db.from("release_note_sends").select("email").eq("note_id", note.id);
  if (sentErr) throw sentErr;
  const done = new Set((sent ?? []).map((r) => r.email));
  const todo = (subs ?? []).filter((s) => !done.has(s.email));

  console.log(`"${note.subject}"\n${subs?.length ?? 0} subscribed, ${done.size} already have it, ${todo.length} to send.`);
  if (!todo.length) return;
  if (flag("yes") === undefined) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Send to ${todo.length} ${todo.length === 1 ? "person" : "people"}? Type "send" to go: `);
    rl.close();
    if (answer.trim().toLowerCase() !== "send") {
      console.log("Not sent.");
      return;
    }
  }

  let ok = 0;
  let failed = 0;
  for (const s of todo) {
    for (let attempt = 1; ; attempt++) {
      try {
        const { id } = await sendEmail({ ...emailFor(s.email, s.token), idempotencyKey: `${note.id}:${s.email}` });
        const { error: logErr } = await db.from("release_note_sends").insert({ note_id: note.id, email: s.email, provider_id: id });
        if (logErr) console.warn(`  sent to ${s.email} but couldn't record it: ${logErr.message}`);
        ok++;
        break;
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (status === 429 && attempt < 5) {
          await sleep(1000 * attempt);
          continue;
        }
        console.warn(`  couldn't send to ${s.email}: ${(e as Error).message}`);
        failed++;
        break;
      }
    }
    // Resend allows a few requests a second; stay well under it.
    await sleep(350);
  }
  console.log(`Done: ${ok} sent${failed ? `, ${failed} failed (run send again to retry them)` : ""}.`);
}

const commands = { preview, test, send };
await commands[command as keyof typeof commands]();
