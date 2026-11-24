import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import type { NewPlanRequest, PlanSummary } from "@dibs/shared/api";
import { TIME_PRESETS } from "@dibs/shared/daypart";
import { readPlanText } from "@dibs/shared/plan-text";
import { shareText } from "@dibs/shared/plans";
import { PlanCard, type PlanFact } from "@/components/dibby/plan-card";
import { Answers, Choice, DIBBY, DibbyAsks, Option, Stagger, talkMs, usePace, type Pose } from "@/components/dibby/flow";
import { PushAsk } from "@/components/dibby/push-ask";
import { Hopscotch, type Rest, type Square } from "@/components/dibby/hopscotch";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import { Icon } from "@/components/ui/icon";
import * as Input from "@/components/ui/input";
import { Placeholder } from "@/components/ui/placeholder";
import * as Label from "@/components/ui/label";
import * as LinkButton from "@/components/ui/link-button";
import { API_URL, ApiError, createPlan, getPlan } from "@/lib/api";
import { addDays, dayLabel, dayWord, sydneyToday } from "@/lib/dates";
import { useSession } from "@/lib/session";
import { useColour } from "@/lib/theme";

/**
 * Making a plan, the web's form (app/new/PlanFlow.tsx) as hopscotch: one question a square.
 * Dibby hops forward a square per answer, lands in a new pose and reads the next question out.
 * What, when, where; then your name if we don't know it yet (no account needed); then it's on,
 * ready to drop in the group chat.
 *
 * Like the web's chat (app/new/PlanChat.tsx), the first square takes the whole plan in one go:
 * "dumplings fri arvo near Newtown" fills in the name, day and time (readPlanText, no AI), and
 * Dibby hops straight past any square that's already answered.
 */

type Step = "what" | "when" | "where" | "who" | "making" | "done";
type Where = "place" | "vote" | "dibby";

const IDEAS: { label: string; category?: string }[] = [
  { label: "Dinner", category: "Food" },
  { label: "Drinks", category: "Drinks" },
  { label: "Beach day", category: "Social" },
  { label: "Movie night", category: "Social" },
  { label: "Study sesh" },
  { label: "Birthday", category: "Social" },
];

const QUESTION = { what: "What are we doing?", when: "When are we going?", where: "Where are we going?", who: "What's your name?" } as const;

const FIELD_STEP: Record<string, Step> = { title: "what", place: "where", where: "where", ask: "where", first: "who", last: "who" };
const PART_WORD: Record<string, string> = { "06:00": "super early", "09:00": "morning", "12:00": "midday", "15:00": "arvo", "18:00": "evening", "20:00": "night", "22:00": "late" };

/** "19:30" → "7:30pm", for a time someone typed rather than tapped. */
function clock(t: string): string {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}
const timeWord = (t: string) => PART_WORD[t] ?? clock(t);
/** "Saturday", or "today"/"tomorrow" when it's mid-sentence. */
const daySaid = (ymd: string, today: string) => dayWord(ymd, today).replace(/^(Today|Tomorrow)$/, (w) => w.toLowerCase());
const timeLabel = (t: string) => TIME_PRESETS.find((p) => p.at === t)?.label ?? clock(t);

export default function NewPlan() {
  const insets = useSafeAreaInsets();
  const pace = usePace();
  const caret = useColour("primary-base");
  const { state, hasGuestPass, setGuestPass } = useSession();
  const signedIn = state.status === "signedIn";
  const needName = !signedIn && !hasGuestPass;

  const [step, setStep] = useState<Step>("what");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [where, setWhere] = useState<Where | null>(null);
  const [placeName, setPlaceName] = useState("");
  const [placeAddress, setPlaceAddress] = useState("");
  const [ask, setAsk] = useState("");
  const [spend, setSpend] = useState<1 | 2 | 3 | null>(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [error, setError] = useState<{ msg: string; step: Step } | null>(null);
  /** What Dibby says on the first square when you gave a day but no name. */
  const [whatAck, setWhatAck] = useState<string | null>(null);
  const [made, setMade] = useState<{ slug: string; plan: PlanSummary | null } | null>(null);

  const today = useMemo(() => sydneyToday(), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i)), [today]);

  const go = (s: Step) => {
    setError(null);
    setStep(s);
  };

  /** Next on the first square: read the whole sentence, keep what it says, skip what's answered. */
  function answerWhat() {
    const raw = title.trim();
    if (!raw) return;
    const r = readPlanText(raw);
    // Only what was typed counts, so an answer from before stays unless this one says otherwise.
    if (r.date) setDate(r.date);
    if (r.time) setTime(r.time);
    if (!r.title) {
      setTitle("");
      const when = [r.date ? daySaid(r.date, today) : null, r.time ? timeWord(r.time) : null].filter(Boolean).join(" ");
      setWhatAck(when ? `Got it, ${when}. And what are we doing?` : null);
      return;
    }
    setWhatAck(null);
    setTitle(r.title);
    setCategory(r.category ?? IDEAS.find((i) => i.label === r.title)?.category ?? null);
    // What you typed is a good brief for Dibby too, if it comes to that ("near Newtown" and all).
    if (!ask.trim() && r.area) setAsk(raw);
    // Day and time both said: hop straight past "when".
    go((r.date ?? date) && (r.time ?? time) && (r.date || r.time) ? "where" : "when");
  }

  async function submit() {
    setError(null);
    setStep("making");
    const body: NewPlanRequest = {
      title: title.trim(),
      category,
      date,
      time,
      where: where ?? "vote",
      place: where === "place" ? { name: placeName.trim(), address: placeAddress.trim() || null } : null,
      ask: where === "dibby" ? ask.trim() : undefined,
      spend: where === "dibby" ? spend : null,
      ...(needName ? { first: first.trim(), last: last.trim() } : {}),
    };
    const started = Date.now();
    try {
      const res = await createPlan(body);
      if (res.guest_token) await setGuestPass(res.guest_token);
      const plan = await getPlan(res.slug).catch(() => null);
      // Let Dibby think for a moment even when the server's quick: it's the plan being made.
      const wait = Math.max(0, (pace.reduce ? 0 : 1400) - (Date.now() - started));
      setTimeout(() => {
        setMade({ slug: res.slug, plan });
        setStep("done");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, wait);
    } catch (e) {
      const back = e instanceof ApiError && e.field ? (FIELD_STEP[e.field] ?? "where") : needName ? "who" : "where";
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError({ msg: (e as Error).message, step: back });
      setStep(back);
    }
  }

  // What Dibby says back after each answer: short, like a mate would.
  const whenAck = !title.trim() ? null : `${title.trim()}, love that.`;
  const whereAck = date ? `${title.trim() ? `${title.trim()}, ` : ""}${title.trim() ? daySaid(date, today) : dayWord(date, today)}${time ? ` ${timeWord(time)}` : ""}. Sweet.` : "No day yet, all good.";

  const whenLabel = date ? [dayLabel(date, today), time ? timeLabel(time) : null].filter(Boolean).join(", ") : "No day yet";
  const whereLabel = where === "place" ? placeName.trim() || "Got a spot" : where === "vote" ? "Crew votes" : where === "dibby" ? "Dibby's on it" : "Where";
  const order: Step[] = needName ? ["what", "when", "where", "who"] : ["what", "when", "where"];
  const at = Math.max(0, order.indexOf(step));
  const squares: Square[] = order.map((s, i) => {
    const answered = i < at;
    const label = !answered
      ? { what: "What", when: "When", where: "Where", who: "You", making: "", done: "" }[s]
      : { what: title.trim(), when: whenLabel, where: whereLabel, who: first.trim(), making: "", done: "" }[s];
    return { key: s, label, onPress: answered ? () => go(s) : undefined };
  });

  const err = error && error.step === step ? error.msg : null;

  if (step === "making") return <Making dibby={where === "dibby"} />;
  if (step === "done" && made) return <Done slug={made.slug} plan={made.plan} title={title} />;

  // Each square: its own pose, and how he rests there (hopscotch.tsx has the Runway clip slots).
  const pose: Pose = step === "what" ? "think" : step === "when" ? "phone" : step === "where" ? (where === "dibby" ? "look" : "point") : "hi";
  const rest: Rest = step === "when" || step === "who" ? "breathe" : "sway";

  return (
    <View className="flex-1 bg-bg-white-0" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="mt-2 h-12 flex-row items-center px-2">
        <Button.Root
          variant="neutral"
          mode="ghost"
          iconOnly
          accessibilityLabel="Back"
          onPress={() => (step === "what" ? router.back() : go(step === "when" ? "what" : step === "where" ? "when" : "where"))}
        >
          <Button.Icon name={step === "what" ? "close-line" : "arrow-left-line"} />
        </Button.Root>
      </View>
      <Hopscotch squares={squares} at={at} pose={pose} rest={rest} talk={talkMs(QUESTION[step as keyof typeof QUESTION] ?? "")} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="gap-5 px-4 pb-6 pt-1" keyboardShouldPersistTaps="handled">
          {step === "what" ? (
            <>
              <DibbyAsks stepKey="what" ack={whatAck} question={QUESTION.what} hint={whatAck ? undefined : "Say the day and time too, if you know it."} />
              <Answers stepKey="what" after={talkMs(QUESTION.what)}>
                <View className="relative">
                  <Placeholder show={!title} ink="faint" className="inset-x-0 top-0 border-b-2 border-transparent py-2 font-display text-title-h3">
                    Dumplings fri arvo
                  </Placeholder>
                  <TextInput
                    value={title}
                    onChangeText={(t) => {
                      setTitle(t);
                      setCategory(IDEAS.find((i) => i.label === t)?.category ?? null);
                    }}
                    placeholder="Dumplings fri arvo"
                    maxLength={80}
                    autoFocus={pace.reduce}
                    returnKeyType="next"
                    onSubmitEditing={answerWhat}
                    accessibilityLabel="What are we doing?"
                    className="border-b-2 border-stroke-soft-200 py-2 font-display text-title-h3 text-text-strong-950"
                    placeholderTextColor="transparent"
                    selectionColor={caret}
                  />
                </View>
                <Text className="text-label-sm text-text-sub-600">Or tap one</Text>
                <View className="flex-row flex-wrap gap-2">
                  {IDEAS.map((i, n) => (
                    <Stagger key={i.label} index={n}>
                      <Choice
                        label={i.label}
                        selected={title === i.label}
                        onPress={() => {
                          setTitle(i.label);
                          setCategory(i.category ?? null);
                        }}
                      />
                    </Stagger>
                  ))}
                </View>
                <Problem msg={err} />
              </Answers>
            </>
          ) : null}

          {step === "when" ? (
            <>
              <DibbyAsks stepKey="when" ack={whenAck} question={QUESTION.when} />
              <Answers stepKey="when" after={talkMs(QUESTION.when)}>
                <Text className="text-label-sm text-text-sub-600">Day</Text>
                <View className="flex-row flex-wrap gap-2">
                  {days.map((d, n) => (
                    <Stagger key={d} index={n}>
                      <Choice label={dayLabel(d, today)} selected={date === d} onPress={() => setDate(date === d ? null : d)} />
                    </Stagger>
                  ))}
                  <Stagger index={days.length}>
                    <Choice label="Not sure yet" icon="question-line" selected={date === null} onPress={() => (setDate(null), setTime(null))} />
                  </Stagger>
                </View>
                {date ? (
                  <Animated.View entering={pace.reduce ? undefined : FadeInDown.duration(260)} className="gap-3">
                    <Text className="text-label-sm text-text-sub-600">What time?</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {TIME_PRESETS.map((t, n) => (
                        <Stagger key={t.at} index={n}>
                          <Choice label={t.label} selected={time === t.at} onPress={() => setTime(time === t.at ? null : t.at)} />
                        </Stagger>
                      ))}
                      {time && !TIME_PRESETS.some((t) => t.at === time) ? (
                        // A time typed on the first square ("7pm"), shown so it can be kept or tapped off.
                        <Stagger index={TIME_PRESETS.length}>
                          <Choice label={clock(time)} selected onPress={() => setTime(null)} />
                        </Stagger>
                      ) : null}
                    </View>
                  </Animated.View>
                ) : null}
              </Answers>
            </>
          ) : null}

          {step === "where" ? (
            <>
              <DibbyAsks stepKey="where" ack={whereAck} question={QUESTION.where} />
              <Answers stepKey="where" after={talkMs(QUESTION.where)}>
                <Stagger index={0}>
                  <Option icon="map-pin-2-line" title="I've got a spot" body="Already know where? Type it in" selected={where === "place"} onPress={() => setWhere("place")} />
                </Stagger>
                {where === "place" ? (
                  <Animated.View entering={pace.reduce ? undefined : FadeInDown.duration(240)} className="gap-3">
                    <View className="gap-1">
                      <Label.Root>Place</Label.Root>
                      <Input.Root size="large">
                        <Input.Wrapper>
                          <Input.Icon name="map-pin-line" />
                          <Input.Input value={placeName} onChangeText={setPlaceName} placeholder="Mr Wong, or Jess's place" maxLength={80} autoFocus />
                        </Input.Wrapper>
                      </Input.Root>
                      <Text className="text-paragraph-xs text-text-soft-400">Anyone with the link sees the name.</Text>
                    </View>
                    <View className="gap-1">
                      <Label.Root>Address (optional)</Label.Root>
                      <Input.Root size="large">
                        <Input.Wrapper>
                          <Input.Input value={placeAddress} onChangeText={setPlaceAddress} placeholder="3 Bridge Lane, Sydney" maxLength={160} />
                        </Input.Wrapper>
                      </Input.Root>
                      <Text className="text-paragraph-xs text-text-soft-400">Only people in the plan see this.</Text>
                    </View>
                  </Animated.View>
                ) : null}
                <Stagger index={1}>
                  <Option icon="bar-chart-2-line" title="Let the crew vote" body="Everyone chucks in ideas. Most votes wins" selected={where === "vote"} onPress={() => setWhere("vote")} />
                </Stagger>
                <Stagger index={2}>
                  <Option dibby title="Ask Dibby" body="Dibby digs up three real spots for the crew to vote on" selected={where === "dibby"} onPress={() => setWhere("dibby")} />
                </Stagger>
                {where === "dibby" ? (
                  <Animated.View entering={pace.reduce ? undefined : FadeInDown.duration(240)} className="gap-3">
                    <View className="gap-1">
                      <Label.Root>What are you after?</Label.Root>
                      <Input.Root size="large">
                        <Input.Wrapper>
                          <Input.Input value={ask} onChangeText={setAsk} placeholder="Dumplings in Chatswood" maxLength={500} autoFocus />
                        </Input.Wrapper>
                      </Input.Root>
                    </View>
                    <View className="flex-row gap-2">
                      {([1, 2, 3] as const).map((s) => (
                        <Choice key={s} label={"$".repeat(s)} selected={spend === s} onPress={() => setSpend(spend === s ? null : s)} />
                      ))}
                    </View>
                    <Text className="text-paragraph-xs text-text-soft-400">Dibby picks real spots and won&rsquo;t pick a day or time for you. What you type goes to an AI provider.</Text>
                  </Animated.View>
                ) : null}
                <Problem msg={err} />
              </Answers>
            </>
          ) : null}

          {step === "who" ? (
            <>
              <DibbyAsks stepKey="who" ack="Last thing." question={QUESTION.who} hint="So the crew knows who's organising. No account needed." />
              <Answers stepKey="who" after={talkMs(QUESTION.who)}>
                <View className="gap-1">
                  <Label.Root>First name</Label.Root>
                  <Input.Root size="large">
                    <Input.Wrapper>
                      <Input.Input value={first} onChangeText={setFirst} autoComplete="given-name" textContentType="givenName" maxLength={40} returnKeyType="next" autoFocus />
                    </Input.Wrapper>
                  </Input.Root>
                </View>
                <View className="gap-1">
                  <Label.Root>Last name</Label.Root>
                  <Input.Root size="large">
                    <Input.Wrapper>
                      <Input.Input value={last} onChangeText={setLast} autoComplete="family-name" textContentType="familyName" maxLength={40} returnKeyType="done" />
                    </Input.Wrapper>
                  </Input.Root>
                </View>
                <Problem msg={err} />
                <LinkButton.Root variant="gray" onPress={() => router.push("/sign-in")}>
                  Got an account? Sign in
                </LinkButton.Root>
              </Answers>
            </>
          ) : null}
        </ScrollView>

        <View className="px-4 pb-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          {step === "what" ? (
            <Button.Root size="large" block disabled={!title.trim()} onPress={answerWhat}>
              Next
            </Button.Root>
          ) : step === "when" ? (
            <Button.Root size="large" block onPress={() => go("where")}>
              {date ? "Next" : "Skip for now"}
            </Button.Root>
          ) : step === "where" ? (
            <Button.Root
              size="large"
              block
              disabled={!where || (where === "place" && !placeName.trim()) || (where === "dibby" && !ask.trim() && !spend)}
              onPress={() => (needName ? go("who") : submit())}
            >
              {needName ? "Next" : "Make the plan"}
            </Button.Root>
          ) : (
            <Button.Root size="large" block disabled={!first.trim() || !last.trim()} onPress={submit}>
              Make the plan
            </Button.Root>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Problem({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <Hint.Root hasError>
      <Hint.Icon name="error-warning-fill" />
      {msg}
    </Hint.Root>
  );
}

/** Dibby's thinking loop while the plan's made (and while Dibby finds spots, which takes a few secs). */
function Making({ dibby }: { dibby: boolean }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg-white-0 p-4">
      <Stack.Screen options={{ headerShown: false }} />
      <Image source={DIBBY.thinking} style={{ width: 200, height: 200 }} contentFit="contain" accessible={false} />
      <Text accessibilityLiveRegion="polite" className="text-center font-display text-title-h4 text-text-strong-950">
        {dibby ? "Finding a few spots…" : "Making it happen…"}
      </Text>
      {dibby ? <Text className="text-center text-paragraph-md text-text-sub-600">Real places, open and nearby. Give it a sec.</Text> : null}
    </View>
  );
}

/** It's on: Dibby cheers, the plan as the crew will see it, and the link to drop in the group chat. */
function Done({ slug, plan, title }: { slug: string; plan: PlanSummary | null; title: string }) {
  const insets = useSafeAreaInsets();
  const pace = usePace();
  const { state } = useSession();
  const url = `${API_URL}/p/${slug}`;

  const facts: PlanFact[] = [];
  if (plan?.when) facts.push({ icon: "calendar-line", text: plan.when });
  const place = plan?.voting ? `Up for a vote${plan.area ? ` around ${plan.area}` : ""}` : (plan?.place ?? plan?.area);
  if (place) facts.push({ icon: "map-pin-line", text: place });

  async function share() {
    const message = shareText({ title: plan?.title ?? title, when: plan?.when, place: plan?.place ?? plan?.area, voting: plan?.voting, url });
    await Share.share(Platform.OS === "ios" ? { message, url } : { message }).catch(() => {});
  }

  return (
    <View className="flex-1 bg-bg-white-0" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerClassName="gap-5 px-4 pb-6 pt-6">
        <View className="items-center gap-2">
          <Image source={DIBBY.cheer} style={{ width: 180, height: 180 }} contentFit="contain" accessible={false} />
          <Animated.Text entering={pace.reduce ? undefined : FadeInDown.duration(380).delay(300)} accessibilityRole="header" className="font-display text-title-h2 text-text-strong-950">
            It&rsquo;s on.
          </Animated.Text>
          <Animated.Text entering={pace.reduce ? undefined : FadeIn.duration(300).delay(500)} className="text-center text-paragraph-md text-text-sub-600">
            Drop the link in the group chat. Your crew taps it to vote and say if they&rsquo;re in, no app or account needed.
          </Animated.Text>
        </View>

        <Animated.View entering={pace.reduce ? undefined : FadeInDown.duration(380).delay(650)}>
          <PlanCard eyebrow={plan?.when ?? null} title={plan?.title ?? title} status={plan?.status ?? "voting"} facts={facts} />
        </Animated.View>

        <PushAsk delay={pace.reduce ? 0 : 1100} />

        {state.status !== "signedIn" ? (
          <Animated.View entering={pace.reduce ? undefined : FadeIn.duration(300).delay(900)}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/sign-in")}
              className="flex-row items-center gap-3 rounded-lg border border-stroke-soft-200 p-4 active:bg-bg-weak-50"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-lighter">
                <Icon name="mail-line" className="text-[20px] leading-[20px] text-primary-base" />
              </View>
              <View className="flex-1">
                <Text className="text-label-md text-text-strong-950">Keep this plan on any phone</Text>
                <Text className="text-paragraph-sm text-text-sub-600">Add your email. One code, no password.</Text>
              </View>
            </Pressable>
          </Animated.View>
        ) : null}
      </ScrollView>
      <View className="gap-3 px-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Button.Root variant="dibs" size="large" block onPress={share}>
          <Button.Icon name="share-forward-line" />
          Share to the group chat
        </Button.Root>
        <Button.Root variant="neutral" mode="lighter" size="large" block onPress={() => router.replace(`/p/${slug}`)}>
          Done
        </Button.Root>
      </View>
    </View>
  );
}

