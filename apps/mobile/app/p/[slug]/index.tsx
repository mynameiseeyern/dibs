import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PlanDetail } from "@dibs/shared/api";
import { shareText } from "@dibs/shared/plans";
import * as Card from "@/components/dibby/card";
import { ChatMessage, ChatSystem } from "@/components/dibby/chat";
import { Monogram } from "@/components/dibby/monogram";
import { PlanCard, type PlanFact } from "@/components/dibby/plan-card";
import { VoteOption } from "@/components/dibby/vote-option";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import { Icon } from "@/components/ui/icon";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as LinkButton from "@/components/ui/link-button";
import { toast } from "@/components/ui/toast";
import { addPlace, API_URL, castVote, joinPlan, setRsvp } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useColour } from "@/lib/theme";
import { usePlan } from "@/lib/use-plan";

/**
 * A plan, opened from its link (same path as the web, /p/:slug, so dibby.social links open here).
 * Join with just a first name, say if you're in, vote on the place, see who's going and the chat.
 * Every rule (capacity, the waitlist, who can vote) is the web's: the API runs the same actions.
 */
export default function PlanScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const spinner = useColour("primary-base");
  const { state, apply } = usePlan(slug);

  if (state.kind === "loading") return <ActivityIndicator className="flex-1" color={spinner} />;
  if (state.kind !== "ok")
    return (
      <View className="gap-2 p-4">
        <Text className="text-title-h4 text-text-strong-950">{state.kind === "missing" ? "Can't find that plan" : "Couldn't load it"}</Text>
        <Text className="text-paragraph-md text-text-sub-600">{state.kind === "missing" ? "It might have been called off, or the link's run out." : state.message}</Text>
      </View>
    );

  return <Plan slug={slug} detail={state.detail} apply={apply} />;
}

function Plan({ slug, detail, apply }: { slug: string; detail: PlanDetail; apply: (d: PlanDetail) => void }) {
  const { plan, me, vote, going, chat } = detail;
  const off = plan.status === "cancelled";

  const facts: PlanFact[] = [];
  const where = plan.voting ? `Up for a vote${plan.area ? ` around ${plan.area}` : ""}` : (plan.place ?? plan.area);
  if (where) facts.push({ icon: "map-pin-line", text: where });
  facts.push({ icon: "group-line", text: plan.capacity ? `${plan.going} of ${plan.capacity} going` : `${plan.going} going` });

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <Stack.Screen options={{ title: "" }} />
      <ScrollView contentContainerClassName="gap-5 p-4">
        <PlanCard eyebrow={plan.when} title={plan.title} status={plan.status} facts={facts} />
        {plan.description ? <Text className="text-paragraph-md text-text-sub-600">{plan.description}</Text> : null}

        {me?.note ? (
          <View className="flex-row gap-2 rounded-lg bg-bg-weak-50 p-3">
            <Icon name="information-line" className="text-[18px] leading-[20px] text-text-sub-600" />
            <Text className="flex-1 text-paragraph-sm text-text-sub-600">{me.note}</Text>
          </View>
        ) : null}

        {!me && !off ? (
          <Text className="text-paragraph-md text-text-sub-600">Say you&rsquo;re in to vote on the place, see who&rsquo;s going and read the chat.</Text>
        ) : null}

        <Vote slug={slug} detail={detail} apply={apply} />

        {going && going.length ? (
          <View className="gap-3">
            <Text accessibilityRole="header" className="text-label-md text-text-sub-600">
              Who&rsquo;s going
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {going.map((g, i) => (
                <View key={`${g.name}-${i}`} className="flex-row items-center gap-1.5 rounded-full bg-bg-weak-50 py-1 pl-1 pr-3">
                  <Monogram name={g.name} colour={g.colour} />
                  <Text className="text-label-sm text-text-strong-950">
                    {g.name.split(" ")[0]}
                    {g.host ? " · host" : g.waitlisted ? " · waitlist" : ""}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {chat ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open the chat" onPress={() => router.push(`/p/${slug}/chat`)}>
            <Card.Root>
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-label-md text-text-strong-950">Chat</Text>
                  <Icon name="arrow-right-s-line" className="text-[20px] leading-[20px] text-text-soft-400" />
                </View>
                {chat.messages.length === 0 ? (
                  <Text className="text-paragraph-sm text-text-sub-600">Nothing yet. Tag @dibby for ideas.</Text>
                ) : (
                  chat.messages.slice(-2).map((m, i, last) =>
                    m.kind === "system" ? (
                      <ChatSystem key={m.id}>{m.body}</ChatSystem>
                    ) : (
                      <ChatMessage
                        key={m.id}
                        from={m.kind === "dibby" ? "dibby" : m.mine ? "me" : "them"}
                        name={m.author?.split(" ")[0]}
                        colour={m.colour ?? undefined}
                        first={i === 0 || last[i - 1].author !== m.author}
                      >
                        {m.body.length > 140 ? `${m.body.slice(0, 140)}…` : m.body}
                      </ChatMessage>
                    )
                  )
                )}
              </View>
            </Card.Root>
          </Pressable>
        ) : null}
      </ScrollView>

      {off ? null : me ? <Answer slug={slug} detail={detail} apply={apply} /> : <Join slug={slug} apply={apply} />}
    </SafeAreaView>
  );
}

/** Where are we going: tap to vote (picks, swaps and the limit are the web's), and add a place. */
function Vote({ slug, detail, apply }: { slug: string; detail: PlanDetail; apply: (d: PlanDetail) => void }) {
  const { me, vote, plan } = detail;
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canAdd = Boolean(me && me.access === "full" && plan.status === "voting" && (vote?.options.length ?? 0) < 8);

  if (!me || me.access === "hidden") return null;
  if (!vote && !(plan.voting && canAdd)) return null;

  const total = vote ? vote.options.reduce((n, o) => n + o.votes, 0) : 0;
  const top = vote ? Math.max(0, ...vote.options.map((o) => o.votes)) : 0;

  async function tap(id: string) {
    try {
      apply(await castVote(slug, id));
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error((e as Error).message);
    }
  }

  async function add() {
    if (!name.trim()) return setError("Give the place a name.");
    setBusy(true);
    setError(null);
    try {
      apply(await addPlace(slug, name.trim(), address.trim()));
      setName("");
      setAddress("");
      setAdding(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-3">
      <View className="gap-0.5">
        <Text accessibilityRole="header" className="font-display text-title-h5 text-text-strong-950">
          Where are we going?
        </Text>
        {vote?.open && vote.options.length > 1 ? (
          <Text className="text-paragraph-sm text-text-sub-600">{vote.maxPicks > 1 ? `Pick up to ${vote.maxPicks}.` : "Pick one."} Tap again to untick.</Text>
        ) : null}
      </View>
      {vote?.options.length ? (
        vote.options.map((o) => (
          <VoteOption
            key={o.id}
            title={o.label}
            meta={o.note ?? undefined}
            votes={o.votes}
            share={total ? o.votes / total : 0}
            mine={o.mine}
            winning={o.votes > 0 && o.votes === top}
            disabled={!vote.open}
            readOnlyReason={me.access === "full" ? undefined : (me.note ?? undefined)}
            onPress={() => tap(o.id)}
          />
        ))
      ) : (
        <Text className="text-paragraph-sm text-text-sub-600">No places yet. Add one and the vote gets going.</Text>
      )}

      {canAdd && !adding ? (
        <LinkButton.Root variant="primary" className="self-start" onPress={() => setAdding(true)}>
          + Add a place
        </LinkButton.Root>
      ) : null}
      {adding ? (
        <View className="gap-3 rounded-lg border border-stroke-soft-200 p-3">
          <View className="gap-1">
            <Label.Root>Place</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Icon name="map-pin-line" />
                <Input.Input value={name} onChangeText={setName} placeholder="Mr Wong, or Jess's place" maxLength={60} autoFocus />
              </Input.Wrapper>
            </Input.Root>
          </View>
          <View className="gap-1">
            <Label.Root>Address (optional)</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input value={address} onChangeText={setAddress} placeholder="3 Bridge Lane, Sydney" maxLength={160} />
              </Input.Wrapper>
            </Input.Root>
            <Text className="text-paragraph-xs text-text-soft-400">Only people in the plan see the address.</Text>
          </View>
          {error ? (
            <Hint.Root hasError>
              <Hint.Icon name="error-warning-fill" />
              {error}
            </Hint.Root>
          ) : null}
          <View className="flex-row gap-2">
            <Button.Root className="flex-1" disabled={busy} onPress={add}>
              {busy ? "Adding…" : "Add it"}
            </Button.Root>
            <Button.Root className="flex-1" variant="neutral" mode="stroke" onPress={() => (setAdding(false), setError(null))}>
              Cancel
            </Button.Root>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Not in yet: just a first name (if we don't know you) and I'm in or Maybe, like the web. */
function Join({ slug, apply }: { slug: string; apply: (d: PlanDetail) => void }) {
  const { state, hasGuestPass, setGuestPass } = useSession();
  const needName = state.status !== "signedIn" && !hasGuestPass;
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [busy, setBusy] = useState<"in" | "maybe" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function join(rsvp: "in" | "maybe") {
    if (needName && !first.trim()) return setError("Pop in your name so the crew knows who you are.");
    setBusy(rsvp);
    setError(null);
    try {
      const res = await joinPlan(slug, rsvp, needName ? { first: first.trim(), last: last.trim() } : undefined);
      if (res.guest_token) await setGuestPass(res.guest_token);
      apply(res.detail);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View className="gap-3 border-t border-stroke-soft-200 bg-bg-white-0 p-4">
      {needName ? (
        <View className="flex-row gap-2">
          <View className="flex-1 gap-1">
            <Label.Root>Your name</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input value={first} onChangeText={setFirst} autoComplete="given-name" textContentType="givenName" maxLength={40} />
              </Input.Wrapper>
            </Input.Root>
          </View>
          <View className="flex-1 gap-1">
            <Label.Root>Last name (optional)</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input value={last} onChangeText={setLast} autoComplete="family-name" textContentType="familyName" maxLength={40} />
              </Input.Wrapper>
            </Input.Root>
          </View>
        </View>
      ) : null}
      {error ? (
        <Hint.Root hasError>
          <Hint.Icon name="error-warning-fill" />
          {error}
        </Hint.Root>
      ) : null}
      <View className="flex-row gap-2">
        <Button.Root className="flex-1" variant="dibs" size="large" disabled={Boolean(busy)} onPress={() => join("in")}>
          {busy === "in" ? "Joining…" : "I'm in"}
        </Button.Root>
        <Button.Root className="flex-1" variant="neutral" mode="lighter" size="large" disabled={Boolean(busy)} onPress={() => join("maybe")}>
          Maybe
        </Button.Root>
      </View>
      {needName ? <Text className="text-center text-paragraph-xs text-text-soft-400">No account needed.</Text> : null}
    </View>
  );
}

const RSVPS = [
  { value: "in", label: "I'm in" },
  { value: "maybe", label: "Maybe" },
  { value: "out", label: "Can't go" },
] as const;

/** In the plan: change your answer (hosts are always going, so they share it instead). */
function Answer({ slug, detail, apply }: { slug: string; detail: PlanDetail; apply: (d: PlanDetail) => void }) {
  const { me, plan } = detail;
  const [busy, setBusy] = useState<string | null>(null);
  if (!me) return null;

  const share = () => {
    const url = `${API_URL}/p/${slug}`;
    const message = shareText({ title: plan.title, when: plan.when, place: plan.place ?? plan.area, voting: plan.voting, url });
    Share.share({ message }).catch(() => {});
  };

  if (me.host)
    return (
      <View className="border-t border-stroke-soft-200 bg-bg-white-0 p-4">
        <Button.Root variant="dibs" size="large" block onPress={share}>
          <Button.Icon name="share-forward-line" />
          Share to the group chat
        </Button.Root>
      </View>
    );

  async function answer(rsvp: "in" | "maybe" | "out") {
    if (rsvp === me!.rsvp) return;
    setBusy(rsvp);
    try {
      const d = await setRsvp(slug, rsvp);
      apply(d);
      Haptics.notificationAsync(rsvp === "in" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      if (rsvp === "in" && d.me?.waitlisted) toast.info("It's full, so you're on the waitlist. You'll get the next spot.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View className="gap-2 border-t border-stroke-soft-200 bg-bg-white-0 p-4">
      <Text className="text-label-sm text-text-sub-600">{me.rsvp === "in" ? (me.waitlisted ? "You're on the waitlist" : "You're in") : "Are you in?"}</Text>
      <View className="flex-row gap-2" accessibilityRole="radiogroup" accessibilityLabel="Are you in?">
        {RSVPS.map((r) => {
          const on = me.rsvp === r.value;
          return (
            <Button.Root
              key={r.value}
              className="flex-1 px-2"
              size="medium"
              variant={!on ? "neutral" : r.value === "in" ? "dibs" : "primary"}
              mode={on ? "filled" : "stroke"}
              disabled={Boolean(busy)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => answer(r.value)}
            >
              {busy === r.value ? "…" : r.label}
            </Button.Root>
          );
        })}
      </View>
      <LinkButton.Root variant="gray" className="self-center" onPress={share}>
        Share the plan
      </LinkButton.Root>
    </View>
  );
}
