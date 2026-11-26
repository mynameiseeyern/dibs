export { renderEmail, button, h1, para, muted, esc, type Sender, type EmailParts } from "./layout";
export { markdownToEmailHtml, markdownToText } from "./markdown";
export { parseReleaseNote, renderReleaseNote, type ReleaseNote } from "./release-note";
export { sendEmail, emailConfig, type OutgoingEmail } from "./send";
export { light, dark, fonts } from "./theme";

/** The beta updates list. One name so the app, the database and the send command agree. */
export const BETA_LIST = "beta_updates";

export function senderFromEnv(site: string) {
  return {
    site: site.replace(/\/$/, ""),
    name: process.env.EMAIL_SENDER_NAME || "Dibby, Sydney NSW",
    contact: process.env.EMAIL_REPLY_TO || "hello@dibby.social",
    postal: process.env.EMAIL_POSTAL_ADDRESS || undefined,
  };
}

/** Links that carry the subscriber's own token, so unsubscribing never needs a sign-in. */
export function listLinks(site: string, token: string) {
  const base = site.replace(/\/$/, "");
  return {
    unsubscribeUrl: `${base}/unsubscribe?t=${encodeURIComponent(token)}`,
    oneClickUrl: `${base}/api/unsubscribe?t=${encodeURIComponent(token)}`,
    settingsUrl: `${base}/account#email`,
  };
}
