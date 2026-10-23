import * as Sentry from "@sentry/nextjs";

/**
 * Logs an error and sends it to Sentry when it's set up (ARV-53), tagged with where it came from
 * ("dibby" for failed AI calls). Never includes what anyone typed.
 */
export function report(area: string, err: unknown): void {
  console.error(`[${area}]`, err);
  Sentry.captureException(err, { tags: { area } });
}
