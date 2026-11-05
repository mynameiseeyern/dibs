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

## Signing in

The phone signs in with the same email as the web, using its 6-digit code instead of the link:
`POST /api/v1/auth/code` emails it, `POST /api/v1/auth/verify` swaps it for a session, and
`lib/session.tsx` keeps that in the keychain (`expo-secure-store`) and refreshes it. Every other
call sends `Authorization: Bearer …`, checked by `apps/web/lib/api-auth.ts`. In demo mode (no
Supabase) any 6 digits sign in.

The code only arrives once Supabase has the current templates: paste `supabase/templates/magic-link.html`
and `confirm-signup.html` into Supabase > Authentication > Emails after changing them.

Delete account is in the app (Apple requires it): `DELETE /api/v1/me`, the same as the web's.

## How it fits with the web app

- **The web app is the backend.** The phone calls `apps/web/app/api/v1/*` and never talks to Supabase directly, so every rule in the root `CLAUDE.md` (who sees addresses, balances, PayID) is enforced in one place.
- **Shapes are shared.** What each endpoint returns is typed in `packages/shared/src/api.ts`. Add fields; don't rename or remove them, because older app versions stay on people's phones for weeks. A breaking change means a new `/api/v2` route.
- **Same design system.** Styling is Tailwind through NativeWind, with a theme `pnpm tokens` generates from `packages/ui/tokens.json` next to the web one, so classes mean the same thing in both apps: `bg-bg-white-0 text-text-strong-950 text-label-md rounded-lg`. Light and dark are CSS variables set at the root (`lib/theme.tsx`).
- **Same components.** `components/ui` has the AlignUI components the web uses, ported to React Native with the same names and props (`<Button.Root variant="dibs" size="large">`). `components/dibby` has the Dibby-only ones (card, plan card, vote option, chat bubble, bill split). Open `/ui` in the dev app to see them all, in both themes.
- **Plan links use the same path** (`/p/:slug`), so a dibby.social link can open the app once universal links are live.

## Shipping a change

| What changed | Web | Phones |
| --- | --- | --- |
| API or database | Live on deploy, for both | Live on deploy, for both |
| Screens, copy, logic in JS | Vercel deploy | EAS Update (over the air, no store review) |
| A new native module or permission | — | New build through EAS, then App Store and Play review |

## Still to set up

1. First builds: see Building and shipping below.
2. Universal links: `apps/web` serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` (`lib/app-links.ts`). Set `APPLE_TEAM_ID` and `ANDROID_CERT_SHA256` on Vercel once the first builds are signed, and add the Play app signing fingerprint after the first Play upload.
3. Sign-in on the phone (Supabase auth, token sent to the API), then joining, RSVP and voting endpoints.

## Building and shipping

Builds run in the cloud on EAS, so no Xcode or Android Studio needed. From `apps/mobile`:

| Profile | What it makes | Command |
| --- | --- | --- |
| `preview` | An install link for your own phones (Android APK, iOS ad hoc) | `npx eas-cli build --profile preview --platform all` |
| `production` | Store builds (iOS `.ipa`, Android `.aab`), build number bumped automatically | `npx eas-cli build --profile production --platform all` |
| — | Send the latest production build to TestFlight / Play internal testing | `npx eas-cli submit --platform ios` (or `android`) |
| — | Push a JS-only change to installed apps, no review | `npx eas-cli update --channel production` |

The first Android upload has to be done by hand in Play Console (download the `.aab` from the EAS build page); `eas submit` works after that.

## Writing UI

- Use a component from `components/ui` or `components/dibby` before building a control. Strings go inside a component or `<Text>`; a bare string in a `View` crashes.
- Type: `text-title-h3`, `text-label-md`, `text-paragraph-sm`, `text-number-md`. Each picks its exact font face, because Android can't choose a weight of a custom font. For a one-off, use `font-sans-semibold`, `font-display`, `font-mono` rather than `font-semibold`.
- A colour as a value (icons in third-party components, spinners, the nav bar): `useColour("primary-base")`. Shadows: `style={useShadow("sm")}`; React Native's `boxShadow` takes the web's syntax.
- Icons: `<Icon name="calendar-line" className="text-text-sub-600" />`, the same Remix Icon font as the web. `pnpm --filter @dibs/mobile icons` refreshes the name list after a remixicon upgrade.
- The web preview (`npx expo start --web`) is handy for checking layout, but some things only show on a phone: haptics, native pickers, the keyboard.
- Not ported, because the web app doesn't use them: steppers (dot, horizontal, vertical), table, pagination, breadcrumb, command menu, file upload, colour picker, kbd, notification, social and fancy buttons, rating icons, status badge, button group, vertical tab menu, compact avatar group. Port one from `apps/web/components/ui` the same way when a screen needs it.
