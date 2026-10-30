# Dibby for iOS and Android

One Expo app (Expo Router, SDK 58) that builds both the iOS and the Android app.

## Run it

```bash
pnpm install          # from the repo root
pnpm mobile           # starts Expo; scan the QR code with Expo Go on your phone
```

It talks to `https://dibby.social` by default. To point it at your laptop instead:

```bash
EXPO_PUBLIC_API_URL=http://<your-laptop-ip>:3000 pnpm mobile
```

## How it fits with the web app

- **The web app is the backend.** The phone calls `apps/web/app/api/v1/*` and never talks to Supabase directly, so every rule in the root `CLAUDE.md` (who sees addresses, balances, PayID) is enforced in one place.
- **Shapes are shared.** What each endpoint returns is typed in `packages/shared/src/api.ts`. Add fields; don't rename or remove them, because older app versions stay on people's phones for weeks. A breaking change means a new `/api/v2` route.
- **Colours come from `packages/ui/tokens.json`**, the same file the web theme is generated from (`lib/theme.ts`). Token names match the web: `primary-base`, `text-strong-950`.
- **Plan links use the same path** (`/p/:slug`), so a dibby.social link can open the app once universal links are live.

## Shipping a change

| What changed | Web | Phones |
| --- | --- | --- |
| API or database | Live on deploy, for both | Live on deploy, for both |
| Screens, copy, logic in JS | Vercel deploy | EAS Update (over the air, no store review) |
| A new native module or permission | — | New build through EAS, then App Store and Play review |

## Still to set up

1. `eas init` and `eas build:configure` (needs an Expo account), then `eas build --platform all`.
2. Universal links: serve `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` from `apps/web`. `app.json` already declares `dibby.social` for both.
3. Sign-in on the phone (Supabase auth, token sent to the API), then joining, RSVP and voting endpoints.
4. Proper Android adaptive icon (a padded foreground layer); for now it reuses the App Store icon.
5. DM Mono for money and codes (`packages/ui/fonts`).

## Building and shipping

Builds run in the cloud on EAS, so no Xcode or Android Studio needed. From `apps/mobile`:

| Profile | What it makes | Command |
| --- | --- | --- |
| `preview` | An install link for your own phones (Android APK, iOS ad hoc) | `npx eas-cli build --profile preview --platform all` |
| `production` | Store builds (iOS `.ipa`, Android `.aab`), build number bumped automatically | `npx eas-cli build --profile production --platform all` |
| — | Send the latest production build to TestFlight / Play internal testing | `npx eas-cli submit --platform ios` (or `android`) |
| — | Push a JS-only change to installed apps, no review | `npx eas-cli update --channel production` |

The first Android upload has to be done by hand in Play Console (download the `.aab` from the EAS build page); `eas submit` works after that.
