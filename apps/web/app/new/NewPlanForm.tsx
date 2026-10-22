"use client";

import { useActionState, useMemo, useState } from "react";
import type { Vibe } from "@dibs/shared/types";
import { createPlan } from "../actions";
import { Field, FormError } from "@/components/Field";
import { VibePick } from "@/components/VibePick";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as Switch from "@/components/ui/switch";
import * as SegmentedControl from "@/components/ui/segmented-control";
import { PlacePicker, type PickedPlace } from "@/components/PlacePicker";
import { PlaceCard } from "@/components/PlaceCard";
import { SearchChips, WhenChips, dayWord, nextDays, timeWord, type SearchValue, type WhenValue } from "./chips";
import { DibbyBubble, DibbyWorking, useCyclingPlaceholder } from "./DibbyBubble";

type Where = "place" | "vote";
type Who = "dibby" | "us";

/**
 * One form for every plan. Name and when are shared; "where" is either a place from the map
 * or a vote, and a vote is filled by Dibby (three real spots) or by the crew.
 */
export function NewPlanForm() {
  const [state, action, pending] = useActionState(createPlan, undefined);
  const [where, setWhere] = useState<Where>("vote");
  const [who, setWho] = useState<Who>("dibby");
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [picking, setPicking] = useState(false);
  const mode = where === "place" ? "place" : who === "dibby" ? "dibby" : "vote";

  // Dibby listens to the form: everything below feeds the bubble that talks back as you fill it.
  const days = useMemo(nextDays, []);
  const [when, setWhen] = useState<WhenValue>({ date: null, time: null });
  const [search, setSearch] = useState<SearchValue>({ spend: null, near: null });
  const [ask, setAsk] = useState("");
  const [vibe, setVibe] = useState<Vibe>("chill");
  const placeholder = useCyclingPlaceholder(mode === "dibby" && ask === "");

  return (
    <form action={action} className="form">
      <input type="hidden" name="where" value={mode} />
      <Field label="Name it" name="title" placeholder="Friday dinner" maxLength={80} autoComplete="off" hint={mode === "dibby" ? "Leave it blank and Dibby names it." : undefined} />

      <WhenChips value={when} onChange={setWhen} />

      <div className="flex flex-col gap-2">
        <Label.Root asChild>
          <span id="where-l">Where</span>
        </Label.Root>
        <SegmentedControl.Root value={where} onValueChange={(v) => setWhere(v as Where)}>
          <SegmentedControl.List aria-labelledby="where-l">
            <SegmentedControl.Trigger value="vote">Vote on it</SegmentedControl.Trigger>
            <SegmentedControl.Trigger value="place">Pick a place</SegmentedControl.Trigger>
          </SegmentedControl.List>
        </SegmentedControl.Root>
      </div>

      {where === "place" ? (
        <div className="flex flex-col gap-2">
          <input type="hidden" name="venue_place_id" value={place?.placeId ?? ""} />
          {place ? (
            <PlaceCard name={place.name} detail={[place.kind, place.address].filter(Boolean).join(" · ")} onChange={() => setPicking(true)} />
          ) : (
            <Button.Root type="button" variant="neutral" mode="lighter" block onClick={() => setPicking(true)}>
              <i className="ri-map-2-line db-icon" aria-hidden="true" />
              Pick it on the map
            </Button.Root>
          )}
          <PlacePicker open={picking} onOpenChange={setPicking} title="Where's it at?" cta="Use" onPick={setPlace} />
        </div>
      ) : (
        <div className="db-card section">
          <div className="flex flex-col gap-2">
            <Label.Root asChild>
              <span id="who-l">Who adds the options?</span>
            </Label.Root>
            <SegmentedControl.Root value={who} onValueChange={(v) => setWho(v as Who)}>
              <SegmentedControl.List aria-labelledby="who-l">
                <SegmentedControl.Trigger value="dibby">Dibby suggests 3</SegmentedControl.Trigger>
                <SegmentedControl.Trigger value="us">We&rsquo;ll add our own</SegmentedControl.Trigger>
              </SegmentedControl.List>
            </SegmentedControl.Root>
          </div>
          {who === "dibby" ? (
            <>
              <DibbyBubble vibe={vibe} parts={{ ask, day: dayWord(days, when.date), time: timeWord(when.time), spend: search.spend, near: !!search.near }} />
              <label htmlFor="ask" className="label-md">What are you after?</label>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input id="ask" name="ask" value={ask} onChange={(e) => setAsk(e.target.value)} placeholder={placeholder} maxLength={500} autoComplete="off" />
                </Input.Wrapper>
              </Input.Root>
              <SearchChips value={search} onChange={setSearch} />
              <p className="paragraph-xs muted">Dibby picks three real spots to vote on. Anyone can add more from the map. What you type goes to an AI provider.</p>
            </>
          ) : (
            <Field label="Where-ish" name="area" placeholder="Surry Hills" icon="ri-map-pin-line" maxLength={80} autoComplete="off" hint="Everyone adds places to the vote from the map." />
          )}
        </div>
      )}

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <Label.Root asChild className="mb-2">
          <legend>Vibe</legend>
        </Label.Root>
        <VibePick onPick={setVibe} />
      </fieldset>

      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <Switch.Root name="plus_ones" />
        Plus-ones welcome
      </label>

      <FormError error={state?.error} />
      {pending && mode === "dibby" && <DibbyWorking where={search.near ? "near you" : null} />}

      <div className="dock">
        <div className="dock__inner">
          <Button.Root variant="dibs" size="large" block disabled={pending || (where === "place" && !place)}>
            {pending ? (mode === "dibby" ? "Dibby's on it…" : "Making it…") : mode === "dibby" ? "Let Dibby pick" : "Make the plan"}
          </Button.Root>
        </div>
      </div>
    </form>
  );
}
