import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Button from "@/components/ui/button";
import * as DigitInput from "@/components/ui/digit-input";
import * as Hint from "@/components/ui/hint";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as LinkButton from "@/components/ui/link-button";
import { sendCode } from "@/lib/api";
import { useSession } from "@/lib/session";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Email, then the 6-digit code from the same email the web sends (it has a link and a code). */
export default function SignIn() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const e = email.trim().toLowerCase();
    if (!EMAIL.test(e)) return setError("That email doesn't look right.");
    setBusy(true);
    setError(null);
    try {
      await sendCode(e);
      setSentTo(e);
      setCode("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    if (!sentTo || value.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const me = await signIn(sentTo, value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(me.name ? "/" : "/name");
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError((err as Error).message);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
          {sentTo ? (
            <>
              <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
                Check your email
              </Text>
              <Text className="text-paragraph-lg text-text-sub-600">Type the code we sent to {sentTo}.</Text>
              <DigitInput.Root numInputs={6} value={code} onChange={setCode} onComplete={verify} hasError={Boolean(error)} disabled={busy} autoFocus />
              {error ? (
                <Hint.Root hasError>
                  <Hint.Icon name="error-warning-fill" />
                  {error}
                </Hint.Root>
              ) : null}
              <View className="flex-row gap-4">
                <LinkButton.Root variant="primary" disabled={busy} onPress={send}>
                  Send a new code
                </LinkButton.Root>
                <LinkButton.Root variant="gray" disabled={busy} onPress={() => (setSentTo(null), setError(null))}>
                  Use another email
                </LinkButton.Root>
              </View>
            </>
          ) : (
            <>
              <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
                Sign in
              </Text>
              <Text className="text-paragraph-lg text-text-sub-600">We'll email you a code. New here? Same thing, it makes your account.</Text>
              <View className="gap-1">
                <Label.Root>Email</Label.Root>
                <Input.Root size="large" hasError={Boolean(error)}>
                  <Input.Wrapper>
                    <Input.Icon name="mail-line" />
                    <Input.Input
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@email.com"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      returnKeyType="send"
                      onSubmitEditing={send}
                      autoFocus
                    />
                  </Input.Wrapper>
                </Input.Root>
                {error ? (
                  <Hint.Root hasError>
                    <Hint.Icon name="error-warning-fill" />
                    {error}
                  </Hint.Root>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
        <View className="p-4">
          {sentTo ? (
            <Button.Root size="large" block disabled={busy || code.length < 6} onPress={() => verify()}>
              {busy ? "Checking…" : "Sign in"}
            </Button.Root>
          ) : (
            <Button.Root size="large" block disabled={busy || !email.trim()} onPress={send}>
              {busy ? "Sending…" : "Email me a code"}
            </Button.Root>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
