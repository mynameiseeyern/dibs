# Logos

The logo is **Dibby**: the lime friend from the chat, waving, as a 3D render on violet. One character everywhere, so the app icon, the chat avatar and the helper are the same face.

Two masters, everything else is made from them by `python3 export.py`:

- `dibby-icon-1024.png`: the app icon. A Runway render (nano-banana-pro) of Dibby from the model sheet; edit it there, not here. Square corners: every platform rounds it.
- `dibby-face.svg`: Dibby's face, flat, on the violet tile with `radius-icon` corners. For favicons, the OG mark and anywhere a mark is under 48px, where a 3D render turns to mush.
- `dibby-model-sheet.png`: Dibby front, three-quarter, side and back. The reference every new render of Dibby starts from.

The old file names stay so links keep working:

- `dibs-app-icon.svg`: now the flat face tile (same as `dibby-face.svg`).
- `dibs-ai-member.svg`: the flat face on a violet disc. In the app the chat avatar is `public/dibby/face-256.png`, the face cropped from the icon.
- `dibs-mark-on-dark.svg`: the flat face alone, for ink backgrounds.

## Exports (`export/`)

| File | Size | Use |
| --- | --- | --- |
| `dibby-app-icon-1024.png` | 1024, square corners | App Store (the store rounds it) |
| `dibby-icon-512.png`, `dibby-icon-192.png` | rounded | PWA / Android (also at `apps/web/public/dibby/`) |
| `dibby-apple-touch-180.png` | 180, square corners | iOS home screen (`apps/web/app/apple-icon.png`) |
| `dibby-favicon-32.png`, `dibby-favicon-16.png` | the flat face | Browser tabs (the site serves `app/icon.svg`) |
| `dibby-social-avatar-400.png` | 400, square | Instagram, X, WhatsApp profile pics (safe in a circle crop) |
| `dibby-ai-member-256.png` | 256 | The flat face anywhere an SVG won't do |
| `dibby-wordmark-light.svg/.png`, `dibby-wordmark-dark.svg/.png` | 680 × 200 (PNG 800 × 200 at 2×) | Icon plus **dibby**. Light: ink text; dark: white text |

The wordmark is the word **dibby**, lowercase, Bricolage Grotesque 800, letter-spacing −0.03em, in `text-strong-950` (or `static-white` on ink), to the right of the icon with a gap of about a third of the icon's height. Never outline, stretch or capitalise it. The email header (`apps/web/public/email/dibby-header@2x.png`) is the on-dark lockup.

Dibby's poses, expressions and animations for the app live in `packages/ui/assets/dibby/`.
