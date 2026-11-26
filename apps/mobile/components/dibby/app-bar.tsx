// The web's top bar (Wordmark + NavMenu, apps/web/components/NavMenu.tsx) on home, plan pages and
// making a plan. With an account the menu is your initials; without one it's a ⋯. Either way it
// holds Your plans, New plan, your account (or keeping your plans), About and signing in or out.

import { useCallback, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Avatar from "@/components/ui/avatar";
import * as Button from "@/components/ui/button";
import * as Dropdown from "@/components/ui/dropdown";
import { API_URL, getAccount } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Wordmark } from "./brand";

/** Who's on this phone: their name (a guest's too), and whether it's an account. */
function useHere() {
  const { state, hasGuestPass } = useSession();
  const signedIn = state.status === "signedIn";
  const meName = signedIn && state.me?.name ? `${state.me.name.first} ${state.me.name.last}`.trim() : null;
  const [guestName, setGuestName] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (signedIn || !hasGuestPass) return setGuestName(null);
      getAccount()
        .then((a) => setGuestName(a.kind === "guest" ? a.name : null))
        .catch(() => {});
    }, [signedIn, hasGuestPass])
  );
  return { signedIn, name: signedIn ? meName : guestName };
}

export function AppBar({ top = true }: { top?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={top ? { paddingTop: insets.top } : undefined} className="bg-bg-weak-50">
      {/* Same spot as the web's: 16px down, a 44px bar. */}
      <View className="mt-2.5 h-14 flex-row items-center justify-between px-4">
        <Pressable accessibilityRole="link" accessibilityLabel="Dibby, your plans" onPress={() => router.dismissTo("/")} className="active:opacity-70">
          <Wordmark />
        </Pressable>
        <NavMenu />
      </View>
    </View>
  );
}

export function NavMenu() {
  const { signedIn, name } = useHere();
  const { signOut } = useSession();
  const guest = !signedIn && Boolean(name);
  return (
    <Dropdown.Root>
      <Dropdown.Trigger>
        {signedIn && name ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`You're ${name}. Menu`} hitSlop={4}>
            <Avatar.Root size="40" color="violet" name={name} />
          </Pressable>
        ) : (
          <Button.Root variant="neutral" mode="ghost" iconOnly accessibilityLabel="Menu">
            <Button.Icon name="more-2-fill" />
          </Button.Root>
        )}
      </Dropdown.Trigger>
      <Dropdown.Content>
        {name ? <Dropdown.Label>{signedIn ? name : `On this phone as ${name}`}</Dropdown.Label> : null}
        {name ? (
          <Dropdown.Item onSelect={() => router.dismissTo("/")}>
            <Dropdown.ItemIcon name="calendar-event-line" />
            Your plans
          </Dropdown.Item>
        ) : null}
        <Dropdown.Item onSelect={() => router.push("/new")}>
          <Dropdown.ItemIcon name="add-line" />
          New plan
        </Dropdown.Item>
        {signedIn ? (
          <Dropdown.Item onSelect={() => router.push("/account")}>
            <Dropdown.ItemIcon name="user-3-line" />
            Your account
          </Dropdown.Item>
        ) : null}
        {guest ? (
          <Dropdown.Item onSelect={() => router.push("/account")}>
            <Dropdown.ItemIcon name="mail-line" />
            Keep your plans
          </Dropdown.Item>
        ) : null}
        <Dropdown.Item onSelect={() => Linking.openURL(`${API_URL}/about`)}>
          <Dropdown.ItemIcon name="information-line" />
          About Dibby
        </Dropdown.Item>
        <Dropdown.Separator />
        {signedIn ? (
          <Dropdown.Item
            onSelect={async () => {
              await signOut();
              router.dismissTo("/");
            }}
          >
            <Dropdown.ItemIcon name="logout-box-r-line" />
            Sign out
          </Dropdown.Item>
        ) : (
          <Dropdown.Item onSelect={() => router.push("/sign-in")}>
            <Dropdown.ItemIcon name="login-box-line" />
            Sign in
          </Dropdown.Item>
        )}
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
