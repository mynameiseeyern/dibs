import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold } from "@expo-google-fonts/figtree";
import { useEffect } from "react";
import { useTheme } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { mode, colour } = useTheme();
  const [loaded] = useFonts({
    BricolageGrotesque_800ExtraBold,
    // React Native can't set variable-font axes, so the condensed title cut is a static file (see assets/fonts/README.md).
    BricolageGrotesqueTitle: require("../assets/fonts/BricolageGrotesque-Title.ttf"),
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colour["bg-weak-50"] },
          headerTintColor: colour["text-strong-950"],
          headerTitle: "",
          contentStyle: { backgroundColor: colour["bg-weak-50"] },
        }}
      />
    </>
  );
}
