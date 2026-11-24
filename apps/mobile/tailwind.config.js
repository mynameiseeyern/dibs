// The Dibby theme for the native app, generated from packages/ui/tokens.json (`pnpm tokens`).
// Class names match apps/web: bg-bg-white-0, text-text-strong-950, text-label-md, rounded-lg.
const theme = require("@dibs/ui/native/theme.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    colors: theme.colors,
    fontFamily: theme.fontFamily,
    borderRadius: theme.borderRadius,
    spacing: theme.spacing,
    extend: {
      // NativeWind's preset sets `sans`, `serif` and `mono` in its own `extend`, which beats the
      // theme above. On iOS its `sans` is "'system font'", not a real font, so every `font-sans`
      // came out in Times (TestFlight, Nov 2026). The web preview never sees it: only builds with
      // NATIVEWIND_OS=ios or android do. Ours goes here so it wins on every platform.
      fontFamily: { sans: theme.fontFamily.sans, mono: theme.fontFamily.mono, serif: theme.fontFamily.sans },
    },
  },
  plugins: [({ addUtilities }) => addUtilities(theme.typeStyles)],
};
