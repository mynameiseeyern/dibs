/**
 * What dibby.social tells iOS and Android so a plan link opens the app instead of the browser.
 * Served at /.well-known/apple-app-site-association and /.well-known/assetlinks.json.
 *
 * Both need values that only exist once the app is signed, so they come from env:
 * - APPLE_TEAM_ID: Apple Developer > Membership details (10 characters).
 * - ANDROID_CERT_SHA256: comma-separated SHA-256 fingerprints. Add the EAS upload key
 *   (`npx eas-cli credentials -p android`) and, once the app is on Play, the app signing key
 *   (Play Console > Test and release > App integrity).
 * Unset, each file says nothing, so links keep opening the web page.
 */

export const APP_ID = "social.dibby.app";

/** The paths the app handles. Matches the app's routes and android.intentFilters in app.json. */
export const APP_PATHS = ["/p/*"];

export function appleAppSiteAssociation(teamId = process.env.APPLE_TEAM_ID?.trim()) {
  const details = teamId
    ? [{ appIDs: [`${teamId}.${APP_ID}`], components: APP_PATHS.map((p) => ({ "/": p })) }]
    : [];
  return { applinks: { details } };
}

export function assetLinks(fingerprints = process.env.ANDROID_CERT_SHA256) {
  const certs = (fingerprints ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);
  if (certs.length === 0) return [];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: APP_ID, sha256_cert_fingerprints: certs },
    },
  ];
}
