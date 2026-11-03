import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import { slugFrom } from "@/lib/api";

/** Placeholder home: open a plan from its link. Making plans comes next. */
export default function Home() {
  const [link, setLink] = useState("");
  const slug = slugFrom(link);

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 gap-4 p-4">
        <Text className="font-display text-[40px] leading-[44px] text-primary-base">dibby</Text>
        <Text className="text-paragraph-lg text-text-sub-600">Paste a plan link from the group chat to open it here.</Text>
        <Input.Root size="large">
          <Input.Wrapper>
            <Input.Icon name="link" />
            <Input.Input value={link} onChangeText={setLink} placeholder="dibby.social/p/…" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          </Input.Wrapper>
        </Input.Root>
        <View className="flex-1" />
        {__DEV__ ? (
          <Link href="/ui" className="text-center text-label-sm text-text-soft-400">
            Components
          </Link>
        ) : null}
        <Button.Root size="large" block disabled={!slug} onPress={() => slug && router.push(`/p/${slug}`)}>
          Open plan
        </Button.Root>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
