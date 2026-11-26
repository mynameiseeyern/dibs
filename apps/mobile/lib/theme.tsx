import { createContext, useContext, useEffect, type ReactNode } from "react";
import { Appearance, useColorScheme, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { vars } from "nativewind";
import { colourVars, shadows, type ShadowName } from "@dibs/ui/native/vars";

/**
 * The Dibby colours for the native app. Classes (bg-bg-white-0, text-primary-base) point at CSS
 * variables, and this sets them for light or dark at the root, like tokens.css does on the web.
 * Everything comes from packages/ui/tokens.json via `pnpm tokens`.
 */
type Mode = "light" | "dark";
const ModeContext = createContext<Mode>("light");
const VARS = { light: vars(colourVars.light), dark: vars(colourVars.dark) };

/** The web's Look and sound picker: match the phone, or always light or dark. Kept on this phone. */
export type ThemeChoice = "system" | "light" | "dark";
const THEME_KEY = "dibs.theme";

function apply(choice: ThemeChoice) {
  try {
    Appearance.setColorScheme(choice === "system" ? "unspecified" : choice);
  } catch {
    // Not on every platform (the web preview); the phone's setting stays.
  }
}

export async function getThemeChoice(): Promise<ThemeChoice> {
  try {
    const t = await SecureStore.getItemAsync(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export async function setThemeChoice(choice: ThemeChoice) {
  apply(choice);
  try {
    if (choice === "system") await SecureStore.deleteItemAsync(THEME_KEY);
    else await SecureStore.setItemAsync(THEME_KEY, choice);
  } catch {}
}

export function ThemeRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    getThemeChoice().then((c) => c !== "system" && apply(c));
  }, []);
  const mode: Mode = useColorScheme() === "dark" ? "dark" : "light";
  return (
    <ModeContext.Provider value={mode}>
      <View style={[VARS[mode], { flex: 1 }]}>{children}</View>
    </ModeContext.Provider>
  );
}

export const useMode = () => useContext(ModeContext);

/**
 * Sets the colour variables again, for content rendered outside the root: a Modal is its own
 * window (a portal on the web), so it doesn't inherit them. Wrap a Modal's children in this.
 */
export function ThemeScope({ children }: { children: ReactNode }) {
  return <View style={[VARS[useMode()], { flex: 1 }]}>{children}</View>;
}

/** A colour as a plain value, for the few props that can't take a class (icons, spinners, the nav bar). */
export function useColour(name: keyof (typeof colourVars)["light"] extends `--${infer N}` ? N : never): string {
  return colourVars[useMode()][`--${name}` as keyof (typeof colourVars)["light"]];
}

/** A Dibby shadow as a style. React Native's boxShadow takes the same syntax as the web. */
export function useShadow(name: ShadowName | null) {
  const mode = useMode();
  return name ? { boxShadow: shadows[mode][name] } : undefined;
}
