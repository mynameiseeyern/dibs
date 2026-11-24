import { useMemo, useState, type ComponentProps } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import type { NewPlanRequest, PlanSummary } from "@dibs/shared/api";
import { TIME_PRESETS } from "@dibs/shared/daypart";
import { readPlanText, saysLater } from "@dibs/shared/plan-text";
import { shareText } from "@dibs/shared/plans";
import { PlanCard, type PlanFact } from "@/components/dibby/plan-card";
import { Answers, Choice, DIBBY, DibbyAsks, Option, Stagger, talkMs, usePace, type Pose } from "@/components/dibby/flow";
import { DayStrip } from "@/components/dibby/day-strip";
import * as Datepicker from "@/components/ui/datepicker";
import { PushAsk } from "@/components/dibby/push-ask";
import { Hopscotch, type Rest, type Square } from "@/components/dibby/hopscotch";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import { Icon } from "@/components/ui/icon";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as LinkButton from "@/components/ui/link-button";
import { PlacePicker } from "@/components/dibby/place";
import { API_URL, ApiError, createPlan, getPlan } from "@/lib/api";
import { sydneyToday, whenLong } from "@/lib/dates";
import { lc, pick, sydneyHhmm, sydneyInstant, timeLabel, whenLine } from "@/lib/when-words";
import { useSession } from "@/lib/session";
import { useColour } from "@/lib/theme";

/**
 * Making a plan, as hopscotch: one question a square, Dibby hopping forward a square per answer.
 * What's in each square is the web's chat (app/new/PlanChat.tsx): the same questions, replies,
 * chips, day strip and choices, and the same box at the bottom to type the answer instead
 * ("dumplings fri arvo near Newtown" fills in the name, day and time with readPlanText, no AI).
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

const PLACEHOLDER = {
  what: "Dumplings fri arvo near Newtown",
  when: "Sat 7pm, or tap below",
  where: "Type what you’re after, or tap one",
  dibby: "Dumplings in Chatswood",
} as const;

const FIELD_STEP: Record<string, Step> = { title: "what", place: "where", where: "where", area: "where", ask: "dibby", first: "who", last: "who", first_name: "who", last_name: "who" };

export default function NewPlan() {
  const insets = useSafeAreaInsets();
  const pace = usePace();
  const caret = useColour("primary-base");
  const { state, hasGuestPass, setGuestPass } = useSession();
  const signedIn = state.status === "signedIn";
  const needName = !signedIn && !hasGuestPass;

  const [step, setStep] = useState<Step>("what");
  const [acks, setAcks] = useState<Partial<Record<Step, string>>>({});
  /** Dibby's aside on this turn: "Didn't catch a day there…", "Hey Sam! And your last name?". */
  const [aside, setAside] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [exact, setExact] = useState(false);
  const [where, setWhere] = useState<Where | null>(null);
  /** Dibby was picked on the first question ("Not sure? Let Dibby plan it"), not on "where". */
  const [viaDibby, setViaDibby] = useState(false);
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

  const go = (s: Step, ack?: string) => {
    setError(null);
    setAside(null);
    setDraft("");
    if (ack !== undefined) setAcks((a) => ({ ...a, [s]: ack }));
    setStep(s);
  };
  /** On to the next turn on the path, with Dibby's reply to this one. */
  const forward = (from: Step, ack?: string) => {
    const next = path[path.indexOf(from) + 1];
    if (next) go(next, ack);
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
      setDraft("");
      setAside(r.date || r.time ? `Got it, ${lc(whenLine(r.date, r.time, today) ?? "")}. And what are we doing?` : "Give it a name, like “Friday dinner”.");
      return;
    }
    setTitle(name);
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
    const love = pick(["love it", "keen", "yes", "big fan"], name);
    // Day and time both said: skip "when".
    if (r.date && r.time) return go("where", `${name}, ${whenLine(r.date, r.time, today)}. ${love[0].toUpperCase()}${love.slice(1)}.`);
    go("when", `${name}, ${love}.`);
  }

  function leaveWhen(d: string | null, t: string | null) {
    const said = whenLine(d, t, today);
    forward("when", said ? `${said}, locked in.` : "No stress, sort the day out later.");
  }

  function decideLater() {
    setDate(null);
    setTime(null);
    setExact(false);
    forward("when", "No stress, sort the day out later.");
  }

  function answerWhen(text: string) {
    if (saysLater(text)) return decideLater();
    const r = readPlanText(text);
    if (!r.date && !r.time) {
      setAside("Didn’t catch a day there. Try “Sat 7pm”, or tap one.");
      return;
    }
    const d = r.date ?? date;
    const t = r.time ?? time;
    setDate(d);
    setTime(t);
    leaveWhen(d, t);
  }

  /** Typed on "where": "vote", "you pick", or what you're after (Dibby finds spots for it). */
  function answerWhere(text: string) {
    const lower = text.toLowerCase();
    if (/\b(vote|poll|crew|everyone)\b/.test(lower)) {
      setWhere("vote");
      return needName ? go("who", "The crew can vote then.") : submit("vote");
    }
    setWhere("dibby");
    if (!/^(you pick|dibby|idk|not sure|dunno|anywhere|ask dibby)\b/.test(lower)) setAsk(text);
    go("dibby", "On it.");
  }

  /** "Actually, make it Saturday": a day or time typed on a later turn moves it. */
  function correction(text: string): boolean {
    if (step === "what" || step === "when") return false;
    const r = readPlanText(text);
    if (!r.date && !r.time) return false;
    if (r.title && !/^(actually|make it|change|move)/i.test(text)) return false;
    const d = r.date ?? date;
    const t = r.time ?? time;
    setDate(d);
    setTime(t);
    setDraft("");
    setAside(`Done, moved it to ${lc(whenLine(d, t, today) ?? "")}.`);
    return true;
  }

  /** The send arrow on the box at the bottom. */
  function send() {
    const text = step === "dibby" ? ask : draft;
    if (step !== "dibby" && !text.trim()) return;
    if (step !== "dibby" && correction(text)) return;
    if (step === "what") answerWhat(text);
    else if (step === "when") answerWhen(text);
    else if (step === "where") answerWhere(text);
    else if (step === "dibby") next();
  }

  /** The big button: the same checks as the web's. */
  function next() {
    setError(null);
    if (step === "when") return leaveWhen(date, time);
    if (step === "where") {
      if (!where) return setError({ step, msg: "Pick one to keep going." });
      if (where === "dibby") return go("dibby", "On it.");
      if (where === "place" && !placeName.trim()) return setError({ step, msg: "Pick the place, or let the crew vote." });
      const ack = where === "place" ? `${placeName.trim()}, nice.` : "The crew can vote then.";
      return needName ? go("who", ack) : submit();
    }
    if (step === "dibby") {
      if (!ask.trim() && !spend) return setError({ step, msg: "Tell Dibby what you're after, like “dumplings” or “bowling”." });
      return needName ? go("who", "Sweet, I’ll find three spots.") : submit();
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
      area: w !== "place" ? area.trim() || null : null,
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

  // The squares: what, when, where (Dibby's brief shares it), you.
  const square = (s: Step): Step => (s === "dibby" ? "where" : s);
  const order: Step[] = needName ? ["what", "when", "where", "who"] : ["what", "when", "where"];
  const at = Math.max(0, order.indexOf(square(step)));
  const whereLabel = where === "place" ? placeName.trim() || "Got a spot" : where === "vote" ? "Crew votes" : where === "dibby" ? "Dibby's on it" : "Where";
  const squares: Square[] = order.map((s, i) => {
    const answered = i < at;
    const label = !answered
      ? { what: "What", when: "When", where: "Where", who: "You" }[s as "what"]
      : { what: title.trim() || (viaDibby ? "Dibby plans it" : "What"), when: line ?? "Decide later", where: whereLabel, who: first.trim() }[s as "what"];
    return { key: s, label, onPress: answered ? () => go(s) : undefined };
  });

  const err = error && error.step === step ? error.msg : null;

  if (step === "making") return <Making dibby={where === "dibby"} />;
  if (step === "done" && made) return <Done slug={made.slug} plan={made.plan} title={title} />;

  // Each square: its own pose, and how he rests there (hopscotch.tsx has the Runway clip slots).
  const pose: Pose = step === "what" ? "think" : step === "when" ? "phone" : step === "where" ? "point" : step === "dibby" ? "look" : "hi";
  const rest: Rest = step === "when" || step === "who" ? "breathe" : "sway";
  const back = () => {
    if (step === "what") return router.back();
    const i = path.indexOf(step);
    go(i > 0 ? path[i - 1] : "what");
  };

  const placeReady = where && where !== "dibby" && (where !== "place" || placeName.trim());
  const make = (
    <Button.Root variant="dibs" size="large" block onPress={next}>
      Make the plan
    </Button.Root>
  );
  const nextButton = (
    <Button.Root size="large" block onPress={next}>
      Next
    </Button.Root>
  );
  const bigButton =
    step === "when" ? nextButton : step === "where" && placeReady ? (needName ? nextButton : make) : step === "where" && where === "dibby" ? nextButton : step === lastStep && (step === "dibby" || step === "who") ? make : step === "dibby" ? nextButton : null;

  return (
    <View className="flex-1 bg-bg-white-0" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="mt-2 h-12 flex-row items-center px-2">
        <Button.Root variant="neutral" mode="ghost" iconOnly accessibilityLabel="Back" onPress={back}>
          <Button.Icon name={step === "what" ? "close-line" : "arrow-left-line"} />
        </Button.Root>
      </View>
      <Hopscotch squares={squares} at={at} pose={pose} rest={rest} talk={talkMs(QUESTION[step as keyof typeof QUESTION] ?? "")} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="gap-5 px-4 pb-6 pt-1" keyboardShouldPersistTaps="handled">
          <DibbyAsks
            stepKey={step}
            ack={acks[step] ?? null}
            question={QUESTION[step as keyof typeof QUESTION]}
            hint={step === "who" ? "So the crew knows who’s organising. No account needed." : undefined}
            extra={
              step === "when" ? (
                <Text accessibilityLiveRegion="polite" className={line ? "font-title text-[24px] leading-[30px] text-primary-dark" : "font-title text-[24px] leading-[30px] text-text-sub-600"}>
                  {line ?? "Pick a day and a time"}
                </Text>
              ) : undefined
            }
          />

          {step === "what" ? (
            <Answers stepKey="what" after={talkMs(QUESTION.what)} className="gap-5">
              <View className="gap-2">
                <Text className="text-label-sm text-text-sub-600">Or tap one</Text>
                <View className="flex-row flex-wrap gap-2">
                  {IDEAS.map((i, n) => (
                    <Stagger key={i.label} index={n}>
                      <Choice label={i.label} selected={title === i.label} onPress={() => answerWhat(i.label)} />
                    </Stagger>
                  ))}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setWhere("dibby");
                  setViaDibby(true);
                  go("when", "No worries, I’ll find spots once we’ve got a day.");
                }}
                className="min-h-11 flex-row items-center gap-3 self-start active:opacity-70"
              >
                <Image source={DIBBY.face} style={{ width: 32, height: 32, borderRadius: 16 }} contentFit="cover" accessible={false} />
                <Text className="text-label-md text-primary-dark">Not sure? Let Dibby plan it</Text>
              </Pressable>
              <Problem msg={err} />
            </Answers>
          ) : null}

          {step === "when" ? (
            <Answers stepKey="when" after={talkMs(QUESTION.when)} className="gap-5">
              <DayStrip value={date} onChange={setDate} />
              {exact ? (
                <View className="gap-3">
                  <Text className="text-label-sm text-text-sub-600">Pick a time</Text>
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
                  <Text className="text-label-sm text-text-sub-600">What time?</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {TIME_PRESETS.map((t, n) => (
                      <Stagger key={t.at} index={n}>
                        <Choice label={t.label} sub={timeLabel(t.at)} selected={time === t.at} onPress={() => setTime(time === t.at ? null : t.at)} />
                      </Stagger>
                    ))}
                    {time && !TIME_PRESETS.some((t) => t.at === time) ? (
                      // A time typed or picked exactly ("7:30pm"), shown so it can be kept or tapped off.
                      <Choice label={timeLabel(time)} selected onPress={() => setTime(null)} />
                    ) : null}
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
              <Button.Root variant="neutral" mode="stroke" onPress={decideLater}>
                Decide later
              </Button.Root>
            </Answers>
          ) : null}

          {step === "where" ? (
            <Answers stepKey="where" after={talkMs(QUESTION.where)}>
              <Stagger index={0}>
                <Option
                  icon="map-pin-2-line"
                  title="I've got a spot"
                  body="Already know where? Find it on the map"
                  selected={where === "place"}
                  onPress={() => {
                    setWhere("place");
                    setError(null);
                    if (!placeName.trim()) setPicking(true);
                  }}
                />
              </Stagger>
              <Stagger index={1}>
                <Option icon="bar-chart-2-line" title="Let the crew vote" body="Everyone chucks in ideas. Most votes wins" selected={where === "vote"} onPress={() => (setWhere("vote"), setError(null))} />
              </Stagger>
              <Stagger index={2}>
                <Option dibby title="Ask Dibby" body="Dibby digs up three real spots for the crew to vote on" selected={where === "dibby"} onPress={() => (setWhere("dibby"), setError(null))} />
              </Stagger>
              <Problem msg={err} />
              {where === "place" && placeName.trim() ? (
                // The spot they picked (from the map, or typed in), with a way to change it.
                <Animated.View entering={pace.reduce ? undefined : FadeInDown.duration(240)} className="flex-row items-center gap-3 rounded-lg border border-stroke-soft-200 p-3">
                  <Icon name="map-pin-2-fill" className="text-[20px] leading-[20px] text-primary-base" />
                  <View className="flex-1 gap-0.5">
                    <Text numberOfLines={1} className="text-label-md text-text-strong-950">
                      {placeName.trim()}
                    </Text>
                    {placeAddress.trim() ? (
                      <Text numberOfLines={2} className="text-paragraph-xs text-text-sub-600">
                        {placeId ? placeAddress.trim() : `${placeAddress.trim()} · only people in the plan see this`}
                      </Text>
                    ) : null}
                  </View>
                  <LinkButton.Root variant="primary" onPress={() => setPicking(true)}>
                    Change
                  </LinkButton.Root>
                </Animated.View>
              ) : null}
              {where === "vote" ? (
                <Animated.View entering={pace.reduce ? undefined : FadeInDown.duration(240)} className="gap-2">
                  <Label.Root>Roughly where? (optional)</Label.Root>
                  <Input.Root>
                    <Input.Wrapper>
                      <Input.Icon name="map-pin-line" />
                      <Input.Input value={area} onChangeText={setArea} placeholder="Surry Hills" maxLength={80} autoCorrect={false} />
                    </Input.Wrapper>
                  </Input.Root>
                </Animated.View>
              ) : null}
              <PlacePicker
                open={picking}
                onOpenChange={setPicking}
                title="Where's it at?"
                onPick={(pick) => {
                  if (pick.kind === "map") {
                    setPlaceId(pick.place.place_id);
                    setPlaceName(pick.place.name);
                    setPlaceAddress(pick.place.address ?? "");
                  } else {
                    setPlaceId(null);
                    setPlaceName(pick.name);
                    setPlaceAddress(pick.address);
                  }
                  setWhere("place");
                  setPicking(false);
                }}
              />
            </Answers>
          ) : null}

          {step === "dibby" ? (
            <Answers stepKey="dibby" after={talkMs(QUESTION.dibby)}>
              <Problem msg={err} />
              <View className="gap-2">
                <Text className="text-label-sm text-text-strong-950">The damage</Text>
                <View className="flex-row flex-wrap gap-2">
                  {SPENDS.map((x) => (
                    <Choice key={x.id} label={x.label} selected={spend === x.id} onPress={() => setSpend(spend === x.id ? null : x.id)} />
                  ))}
                </View>
              </View>
              <Text className="text-paragraph-sm text-text-sub-600">
                Dibby picks three real spots to vote on, and the crew can add more. It won&rsquo;t pick a day or time for you. What you type goes to an AI provider.
              </Text>
            </Answers>
          ) : null}

          {step === "who" ? (
            <Answers stepKey="who" after={talkMs(QUESTION.who)} className="gap-5">
              <BigField label="First name" value={first} onChangeText={setFirst} autoComplete="given-name" textContentType="givenName" caret={caret} autoFocus />
              <BigField label="Last name" value={last} onChangeText={setLast} autoComplete="family-name" textContentType="familyName" caret={caret} />
              <Problem msg={err} />
              <View className="flex-row flex-wrap items-center">
                <Text className="text-paragraph-sm text-text-sub-600">Got an account? </Text>
                <LinkButton.Root variant="primary" onPress={() => router.push({ pathname: "/sign-in", params: { next: "/new" } })}>
                  Sign in
                </LinkButton.Root>
              </View>
            </Answers>
          ) : null}

          {aside ? (
            // Dibby's aside, in its lime bubble (the web's pc-dibby--aside).
            <Animated.View entering={pace.reduce ? undefined : FadeIn.duration(240)} className="flex-row items-start gap-2">
              <Image source={DIBBY.face} style={{ width: 32, height: 32, borderRadius: 16 }} contentFit="cover" accessible={false} />
              <View className="shrink rounded-lg rounded-bl-[6px] border-[1.5px] border-accent-light bg-accent-lighter px-3.5 py-2.5">
                <Text className="font-sans text-[16px] leading-[22px] text-text-strong-950">{aside}</Text>
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        <View className="gap-3 border-t border-stroke-soft-200 px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          {bigButton}
          {step !== "who" ? (
            <View className="flex-row gap-2">
              <Input.Root hasError={Boolean(err) && (step === "what" || step === "dibby")} className="min-w-0 flex-1">
                <Input.Wrapper>
                  <Input.Input
                    value={step === "dibby" ? ask : draft}
                    onChangeText={step === "dibby" ? setAsk : setDraft}
                    placeholder={PLACEHOLDER[step as keyof typeof PLACEHOLDER]}
                    accessibilityLabel={step === "dibby" ? QUESTION.dibby : "Message Dibby"}
                    maxLength={step === "dibby" ? 500 : 120}
                    returnKeyType="send"
                    submitBehavior="submit"
                    onSubmitEditing={send}
                  />
                </Input.Wrapper>
              </Input.Root>
              <Button.Root iconOnly accessibilityLabel="Send" disabled={step !== "dibby" && !draft.trim()} onPress={send}>
                <Button.Icon name="arrow-up-line" />
              </Button.Root>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
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

