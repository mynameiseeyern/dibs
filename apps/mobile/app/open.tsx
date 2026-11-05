import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import { slugFrom } from "@/lib/api";

/** Open a plan from a link someone pasted in the group chat (links also open the app directly). */
export default function OpenLink() {
  const [link, setLink] = useState("");
  const slug = slugFrom(link);

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 gap-4 p-4">
        <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
          Open a plan
        </Text>
        <Text className="text-paragraph-lg text-text-sub-600">Paste the link from the group chat.</Text>
        <Input.Root size="large">
          <Input.Wrapper>
            <Input.Icon name="link" />
            <Input.Input value={link} onChangeText={setLink} placeholder="dibby.social/p/…" autoCapitalize="none" autoCorrect={false} keyboardType="url" autoFocus />
          </Input.Wrapper>
        </Input.Root>
        <View className="flex-1" />
        <Button.Root size="large" block disabled={!slug} onPress={() => slug && router.replace(`/p/${slug}`)}>
          Open plan
        </Button.Root>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
