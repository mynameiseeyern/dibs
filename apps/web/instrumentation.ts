import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.shared";

// Crash reporting on the server and edge (ARV-53). Does nothing without SENTRY_DSN.
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, ...sentryOptions });
}

export const onRequestError = Sentry.captureRequestError;
