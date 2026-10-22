// The one place that talks to an email provider. Today that's Resend's plain email API,
// which bills per email (not per contact). We keep the list in Supabase ourselves, so moving
// to Amazon SES or anyone else later means rewriting only this file.

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Extra headers, e.g. List-Unsubscribe. */
  headers?: Record<string, string>;
  /** Same key twice within 24 hours and Resend sends it once. Stops double sends on a retry. */
  idempotencyKey?: string;
}

export interface SendResult {
  id: string;
}

export function emailConfig() {
  const from = process.env.EMAIL_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO;
  const apiKey = process.env.RESEND_API_KEY;
  return { from, replyTo, apiKey, ready: Boolean(from && apiKey) };
}

export async function sendEmail(e: OutgoingEmail): Promise<SendResult> {
  const { from, replyTo, apiKey } = emailConfig();
  if (!apiKey || !from) throw new Error("Set RESEND_API_KEY and EMAIL_FROM to send email.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(e.idempotencyKey ? { "Idempotency-Key": e.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [e.to],
      subject: e.subject,
      html: e.html,
      text: e.text,
      reply_to: replyTo || undefined,
      headers: e.headers,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (!res.ok || !body.id) {
    const err = new Error(`Resend ${res.status}: ${body.message ?? body.name ?? "unknown error"}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return { id: body.id };
}
