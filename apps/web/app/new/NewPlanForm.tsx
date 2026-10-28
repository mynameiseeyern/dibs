"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { locate } from "@/lib/locate";
import type { Vibe } from "@dibs/shared/types";
import { createPlan } from "../actions";
import { Field, FieldError, FormError } from "@/components/Field";
import { VibePick } from "@/components/VibePick";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as Switch from "@/components/ui/switch";
import * as SegmentedControl from "@/components/ui/segmented-control";
import { PlacePicker, isTyped, type PlacePick } from "@/components/PlacePicker";
import { PlaceCard } from "@/components/PlaceCard";
import { SearchChips, WhenChips, dayWord, nextDays, timeWord, type SearchValue, type WhenValue } from "./chips";
import { DibbyBubble, useCyclingPlaceholder } from "./DibbyBubble";
import { DibbyWorking } from "@/components/DibbyWorking";
import { CategoryPick } from "./CategoryPick";
import { Description } from "./Description";
import { Organiser, type Organising } from "./Organiser";
import { Extras } from "./Extras";
import { DibbyName } from "@/components/Logo";

type Where = "place" | "vote";
type Who = "dibby" | "us";
/** Fields on step 1: an error about one of these takes you back there. */
const STEP_1_FIELDS = new Set(["title", "place", "ask", "area", "description", "category"]);

/**
 * One form for every plan. Name and when are shared; "where" is either a place from the map
 * or a vote, and a vote is filled by Dibby (three real spots) or by the crew.
 */
export function NewPlanForm({ organising, savedCategories = [] }: { organising: Organising; savedCategories?: string[] }) {
  // Dibby searches near you, so location is asked for when you tap "Let Dibby pick", not before.
  // Turning "Near me" off on the chip means no.
  const nearDeclined = useRef(false);
  const [state, action, pending] = useActionState(async (s: Awaited<ReturnType<typeof createPlan>>, f: FormData) => {
    if (f.get("where") === "dibby" && !f.get("near_lat") && !nearDeclined.current) {
      const c = await locate({ ask: true });
      if (c) {
        f.set("near_lat", String(c.lat));
        f.set("near_lng", String(c.lng));
        setSearch((v) => ({ ...v, near: c }));
      }
    }
    return createPlan(s, f);
  }, undefined);
  const [where, setWhere] = useState<Where>("place");
  const [who, setWho] = useState<Who>("dibby");
  const [place, setPlace] = useState<PlacePick | null>(null);
  const [picking, setPicking] = useState(false);
  const mode = where === "place" ? "place" : who === "dibby" ? "dibby" : "vote";
  // Two steps on one form, so everything posts together: the plan itself, then Dibby and extras.
  // Step 3 (share it) is its own page once the plan exists.
  const [step, setStep] = useState<1 | 2>(1);
  const formRef = useRef<HTMLFormElement>(null);
  // One problem at a time, shown under the field it's about (or at the top if it's not about
  // a field). Fixing that field clears it.
  const [err, setErr] = useState<{ field?: string; msg: string } | null>(null);
  const errFor = (field: string) => (err?.field === field ? err.msg : undefined);
  const show = (e: { field?: string; msg: string }) => {
    setErr(e);
    const n = e.field && STEP_1_FIELDS.has(e.field) ? 1 : step;
    setStep(n);
    // After the step shows: bring the field into view and put the cursor in it.
    requestAnimationFrame(() => {
      const el = e.field ? formRef.current?.querySelector<HTMLElement>(`[name="${e.field}"]:not([type=hidden]), [data-field="${e.field}"]`) : formRef.current;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el && "focus" in el && el.tagName !== "FORM") el.focus({ preventScroll: true });
    });
  };
  const go = (n: 1 | 2) => {
    setStep(n);
    setErr(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => {
    const title = String(new FormData(formRef.current!).get("title") ?? "").trim();
    if (!title && mode !== "dibby") return show({ field: "title", msg: "Give it a name, like “Friday dinner”." });
    if (where === "place" && !place) return show({ field: "place", msg: "Pick the place, or start a poll." });
    if (mode === "dibby" && !ask.trim() && !search.spend) return show({ field: "ask", msg: "Tell Dibby what you're after, like “dumplings” or “bowling”." });
    go(2);
  };
  // What the server sent back after Make the plan.
  useEffect(() => {
    if (state?.error) show({ field: state.field, msg: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Dibby listens to the form: everything below feeds the bubble that talks back as you fill it.
  const days = useMemo(nextDays, []);
  const [when, setWhen] = useState<WhenValue>({ date: null, time: null });
  const [search, setSearch] = useState<SearchValue>({ spend: null, near: null });
  const [ask, setAsk] = useState("");
  const [vibe, setVibe] = useState<Vibe>("chill");
  const placeholder = useCyclingPlaceholder(mode === "dibby" && ask === "");
  // Near me is the default for Dibby: on straight away if location's already allowed. If not,
  // nothing pops up here; it's asked for on "Let Dibby pick". Tap the chip to turn it off.
  const locChecked = useRef(false);
  useEffect(() => {
    if (mode !== "dibby" || search.near || locChecked.current) return;
    locChecked.current = true;
    locate({ ask: false }).then((c) => c && setSearch((v) => ({ ...v, near: c })));
  }, [mode, search.near]);

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      className="form"
      onInput={(e) => {
        const name = (e.target as HTMLInputElement).name;
        if (err?.field && name === err.field) setErr(null);
      }}
      onKeyDown={(e) => {
        // Enter in a step 1 field means Next, not "make the plan" before you've seen step 2.
        if (step === 1 && e.key === "Enter" && e.target instanceof HTMLInputElement) {
          e.preventDefault();
          next();
        }
      }}
    >
      <input type="hidden" name="where" value={mode} />
      {/* Only problems that aren't about one field show here, at the top. */}
      {err && !err.field && <FormError error={err.msg} />}
      <div className="form" hidden={step !== 1}>
      <Field label="Name it" name="title" placeholder="Friday dinner" maxLength={80} autoComplete="off" hint={mode === "dibby" ? "Leave it blank and Dibby names it." : undefined} error={errFor("title")} />
      <Description />

      <CategoryPick saved={savedCategories} signedIn={organising.kind === "account"} />

      <WhenChips value={when} onChange={setWhen} />

      <SegmentedControl.Root value={where} onValueChange={(v) => setWhere(v as Where)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label.Root asChild>
          <span id="where-l">Where</span>
        </Label.Root>
          <SegmentedControl.List aria-labelledby="where-l">
            <SegmentedControl.Trigger value="place">Location</SegmentedControl.Trigger>
            <SegmentedControl.Trigger value="vote">Start a poll</SegmentedControl.Trigger>
          </SegmentedControl.List>
      </div>

      {/* Both panels stay mounted so each tab controls a real panel; only the picked one shows. */}
      <SegmentedControl.Content value="place" forceMount hidden={where !== "place"}>
        <div className="flex flex-col gap-2">
          {place && isTyped(place) ? (
            <>
              <input type="hidden" name="venue_custom_name" value={place.name} />
              <input type="hidden" name="venue_custom_address" value={place.address ?? ""} />
            </>
          ) : (
            <input type="hidden" name="venue_place_id" value={place?.placeId ?? ""} />
          )}
          {place ? (
            <PlaceCard
              name={place.name}
              detail={isTyped(place) ? (place.address ? `${place.address} · only people in the plan see this` : null) : [place.kind, place.address].filter(Boolean).join(" · ")}
              onChange={() => setPicking(true)}
            />
          ) : (
            <Button.Root type="button" data-field="place" variant="neutral" mode="lighter" block onClick={() => setPicking(true)}>
              <i className="ri-map-2-line db-icon" aria-hidden="true" />
              Pick the place
            </Button.Root>
          )}
          <FieldError error={errFor("place")} />
          <PlacePicker open={picking} onOpenChange={setPicking} title="Where's it at?" cta="Use this place" onPick={(p) => {
              setPlace(p);
              if (err?.field === "place") setErr(null);
            }} />
        </div>
      </SegmentedControl.Content>
      <SegmentedControl.Content value="vote" forceMount hidden={where !== "vote"}>
        <div className="db-card section">
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <span className="flex-1">
              <span className="label-md block">Let <DibbyName /> help</span>
              <span className="paragraph-xs muted block">Three real spots to start the vote</span>
            </span>
            <Switch.Root checked={who === "dibby"} onCheckedChange={(on) => setWho(on ? "dibby" : "us")} />
          </label>
          {who === "dibby" ? (
            <>
              <DibbyBubble vibe={vibe} parts={{ ask, day: dayWord(days, when.date), time: timeWord(when.time), spend: search.spend, near: !!search.near }} />
              <label htmlFor="ask" className="label-md">What are you after?</label>
              <Input.Root hasError={Boolean(errFor("ask"))}>
                <Input.Wrapper>
                  <Input.Input id="ask" name="ask" aria-invalid={errFor("ask") ? true : undefined} value={ask} onChange={(e) => setAsk(e.target.value)} placeholder={placeholder} maxLength={500} autoComplete="off" />
                </Input.Wrapper>
              </Input.Root>
              <FieldError error={errFor("ask")} />
              <SearchChips
                value={search}
                onChange={(v) => {
                  if (search.near && !v.near) nearDeclined.current = true;
                  if (v.near) nearDeclined.current = false;
                  setSearch(v);
                }}
              />
              <p className="paragraph-xs muted">Dibby picks three real spots to vote on. Anyone can add more from the map. What you type goes to an AI provider.</p>
            </>
          ) : (
            <Field label="Where-ish" name="area" placeholder="Surry Hills" icon="ri-map-pin-line" maxLength={80} autoComplete="off" hint="Open vote: everyone adds places from the map." />
          )}
        </div>
      </SegmentedControl.Content>
      </SegmentedControl.Root>

      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <Switch.Root name="plus_ones" />
        Plus-ones welcome
      </label>
      </div>

      <div className="form" hidden={step !== 2}>
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <Label.Root asChild className="mb-2">
          <legend>How <DibbyName /> talks</legend>
        </Label.Root>
        <VibePick onPick={setVibe} />
        <p className="paragraph-xs muted mt-2">How Dibby sounds in the chat and its reminders. You can change it later.</p>
      </fieldset>

      <Extras />

      <Organiser who={organising} errorFor={errFor} />
      </div>

      {pending && mode === "dibby" && <DibbyWorking where={search.near ? "near you" : null} />}

      <div className="dock">
        <div className="dock__inner">
          {step === 1 ? (
            <Button.Root key="next" type="button" size="large" block onClick={next}>
              Next: Dibby and extras
              <Button.Icon as="i" className="ri-arrow-right-line" />
            </Button.Root>
          ) : (
            <>
              <Button.Root key="make" variant="dibs" size="large" block disabled={pending}>
                {pending ? (mode === "dibby" ? "Dibby's on it…" : "Making it…") : mode === "dibby" ? "Let Dibby pick" : "Make the plan"}
              </Button.Root>
              <Button.Root type="button" variant="neutral" mode="ghost" block disabled={pending} onClick={() => go(1)}>
                Back
              </Button.Root>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
