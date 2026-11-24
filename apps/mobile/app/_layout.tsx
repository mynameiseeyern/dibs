import "../global.css";
import "@/lib/interop";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useDibbyFonts } from "@/lib/fonts";
import { usePushSetup } from "@/lib/push";
import { useLatestVersion } from "@/lib/updates";
import { SessionProvider, useSession } from "@/lib/session";
import { ThemeRoot, useColour, useMode } from "@/lib/theme";
import { Toaster } from "@/components/ui/toast";

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
          // Every screen draws its own top bar (components/dibby/top-bar.tsx): iOS 26's native bar
          // puts grey glass behind the back button. Swipe-back still works.
          headerShown: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: page },
          headerTintColor: ink,
          headerTitle: "",
          contentStyle: { backgroundColor: page },
        }}
      >
        {/* Making a plan: no slide, Dibby hops on from the hello moment (components/dibby/hello.tsx). */}
        <Stack.Screen name="new" options={{ headerShown: false, animation: "none" }} />
      </Stack>
      <Toaster />
    </>
  );
}

export default function RootLayout() {
  const [fonts] = useDibbyFonts();
  // Starts straight into a new version if one's out, so one launch is enough (lib/updates.ts).
  const latest = useLatestVersion();
  const loaded = fonts && latest;
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;
  return (
    <ThemeRoot>
      <SessionProvider>
        <PushSetup />
        <Screens />
      </SessionProvider>
    </ThemeRoot>
  );
}

/** Registers this phone for pushes when who's here changes, and opens the plan a tapped notification is about. */
function PushSetup() {
  const { state, hasGuestPass } = useSession();
  usePushSetup(state.status === "signedIn" ? `user:${state.me?.id ?? ""}` : hasGuestPass ? "guest" : state.status);
  return null;
}
