import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PlanDetail } from "@dibs/shared/api";
import { ChatMessage, ChatSystem } from "@/components/dibby/chat";
import { Thinking } from "@/components/dibby/flow";
import * as Button from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { sendMessage } from "@/lib/api";
import { useColour } from "@/lib/theme";
import { usePlan } from "@/lib/use-plan";

type Msg = NonNullable<PlanDetail["chat"]>["messages"][number];

/**
 * The plan's chat. Anyone going reads it; posting needs an account (guests add their email,
 * one code). Tag @dibby and Dibby replies in a few seconds: it only reads messages it's tagged in.
 */
export default function PlanChat() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const spinner = useColour("primary-base");
  const hint = useColour("text-disabled-300");
  const caret = useColour("primary-base");
  const { state, apply } = usePlan(slug);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const detail = state.kind === "ok" ? state.detail : null;
  const messages = useMemo(() => detail?.chat?.messages ?? [], [detail]);
  // Newest first for the inverted list, with "first of a burst" worked out oldest first.
  const rows = useMemo(() => {
    const out = messages.map((m, i) => ({ m, first: i === 0 || messages[i - 1].author !== m.author || messages[i - 1].kind !== m.kind }));
    return out.reverse();
  }, [messages]);

  if (!detail) return <ActivityIndicator className="flex-1" color={spinner} />;
  const { me, chat } = detail;

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(body);
    setDraft("");
    Haptics.selectionAsync();
    try {
      apply(await sendMessage(slug, body));
    } catch (e) {
      setDraft(body);
      toast.error((e as Error).message);
    } finally {
      setSending(null);
    }
  }

  const footer = !chat ? (
    <Text className="text-center text-paragraph-sm text-text-sub-600">{me?.note ?? "Join the plan to see the chat."}</Text>
  ) : me?.access !== "full" ? (
    <Text className="text-center text-paragraph-sm text-text-sub-600">{me?.note ?? "Say you're in to chat."}</Text>
  ) : !me.canPost ? (
    <View className="gap-2">
      <Text className="text-center text-paragraph-sm text-text-sub-600">Add your email to chat. One code, no password.</Text>
      <Button.Root size="large" block onPress={() => router.push("/sign-in")}>
        Add my email
      </Button.Root>
    </View>
  ) : (
    <View className="flex-row items-end gap-2">
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Message, or tag @dibby for ideas"
        placeholderTextColor={hint}
        selectionColor={caret}
        multiline
        maxLength={2000}
        accessibilityLabel="Message"
        className="max-h-32 min-h-11 flex-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-4 py-2.5 text-paragraph-md text-text-strong-950"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send"
        disabled={!draft.trim() || Boolean(sending)}
        onPress={send}
        className={draft.trim() ? "h-11 w-11 items-center justify-center rounded-full bg-primary-base" : "h-11 w-11 items-center justify-center rounded-full bg-bg-soft-200"}
      >
        <Icon name="send-plane-fill" className="text-[20px] leading-[20px] text-static-white" />
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 bg-bg-white-0">
      <Stack.Screen options={{ title: detail.plan.title }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0} className="flex-1">
        {rows.length === 0 && !sending ? (
          // Outside the list: an inverted FlatList draws its empty state upside down on some versions.
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-center text-paragraph-sm text-text-sub-600">
              {chat ? "Nothing yet. Try “@dibby find us somewhere cheap”." : ""}
            </Text>
          </View>
        ) : null}
        <FlatList
          style={rows.length === 0 && !sending ? { flexGrow: 0 } : undefined}
          inverted
          data={rows}
          keyExtractor={(r) => r.m.id}
          contentContainerClassName="gap-2 p-4"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            sending ? (
              <View className="gap-2">
                <ChatMessage from="me">{sending}</ChatMessage>
                {/@dibby/i.test(sending) ? (
                  <View className="flex-row items-center gap-2 pl-9">
                    <Thinking />
                    <Text className="text-paragraph-xs text-text-soft-400">Dibby&rsquo;s on it</Text>
                  </View>
                ) : null}
              </View>
            ) : undefined
          }
          renderItem={({ item: { m, first } }) => <Row m={m} first={first} />}
        />
        <View className="border-t border-stroke-soft-200 bg-bg-white-0 px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Row({ m, first }: { m: Msg; first: boolean }) {
  if (m.kind === "system") return <ChatSystem>{m.body}</ChatSystem>;
  return (
    <ChatMessage from={m.kind === "dibby" ? "dibby" : m.mine ? "me" : "them"} name={m.author?.split(" ")[0]} colour={m.colour ?? undefined} first={first}>
      {m.body}
    </ChatMessage>
  );
}
