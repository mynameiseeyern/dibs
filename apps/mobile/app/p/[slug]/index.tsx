import { useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PlanDetail } from "@dibs/shared/api";
import { RSVP_LABEL, shareText } from "@dibs/shared/plans";
import { splitLeaders, voteStep } from "@dibs/shared/votes";
import * as Card from "@/components/dibby/card";
import { CircleAction, PlanFacts, PlanHero, type HeroFact } from "@/components/dibby/plan-hero";
import { PlacePhoto, PlacePicker, PlaceSheet, placeLine, type PlacePick } from "@/components/dibby/place";
import { PlanCard, type PlanFact } from "@/components/dibby/plan-card";
import * as Avatar from "@/components/ui/avatar";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import { Icon } from "@/components/ui/icon";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { addMapPlace, addPlace, API_URL, castVote, joinPlan, lockPlan, setRsvp } from "@/lib/api";
import { usePlace } from "@/lib/places";
import { useSession } from "@/lib/session";
import { useColour, useShadow } from "@/lib/theme";
import { cn } from "@/utils/cn";
import { countdown, whenLong, whenParts } from "@/lib/dates";
import { usePlan } from "@/lib/use-plan";
import { AppBar } from "@/components/dibby/app-bar";

/**
 * A plan, opened from its link (same path as the web, /p/:slug, so dibby.social links open here).
 * Join with just a first name, say if you're in, vote on the place, see who's going and the chat.
 * Every rule (capacity, the waitlist, who can vote) is the web's: the API runs the same actions.
 */
export default function PlanScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const spinner = useColour("primary-base");
  const { state, apply } = usePlan(slug);

  if (state.kind === "loading")
    return (
      <View className="flex-1">
        <AppBar />
        <ActivityIndicator className="flex-1" color={spinner} />
      </View>
    );
  if (state.kind !== "ok")
    return (
      <View className="flex-1">
        <AppBar />
        <View className="gap-2 p-4">
          <Text className="text-title-h4 text-text-strong-950">{state.kind === "missing" ? "Can't find that plan" : "Couldn't load it"}</Text>
          <Text className="text-paragraph-md text-text-sub-600">{state.kind === "missing" ? "It might have been called off, or the link's run out." : state.message}</Text>
        </View>
      </View>
    );

  return <Plan slug={slug} detail={state.detail} apply={apply} />;
}

function Plan({ slug, detail, apply }: { slug: string; detail: PlanDetail; apply: (d: PlanDetail) => void }) {
  const { plan, me, going, chat } = detail;
  const off = plan.status === "cancelled";
  const locked = plan.status === "locked";
  // Voting and locked in share the web's one-page layout; wrapped and called off keep the card.
  const onePage = locked || plan.status === "voting";
  const hostedBy = me?.host ? "Hosted by you" : detail.host_name ? `Hosted by ${detail.host_name}` : null;

  const share = () => {
    const url = `${API_URL}/p/${slug}`;
    const message = shareText({ title: plan.title, when: plan.when, place: plan.place ?? plan.area, voting: plan.voting, url });
    Share.share({ message }).catch(() => {});
  };

  // The round buttons (.plan-actions). Share is one of them once it's locked in; while it's still
  // coming together it's the pinned button instead, like the web.
  const actions =
    !off && me ? (
      <View className={onePage ? "flex-row justify-around" : "flex-row flex-wrap gap-2"} accessibilityRole="toolbar" accessibilityLabel="Plan actions">
        {locked ? <CircleAction dibs={me.host} icon="whatsapp-line" label="Share" onPress={share} /> : null}
        {detail.calendar ? <CircleAction icon="calendar-line" label="Calendar" onPress={() => Linking.openURL(detail.calendar!)} /> : null}
        {detail.directions ? <CircleAction icon="direction-line" label="Directions" onPress={() => Linking.openURL(detail.directions!)} /> : null}
        {chat ? <CircleAction icon="chat-3-line" label="Chat" badge={detail.unread || undefined} onPress={() => router.push(`/p/${slug}/chat`)} /> : null}
      </View>
    ) : null;

  // The crew for the hero: who's in (not the waitlist), you raised in the middle if you're in, else the host.
  const crew = (going ?? []).filter((g) => !g.waitlisted).map((g) => ({ name: g.name, colour: g.colour, host: g.host }));
  const iAmIn = Boolean(me && !me.waitlisted && (me.rsvp === "in" || me.host));
  const raised = (iAmIn ? crew.find((c) => c.name === me!.name) : null) ?? crew.find((c) => c.host) ?? null;

  // When / Where / Going, as the web words them.
  const parts = whenParts(plan.starts_at);
  const left = countdown(plan.starts_at);
  const soon = left === "Tonight" || left === "Tomorrow";
  const heroFacts: HeroFact[] = [
    {
      label: "When",
      main: parts ? (soon ? left! : parts.day) : "To be decided",
      sub: parts ? (soon ? `${parts.day} · ${parts.time}` : [parts.time, left?.toLowerCase()].filter(Boolean).join(" · ")) : null,
    },
    {
      label: "Where",
      main: plan.place ?? (plan.voting ? "Up for a vote" : (plan.area ?? "To be decided")),
      sub: !plan.place && plan.voting ? (plan.area ? `Around ${plan.area}` : null) : detail.address ? detail.address : plan.place && plan.area && !plan.place.toLowerCase().includes(plan.area.toLowerCase()) ? plan.area : null,
    },
    {
      label: "Going",
      main: plan.capacity !== null ? `${plan.going} of ${plan.capacity}` : `${plan.going} ${plan.going === 1 ? "person" : "people"}`,
      sub:
        plan.capacity !== null
          ? plan.going >= plan.capacity
            ? "Full, waitlist's open"
            : `${plan.capacity - plan.going} ${plan.capacity - plan.going === 1 ? "spot" : "spots"} left`
          : null,
    },
  ];

  // The card, for a wrapped or called-off plan.
  const facts: PlanFact[] = [];
  const when = whenLong(plan.starts_at);
  facts.push(when ? { icon: "calendar-line", text: when } : { icon: "calendar-line", text: "Time to be decided", muted: true });
  facts.push(plan.place ? { icon: "map-pin-line", text: plan.place } : plan.area ? { icon: "map-pin-line", text: plan.area } : { icon: "map-pin-line", text: "Place to be decided", muted: true });

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <AppBar />
      <ScrollView contentContainerClassName="gap-6 p-4 pb-8">
        {onePage ? (
          <View className="gap-6">
            <PlanHero going={crew} raised={raised} isYou={iAmIn} />
            <View className="items-center gap-1">
              <Text accessibilityRole="header" className="text-center text-title-h2 text-text-strong-950">
                {plan.title}
              </Text>
              {hostedBy ? <Text className="text-center text-paragraph-md text-text-sub-600">{hostedBy}</Text> : null}
              {plan.description ? <Text className="pt-1 text-center text-paragraph-sm text-text-strong-950">{plan.description}</Text> : null}
            </View>
            <PlanFacts facts={heroFacts} />
            {actions}
          </View>
        ) : (
          <PlanCard
            size="page"
            title={plan.title}
            status={plan.status}
            category={plan.category}
            byline={hostedBy}
            facts={facts}
            footer={
              plan.description || actions ? (
                <View className="w-full gap-4">
                  {plan.description ? <Text className="text-paragraph-sm text-text-sub-600">{plan.description}</Text> : null}
                  {actions}
                </View>
              ) : undefined
            }
          />
        )}

        {/* Your one job: strangers join, people in the plan answer, hosts are already going. */}
        {!off && !me ? <Join slug={slug} apply={apply} /> : null}
        {!off && me && !me.host ? <Answer slug={slug} detail={detail} apply={apply} /> : null}

        {going && going.length ? <WhoRow going={going} me={me?.name ?? null} going_count={plan.going} capacity={plan.capacity} /> : null}

        <Vote slug={slug} detail={detail} apply={apply} />
      </ScrollView>

      {/* Pinned while it's still coming together, like the web's dock; once locked, Share is a round button. */}
      {off || !me || locked || plan.status === "wrapped" ? null : (
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

/** Five faces fit across a phone; past that, four and a "+N" tile. Tap for everyone, in a sheet. */
const FIT = 5;

function WhoRow({ going, me, going_count, capacity }: { going: NonNullable<PlanDetail["going"]>; me: string | null; going_count: number; capacity: number | null }) {
  const [open, setOpen] = useState(false);
  const waiting = going.filter((g) => g.waitlisted).length;
  const summary = [capacity ? `${going_count} of ${capacity} in` : `${going_count} in`, waiting ? `${waiting} waiting` : null].filter(Boolean).join(" · ");
  const shown = going.length <= FIT ? going : going.slice(0, FIT - 1);
  const more = going.length - shown.length;
  const first = (g: { name: string }) => (me && g.name === me ? "You" : g.name.split(" ")[0]);

  return (
    <View className="gap-3">
      <View className="flex-row items-end justify-between gap-3">
        <View className="shrink gap-0.5">
          <Text accessibilityRole="header" className="text-title-h5 text-text-strong-950">
            Who&rsquo;s going
          </Text>
          <Text className="text-paragraph-sm text-text-sub-600">{summary}</Text>
        </View>
        <LinkButton.Root variant="primary" className="-mb-3" onPress={() => setOpen(true)}>
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
              <Text className="text-title-h6 text-text-strong-950">+{more}</Text>
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

/**
 * The vote, laid out like the web's (app/p/[slug]/Vote.tsx): the leaders as big place cards (two
 * side by side when tied or nobody's voted), everyone else as compact rows under "Also in the
 * running", and Add a place as the last row. Hosts get who's ahead and Lock it in at the top.
 */
function Vote({ slug, detail, apply }: { slug: string; detail: PlanDetail; apply: (d: PlanDetail) => void }) {
  const { me, vote, plan } = detail;
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<VoteRow | null>(null);
  const [locking, setLocking] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  const rows: VoteRow[] = vote?.options ?? [];
  const open = Boolean(vote?.open ?? plan.status === "voting");
  const full = me?.access === "full";
  const canAdd = Boolean(me && full && plan.status === "voting" && rows.length < 8);

  if (me?.access === "hidden") return null;
  if (!vote && !(plan.voting && canAdd)) return null;

  const maxPicks = vote?.maxPicks ?? 1;
  const mineIds = rows.filter((r) => r.mine).map((r) => r.id);
  const order = rows.some((r) => r.votes > 0) ? [...rows].sort((a, b) => b.votes - a.votes) : rows;
  const split = splitLeaders(order.map((r) => r.votes));
  const big = order.slice(0, split.big);
  const rest = order.slice(split.big);
  const paired = split.big === 2 && split.eyebrow !== null;
  const total = rows.reduce((n, r) => n + r.votes, 0);
  const top = Math.max(0, ...rows.map((r) => r.votes));
  const leader = top > 0 ? order[0] : null;
  const tied = top > 0 && rows.filter((r) => r.votes === top).length > 1;
  const readOnly = full ? null : me ? (me.note ?? "You can't vote on this one.") : "Tap I'm in to add a place.";

  async function tap(r: VoteRow) {
    if (readOnly) return toast.info(readOnly);
    const step = voteStep(mineIds, r.id, maxPicks);
    if (step.kind === "none") return;
    if (step.kind === "full") return toast.info(`That's your ${step.max} picks. Untick one to swap it.`);
    Haptics.selectionAsync();
    try {
      apply(await castVote(slug, r.id));
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error((e as Error).message);
    }
  }

  async function add(pick: PlacePick) {
    setAdding(true);
    setAddError(null);
    try {
      apply(pick.kind === "map" ? await addMapPlace(slug, pick.place.place_id) : await addPlace(slug, pick.name, pick.address));
      setPicking(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function lock() {
    setLockBusy(true);
    try {
      apply(await lockPlan(slug));
      setLocking(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLockBusy(false);
    }
  }

  const voteButton = (r: VoteRow) =>
    open ? (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: r.mine }}
        accessibilityLabel={r.mine ? (maxPicks > 1 ? `Untick ${r.label}` : `Your pick: ${r.label}`) : `Vote for ${r.label}`}
        hitSlop={6}
        onPress={() => tap(r)}
        className={r.mine ? "size-10 items-center justify-center rounded-full bg-primary-base active:opacity-80" : "size-10 items-center justify-center rounded-full border-[1.5px] border-stroke-sub-300 bg-bg-white-0 active:opacity-70"}
      >
        <Icon name="check-line" className={r.mine ? "text-[20px] leading-[20px] text-static-white" : "text-[20px] leading-[20px] text-text-sub-600"} />
      </Pressable>
    ) : null;

  const addRow = canAdd ? (
    <Pressable accessibilityRole="button" onPress={() => (setAddError(null), setPicking(true))} className="min-h-14 flex-row items-center gap-2 active:opacity-70">
      <Icon name="add-line" className="text-[20px] leading-[20px] text-primary-dark" />
      <Text className="text-label-md text-primary-dark">Add a place</Text>
    </Pressable>
  ) : open && rows.length < 8 && readOnly ? (
    <View className="min-h-14 flex-row items-center gap-2">
      <Icon name="add-circle-line" className="text-[20px] leading-[20px] text-text-soft-400" />
      <Text className="flex-1 text-paragraph-sm text-text-sub-600">{readOnly}</Text>
    </View>
  ) : null;

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text accessibilityRole="header" className="text-title-h5 text-text-strong-950">
          Where to?
        </Text>
        {vote?.voters !== undefined && vote.members ? (
          <Text className="shrink text-right text-paragraph-sm text-text-sub-600">
            {vote.voters} of {vote.members} voted{vote.closes ? ` · closes ${vote.closes}` : ""}
          </Text>
        ) : null}
      </View>

      {open && me?.host && rows.length > 0 ? (
        <Card.Root>
          <View className="flex-row items-center gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-label-md text-text-strong-950">
                {leader ? (tied ? `It's a tie at ${top} ${top === 1 ? "vote" : "votes"}` : `${leader.label} is ahead with ${top} ${top === 1 ? "vote" : "votes"}`) : "No votes yet"}
              </Text>
              <Text className="text-paragraph-xs text-text-sub-600">{vote?.closes ? "When voting closes, the top pick locks in on its own." : "Lock it in whenever you're ready."}</Text>
            </View>
            {leader ? (
              <Button.Root size="small" disabled={lockBusy} onPress={() => setLocking(true)}>
                <Button.Icon name="lock-2-line" />
                {lockBusy ? "Locking…" : "Lock it in"}
              </Button.Root>
            ) : null}
          </View>
        </Card.Root>
      ) : null}

      {rows.length === 0 ? <Text className="text-paragraph-sm text-text-sub-600">No options yet. Add a place and the vote gets going.</Text> : null}
      {open && full && maxPicks > 1 && rows.length > 1 ? (
        <Text className="text-paragraph-xs text-text-sub-600">
          {mineIds.length === 0 ? `Pick up to ${maxPicks}.` : mineIds.length >= maxPicks ? `That's your ${maxPicks} picks. Tap one to untick it.` : `${maxPicks - mineIds.length} more ${maxPicks - mineIds.length === 1 ? "pick" : "picks"} if you want.`}
        </Text>
      ) : null}

      {split.eyebrow ? <Text className="pt-1 text-subheading-xs uppercase text-text-soft-400">{split.eyebrow}</Text> : null}
      <View className={paired ? "flex-row gap-2" : "gap-2"}>
        {big.map((r) => (
          <BigVoteCard key={r.id} row={r} tile={paired} total={total} winning={top > 0 && r.votes === top} onOpen={() => setViewing(r)} button={voteButton(r)} />
        ))}
      </View>

      {rest.length > 0 ? (
        <>
          <View className="flex-row items-baseline justify-between pt-1">
            <Text className="text-subheading-xs uppercase text-text-soft-400">Also in the running</Text>
            {rest.some((r) => r.place_id) ? <Text className="text-paragraph-xs text-text-soft-400">Photos from Google Maps</Text> : null}
          </View>
          <Card.Root className="gap-0 px-3 py-0">
            {rest.map((r, i) => (
              <View key={r.id} className={i > 0 ? "border-t border-stroke-soft-200" : undefined}>
                <RestVoteRow row={r} tied={split.tiedAt !== null && r.votes === split.tiedAt} onOpen={() => setViewing(r)} button={voteButton(r)} />
              </View>
            ))}
            {addRow ? <View className="border-t border-stroke-soft-200">{addRow}</View> : null}
          </Card.Root>
        </>
      ) : canAdd ? (
        <Button.Root variant="neutral" mode="stroke" onPress={() => (setAddError(null), setPicking(true))}>
          <Button.Icon name="add-line" />
          Add a place
        </Button.Root>
      ) : addRow}

      <PlacePicker open={picking} onOpenChange={setPicking} onPick={add} area={plan.area} busy={adding} error={addError} />
      <PlaceSheet
        open={viewing !== null}
        onOpenChange={(o) => !o && setViewing(null)}
        placeId={viewing?.place_id ?? null}
        name={viewing?.label ?? ""}
        address={viewing?.note ?? null}
        action={viewing && open && full ? { label: viewing.mine ? "Untick it" : "Vote for this", onPress: () => (tap(viewing), setViewing(null)) } : null}
      />
      <Modal.Root open={locking} onOpenChange={setLocking}>
        <Modal.Content>
          <Modal.Header title={tied ? "Lock it in?" : `Lock in ${leader?.label ?? "it"}?`} description={tied ? "It's a tie, so it spins for it. Everyone hears in the chat." : "Voting closes and everyone hears in the chat."} />
          <Modal.Footer>
            <Button.Root size="large" block disabled={lockBusy} onPress={lock}>
              {lockBusy ? "Locking it in…" : tied ? "Spin for it" : `Lock in ${leader?.label ?? "it"}`}
            </Button.Root>
            <Modal.Close>
              <Button.Root variant="neutral" mode="stroke" size="large" block>
                Not yet
              </Button.Root>
            </Modal.Close>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </View>
  );
}

type VoteRow = NonNullable<PlanDetail["vote"]>["options"][number];

/** A leader: the place's photo, name and stars (or a typed-in name and address), then the tally and the tick. */
function BigVoteCard({ row, tile, total, winning, onOpen, button }: { row: VoteRow; tile: boolean; total: number; winning: boolean; onOpen: () => void; button: ReactNode }) {
  const place = usePlace(row.place_id);
  const clay = useShadow(winning ? "clay" : null);
  const share = total ? Math.round((row.votes / total) * 100) : 0;
  const line = placeLine(place) ?? row.note;
  return (
    <View
      className={cn(
        "overflow-hidden rounded-md border-[1.5px]",
        tile && "flex-1",
        winning ? "border-stroke-sticker bg-bg-sticker" : row.mine ? "border-primary-base bg-bg-white-0" : "border-stroke-soft-200 bg-bg-white-0"
      )}
      style={clay}
    >
      <Pressable accessibilityRole="button" accessibilityLabel={`Photos and details for ${row.label}`} onPress={onOpen} className="active:opacity-80">
        {place?.photo ? <PlacePhoto place={place} className={tile ? "h-24 w-full" : "h-32 w-full"} /> : null}
        <View className="flex-row items-start gap-2.5 px-3 pt-3">
          {place?.photo ? null : <Icon name={row.place_id ? "store-2-line" : "home-4-line"} className="mt-0.5 text-[20px] leading-[22px] text-text-sub-600" />}
          <View className="flex-1 gap-0.5">
            <Text numberOfLines={2} className="text-label-lg text-text-strong-950">
              {row.label}
            </Text>
            {line ? (
              <Text numberOfLines={2} className="text-paragraph-sm text-text-sub-600">
                {line}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      <View className={tile ? "mt-auto flex-row items-center gap-1 p-2 pt-4" : "flex-row items-center gap-2 px-3 pb-3 pt-4"}>
        <View className="flex-1 gap-1">
          {total > 0 ? (
            <>
              <View className="h-1.5 overflow-hidden rounded-full bg-bg-soft-200">
                <View className={winning ? "h-full rounded-full bg-accent-base" : "h-full rounded-full bg-primary-bar"} style={{ width: `${share}%` }} />
              </View>
              <Text className="text-paragraph-xs text-text-sub-600">
                {row.votes} {row.votes === 1 ? "vote" : "votes"}
                {winning && !tile ? " · in front" : ""}
              </Text>
            </>
          ) : null}
        </View>
        {button}
      </View>
    </View>
  );
}

/** Everyone else: a small photo, the name and the count, then the tick. Tap for the place's details. */
function RestVoteRow({ row, tied, onOpen, button }: { row: VoteRow; tied: boolean; onOpen: () => void; button: ReactNode }) {
  const place = usePlace(row.place_id);
  return (
    <View className="min-h-[72px] flex-row items-center gap-2">
      <Pressable accessibilityRole="button" accessibilityLabel={`Photos and details for ${row.label}`} onPress={onOpen} className="flex-1 flex-row items-center gap-3 py-2 active:opacity-70">
        {place?.photo ? (
          <PlacePhoto place={place} className="size-12 rounded-md" />
        ) : (
          <View className={row.mine ? "size-12 items-center justify-center rounded-md bg-primary-lighter" : "size-12 items-center justify-center rounded-md bg-bg-soft-200"}>
            <Icon name={row.place_id ? "store-2-line" : "home-4-line"} className="text-[22px] leading-[22px] text-primary-base" />
          </View>
        )}
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-label-md text-text-strong-950">
            {row.label}
          </Text>
          <Text numberOfLines={1} className="text-paragraph-xs text-text-sub-600">
            {row.votes === 0 ? "No votes yet" : `${row.votes} ${row.votes === 1 ? "vote" : "votes"}`}
            {tied ? " · also tied" : ""}
          </Text>
          <Text className="text-label-sm text-primary-dark">Photos and details</Text>
        </View>
      </Pressable>
      {button}
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
        <Text accessibilityRole="header" className="text-title-h4 text-text-strong-950">
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
