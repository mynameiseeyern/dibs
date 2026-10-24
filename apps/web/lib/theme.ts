/**
 * Light, dark or follow the phone (ARV: theme setting). The choice lives in this browser's
 * localStorage and is applied as data-theme on <html>, which tokens.css already switches on.
 * The inline script in the root layout applies it before the first paint, so there's no flash.
 */
export type ThemeChoice = "system" | "light" | "dark";
export const THEME_KEY = "dibs:theme";

/** Runs in <head> before anything paints. Plain ES5 so it works everywhere; never throws. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

/** Light or dark right now, after the person's choice and their phone's setting. */
export function resolvedTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const t = document.documentElement.getAttribute("data-theme");
  if (t === "light" || t === "dark") return t;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
