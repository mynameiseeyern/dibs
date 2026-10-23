import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Sentry settings shared by the browser, server and edge (ARV-53). Off unless a DSN is set.
 * No personal data: no IPs, cookies or request bodies, and no breadcrumbs of what people typed.
 */
export const sentryOptions = {
  sendDefaultPii: false,
  tracesSampleRate: 0,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  beforeSend(event: ErrorEvent) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      delete event.request.headers;
      delete event.request.query_string;
    }
    delete event.user;
    return event;
  },
};
