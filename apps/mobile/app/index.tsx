import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { slugFrom } from "@/lib/api";
import { font, radius, space, useTheme } from "@/lib/theme";

/** Placeholder home: open a plan from its link. Making plans comes next. */
export default function Home() {
  const { colour } = useTheme();
  const [link, setLink] = useState("");
  const slug = slugFrom(link);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, padding: space["space-4"], gap: space["space-4"] }}>
        <Text style={{ fontFamily: font.display, fontSize: 40, color: colour["primary-base"] }}>dibby</Text>
        <Text style={{ fontFamily: font.sans, fontSize: 17, color: colour["text-sub-600"] }}>Paste a plan link from the group chat to open it here.</Text>
        <TextInput
          value={link}
          onChangeText={setLink}
          placeholder="dibby.social/p/…"
          placeholderTextColor={colour["text-soft-400"]}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={{
            minHeight: 52,
            paddingHorizontal: space["space-4"],
            borderRadius: radius["radius-md"],
            borderWidth: 1,
            borderColor: colour["stroke-soft-200"],
            backgroundColor: colour["bg-white-0"],
            color: colour["text-strong-950"],
            fontFamily: font.sans,
            fontSize: 17,
          }}
        />
        <View style={{ flex: 1 }} />
        <Button label="Open plan" disabled={!slug} onPress={() => slug && router.push(`/p/${slug}`)} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
