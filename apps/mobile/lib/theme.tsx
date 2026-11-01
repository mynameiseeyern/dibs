import { createContext, useContext, type ReactNode } from "react";
import { useColorScheme, View } from "react-native";
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

export function ThemeRoot({ children }: { children: ReactNode }) {
  const mode: Mode = useColorScheme() === "dark" ? "dark" : "light";
  return (
    <ModeContext.Provider value={mode}>
      <View style={[VARS[mode], { flex: 1 }]}>{children}</View>
    </ModeContext.Provider>
  );
}

export const useMode = () => useContext(ModeContext);

/** A colour as a plain value, for the few props that can't take a class (icons, spinners, the nav bar). */
export function useColour(name: keyof (typeof colourVars)["light"] extends `--${infer N}` ? N : never): string {
  return colourVars[useMode()][`--${name}` as keyof (typeof colourVars)["light"]];
}

/** A Dibby shadow as a style. React Native's boxShadow takes the same syntax as the web. */
export function useShadow(name: ShadowName | null) {
  const mode = useMode();
  return name ? { boxShadow: shadows[mode][name] } : undefined;
}
