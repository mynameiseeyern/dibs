import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { DIBBY } from "@/components/dibby/flow";
import * as Button from "@/components/ui/button";
import { useSession } from "@/lib/session";

/**
 * The "Sign in to Dibby" button in a sign-in email the app asked for
 * (https://dibby.social/auth/app?token_hash=…, opened here by universal links).
 * Swaps the link for a session, then on to your plans, or the name step if it's new.
 */
export default function SignInLink() {
  const { token_hash } = useLocalSearchParams<{ token_hash?: string }>();
  const { signInWithLink } = useSession();
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    if (!token_hash) return setError("That link's missing a bit. Get a new code.");
    signInWithLink(token_hash)
      .then((me) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(me.name ? "/" : "/name");
      })
      .catch((e: Error) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(e.message);
      });
  }, [token_hash, signInWithLink]);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg-white-0 p-4">
      <Stack.Screen options={{ headerShown: false }} />
      <Image source={error ? DIBBY.shrug : DIBBY.thinking} style={{ width: 200, height: 200 }} contentFit="contain" accessible={false} />
      <Text accessibilityLiveRegion="polite" className="text-center text-title-h4 text-text-strong-950">
        {error ? "Couldn't sign you in" : "Signing you in…"}
      </Text>
      {error ? (
        <>
          <Text className="text-center text-paragraph-md text-text-sub-600">{error}</Text>
          <View className="w-full pt-4">
            <Button.Root size="large" block onPress={() => router.replace("/sign-in")}>
              Get a new code
            </Button.Root>
          </View>
        </>
      ) : null}
    </View>
  );
}
