import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { cleanCrew, type CrewDetail } from "@dibs/shared/crews";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as LinkButton from "@/components/ui/link-button";
import * as Switch from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { TopBar } from "@/components/dibby/top-bar";
import { NeedsAccount } from "@/components/dibby/crews-strip";
import { CrewEmojiPicker } from "@/components/dibby/crew-emoji-picker";
import { deleteCrew, getCrew, leaveCrew, updateCrew } from "@/lib/crews";
import { useSession } from "@/lib/session";

/**
 * A crew's settings (ARV-94). The owner renames it, changes the emoji or deletes it; everyone
 * mutes it or leaves. Roles and removing people are on the crew page: tap a name.
 */
export default function CrewSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useSession();
  const [detail, setDetail] = useState<CrewDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const signedIn = state.status === "signedIn";

  useFocusEffect(
    useCallback(() => {
      if (!signedIn) return;
      getCrew(id)
        .then(setDetail)
        .catch((e) => setError((e as Error).message));
    }, [id, signedIn])
  );

  if (!signedIn) return <NeedsAccount />;
  if (!detail)
    return (
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <TopBar title="Crew settings" />
        {error ? <Text className="p-4 text-paragraph-md text-text-sub-600">{error}</Text> : null}
      </SafeAreaView>
    );
  return <Settings detail={detail} onChange={setDetail} />;
}

function Settings({ detail, onChange }: { detail: CrewDetail; onChange: (d: CrewDetail) => void }) {
  const { crew, can } = detail;
  const [name, setName] = useState(crew.name);
  const [emoji, setEmoji] = useState(crew.emoji);
  const [busy, setBusy] = useState(false);
  const changed = name.trim() !== crew.name || emoji !== crew.emoji;
  const ownerWithOthers = crew.role === "owner" && crew.members > 1;

  async function save() {
    const clean = cleanCrew(name, emoji);
    if (!clean) return toast.error(name.trim() ? "Pick one emoji for your crew." : "Give your crew a name.");
    setBusy(true);
    try {
      onChange(await updateCrew(crew.id, clean));
      toast.success("Saved");
    } catch (e) {
      toast.error("Couldn't save that", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function mute(on: boolean) {
    try {
      onChange(await updateCrew(crew.id, { muted: !on }));
    } catch (e) {
      toast.error("Couldn't change that", { description: (e as Error).message });
    }
  }

  function leave() {
    const last = crew.members === 1;
    Alert.alert(
      `Leave ${crew.name}?`,
      last ? "You're the last one, so the crew goes too. Its plans stay with the people on them." : "You'll lose its crew-only plans. To come back, someone has to invite you again.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveCrew(crew.id);
              toast.success(`You've left ${crew.name}`);
              router.dismissTo("/crews");
            } catch (e) {
              toast.error("Couldn't leave", { description: (e as Error).message });
            }
          },
        },
      ]
    );
  }

  function remove() {
    Alert.alert(`Delete ${crew.name}?`, "Everyone's out of the crew and its links stop working. Its plans stay with the people on them. This can't be undone.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCrew(crew.id);
            toast.success(`${crew.name} is gone`);
            router.dismissTo("/crews");
          } catch (e) {
            toast.error("Couldn't delete it", { description: (e as Error).message });
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <TopBar title="Crew settings" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="gap-8 p-4" keyboardShouldPersistTaps="handled">
          {can.manageCrew ? (
            <View className="gap-4">
              <View className="gap-1">
                <Label.Root>Crew name</Label.Root>
                <Input.Root size="large">
                  <Input.Wrapper>
                    <Input.Input value={name} onChangeText={setName} maxLength={40} returnKeyType="done" onSubmitEditing={() => changed && save()} />
                  </Input.Wrapper>
                </Input.Root>
              </View>
              <CrewEmojiPicker emoji={emoji} onChange={setEmoji} />
              {changed ? (
                <Button.Root block disabled={busy} onPress={save}>
                  {busy ? "Saving…" : "Save"}
                </Button.Root>
              ) : null}
            </View>
          ) : null}

          <View className="min-h-11 flex-row items-center gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-label-md text-text-strong-950">Notifications</Text>
              <Text className="text-paragraph-sm text-text-sub-600">New plans and people asking to join. Plans you're on still let you know.</Text>
            </View>
            <Switch.Root checked={!detail.muted} onCheckedChange={mute} accessibilityLabel="Crew notifications" />
          </View>

          <View className="gap-3">
            {ownerWithOthers ? (
              <Text className="text-paragraph-sm text-text-sub-600">You own this crew. To leave, hand it to someone first: tap their name on the crew page.</Text>
            ) : (
              <LinkButton.Root variant="error" className="self-start" onPress={leave}>
                Leave the crew
              </LinkButton.Root>
            )}
            {can.manageCrew ? (
              <LinkButton.Root variant="error" className="self-start" onPress={remove}>
                Delete the crew
              </LinkButton.Root>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
