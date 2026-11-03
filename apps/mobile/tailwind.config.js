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
    extend: {},
  },
  plugins: [({ addUtilities }) => addUtilities(theme.typeStyles)],
};
