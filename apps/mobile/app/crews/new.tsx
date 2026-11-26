import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CREW_EMOJI, cleanCrew, isSingleEmoji, type NewCrewResponse } from "@dibs/shared/crews";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as LinkButton from "@/components/ui/link-button";
import { TopBar } from "@/components/dibby/top-bar";
import { NeedsAccount } from "@/components/dibby/crews-strip";
import { createCrew, inviteLasts, inviteMessage } from "@/lib/crews";
import { useSession } from "@/lib/session";

/** ARV-90: name + emoji, as quick as starting a group chat, then share the invite link. */
export default function NewCrew() {
  const { state } = useSession();
  const [made, setMade] = useState<NewCrewResponse | null>(null);
  if (state.status !== "signedIn") return <NeedsAccount />;
  return made ? <Ready made={made} /> : <Name onMade={setMade} />;
}

function Name({ onMade }: { onMade: (m: NewCrewResponse) => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string>(CREW_EMOJI[0]);
  const [own, setOwn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function make() {
    const crew = cleanCrew(name, emoji);
    if (!crew) return setError(name.trim() ? "Pick one emoji for your crew." : "Give your crew a name.");
    setBusy(true);
    setError(null);
    try {
      onMade(await createCrew(crew.name, crew.emoji));
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
        <ScrollView contentContainerClassName="gap-6 p-4" keyboardShouldPersistTaps="handled">
          <View className="gap-2">
            <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
              Name your crew
            </Text>
            <Text className="text-paragraph-lg text-text-sub-600">The people you keep making plans with.</Text>
          </View>

          <View className="flex-row items-center gap-3">
            <View accessibilityLabel={`Crew emoji ${emoji}`} className="size-16 items-center justify-center rounded-lg bg-primary-lighter">
              <Text className="text-[34px] leading-[40px]">{emoji}</Text>
            </View>
            <View className="flex-1 gap-1">
              <Label.Root>Crew name</Label.Root>
              <Input.Root size="large">
                <Input.Wrapper>
                  <Input.Input value={name} onChangeText={setName} placeholder="Dumpling Gang" maxLength={40} autoFocus returnKeyType="done" onSubmitEditing={make} />
                </Input.Wrapper>
              </Input.Root>
            </View>
          </View>

          <View className="gap-3">
            <Label.Root>Pick an emoji</Label.Root>
            <View className="flex-row flex-wrap gap-2">
              {CREW_EMOJI.map((e) => (
                <Pressable
                  key={e}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: e === emoji }}
                  accessibilityLabel={e}
                  onPress={() => {
                    setEmoji(e);
                    setOwn("");
                  }}
                  className={`size-12 items-center justify-center rounded-lg border active:opacity-70 ${e === emoji ? "border-primary-base bg-primary-lighter" : "border-stroke-soft-200 bg-bg-white-0"}`}
                >
                  <Text className="text-[24px] leading-[30px]">{e}</Text>
                </Pressable>
              ))}
            </View>
            <View className="gap-1">
              <Label.Root>Or use your own</Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    value={own}
                    placeholder="Tap the emoji key"
                    maxLength={16}
                    onChangeText={(t) => {
                      setOwn(t);
                      const v = t.trim();
                      if (isSingleEmoji(v)) setEmoji(v);
                    }}
                  />
                </Input.Wrapper>
              </Input.Root>
            </View>
          </View>

          {error ? (
            <Hint.Root hasError>
              <Hint.Icon name="error-warning-fill" />
              {error}
            </Hint.Root>
          ) : null}
        </ScrollView>
        <View className="p-4">
          <Button.Root size="large" block disabled={busy} onPress={make}>
            {busy ? "Making it…" : "Make the crew"}
          </Button.Root>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Straight after: the invite link, ready for the group chat. */
function Ready({ made }: { made: NewCrewResponse }) {
  const { crew, invite } = made;
  const share = () => Share.share(Platform.OS === "ios" ? { message: inviteMessage(crew, ""), url: invite.url } : { message: inviteMessage(crew, invite.url) }).catch(() => {});
  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <TopBar />
      <ScrollView contentContainerClassName="items-center gap-4 p-4 pt-10">
        <View className="size-24 items-center justify-center rounded-full bg-primary-lighter">
          <Text className="text-[52px] leading-[60px]">{crew.emoji}</Text>
        </View>
        <Text accessibilityRole="header" className="text-center text-title-h3 text-text-strong-950">
          {crew.name} is ready
        </Text>
        <Text className="text-center text-paragraph-lg text-text-sub-600">Send the link to your crew. They ask to join, you say yes.</Text>
        <Text className="text-paragraph-sm text-text-soft-400">{inviteLasts(invite)}</Text>
      </ScrollView>
      <View className="gap-3 p-4">
        <Button.Root size="large" block onPress={share}>
          <Button.Icon name="share-forward-line" />
          Share the link
        </Button.Root>
        <LinkButton.Root variant="gray" className="self-center" onPress={() => router.replace(`/crews/${crew.id}`)}>
          Done
        </LinkButton.Root>
      </View>
    </SafeAreaView>
  );
}
