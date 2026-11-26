import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { Platform, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn, FadeInDown, FadeInLeft, FadeInRight } from "react-native-reanimated";
import type { NewPlanRequest, PlanSummary } from "@dibs/shared/api";
import { TIME_PRESETS } from "@dibs/shared/daypart";
import { readPlanText } from "@dibs/shared/plan-text";
import { shareText } from "@dibs/shared/plans";
import { PlanCard, type PlanFact } from "@/components/dibby/plan-card";
import { Choice, DIBBY, Option, usePace, type Pose } from "@/components/dibby/flow";
import { DayStrip } from "@/components/dibby/day-strip";
import * as Datepicker from "@/components/ui/datepicker";
import { PushAsk } from "@/components/dibby/push-ask";
import { DibbyHero, HERO_SIZE, StepBar } from "@/components/dibby/hero";
import { KeyboardRoot, KeyboardSpacer } from "@/components/dibby/keyboard-spacer";
import { AgreeLine } from "@/components/dibby/agree-line";
import { AiConsent, hasAiConsent } from "@/components/dibby/ai-consent";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import { Icon } from "@/components/ui/icon";
import * as LinkButton from "@/components/ui/link-button";
import { Placeholder } from "@/components/ui/placeholder";
import { PlacePicker } from "@/components/dibby/place";
import { API_URL, ApiError, createPlan, getPlan } from "@/lib/api";
import { sydneyToday, whenLong } from "@/lib/dates";
import { lc, sydneyHhmm, sydneyInstant, timeLabel, whenLine } from "@/lib/when-words";
import { useSession } from "@/lib/session";
import { useColour } from "@/lib/theme";

/**
 * Making a plan: one question a screen, full screen, minimal. Dibby asks it, centred, the question in
 * his speech bubble, and jumps on the spot to the next one (components/dibby/hero.tsx); one thing to
 * answer under him, and the button pinned at the bottom (it rides up with the keyboard). A slim bar
 * beside the back button shows how far through you are.
 * The first screen takes the whole plan as a sentence ("dumplings fri arvo near Newtown" fills in
 * the name, day and time with readPlanText, no AI) and skips what's already answered.
 * What, when, where (and what Dibby's after, if Dibby's finding spots), then your name if we
 * don't know it yet; then it's on, ready to drop in the group chat.
 */

type Step = "what" | "when" | "where" | "dibby" | "who" | "making" | "done";
type Where = "place" | "vote" | "dibby";

const IDEAS: { label: string; category?: string }[] = [
  { label: "Dinner", category: "Food" },
  { label: "Drinks", category: "Drinks" },
  { label: "Beach day", category: "Social" },
  { label: "Movie night", category: "Social" },
  { label: "Study sesh" },
  { label: "Birthday", category: "Social" },
];

const SPENDS = [
  { id: 1, label: "Cheap and cheerful" },
  { id: 2, label: "Mid-range" },
  { id: 3, label: "Treat ourselves" },
] as const;

const QUESTION = {
  what: "What are we doing?",
  when: "When are we going?",
  where: "Where are we going?",
  dibby: "What are you after?",
  who: "Last thing, what’s your name?",
} as const;

const FIELD_STEP: Record<string, Step> = { title: "what", place: "where", where: "where", area: "where", ask: "dibby", first: "who", last: "who", first_name: "who", last_name: "who" };

export default function NewPlan() {
  return (
    <KeyboardRoot>
      <PlanFlow />
    </KeyboardRoot>
  );
}

function PlanFlow() {
  // From a crew's page: the plan is the crew's, crew only to start with (ARV-93).
  const { crew: crewId } = useLocalSearchParams<{ crew?: string }>();
  const insets = useSafeAreaInsets();
  const pace = usePace();
  const caret = useColour("primary-base");
  const { state, hasGuestPass, setGuestPass } = useSession();
  const signedIn = state.status === "signedIn";
  const needName = !signedIn && !hasGuestPass;

  const [step, setStep] = useState<Step>("what");
  /** 1 going forward, -1 going back: which side the next screen slides in from. */
  const [dir, setDir] = useState<1 | -1>(1);
  /** A word from Dibby on the first screen when the typed plan didn't say what it is. */
  const [nudge, setNudge] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [exact, setExact] = useState(false);
  const [where, setWhere] = useState<Where | null>(null);
  /** Dibby was picked on the first question ("Not sure? Let Dibby plan it"), not on "where". */
  const [viaDibby, setViaDibby] = useState(false);
  // Apple 5.1.2(i): say who gets it and ask before anything goes to the AI provider. Once per phone.
  const [aiOk, setAiOk] = useState(false);
  const [askingAi, setAskingAi] = useState<null | (() => void)>(null);
  useEffect(() => {
    hasAiConsent().then(setAiOk);
  }, []);
  /** Runs `then` straight away if they've said OK to Dibby's AI, otherwise once they do. */
  const withAiOk = (then: () => void) => (aiOk ? then() : setAskingAi(() => then));
  const [placeName, setPlaceName] = useState("");
  const [placeAddress, setPlaceAddress] = useState("");
  /** Set when the spot was picked from the map: the server checks it with Google and uses Google's name. */
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [area, setArea] = useState("");
  const [ask, setAsk] = useState("");
  const [spend, setSpend] = useState<1 | 2 | 3 | null>(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [error, setError] = useState<{ msg: string; step: Step } | null>(null);
  const [made, setMade] = useState<{ slug: string; plan: PlanSummary | null } | null>(null);

  const today = useMemo(() => sydneyToday(), []);
  const line = whenLine(date, time, today);
  // Through Dibby: what → when → dibby (→ who). Otherwise what → when → where (→ dibby) (→ who).
  const path: Step[] = [
    "what",
    "when",
    ...(viaDibby ? [] : (["where"] as Step[])),
    ...(where === "dibby" ? (["dibby"] as Step[]) : []),
    ...(needName ? (["who"] as Step[]) : []),
  ];
  const lastStep = path[path.length - 1];

  const go = (s: Step) => {
    setError(null);
    setNudge(null);
    const order: Step[] = ["what", "when", "where", "dibby", "who"];
    setDir(order.indexOf(s) >= order.indexOf(step) ? 1 : -1);
    setStep(s);
  };
  const forward = (from: Step) => {
    const nextStep = path[path.indexOf(from) + 1];
    if (nextStep) go(nextStep);
    else submit();
  };

  /** "Dinner", or a whole sentence typed in: keep what it says, skip what's answered. */
  function answerWhat(raw: string) {
    const text = raw.trim();
    if (!text) return;
    const r = readPlanText(text);
    const name = r.title;
    if (!name) {
      // Only a day or time, no name: keep them, and ask for the name.
      if (r.date) setDate(r.date);
      if (r.time) setTime(r.time);
      setNudge(r.date || r.time ? `Got ${lc(whenLine(r.date, r.time, today) ?? "")}. What are we doing?` : "Give it a name, like “Friday dinner”.");
      return;
    }
    setTitle(name);
    setDraft(text);
    setCategory(r.category ?? IDEAS.find((i) => i.label === name)?.category ?? null);
    if (r.date) setDate(r.date);
    if (r.time) setTime(r.time);
    if (r.area) setArea(r.area);
    // What you typed is a good brief for Dibby too, if it comes to that.
    if (!ask) setAsk(text);
    if (where === "dibby" && viaDibby) {
      setWhere(null);
      setViaDibby(false);
    }
    // Day and time both said: skip "when".
    go(r.date && r.time ? "where" : "when");
  }

  function decideLater() {
    setDate(null);
    setTime(null);
    setExact(false);
    forward("when");
  }

  /** The big button. */
  function next() {
    setError(null);
    if (step === "what") return answerWhat(draft);
    if (step === "when") return date || time ? forward("when") : decideLater();
    if (step === "where") {
      if (!where) return setError({ step, msg: "Pick one to keep going." });
      if (where === "dibby") return go("dibby");
      if (where === "place" && !placeName.trim()) return setError({ step, msg: "Pick the place, or let the crew vote." });
      return needName ? go("who") : submit();
    }
    if (step === "dibby") {
      if (!ask.trim() && !spend) return setError({ step, msg: "Tell Dibby what you're after, like “dumplings” or “bowling”." });
      return needName ? go("who") : submit();
    }
    if (step === "who") {
      if (!first.trim()) return setError({ step, msg: "Add your first name." });
      if (!last.trim()) return setError({ step, msg: "Add your last name." });
      return submit();
    }
  }

  async function submit(whereNow: Where | null = where) {
    setError(null);
    setStep("making");
    const w = whereNow ?? "vote";
    const body: NewPlanRequest = {
      title: title.trim(),
      category,
      date,
      time,
      where: w,
      place: w === "place" ? (placeId ? { name: placeName.trim(), place_id: placeId } : { name: placeName.trim(), address: placeAddress.trim() || null }) : null,
      ask: w === "dibby" ? ask.trim() : undefined,
      spend: w === "dibby" ? spend : null,
      ai_consent: w === "dibby" ? aiOk : undefined,
      area: w !== "place" ? area.trim() || null : null,
      ...(crewId ? { crew_id: crewId } : {}),
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
      const back = e instanceof ApiError && e.field ? (FIELD_STEP[e.field] ?? "where") : needName ? "who" : w === "dibby" ? "dibby" : "where";
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError({ msg: (e as Error).message, step: back });
      setStep(back);
    }
  }

  // The progress: what, when, where (Dibby's brief shares it), you.
  const stage = (s: Step): Step => (s === "dibby" ? "where" : s);
  const order: Step[] = needName ? ["what", "when", "where", "who"] : ["what", "when", "where"];
  const at = Math.max(0, order.indexOf(stage(step)));

  const err = error && error.step === step ? error.msg : null;

  if (step === "making") return <Making dibby={where === "dibby"} />;
  if (step === "done" && made) return <Done slug={made.slug} plan={made.plan} title={title} />;

  // His pose on each question, and a smaller Dibby where the answers need the room.
  const pose: Pose = step === "what" ? "think" : step === "when" ? "phone" : step === "where" ? "point" : step === "dibby" ? "look" : "hi";
  const heroSize = step === "when" || step === "who" ? 88 : HERO_SIZE;
  const back = () => {
    if (step === "what") return router.back();
    const i = path.indexOf(step);
    go(i > 0 ? path[i - 1] : "what");
  };

  const isLast = step === lastStep && step !== "what" && step !== "when" && !(step === "where" && where === "dibby");
  const ready =
    step === "what" ? Boolean(draft.trim()) : step === "where" ? Boolean(where && (where !== "place" || placeName.trim())) : step === "dibby" ? Boolean(ask.trim() || spend) : true;
  const label = isLast ? "Make the plan" : step === "when" && !date && !time ? "Decide later" : "Continue";
  const bottom = Math.max(insets.bottom, 16);
  // The screen slides in from the side it's coming from; nothing waits on anything.
  const enter = pace.reduce ? undefined : (dir === 1 ? FadeInRight : FadeInLeft).duration(260).easing(Easing.out(Easing.cubic));

  return (
    <View className="flex-1 bg-bg-white-0" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="mt-2 h-12 flex-row items-center gap-3 px-2">
        <Button.Root variant="neutral" mode="ghost" iconOnly accessibilityLabel={step === "what" ? "Close" : "Back"} onPress={back}>
          <Button.Icon name={step === "what" ? "close-line" : "arrow-left-line"} />
        </Button.Root>
        <StepBar count={order.length} at={at} />
        {/* Balances the back button, so the bar sits centred. */}
        <View className="w-10" />
      </View>
      {/* Dibby asks: centred, the question in his bubble. He jumps on the spot between questions. */}
      <View className="px-4 pt-2">
        <DibbyHero pose={pose} question={QUESTION[step as keyof typeof QUESTION]} size={heroSize} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-6 pt-6" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Animated.View key={step} entering={enter} className="gap-6">
          {step === "when" && line ? <Text className="text-center font-title text-[22px] leading-[28px] text-primary-dark">{line}</Text> : null}
          {step === "who" ? <Text className="text-center text-paragraph-md text-text-sub-600">So the crew knows who&rsquo;s organising. No account needed.</Text> : null}

          {step === "what" ? (
            <>
              <BigInput
                value={draft}
                onChangeText={(t) => (setDraft(t), setNudge(null))}
                placeholder="Dumplings fri arvo"
                accessibilityLabel={QUESTION.what}
                maxLength={120}
                caret={caret}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => answerWhat(draft)}
              />
              {nudge ? <Text className="text-paragraph-md text-text-sub-600">{nudge}</Text> : null}
              <View className="flex-row flex-wrap gap-2">
                {IDEAS.map((i) => (
                  <Choice key={i.label} label={i.label} selected={title === i.label} onPress={() => answerWhat(i.label)} />
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  withAiOk(() => {
                    setWhere("dibby");
                    setViaDibby(true);
                    go("when");
                  })
                }
                className="min-h-11 flex-row items-center gap-2 self-start active:opacity-70"
              >
                <Image source={DIBBY.face} style={{ width: 28, height: 28, borderRadius: 14 }} contentFit="cover" accessible={false} />
                <Text className="text-label-md text-primary-dark">Not sure? Let Dibby plan it</Text>
              </Pressable>
            </>
          ) : null}

          {step === "when" ? (
            <>
              <DayStrip value={date} onChange={setDate} />
              {exact ? (
                <View className="gap-3">
                  <Datepicker.Root
                    mode="time"
                    value={sydneyInstant(date ?? today, time ?? "19:00")}
                    onChange={(d) => setTime(sydneyHhmm(d))}
                    accessibilityLabel="Time"
                  />
                  <LinkButton.Root variant="primary" className="self-start" onPress={() => setExact(false)}>
                    Back to quick picks
                  </LinkButton.Root>
                </View>
              ) : (
                <View className="gap-3">
                  <View className="flex-row flex-wrap gap-2">
                    {TIME_PRESETS.map((t) => (
                      <Choice key={t.at} label={t.label} sub={timeLabel(t.at)} selected={time === t.at} onPress={() => setTime(time === t.at ? null : t.at)} />
                    ))}
                    {time && !TIME_PRESETS.some((t) => t.at === time) ? <Choice label={timeLabel(time)} selected onPress={() => setTime(null)} /> : null}
                  </View>
                  <LinkButton.Root
                    variant="primary"
                    className="self-start"
                    onPress={() => {
                      if (!time) setTime("19:00");
                      setExact(true);
                    }}
                  >
                    Pick an exact time
                  </LinkButton.Root>
                </View>
              )}
            </>
          ) : null}

          {step === "where" ? (
            <View className="gap-3">
              <Option
                icon="map-pin-2-line"
                title={where === "place" && placeName.trim() ? placeName.trim() : "I've got a spot"}
                body={where === "place" && placeName.trim() ? "Tap to change it" : "Find it on the map"}
                selected={where === "place"}
                onPress={() => {
                  setWhere("place");
                  setError(null);
                  setPicking(true);
                }}
              />
              <Option icon="bar-chart-2-line" title="Let the crew vote" body="Everyone chucks in ideas. Most votes wins" selected={where === "vote"} onPress={() => (setWhere("vote"), setError(null))} />
              <Option dibby title="Ask Dibby" body="Three real spots for the crew to vote on" selected={where === "dibby"} onPress={() => withAiOk(() => (setWhere("dibby"), setError(null)))} />
              <PlacePicker
                open={picking}
                onOpenChange={setPicking}
                title="Where's it at?"
                onPick={(p) => {
                  if (p.kind === "map") {
                    setPlaceId(p.place.place_id);
                    setPlaceName(p.place.name);
                    setPlaceAddress(p.place.address ?? "");
                  } else {
                    setPlaceId(null);
                    setPlaceName(p.name);
                    setPlaceAddress(p.address);
                  }
                  setWhere("place");
                  setPicking(false);
                }}
              />
            </View>
          ) : null}

          {step === "dibby" ? (
            <>
              <BigInput value={ask} onChangeText={setAsk} placeholder="Dumplings in Chatswood" accessibilityLabel={QUESTION.dibby} maxLength={500} caret={caret} />
              <View className="flex-row flex-wrap gap-2">
                {SPENDS.map((x) => (
                  <Choice key={x.id} label={x.label} selected={spend === x.id} onPress={() => setSpend(spend === x.id ? null : x.id)} />
                ))}
              </View>
              <Text className="text-paragraph-xs text-text-soft-400">Dibby finds spots, not a day or time. What you type goes to Anthropic, the AI company behind Dibby.</Text>
            </>
          ) : null}

          {step === "who" ? (
            <>
              <BigField label="First name" value={first} onChangeText={setFirst} autoComplete="given-name" textContentType="givenName" caret={caret} autoFocus />
              <BigField label="Last name" value={last} onChangeText={setLast} autoComplete="family-name" textContentType="familyName" caret={caret} />
              <View className="flex-row flex-wrap items-center">
                <Text className="text-paragraph-sm text-text-sub-600">Got an account? </Text>
                <LinkButton.Root variant="primary" onPress={() => router.push({ pathname: "/sign-in", params: { next: "/new" } })}>
                  Sign in
                </LinkButton.Root>
              </View>
              <AgreeLine />
            </>
          ) : null}

          <Problem msg={err} />
        </Animated.View>
      </ScrollView>

      <AiConsent
        open={askingAi !== null}
        onOpenChange={(o) => !o && setAskingAi(null)}
        onAllow={() => {
          setAiOk(true);
          askingAi?.();
          setAskingAi(null);
        }}
      />
      <View className="px-4 pt-3" style={{ paddingBottom: bottom }}>
        <Button.Root variant={isLast ? "dibs" : "primary"} size="large" block disabled={!ready} onPress={next}>
          {label}
        </Button.Root>
      </View>
      <KeyboardSpacer less={bottom - 12} />
    </View>
  );
}


/** The web's `.pf-big` name field: big Bricolage on a violet underline, its label muted above. */
function BigField({ label, caret, ...rest }: { label: string; caret: string } & ComponentProps<typeof TextInput>) {
  return (
    <View className="gap-1">
      <Text className="text-label-sm text-text-sub-600">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        maxLength={40}
        selectionColor={caret}
        className="border-b-2 border-primary-base py-2 font-title text-[30px] leading-[36px] text-text-strong-950"
        {...rest}
      />
    </View>
  );
}

/** A big answer on a violet underline, for the screens you type on. Placeholder drawn by us (components/ui/placeholder.tsx). */
function BigInput({ caret, placeholder, value, ...rest }: { caret: string } & ComponentProps<typeof TextInput>) {
  return (
    <View className="relative">
      <Placeholder show={!value} ink="faint" className="inset-x-0 top-0 py-2 font-title text-[26px] leading-[32px]">
        {placeholder}
      </Placeholder>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="transparent"
        selectionColor={caret}
        className="border-b-2 border-primary-base py-2 font-title text-[26px] leading-[32px] text-text-strong-950"
        {...rest}
      />
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
      <Text accessibilityLiveRegion="polite" className="text-center text-title-h4 text-text-strong-950">
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
  const when = whenLong(plan?.starts_at ?? null) ?? plan?.when;
  if (when) facts.push({ icon: "calendar-line", text: when });
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
          <Animated.Text entering={pace.reduce ? undefined : FadeInDown.duration(380).delay(300)} accessibilityRole="header" className="text-title-h2 text-text-strong-950">
            It&rsquo;s on.
          </Animated.Text>
          <Animated.Text entering={pace.reduce ? undefined : FadeIn.duration(300).delay(500)} className="text-center text-paragraph-md text-text-sub-600">
            Drop the link in the group chat. Your crew taps it to vote and say if they&rsquo;re in, no app or account needed.
          </Animated.Text>
        </View>

        <Animated.View entering={pace.reduce ? undefined : FadeInDown.duration(380).delay(650)}>
          <PlanCard title={plan?.title ?? title} status={plan?.status ?? "voting"} category={plan?.category} facts={facts} />
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

