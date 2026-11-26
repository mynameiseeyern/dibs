import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Alert from "@/components/ui/alert";
import * as Button from "@/components/ui/button";
import * as DigitInput from "@/components/ui/digit-input";
import * as Hint from "@/components/ui/hint";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as LinkButton from "@/components/ui/link-button";
import { AgreeLine } from "@/components/dibby/agree-line";
import { sendCode } from "@/lib/api";
import { useSession } from "@/lib/session";
import { TopBar } from "@/components/dibby/top-bar";
import { SiteFooter, Wordmark } from "@/components/dibby/brand";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * The web's /login, centred: logo, "Sign in to Dibby", email, Email me a link, the legal footer.
 * The email has a link (it opens the app) and a 6-digit code, so after sending, both work here.
 * `?email=` fills it in and sends straight away (the chat's email box); `?next=` is where to go after.
 */
export default function SignIn() {
  const { signIn } = useSession();
  const params = useLocalSearchParams<{ email?: string; next?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.email) send();
    // Only on arrival with an email from the chat's box.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      router.replace(!me.name ? "/name" : params.next?.startsWith("/") ? (params.next as "/") : "/");
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
      <TopBar />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="flex-grow justify-center gap-4 px-4 pb-8" keyboardShouldPersistTaps="handled">
          <Wordmark />
          <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
            Sign in to Dibby
          </Text>
          <Text className="text-paragraph-md text-text-sub-600">We&rsquo;ll email you a link, no password. Your plans come with you to any device.</Text>
          {sentTo ? (
            <>
              <Alert.Root status="success">
                <Alert.Icon name="mail-check-fill" />
                <Alert.Content>
                  <Alert.Title>Check your email</Alert.Title>
                  We sent a sign-in link to {sentTo}. Tap it on this phone, or type the code from it.
                </Alert.Content>
              </Alert.Root>
              <DigitInput.Root numInputs={6} value={code} onChange={setCode} onComplete={verify} hasError={Boolean(error)} disabled={busy} autoFocus />
              {error ? (
                <Hint.Root hasError>
                  <Hint.Icon name="error-warning-fill" />
                  {error}
                </Hint.Root>
              ) : null}
              <Button.Root size="large" block disabled={busy || code.length < 6} onPress={() => verify()}>
                {busy ? "Checking…" : "Sign in"}
              </Button.Root>
              <View className="flex-row justify-center gap-4">
                <LinkButton.Root variant="primary" disabled={busy} onPress={send}>
                  Send a new one
                </LinkButton.Root>
                <LinkButton.Root variant="gray" disabled={busy} onPress={() => (setSentTo(null), setError(null))}>
                  Use another email
                </LinkButton.Root>
              </View>
            </>
          ) : (
            <>
              <View className="gap-1">
                <Label.Root>Email</Label.Root>
                <Input.Root size="large" hasError={Boolean(error)}>
                  <Input.Wrapper>
                    <Input.Icon name="mail-line" />
                    <Input.Input
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      returnKeyType="send"
                      onSubmitEditing={send}
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
              <Button.Root size="large" block disabled={busy || !email.trim()} onPress={send}>
                {busy ? "Sending…" : "Email me a link"}
              </Button.Root>
              <AgreeLine />
            </>
          )}
          <SiteFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
