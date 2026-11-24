import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PlanDetail } from "@dibs/shared/api";
import { RSVP_LABEL, shareText } from "@dibs/shared/plans";
import * as Card from "@/components/dibby/card";
import { PlanCard, type PlanFact } from "@/components/dibby/plan-card";
import { VoteOption } from "@/components/dibby/vote-option";
import * as Avatar from "@/components/ui/avatar";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import { Icon, type IconName } from "@/components/ui/icon";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { addPlace, API_URL, castVote, joinPlan, setRsvp } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useColour } from "@/lib/theme";
import { whenLong } from "@/lib/dates";
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
  const { plan, me, going, chat } = detail;
  const off = plan.status === "cancelled";

  // The web's plan card facts: the day and time (or "to be decided"), then the place.
  const facts: PlanFact[] = [];
  const when = whenLong(plan.starts_at);
  facts.push(when ? { icon: "calendar-line", text: when } : { icon: "calendar-line", text: "Time to be decided", muted: true });
  if (plan.place) facts.push({ icon: "map-pin-line", text: plan.place });
  else if (plan.voting) facts.push({ icon: "map-pin-line", text: `Up for a vote${plan.area ? ` around ${plan.area}` : ""}`, muted: true });
  else facts.push(plan.area ? { icon: "map-pin-line", text: plan.area } : { icon: "map-pin-line", text: "Place to be decided", muted: true });

  const share = () => {
    const url = `${API_URL}/p/${slug}`;
    const message = shareText({ title: plan.title, when: plan.when, place: plan.place ?? plan.area, voting: plan.voting, url });
    Share.share({ message }).catch(() => {});
  };

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <Stack.Screen options={{ title: "" }} />
      <ScrollView contentContainerClassName="gap-5 p-4">
        <PlanCard
          size="page"
          title={plan.title}
          status={plan.status}
          category={plan.category}
          facts={facts}
          footer={
            plan.description || (!off && (me || chat)) ? (
              <View className="w-full gap-4">
                {plan.description ? <Text className="text-paragraph-sm text-text-sub-600">{plan.description}</Text> : null}
                {!off && me ? (
                  // The web's round actions under the plan (.plan-actions).
                  <View className="flex-row flex-wrap gap-2" accessibilityRole="toolbar" accessibilityLabel="Plan actions">
                    <CircleAction icon="share-forward-line" label="Share" onPress={share} />
                    {chat ? <CircleAction icon="chat-3-line" label="Chat" onPress={() => router.push(`/p/${slug}/chat`)} /> : null}
                  </View>
                ) : null}
              </View>
            ) : undefined
          }
        />

        {/* Your one job: strangers join, people in the plan answer, hosts are already going. */}
        {!off && !me ? <Join slug={slug} apply={apply} /> : null}
        {!off && me && !me.host ? <Answer slug={slug} detail={detail} apply={apply} /> : null}

        {going && going.length ? <WhoRow going={going} me={me?.name ?? null} going_count={plan.going} capacity={plan.capacity} /> : null}

        <Vote slug={slug} detail={detail} apply={apply} />
      </ScrollView>

      {/* Pinned, like the web's dock: share the plan once you're in it. */}
      {off || !me ? null : (
        <View className="border-t border-stroke-soft-200 bg-bg-white-0 p-4">
          <Button.Root variant={me.host ? "dibs" : "primary"} size="large" block onPress={share}>
            <Button.Icon name="share-forward-line" />
            {me.host ? "Share to the group chat" : "Share the plan"}
          </Button.Root>
        </View>
      )}
    </SafeAreaView>
  );
}

/** A round button with a label under it (the web's .circle-action): 48px, soft background. */
function CircleAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="min-w-16 items-center gap-1.5 active:opacity-70">
      <View className="size-12 items-center justify-center rounded-full bg-bg-soft-200">
        <Icon name={icon} className="text-[22px] leading-[22px] text-text-strong-950" />
      </View>
      <Text className="text-label-xs text-text-sub-600">{label}</Text>
    </Pressable>
  );
}

/** Five faces fit across a phone; past that, four and a "+N" tile. Tap for everyone, in a sheet. */
const FIT = 5;

function WhoRow({ going, me, going_count, capacity }: { going: NonNullable<PlanDetail["going"]>; me: string | null; going_count: number; capacity: number | null }) {
  const [open, setOpen] = useState(false);
  const waiting = going.filter((g) => g.waitlisted).length;
  const summary = [capacity ? `${going_count} of ${capacity} going` : `${going_count} going`, waiting ? `${waiting} waiting` : null].filter(Boolean).join(" · ");
  const shown = going.length <= FIT ? going : going.slice(0, FIT - 1);
  const more = going.length - shown.length;
  const first = (g: { name: string }) => (me && g.name === me ? "You" : g.name.split(" ")[0]);

  return (
    <View className="gap-3">
      <View className="flex-row items-end justify-between gap-3">
        <View className="shrink gap-0.5">
          <Text accessibilityRole="header" className="font-display text-title-h5 text-text-strong-950">
            Who&rsquo;s going
          </Text>
          <Text className="text-paragraph-sm text-text-sub-600">{summary}</Text>
        </View>
        <LinkButton.Root variant="primary" onPress={() => setOpen(true)}>
          See all
        </LinkButton.Root>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`See everyone: ${summary}`} onPress={() => setOpen(true)} className="flex-row gap-3">
        {shown.map((g, i) => (
          <View key={`${g.name}-${i}`} className={g.waitlisted ? "w-14 items-center gap-1 opacity-60" : "w-14 items-center gap-1"}>
            <View>
              <Avatar.Root size="48" color={g.colour} name={g.name} />
              {g.host || g.waitlisted ? (
                <View className={g.host ? "absolute -bottom-0.5 -right-0.5 size-5 items-center justify-center rounded-full border-2 border-bg-white-0 bg-accent-base" : "absolute -bottom-0.5 -right-0.5 size-5 items-center justify-center rounded-full border-2 border-bg-white-0 bg-bg-soft-200"}>
                  <Icon name={g.host ? "star-fill" : "time-line"} className="text-[11px] leading-[11px] text-static-black" />
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} className="text-label-sm text-text-strong-950">
              {first(g)}
            </Text>
          </View>
        ))}
        {more > 0 ? (
          <View className="w-14 items-center gap-1">
            <View className="size-12 items-center justify-center rounded-full bg-bg-soft-200">
              <Text className="font-display text-title-h6 text-text-strong-950">+{more}</Text>
            </View>
            <Text className="text-label-sm text-text-sub-600">more</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal.Root open={open} onOpenChange={setOpen}>
        <Modal.Content>
          <Modal.Header title="Who’s going" description={summary} />
          <Modal.Body>
            <View className="gap-3">
              {going.map((g, i) => (
                <View key={`${g.name}-${i}`} className="flex-row items-center gap-3">
                  <Avatar.Root size="40" color={g.colour} name={g.name} />
                  <Text className="flex-1 text-label-md text-text-strong-950">
                    {g.name}
                    {me && g.name === me ? " (you)" : ""}
                  </Text>
                  {g.host ? <Text className="text-paragraph-sm text-text-sub-600">Organiser</Text> : g.waitlisted ? <Text className="text-paragraph-sm text-text-sub-600">Waitlist</Text> : null}
                </View>
              ))}
            </View>
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </View>
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
          Where to?
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

/** Not in yet: the web's "You coming?" card. A first name (if we don't know you), then I'm in or Maybe. */
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
    <Card.Root>
      <View className="gap-4">
        <Text accessibilityRole="header" className="font-display text-title-h4 text-text-strong-950">
          You coming?
        </Text>
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
              <Label.Root>
                Last name <Text className="text-text-sub-600">(optional)</Text>
              </Label.Root>
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
        {/* Going is what lets you vote, so the main button says you're in as you join. */}
        <View className="gap-2">
          <Button.Root variant="dibs" size="large" block disabled={Boolean(busy)} onPress={() => join("in")}>
            {busy === "in" ? "Joining…" : "I'm in"}
          </Button.Root>
          <Button.Root variant="neutral" mode="lighter" size="large" block disabled={Boolean(busy)} onPress={() => join("maybe")}>
            Maybe
          </Button.Root>
        </View>
        {needName ? <Text className="text-paragraph-sm text-text-sub-600">No account needed. We just remember you on this phone.</Text> : null}
      </View>
    </Card.Root>
  );
}

const RSVPS = (["in", "maybe", "out"] as const).map((value) => ({ value, label: RSVP_LABEL[value] }));

/** The web's chill headings for your answer (apps/web/lib/copy.ts rsvpHeading). */
const HEADING = { in: "You're in. Nice.", maybe: "You're a maybe", out: "You can't make it", waitlist: "You're on the waitlist", none: "Are you in?" } as const;

/** In the plan: the web's RSVP card. Three buttons, the one you picked filled, the rest lighter. */
function Answer({ slug, detail, apply }: { slug: string; detail: PlanDetail; apply: (d: PlanDetail) => void }) {
  const { me } = detail;
  const [busy, setBusy] = useState<string | null>(null);
  if (!me) return null;

  async function answer(rsvp: "in" | "maybe" | "out") {
    if (rsvp === me!.rsvp) return;
    setBusy(rsvp);
    try {
      const d = await setRsvp(slug, rsvp);
      apply(d);
      Haptics.notificationAsync(rsvp === "in" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const state = me.waitlisted ? "waitlist" : (me.rsvp ?? "none");
  return (
    <Card.Root>
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-label-md text-text-strong-950">
          {HEADING[state]}
        </Text>
        <View className="flex-row gap-2" accessibilityRole="radiogroup" accessibilityLabel="Are you in?">
          {RSVPS.map((r) => {
            const on = me.rsvp === r.value;
            return (
              <Button.Root
                key={r.value}
                className="flex-1 px-2"
                size="medium"
                variant={!on ? "neutral" : r.value === "in" ? "dibs" : "primary"}
                mode={on ? "filled" : "lighter"}
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
        {me.waitlisted ? (
          <Text className="text-paragraph-sm text-text-sub-600">It&rsquo;s full, so you&rsquo;re in line. If someone drops out, you&rsquo;re in straight away and the chat hears about it.</Text>
        ) : null}
        {me.note ? (
          <View className="flex-row gap-2">
            <Icon name={me.access === "hidden" ? "eye-off-line" : "eye-line"} className="text-[18px] leading-[20px] text-text-sub-600" />
            <Text className="flex-1 text-paragraph-sm text-text-sub-600">{me.note}</Text>
          </View>
        ) : null}
      </View>
    </Card.Root>
  );
}
