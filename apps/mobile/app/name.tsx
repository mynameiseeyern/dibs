import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import { saveName } from "@/lib/api";
import { useSession } from "@/lib/session";
import { TopBar } from "@/components/dibby/top-bar";

/** Sign-up's one step: your name, so the crew knows who's in. */
export default function Name() {
  const { state, setMe } = useSession();
  const me = state.status === "signedIn" ? state.me : null;
  const [first, setFirst] = useState(me?.name?.first ?? "");
  const [last, setLast] = useState(me?.name?.last ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!first.trim() || !last.trim()) return setError("We need your first and last name.");
    setBusy(true);
    setError(null);
    try {
      setMe(await saveName(first.trim(), last.trim()));
      router.replace("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <TopBar />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
            What do your mates call you?
          </Text>
          <Text className="text-paragraph-lg text-text-sub-600">It's how you show up on plans.</Text>
          <View className="gap-1">
            <Label.Root>First name</Label.Root>
            <Input.Root size="large">
              <Input.Wrapper>
                <Input.Input value={first} onChangeText={setFirst} autoComplete="given-name" textContentType="givenName" returnKeyType="next" autoFocus />
              </Input.Wrapper>
            </Input.Root>
          </View>
          <View className="gap-1">
            <Label.Root>Last name</Label.Root>
            <Input.Root size="large">
              <Input.Wrapper>
                <Input.Input value={last} onChangeText={setLast} autoComplete="family-name" textContentType="familyName" returnKeyType="done" onSubmitEditing={save} />
              </Input.Wrapper>
            </Input.Root>
          </View>
          {error ? (
            <Hint.Root hasError>
              <Hint.Icon name="error-warning-fill" />
              {error}
            </Hint.Root>
          ) : null}
        </ScrollView>
        <View className="p-4">
          <Button.Root size="large" block disabled={busy} onPress={save}>
            {busy ? "Saving…" : "Done"}
          </Button.Root>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
