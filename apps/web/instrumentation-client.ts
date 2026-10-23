import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.shared";

// Crash reporting in the browser (ARV-53). Does nothing without NEXT_PUBLIC_SENTRY_DSN.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) Sentry.init({ dsn, ...sentryOptions, integrations: [] });
