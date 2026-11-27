import type { ComponentRef } from "react";
import { Children, Fragment, isValidElement, useCallback, useState, type ReactNode } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusOnOpen } from "@/lib/use-focus-on-open";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PlanEditRequest, PlanEditState } from "@dibs/shared/api";
import { TIME_PRESETS } from "@dibs/shared/daypart";
import { DIBBY_VOLUMES, MAX_SPOTS, MIN_SPOTS, PLAN_EXTRAS, VIBES } from "@dibs/shared/plans";
import * as Button from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import * as Input from "@/components/ui/input";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";
import * as Switch from "@/components/ui/switch";
import * as Textarea from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Choice } from "@/components/dibby/flow";
import { DayStrip } from "@/components/dibby/day-strip";
import { PlacePicker } from "@/components/dibby/place";
import { TopBar } from "@/components/dibby/top-bar";
import { editPlan, getPlanEdit } from "@/lib/api";
import { timeLabel } from "@/lib/when-words";

type Sheet = "title" | "category" | "description" | "when" | "where" | "deadline" | "spots" | "vibe" | "volume" | null;
const DESCRIPTION_MAX = 500;

/** Sydney wall clock for an ISO time: { ymd: "2026-12-04", hhmm: "19:00" }. */
function sydneyParts(iso: string | null): { ymd: string | null; hhmm: string | null } {
  if (!iso) return { ymd: null, hhmm: null };
  const d = new Date(iso);
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return { ymd, hhmm };
}

/**
 * Edit plan, for hosts: the web's /p/:slug/manage in the app. Every change goes through the same
 * actions on the server, so the chat note and the "Updated" tag work the same either way.
 * After wrap-up it's just the extras, like the web.
 */
export default function EditPlan() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [state, setState] = useState<PlanEditState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getPlanEdit(slug)
        .then(setState)
        .catch((e) => setError((e as Error).message));
    }, [slug])
  );

  /** One change. Resolves true if it saved. */
  async function save(change: PlanEditRequest, done?: string): Promise<boolean> {
    setBusy(true);
    try {
      const { state: next } = await editPlan(slug, change);
      if (next) setState(next);
      if (done) toast.success(done);
      return true;
    } catch (e) {
      toast.error("Couldn't save that", { description: (e as Error).message });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const close = () => setSheet(null);

  if (!state)
    return (
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <TopBar title="Edit plan" />
        {error ? <Text className="p-4 text-paragraph-md text-text-sub-600">{error}</Text> : null}
      </SafeAreaView>
    );

  const voting = state.status === "voting";
  const finished = state.status === "wrapped" || state.status === "cancelled";
  const where = state.venue ?? (voting ? (state.option_count ? `Up for a vote · ${state.option_count} ${state.option_count === 1 ? "place" : "places"}` : "Up for a vote") : (state.area ?? "To be decided"));

  const extras = (
    <Group label="Extras" footnote="RSVPs are always on. Switching something off hides it; anything already there comes back if you switch it on.">
      {PLAN_EXTRAS.map((e) => (
        <SwitchRow
          key={e.id}
          label={e.label}
          hint={e.hint}
          on={!state.extras_off.includes(e.id)}
          disabled={busy}
          onChange={(on) => save({ field: "extra", value: { extra: e.id, on } })}
        />
      ))}
    </Group>
  );

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <TopBar title="Edit plan" />
      <ScrollView contentContainerClassName="gap-6 p-4 pb-10">
        {finished ? (
          state.status === "wrapped" ? (
            extras
          ) : (
            <Text className="text-paragraph-md text-text-sub-600">This one&apos;s called off, so there&apos;s nothing to change.</Text>
          )
        ) : (
          <>
            <Group label="The plan">
              <Row label="Name" value={state.title} onPress={() => setSheet("title")} />
              <Row label="Category" value={state.category ?? "None"} onPress={() => setSheet("category")} />
              <Row label="Details" value={state.description ? state.description.replace(/\s+/g, " ") : "None"} onPress={() => setSheet("description")} />
              <Row label="When" value={state.when_label ?? "To be decided"} onPress={() => setSheet("when")} />
              <Row label="Where" value={where} onPress={() => setSheet("where")} />
              {voting ? <Row label="Vote closes" value={state.deadline_label ?? "When you lock it in"} onPress={() => setSheet("deadline")} /> : null}
              {voting ? (
                <SwitchRow label="Up to three picks each" hint="Off: one pick each." on={state.multi_vote} disabled={busy} onChange={(on) => save({ field: "multi_vote", value: on })} />
              ) : null}
            </Group>

            <Group label="Who's coming">
              <Row label="Spots" value={`${state.capacity === null ? "Open" : `${state.capacity} max`} · ${state.going} going`} onPress={() => setSheet("spots")} />
              <SwitchRow label="Plus-ones" hint="People can bring someone." on={state.plus_ones} disabled={busy} onChange={(on) => save({ field: "plus_ones", value: on })} />
            </Group>

            {extras}

            <Group label="Dibby">
              <Row label="How Dibby talks" value={VIBES.find((v) => v.id === state.vibe)?.name ?? "Chill"} onPress={() => setSheet("vibe")} />
              <Row label="How chatty" value={DIBBY_VOLUMES.find((v) => v.id === state.volume)?.label ?? "Normal"} onPress={() => setSheet("volume")} />
            </Group>

            <LinkButton.Root
              variant="error"
              className="self-start"
              onPress={() =>
                Alert.alert("Call it off?", "Everyone sees it's not happening, and nobody owes anything for it. The plan stays up so no one's left wondering.", [
                  { text: "Keep it", style: "cancel" },
                  {
                    text: "Call it off",
                    style: "destructive",
                    onPress: async () => {
                      if (await save({ field: "cancel" }, "Called off")) router.back();
                    },
                  },
                ])
              }
            >
              Call it off
            </LinkButton.Root>
          </>
        )}
      </ScrollView>

      <TextSheet
        open={sheet === "title"}
        title="Name"
        initial={state.title}
        max={80}
        busy={busy}
        onClose={close}
        onSave={async (v) => (await save({ field: "title", value: v }, "Renamed")) && close()}
      />
      <CategorySheet
        open={sheet === "category"}
        initial={state.category}
        options={state.categories}
        busy={busy}
        onClose={close}
        onSave={async (v) => (await save({ field: "category", value: v }, "Saved")) && close()}
      />
      <TextSheet
        open={sheet === "description"}
        title="Details"
        hint="What to bring, where to meet. Anyone with the link sees this, like the name."
        initial={state.description ?? ""}
        max={DESCRIPTION_MAX}
        multiline
        allowEmpty
        busy={busy}
        onClose={close}
        onSave={async (v) => (await save({ field: "description", value: v }, "Saved")) && close()}
      />
      <WhenSheet
        open={sheet === "when"}
        title="When"
        initial={state.starts_at}
        clearable
        busy={busy}
        onClose={close}
        onSave={async (v) => (await save({ field: "when", value: v }, v ? "Time changed" : "Time cleared")) && close()}
      />
      <WhenSheet
        open={sheet === "deadline"}
        title="Vote closes"
        hint="The top pick locks in then. Dibby gives everyone a heads-up in the last hour."
        initial={state.vote_deadline}
        busy={busy}
        onClose={close}
        onSave={async (v) => (await save({ field: "vote_deadline", value: v }, "Saved")) && close()}
      />
      <WhereSheet open={sheet === "where"} state={state} busy={busy} onClose={close} save={save} />
      <SpotsSheet
        open={sheet === "spots"}
        capacity={state.capacity}
        going={state.going}
        busy={busy}
        onClose={close}
        onSave={async (n) => (await save({ field: "capacity", value: n }, "Saved")) && close()}
      />
      <PickSheet
        open={sheet === "vibe"}
        title="How Dibby talks"
        hint="Changes how Dibby sounds on this plan, straight away, including reminders already in the chat."
        options={VIBES.map((v) => ({ id: v.id, label: v.name, sub: v.note }))}
        value={state.vibe}
        onClose={close}
        onPick={(id) => save({ field: "vibe", value: id as PlanEditState["vibe"] })}
      />
      <PickSheet
        open={sheet === "volume"}
        title="How chatty is Dibby?"
        options={DIBBY_VOLUMES.map((v) => ({ id: v.id, label: v.label, sub: v.hint }))}
        value={state.volume}
        onClose={close}
        onPick={(id) => save({ field: "volume", value: id as PlanEditState["volume"] })}
      />
    </SafeAreaView>
  );
}

// ---------- Rows ----------

function Group({ label, footnote, children }: { label: string; footnote?: string; children: ReactNode }) {
  return (
    <View className="gap-1">
      <Text accessibilityRole="header" className="pb-1 text-subheading-sm uppercase text-text-soft-400">
        {label}
      </Text>
      <View className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3">
        {/* A hairline between rows, none after the last. */}
        {Children.toArray(children)
          .filter(isValidElement)
          .map((child, i) => (
            <Fragment key={i}>
              {i > 0 ? <View className="h-px bg-stroke-soft-200" /> : null}
              {child}
            </Fragment>
          ))}
      </View>
      {footnote ? <Text className="pt-1 text-paragraph-xs text-text-soft-400">{footnote}</Text> : null}
    </View>
  );
}

function Row({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} className="min-h-12 flex-row items-center gap-3 py-3 active:opacity-70">
      <Text className="w-28 text-label-sm text-text-sub-600">{label}</Text>
      <Text numberOfLines={1} className="flex-1 text-paragraph-md text-text-strong-950">
        {value}
      </Text>
      <Icon name="arrow-right-s-line" className="text-[20px] leading-[22px] text-text-soft-400" />
    </Pressable>
  );
}

function SwitchRow({ label, hint, on, disabled, onChange }: { label: string; hint?: string; on: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <View className="min-h-12 flex-row items-center gap-3 py-3">
      <View className="flex-1 gap-0.5">
        <Text className="text-label-md text-text-strong-950">{label}</Text>
        {hint ? <Text className="text-paragraph-xs text-text-sub-600">{hint}</Text> : null}
      </View>
      <Switch.Root checked={on} disabled={disabled} onCheckedChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

// ---------- Sheets ----------

function SheetShell({ open, title, hint, onClose, footer, children }: { open: boolean; title: string; hint?: string; onClose: () => void; footer?: ReactNode; children: ReactNode }) {
  return (
    <Modal.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Modal.Content>
        <Modal.Header title={title} description={hint} />
        <Modal.Body>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>{children}</KeyboardAvoidingView>
        </Modal.Body>
        {footer ? <Modal.Footer>{footer}</Modal.Footer> : null}
      </Modal.Content>
    </Modal.Root>
  );
}

function TextSheet({
  open,
  title,
  hint,
  initial,
  max,
  multiline,
  allowEmpty,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  hint?: string;
  initial: string;
  max: number;
  multiline?: boolean;
  allowEmpty?: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(initial);
  const [was, setWas] = useState(open);
  if (open !== was) {
    setWas(open);
    if (open) setV(initial);
  }
  const ok = allowEmpty || v.trim().length > 0;
  const box = useFocusOnOpen<ComponentRef<typeof TextInput>>(open);
  return (
    <SheetShell
      open={open}
      title={title}
      hint={hint}
      onClose={onClose}
      footer={
        <Button.Root size="large" block disabled={!ok || busy} onPress={() => onSave(v.trim())}>
          {busy ? "Saving…" : "Save"}
        </Button.Root>
      }
    >
      {multiline ? (
        <Textarea.Root value={v} onChangeText={setV} maxLength={max} placeholder="Bring cash, meet out the front…" ref={box}>
          <Textarea.CharCounter current={v.length} max={max} />
        </Textarea.Root>
      ) : (
        <Input.Root size="large">
          <Input.Wrapper>
            <Input.Input ref={box} value={v} onChangeText={setV} maxLength={max} returnKeyType="done" onSubmitEditing={() => ok && onSave(v.trim())} />
          </Input.Wrapper>
        </Input.Root>
      )}
    </SheetShell>
  );
}

function CategorySheet({ open, initial, options, busy, onClose, onSave }: { open: boolean; initial: string | null; options: string[]; busy: boolean; onClose: () => void; onSave: (v: string) => void }) {
  const [own, setOwn] = useState("");
  return (
    <SheetShell open={open} title="Category" onClose={onClose}>
      <View className="gap-4">
        <View className="flex-row flex-wrap gap-2">
          <Choice label="None" selected={!initial} onPress={() => !busy && onSave("")} />
          {options.map((c) => (
            <Choice key={c} label={c} selected={initial === c} onPress={() => !busy && onSave(c)} />
          ))}
        </View>
        <Input.Root>
          <Input.Wrapper>
            <Input.Input value={own} onChangeText={setOwn} maxLength={30} placeholder="Or your own" returnKeyType="done" onSubmitEditing={() => own.trim() && !busy && onSave(own.trim())} />
          </Input.Wrapper>
        </Input.Root>
      </View>
    </SheetShell>
  );
}

/** A day and a time, Sydney wall clock. Saves "YYYY-MM-DDTHH:mm", or "" to clear. */
function WhenSheet({ open, title, hint, initial, clearable, busy, onClose, onSave }: { open: boolean; title: string; hint?: string; initial: string | null; clearable?: boolean; busy: boolean; onClose: () => void; onSave: (local: string) => void }) {
  const start = sydneyParts(initial);
  const [ymd, setYmd] = useState<string | null>(start.ymd);
  const [hhmm, setHhmm] = useState<string | null>(start.hhmm);
  const [was, setWas] = useState(open);
  if (open !== was) {
    setWas(open);
    if (open) {
      setYmd(start.ymd);
      setHhmm(start.hhmm);
    }
  }
  return (
    <SheetShell
      open={open}
      title={title}
      hint={hint}
      onClose={onClose}
      footer={
        <View className="w-full gap-3">
          <Button.Root size="large" block disabled={!ymd || !hhmm || busy} onPress={() => ymd && hhmm && onSave(`${ymd}T${hhmm}`)}>
            {busy ? "Saving…" : "Save"}
          </Button.Root>
          {clearable && initial ? (
            <LinkButton.Root variant="gray" className="self-center" onPress={() => onSave("")}>
              Not sure yet: clear it
            </LinkButton.Root>
          ) : null}
        </View>
      }
    >
      <View className="gap-4">
        <DayStrip value={ymd} onChange={setYmd} />
        <View className="flex-row flex-wrap gap-2">
          {TIME_PRESETS.map((t) => (
            <Choice key={t.at} label={t.label} sub={timeLabel(t.at)} selected={hhmm === t.at} onPress={() => setHhmm(t.at)} />
          ))}
          {hhmm && !TIME_PRESETS.some((t) => t.at === hhmm) ? <Choice label={timeLabel(hhmm)} selected onPress={() => setHhmm(null)} /> : null}
        </View>
      </View>
    </SheetShell>
  );
}

function WhereSheet({ open, state, busy, onClose, save }: { open: boolean; state: PlanEditState; busy: boolean; onClose: () => void; save: (c: PlanEditRequest, done?: string) => Promise<boolean> }) {
  const [picking, setPicking] = useState(false);
  const [area, setArea] = useState(state.area ?? "");
  const voting = state.status === "voting";
  return (
    <>
      <SheetShell
        open={open && !picking}
        title="Where"
        onClose={onClose}
        footer={
          <Button.Root variant="neutral" mode="lighter" size="large" block onPress={onClose}>
            Done
          </Button.Root>
        }
      >
        <View className="gap-4">
          {state.venue ? <Text className="text-label-md text-text-strong-950">{state.venue}</Text> : null}
          <Text className="text-paragraph-sm text-text-sub-600">
            {voting
              ? `${state.option_count ? `${state.option_count} ${state.option_count === 1 ? "place" : "places"} on the vote.` : "No places on the vote yet."} Already know where? Pick it and the vote ends.`
              : "Set. Change the place, or put it back to a vote."}
          </Text>
          <Button.Root variant="neutral" mode="lighter" block onPress={() => setPicking(true)}>
            <Button.Icon name="map-2-line" />
            {state.venue ? "Change the place" : "Pick the place"}
          </Button.Root>
          {!voting ? (
            <LinkButton.Root
              variant="primary"
              className="self-start"
              onPress={() =>
                Alert.alert("Put it to a vote?", `${state.venue ? `${state.venue} goes on the list so it's still in the running.` : "The plan opens back up for votes."} Voting closes in 24 hours, or when you lock it in.`, [
                  { text: "Keep the place", style: "cancel" },
                  { text: "Open the vote", onPress: () => save({ field: "open_vote" }, "Back to a vote") },
                ])
              }
            >
              Put it to a vote instead
            </LinkButton.Root>
          ) : (
            <View className="gap-1">
              <Text className="text-label-sm text-text-sub-600">Area to search near</Text>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input value={area} onChangeText={setArea} maxLength={60} placeholder="Newtown" returnKeyType="done" onSubmitEditing={() => save({ field: "area", value: area.trim() }, "Saved")} />
                </Input.Wrapper>
              </Input.Root>
            </View>
          )}
        </View>
      </SheetShell>
      <PlacePicker
        open={picking}
        onOpenChange={setPicking}
        area={state.area}
        title={state.venue ? "Change the place" : "Where's it at?"}
        busy={busy}
        onPick={async (p) => {
          const ok = await save(
            { field: "place", value: p.kind === "map" ? { place_id: p.place.place_id } : { name: p.name, address: p.address } },
            p.kind === "map" ? `Now at ${p.place.name}` : `Now at ${p.name}`
          );
          if (ok) setPicking(false);
        }}
      />
    </>
  );
}

function SpotsSheet({ open, capacity, going, busy, onClose, onSave }: { open: boolean; capacity: number | null; going: number; busy: boolean; onClose: () => void; onSave: (n: number | null) => void }) {
  const [v, setV] = useState(capacity === null ? "" : String(capacity));
  const n = v.trim() === "" ? null : Number(v);
  const bad = n !== null && (!Number.isInteger(n) || n < MIN_SPOTS || n > MAX_SPOTS);
  return (
    <SheetShell
      open={open}
      title="Spots"
      hint={`${going} going now, plus-ones included. Leave it empty for no limit.`}
      onClose={onClose}
      footer={
        <Button.Root size="large" block disabled={bad || busy} onPress={() => onSave(n)}>
          {busy ? "Saving…" : n === null ? "Save: open" : `Save: ${n} max`}
        </Button.Root>
      }
    >
      <Input.Root size="large" hasError={bad}>
        <Input.Wrapper>
          <Input.Input value={v} onChangeText={(t) => setV(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="No limit" maxLength={3} />
        </Input.Wrapper>
      </Input.Root>
      {bad ? <Text className="pt-2 text-paragraph-xs text-error-base">{`Anywhere from ${MIN_SPOTS} to ${MAX_SPOTS}.`}</Text> : null}
    </SheetShell>
  );
}

function PickSheet({ open, title, hint, options, value, onClose, onPick }: { open: boolean; title: string; hint?: string; options: { id: string; label: string; sub?: string }[]; value: string; onClose: () => void; onPick: (id: string) => void }) {
  return (
    <SheetShell
      open={open}
      title={title}
      hint={hint}
      onClose={onClose}
      footer={
        <Button.Root variant="neutral" mode="lighter" size="large" block onPress={onClose}>
          Done
        </Button.Root>
      }
    >
      <View className="gap-2">
        {options.map((o) => (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === o.id }}
            onPress={() => value !== o.id && onPick(o.id)}
            className={`min-h-12 flex-row items-center gap-3 rounded-lg border p-3 active:opacity-80 ${value === o.id ? "border-primary-base bg-primary-lighter" : "border-stroke-soft-200 bg-bg-white-0"}`}
          >
            <View className="flex-1 gap-0.5">
              <Text className="text-label-md text-text-strong-950">{o.label}</Text>
              {o.sub ? <Text className="text-paragraph-xs text-text-sub-600">{o.sub}</Text> : null}
            </View>
            {value === o.id ? <Icon name="check-line" className="text-[20px] leading-[22px] text-primary-dark" /> : null}
          </Pressable>
        ))}
      </View>
    </SheetShell>
  );
}
