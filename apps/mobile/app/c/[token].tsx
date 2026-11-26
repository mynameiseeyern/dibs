import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CrewInvitePreview } from "@dibs/shared/crews";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import * as LinkButton from "@/components/ui/link-button";
import { TopBar } from "@/components/dibby/top-bar";
import { askToJoin, previewInvite } from "@/lib/crews";

/**
 * A crew invite link, opened in the app (ARV-91). Shows only what ARV-89 allows: the crew's name,
 * emoji, how many are in it and who invited you. Anything but a working link is "expired",
 * with nothing about the crew.
 */
export default function Invite() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [load, setLoad] = useState<{ kind: "loading" } | { kind: "error"; message: string } | { kind: "ok"; preview: CrewInvitePreview }>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh every time (back from signing in, say).
  useFocusEffect(
    useCallback(() => {
      previewInvite(token)
        .then((preview) => setLoad({ kind: "ok", preview }))
        .catch((e) => setLoad({ kind: "error", message: (e as Error).message }));
    }, [token])
  );

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      setLoad({ kind: "ok", preview: await askToJoin(token) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (load.kind === "loading") return <Frame />;
  if (load.kind === "error") return <Frame title="Couldn't open that" body={load.message} />;
  const p = load.preview;
  if (p.status !== "ok" || !p.crew) return <Frame title="This invite's expired" body="Ask whoever sent it for a new one." />;

  const lead = `${p.crew.members} ${p.crew.members === 1 ? "person" : "people"}${p.invited_by ? ` · ${p.invited_by} invited you` : ""}`;
  const action =
    p.you === "signed_out" ? (
      <Button.Root size="large" block onPress={() => router.push({ pathname: "/sign-in", params: { next: `/c/${token}` } })}>
        Sign in to ask to join
      </Button.Root>
    ) : p.you === "member" && p.crew_id ? (
      <Button.Root size="large" block onPress={() => router.replace(`/crews/${p.crew_id}`)}>
        Open the crew
      </Button.Root>
    ) : p.you === "can_ask" ? (
      <Button.Root size="large" block disabled={busy} onPress={ask}>
        {busy ? (p.personal ? "Joining…" : "Asking…") : p.personal ? "Join the crew" : "Ask to join"}
      </Button.Root>
    ) : null;

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <TopBar />
      <ScrollView contentContainerClassName="items-center gap-4 p-4 pt-10">
        <View className="size-24 items-center justify-center rounded-full bg-primary-lighter">
          <Text className="text-[52px] leading-[60px]">{p.crew.emoji}</Text>
        </View>
        <Text accessibilityRole="header" className="text-center text-title-h3 text-text-strong-950">
          {p.crew.name}
        </Text>
        <Text className="text-center text-paragraph-lg text-text-sub-600">{lead}</Text>
        {p.you === "pending" ? (
          <Hint.Root>
            <Hint.Icon name="time-line" />
            Asked. You&apos;re in once the owner or an admin says yes.
          </Hint.Root>
        ) : p.you === "member" ? (
          <Text className="text-paragraph-md text-text-sub-600">You&apos;re in this crew.</Text>
        ) : p.personal ? (
          <Text className="text-center text-paragraph-md text-text-sub-600">{p.invited_by ?? "They"} picked you, so you&apos;re straight in.</Text>
        ) : p.you === "cant_ask" && p.note ? (
          <Text className="text-center text-paragraph-md text-text-sub-600">{p.note}</Text>
        ) : p.you === "signed_out" ? (
          <Text className="text-center text-paragraph-md text-text-sub-600">Crews need an account, so the crew can find you on any phone.</Text>
        ) : null}
        {error ? (
          <Hint.Root hasError>
            <Hint.Icon name="error-warning-fill" />
            {error}
          </Hint.Root>
        ) : null}
      </ScrollView>
      {action ? <View className="p-4">{action}</View> : null}
    </SafeAreaView>
  );
}

function Frame({ title, body }: { title?: string; body?: string }) {
  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <TopBar />
      {title ? (
        <View className="flex-1 gap-2 p-4 pt-8">
          <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
            {title}
          </Text>
          {body ? <Text className="text-paragraph-lg text-text-sub-600">{body}</Text> : null}
        </View>
      ) : null}
      {title ? (
        <View className="p-4">
          <LinkButton.Root variant="gray" className="self-center" onPress={() => router.replace("/")}>
            Go home
          </LinkButton.Root>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
