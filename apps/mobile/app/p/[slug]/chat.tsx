import { forwardRef, useCallback, useMemo, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, FlatList, Image, Platform, Pressable, Text, TextInput, View, type ScrollViewProps } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import type { KeyboardChatScrollViewProps, KeyboardChatScrollViewRef } from "react-native-keyboard-controller";
import { keyboardController, useKeyboardFromEvents } from "@/lib/keyboard";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PlanDetail } from "@dibs/shared/api";
import { ChatMessage, ChatSystem, ChatTime, DibbyTyping } from "@/components/dibby/chat";
import { DIBBY } from "@/components/dibby/flow";
import * as Button from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import * as Input from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { reactTo, sendMessage, toggleDibbyMute } from "@/lib/api";
import { chatStamp } from "@/lib/dates";
import { useColour } from "@/lib/theme";
import { usePlan } from "@/lib/use-plan";

type Chat = NonNullable<PlanDetail["chat"]>;
type Msg = Chat["messages"][number];

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** A gap this long between messages gets a time stamp, like the web thread. */
const STAMP_GAP_MS = 15 * 60 * 1000;

/**
 * The plan's chat, laid out like the web's /p/[slug]/chat: a bar with the plan's name and the bell,
 * the pinned line (what, when, where, how many), the messages, and the composer at the bottom.
 * Anyone going reads it; posting needs an account (guests add their email right here).
 * Tag @dibby and Dibby replies in a few seconds: it only reads messages it's tagged in.
 *
 * The keyboard, like iMessage and WhatsApp: the composer rides on top of the system keyboard frame
 * by frame (react-native-keyboard-controller reads the native keyboard animation on iOS and
 * Android's WindowInsetsAnimation), the newest messages lift with it, and the thread behind dims
 * while you type. Swipe the thread down to put the keyboard away (interactive on iOS).
 * Builds from before the library was added (see lib/keyboard.ts) move the composer from the
 * keyboard's show and hide events instead, on the same timing.
 */
export default function PlanChatScreen() {
  // Scoped to this screen, so the rest of the app keeps its own keyboard handling.
  const KC = keyboardController;
  return KC ? (
    <KC.KeyboardProvider>
      <PlanChat />
    </KC.KeyboardProvider>
  ) : (
    <PlanChat />
  );
}

/** How far the composer's bottom padding sits above the keyboard while it's up. */
const KEYBOARD_GAP = 12;

function PlanChat() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const spinner = useColour("primary-base");
  const { state, apply } = usePlan(slug);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  // The composer's bottom padding clears the home indicator; once the keyboard's up it only needs a
  // small gap, so the composer (and the messages with it) rise by the keyboard less that difference.
  const bottom = Math.max(insets.bottom, KEYBOARD_GAP);
  const lift = bottom - KEYBOARD_GAP;
  const scroller = useCallback((props: ScrollViewProps) => <ChatScroll {...props} offset={lift} />, [lift]);
  const KC = keyboardController;
  const events = useKeyboardFromEvents(!KC);

  const detail = state.kind === "ok" ? state.detail : null;
  const messages = useMemo(() => detail?.chat?.messages ?? [], [detail]);
  // Newest first for the inverted list; bursts and time stamps worked out oldest first.
  const rows = useMemo(() => {
    const out = messages.map((m, i) => {
      const prev = messages[i - 1];
      const stamp = !prev || Date.parse(m.at) - Date.parse(prev.at) > STAMP_GAP_MS ? chatStamp(m.at) : null;
      return { m, stamp, first: Boolean(stamp) || !prev || prev.author !== m.author || prev.kind !== m.kind };
    });
    return out.reverse();
  }, [messages]);

  if (!detail) return <ActivityIndicator className="flex-1" color={spinner} />;
  const { me, chat } = detail;
  const canPost = Boolean(me?.canPost && me.access === "full");

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

  async function mute() {
    Haptics.selectionAsync();
    try {
      apply(await toggleDibbyMute(slug));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function react(id: string, emoji: string) {
    Haptics.selectionAsync();
    try {
      apply(await reactTo(slug, id, emoji));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const footer = !chat ? (
    <Text className="text-paragraph-sm text-text-sub-600">{me?.note ?? "Join the plan to see the chat."}</Text>
  ) : me?.access === "read" ? (
    <ReadOnly note={me.note ?? "Say you're in to chat."} />
  ) : me?.access !== "full" ? (
    <Text className="text-paragraph-sm text-text-sub-600">{me?.note ?? "Say you're in to chat."}</Text>
  ) : !me.canPost ? (
    <EmailGate slug={slug} />
  ) : (
    <Composer value={draft} onChange={setDraft} onSend={send} busy={Boolean(sending)} />
  );

  const empty = rows.length === 0 && !sending;
  const thread = (
    <View className="flex-1">
      {chat?.summary ? (
        <View className="flex-row items-center gap-2 border-b border-stroke-soft-200 bg-bg-weak-50 px-4 py-2">
          <Icon name="pushpin-2-line" className="text-[20px] leading-[20px] text-primary-base" />
          <Text className="flex-1 font-sans-medium text-[14px] leading-[20px] text-text-sub-600">{chat.summary}</Text>
        </View>
      ) : null}
      {empty ? (
        // Outside the list: an inverted FlatList draws its empty state upside down on some versions.
        <View className="flex-1 items-center px-4 py-8">
          <Image source={DIBBY.look} accessibilityIgnoresInvertColors style={{ width: 80, height: 80 }} resizeMode="contain" />
          <Text className="mt-2 text-center text-paragraph-sm text-text-sub-600">
            Nothing yet. {canPost ? "Try “@dibby find us somewhere cheap”." : ""}
          </Text>
        </View>
      ) : null}
      <FlatList
        style={empty ? { flexGrow: 0 } : undefined}
        inverted
        data={rows}
        keyExtractor={(r) => r.m.id}
        contentContainerClassName="gap-2 p-4"
        // Inverted: flex-end is the top, so a short chat starts under the pinned line like the web.
        contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
        keyboardShouldPersistTaps="handled"
        // Interactive needs the library: without it the composer only moves once the swipe lets go.
        keyboardDismissMode={KC && Platform.OS === "ios" ? "interactive" : "on-drag"}
        renderScrollComponent={KC ? scroller : undefined}
        ListHeaderComponent={
          sending ? (
            <View className="gap-2">
              <ChatMessage from="me">{sending}</ChatMessage>
              {/@dibby/i.test(sending) ? <DibbyTyping /> : null}
            </View>
          ) : undefined
        }
        renderItem={({ item: { m, first, stamp } }) => (
          <View className="gap-2">
            {stamp ? <ChatTime>{stamp}</ChatTime> : null}
            <Row m={m} first={first} options={chat?.react ?? []} onReact={(e) => react(m.id, e)} />
          </View>
        )}
      />
      {KC ? <DimWithKeyboard /> : <Dim progress={events.progress} />}
    </View>
  );
  const bar = (
    <View className="gap-2 border-t border-stroke-soft-200 bg-bg-white-0 px-4 pt-3" style={{ paddingBottom: bottom }}>
      {footer}
    </View>
  );
  return (
    <View className="flex-1 bg-bg-white-0">
      <ChatBar title={detail.plan.title} muted={chat?.muted ?? null} onMute={mute} />
      {KC ? (
        <>
          {thread}
          <KC.KeyboardStickyView offset={{ closed: 0, opened: lift }}>{bar}</KC.KeyboardStickyView>
        </>
      ) : (
        <>
          {thread}
          {bar}
          <Lift height={events.height} less={lift} />
        </>
      )}
    </View>
  );
}

/** The thread's scroll view: lifts the newest messages with the keyboard, in step with the composer. */
// Only rendered when keyboardController is there.
const ChatScroll = forwardRef<KeyboardChatScrollViewRef, ScrollViewProps & KeyboardChatScrollViewProps>((props, ref) => {
  const Scroll = keyboardController!.KeyboardChatScrollView;
  return <Scroll ref={ref} inverted automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never" {...props} />;
});
ChatScroll.displayName = "ChatScroll";

/**
 * The thread dims as the keyboard comes up, so what you're typing is the focus. It follows the
 * keyboard's own progress, so it fades in and out exactly with it. Touches pass through: you can
 * still scroll, react, and swipe the keyboard away.
 */
function DimWithKeyboard() {
  const { progress } = keyboardController!.useReanimatedKeyboardAnimation();
  const style = useAnimatedStyle(() => ({ opacity: progress.value * DIM }));
  return <Animated.View pointerEvents="none" className="absolute inset-0 bg-overlay" style={style} />;
}

/** Older builds: the same dim, from the keyboard's events (useKeyboardFromEvents). */
function Dim({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: progress.value * DIM }));
  return <Animated.View pointerEvents="none" className="absolute inset-0 bg-overlay" style={style} />;
}

/**
 * Older builds: room under the composer as tall as the keyboard (less the home-indicator padding
 * it already has), so the composer rises as one piece and the thread above shrinks, keeping the
 * newest messages just above it.
 */
function Lift({ height, less }: { height: SharedValue<number>; less: number }) {
  const style = useAnimatedStyle(() => ({ height: Math.max(0, height.value - less) }));
  return <Animated.View style={style} />;
}

/** How much of the overlay scrim the dim uses: lighter than a sheet's, the thread stays readable. */
const DIM = 0.6;

/** The web's chat topbar: round back button, the plan's name with "Chat" under it, and the bell. */
function ChatBar({ title, muted, onMute }: { title: string; muted: boolean | null; onMute: () => void }) {
  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  return (
    <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center gap-3 border-b border-stroke-soft-200 bg-bg-white-0 px-3 pb-2">
      <Button.Root variant="neutral" mode="lighter" iconOnly accessibilityLabel={`Back to ${title}`} onPress={back}>
        <Button.Icon name="arrow-left-line" />
      </Button.Root>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} accessibilityRole="header" className="text-label-lg text-text-strong-950">
          {title}
        </Text>
        <Text className="text-paragraph-xs text-text-sub-600">Chat</Text>
      </View>
      {muted !== null ? (
        <Button.Root
          variant="neutral"
          mode="ghost"
          iconOnly
          accessibilityLabel={muted ? "Show Dibby's nudges" : "Mute Dibby's nudges"}
          accessibilityState={{ checked: muted }}
          onPress={onMute}
        >
          <Button.Icon name={muted ? "notification-off-line" : "notification-3-line"} />
        </Button.Root>
      ) : null}
    </View>
  );
}

/** The web's Composer: Ask Dibby above the input (where a thumb finds it), then the input and send. */
function Composer({ value, onChange, onSend, busy }: { value: string; onChange: (t: string) => void; onSend: () => void; busy: boolean }) {
  const tagging = /(^|\s)@dibby\b/i.test(value);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  return (
    <>
      {!tagging ? (
        <Button.Root
          variant="primary"
          mode="lighter"
          size="small"
          onPress={() => {
            onChange(`@dibby ${value}`);
            input.current?.focus();
          }}
        >
          <Button.Icon name="sparkling-line" />
          Ask Dibby
        </Button.Root>
      ) : null}
      <View className="flex-row gap-2">
        <Input.Root className="min-w-0 flex-1">
          <Input.Wrapper>
            <Input.Input
              ref={input}
              value={value}
              onChangeText={onChange}
              placeholder="Message, or @dibby…"
              accessibilityLabel="Message"
              maxLength={2000}
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={onSend}
            />
          </Input.Wrapper>
        </Input.Root>
        <Button.Root iconOnly accessibilityLabel="Send" disabled={busy || !value.trim()} onPress={onSend}>
          <Button.Icon name="send-plane-2-fill" />
        </Button.Root>
      </View>
      {tagging ? (
        <View className="flex-row items-center gap-1">
          <Icon name="map-pin-line" className="text-[14px] leading-[14px] text-text-sub-600" />
          <Text className="flex-1 text-paragraph-xs text-text-sub-600">Name a place, like &ldquo;in Newtown&rdquo;, and Dibby looks there.</Text>
        </View>
      ) : null}
    </>
  );
}

/** Where a guest's composer would be: an email is all it takes to chat (the web's ChatEmailGate). */
function EmailGate({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  function go() {
    const e = email.trim().toLowerCase();
    if (!EMAIL.test(e)) return setError("That email doesn't look right.");
    setError(null);
    router.push({ pathname: "/sign-in", params: { email: e, next: `/p/${slug}/chat` } });
  }
  return (
    <>
      <View>
        <Text accessibilityRole="header" className="text-label-sm text-text-strong-950">
          Want to say something?
        </Text>
        <Text className="text-paragraph-sm text-text-sub-600">Add your email to chat. One sign-in link, no password.</Text>
      </View>
      <View className="flex-row gap-2">
        <Input.Root hasError={Boolean(error)} className="min-w-0 flex-1">
          <Input.Wrapper>
            <Input.Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={go}
            />
          </Input.Wrapper>
        </Input.Root>
        <Button.Root onPress={go}>Send</Button.Root>
      </View>
      {error ? <Text className="text-paragraph-xs text-error-base">{error}</Text> : null}
    </>
  );
}

/** Maybe, not replied or waitlisted: a lock chip and why (the web's ReadOnlyComposer). */
function ReadOnly({ note }: { note: string }) {
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => toast.info(note)} className="min-h-11 flex-row items-center gap-2 self-start rounded-full bg-bg-weak-50 px-4">
        <Icon name="lock-line" className="text-[18px] leading-[18px] text-text-sub-600" />
        <Text className="text-label-sm text-text-sub-600">Read only</Text>
      </Pressable>
      <Text className="text-paragraph-xs text-text-sub-600">{note}</Text>
    </>
  );
}

function Row({ m, first, options, onReact }: { m: Msg; first: boolean; options: string[]; onReact: (emoji: string) => void }) {
  if (m.kind === "system") return <ChatSystem>{m.body}</ChatSystem>;
  const from = m.kind === "dibby" ? "dibby" : m.mine ? "me" : "them";
  return (
    <ChatMessage from={from} name={m.author ?? undefined} colour={m.colour ?? undefined} first={first} below={<Reactions all={m.reactions ?? []} options={options} onReact={onReact} />}>
      {m.body}
    </ChatMessage>
  );
}

/** Reaction chips under a message, and the picker for people who can react (the web's Reactions). */
function Reactions({ all, options, onReact }: { all: NonNullable<Msg["reactions"]>; options: string[]; onReact: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const can = options.length > 0;
  if (all.length === 0 && !can) return null;
  return (
    <View className="mt-1 flex-row flex-wrap gap-1">
      {all.map((r) => (
        <Pressable
          key={r.emoji}
          disabled={!can}
          accessibilityRole="button"
          accessibilityLabel={`${r.emoji} ${r.count}${r.mine ? ", including you" : ""}`}
          accessibilityState={{ selected: r.mine }}
          onPress={() => onReact(r.emoji)}
          className={chip(r.mine)}
        >
          <Text className="font-sans-medium text-[14px] leading-[20px] text-text-sub-600">
            {r.emoji} {r.count}
          </Text>
        </Pressable>
      ))}
      {can ? (
        open ? (
          options.map((e) => (
            <Pressable key={e} accessibilityRole="button" accessibilityLabel={`React ${e}`} onPress={() => (setOpen(false), onReact(e))} className={chip(false)}>
              <Text className="text-[14px] leading-[20px]">{e}</Text>
            </Pressable>
          ))
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="React" onPress={() => setOpen(true)} className={chip(false)}>
            <Icon name="emotion-line" className="text-[18px] leading-[18px] text-text-sub-600" />
          </Pressable>
        )
      ) : null}
    </View>
  );
}

const chip = (mine: boolean) =>
  `min-h-11 min-w-11 flex-row items-center justify-center gap-1 rounded-full border px-2 ${mine ? "border-primary-base bg-primary-lighter" : "border-stroke-soft-200 bg-bg-white-0"}`;
