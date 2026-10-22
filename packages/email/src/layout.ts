import { dark, fonts, light } from "./theme";

/** Who the email is from, for the footer. The Spam Act needs an accurate name and a way to reach you. */
export interface Sender {
  /** Public site address, no trailing slash, e.g. https://dibby.social. Images load from here. */
  site: string;
  /** Shown in the footer, e.g. "dibs, Sydney NSW". */
  name: string;
  /** Where replies and questions go, e.g. hello@dibby.social. */
  contact: string;
}

export interface EmailParts {
  sender: Sender;
  /** Shown as the browser tab title and to screen readers. */
  title: string;
  /** The grey line inboxes show after the subject. Keep it under ~90 characters. */
  preheader: string;
  /** Small label in the header band, e.g. "Beta update · 23 Oct". */
  eyebrow?: string;
  /** The content, already HTML (use the helpers below or the markdown renderer). */
  body: string;
  footer: {
    /** Why they're getting this, in one sentence. */
    reason: string;
    /** One-click unsubscribe link. Required for anything that isn't a sign-in or receipt. */
    unsubscribeUrl?: string;
    /** Where they can change what dibs emails them about. */
    settingsUrl?: string;
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The dibs email shell: violet header band with the logo, white card, quiet footer.
 * Table layout and inline styles so it holds up in Gmail and Outlook. Clients that
 * honour prefers-color-scheme (Apple Mail, Outlook apps) get the dark palette.
 */
export function renderEmail(p: EmailParts): string {
  const L = light;
  const D = dark;
  const { site, name, contact } = p.sender;
  const links = [
    p.footer.unsubscribeUrl && `<a href="${esc(p.footer.unsubscribeUrl)}" class="db-link-sub" style="color:${L["text-sub-600"]};text-decoration:underline;">Unsubscribe</a>`,
    p.footer.settingsUrl && `<a href="${esc(p.footer.settingsUrl)}" class="db-link-sub" style="color:${L["text-sub-600"]};text-decoration:underline;">Email settings</a>`,
  ].filter(Boolean);

  return `<!doctype html>
<html lang="en-AU" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(p.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; }
  table { border-collapse: collapse; }
  img { border: 0; display: block; outline: none; }
  a { color: ${L["primary-dark"]}; }
  .db-body a { color: ${L["primary-dark"]}; }
  @media (max-width: 600px) {
    .db-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .db-outer { padding: 12px 8px 24px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .db-page { background: ${D["bg-weak-50"]} !important; }
    .db-card { background: ${D["bg-white-0"]} !important; border-color: ${D["stroke-soft-200"]} !important; }
    .db-text { color: ${D["text-strong-950"]} !important; }
    .db-sub, .db-link-sub { color: ${D["text-sub-600"]} !important; }
    .db-rule { border-color: ${D["stroke-soft-200"]} !important; }
    .db-body a { color: ${D["primary-dark"]} !important; }
    .db-body a.db-button { color: ${L["static-white"]} !important; }
    .db-code { background: ${D["bg-soft-200"]} !important; color: ${D["text-strong-950"]} !important; }
    .db-callout { background: ${D["primary-lighter"]} !important; }
  }
  [data-ogsc] .db-page { background: ${D["bg-weak-50"]} !important; }
  [data-ogsc] .db-card { background: ${D["bg-white-0"]} !important; }
  [data-ogsc] .db-text { color: ${D["text-strong-950"]} !important; }
  [data-ogsc] .db-sub, [data-ogsc] .db-link-sub { color: ${D["text-sub-600"]} !important; }
</style>
</head>
<body class="db-page" style="margin:0;padding:0;background:${L["bg-weak-50"]};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(p.preheader)}${"&#8199;&#65279;&#847; ".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="db-page" style="background:${L["bg-weak-50"]};">
<tr><td align="center" class="db-outer" style="padding:24px 16px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td style="background:${L["primary-base"]};border-radius:24px 24px 0 0;padding:24px 32px;" class="db-pad">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle"><a href="${esc(site)}" style="text-decoration:none;"><img src="${esc(site)}/email/dibs-header@2x.png" width="96" height="32" alt="dibs" style="width:96px;height:32px;color:${L["static-white"]};font:800 26px ${fonts.display};"></a></td>
        ${p.eyebrow ? `<td align="right" valign="middle" style="font:700 12px/16px ${fonts.sans};letter-spacing:0.08em;text-transform:uppercase;color:${L["static-white"]};">${esc(p.eyebrow)}</td>` : ""}
      </tr></table>
    </td></tr>
    <tr><td class="db-card db-pad db-body" style="background:${L["bg-white-0"]};border:1px solid ${L["stroke-soft-200"]};border-top:0;border-radius:0 0 24px 24px;padding:32px 32px 36px;font:400 16px/26px ${fonts.sans};color:${L["text-strong-950"]};">
      <div class="db-text" style="color:${L["text-strong-950"]};">
${p.body}
      </div>
    </td></tr>
    <tr><td class="db-pad" style="padding:24px 32px 0;font:400 13px/20px ${fonts.sans};color:${L["text-sub-600"]};" align="center">
      <p class="db-sub" style="margin:0 0 8px;color:${L["text-sub-600"]};">${esc(p.footer.reason)}</p>
      ${links.length ? `<p class="db-sub" style="margin:0 0 8px;color:${L["text-sub-600"]};">${links.join(" &nbsp;·&nbsp; ")}</p>` : ""}
      <p class="db-sub" style="margin:0 0 8px;color:${L["text-sub-600"]};">dibs never asks for your password or bank details by email.</p>
      <p class="db-sub" style="margin:0;color:${L["text-sub-600"]};">${esc(name)} &nbsp;·&nbsp; <a href="mailto:${esc(contact)}" class="db-link-sub" style="color:${L["text-sub-600"]};text-decoration:underline;">${esc(contact)}</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

// ---------- Content helpers, for emails written in code rather than markdown ----------

export const h1 = (text: string) =>
  `<h1 class="db-text" style="margin:0 0 12px;font:800 30px/36px ${fonts.display};letter-spacing:-0.01em;color:${light["text-strong-950"]};">${esc(text)}</h1>`;

export const para = (html: string) => `<p style="margin:0 0 16px;">${html}</p>`;

export const muted = (html: string) =>
  `<p class="db-sub" style="margin:0 0 16px;font-size:14px;line-height:22px;color:${light["text-sub-600"]};">${html}</p>`;

/** A pill button that renders in every client, Outlook included. */
export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr>
<td style="border-radius:999px;background:${light["primary-base"]};">
<a href="${esc(href)}" class="db-button" style="display:inline-block;padding:14px 28px;font:600 16px/22px ${fonts.sans};color:${light["static-white"]};text-decoration:none;border-radius:999px;">${esc(label)}</a>
</td></tr></table>`;
}

export { esc };
