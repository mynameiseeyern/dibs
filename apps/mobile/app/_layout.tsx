import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useDibbyFonts } from "@/lib/fonts";
import { ThemeRoot, useColour, useMode } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

function Screens() {
  const mode = useMode();
  const page = useColour("bg-weak-50");
  const ink = useColour("text-strong-950");
  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: page },
          headerTintColor: ink,
          headerTitle: "",
          contentStyle: { backgroundColor: page },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useDibbyFonts();
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;
  return (
    <ThemeRoot>
      <Screens />
    </ThemeRoot>
  );
}
