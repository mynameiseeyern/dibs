# Logos

Direction C · Hands up (V3), refined for launch as **Dibby** (ARV-39): three friends, the lime one popping up to call dibs. The file names still say `dibs-` so existing links keep working.

- `dibs-app-icon.svg`: the app icon. Violet `primary-base` tile, corner `radius-icon` (48 on 200), two **solid** `primary-light` friends either side and the lime friend with a hand up. Solid side friends keep the mark readable at 16px.
- `dibs-mark-on-dark.svg`: the mark on its own for ink backgrounds (`bg-strong-950` or a photo darker than that). Side friends are a solid lighter violet; never put it on white.
- `dibs-ai-member.svg`: Dibby in chats. The raised lime friend from the logo, with a face, on a violet disc. Use it only for the AI in chats and member lists, never as the app logo.

## Exports (`export/`)

| File | Size | Use |
| --- | --- | --- |
| `dibby-app-icon-1024.png` | 1024, square corners | App Store (the store rounds it) |
| `dibby-icon-512.png`, `dibby-icon-192.png` | rounded | PWA / Android |
| `dibby-apple-touch-180.png` | 180, square corners | iOS home screen |
| `dibby-favicon-32.png`, `dibby-favicon-16.png` | rounded | Browser tabs (the site serves `app/icon.svg`) |
| `dibby-social-avatar-400.png` | 400, square | Instagram, X, WhatsApp profile pics (safe in a circle crop) |
| `dibby-ai-member-256.png` | 256 | Dibby's avatar anywhere an SVG won't do |
| `dibby-wordmark-light.svg/.png`, `dibby-wordmark-dark.svg/.png` | 680 × 200 (PNG at 2×) | Icon plus **dibby**, outlined from Bricolage Grotesque 800 so no font is needed. Light: ink text; dark: white text |

The wordmark is the word **dibby**, lowercase, Bricolage Grotesque 800, letter-spacing −0.03em, in `text-strong-950` (or `static-white` on ink), to the right of the icon with a gap of half the icon's height. Never outline, stretch or capitalise it. The email header (`apps/web/public/email/dibby-header@2x.png`) is the on-dark lockup.
