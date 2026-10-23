"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { locate } from "@/lib/locate";
import type { Vibe } from "@dibs/shared/types";
import { createPlan } from "../actions";
import { Field, FormError } from "@/components/Field";
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

type Where = "place" | "vote";
type Who = "dibby" | "us";

/**
 * One form for every plan. Name and when are shared; "where" is either a place from the map
 * or a vote, and a vote is filled by Dibby (three real spots) or by the crew.
 */
export function NewPlanForm() {
  const [state, action, pending] = useActionState(createPlan, undefined);
  const [where, setWhere] = useState<Where>("place");
  const [who, setWho] = useState<Who>("dibby");
  const [place, setPlace] = useState<PlacePick | null>(null);
  const [picking, setPicking] = useState(false);
  const mode = where === "place" ? "place" : who === "dibby" ? "dibby" : "vote";

  // Dibby listens to the form: everything below feeds the bubble that talks back as you fill it.
  const days = useMemo(nextDays, []);
  const [when, setWhen] = useState<WhenValue>({ date: null, time: null });
  const [search, setSearch] = useState<SearchValue>({ spend: null, near: null });
  const [ask, setAsk] = useState("");
  const [vibe, setVibe] = useState<Vibe>("chill");
  const placeholder = useCyclingPlaceholder(mode === "dibby" && ask === "");
  // Near me is the default for Dibby: on straight away if location's already allowed, otherwise
  // asked for the first time Dibby's section is in play. Tap the chip to turn it off.
  const locAsked = useRef(false);
  useEffect(() => {
    if (mode !== "dibby" || search.near || locAsked.current) return;
    locAsked.current = true;
    locate({ ask: false }).then((c) => (c ? setSearch((v) => ({ ...v, near: c })) : locate({ ask: true }).then((c2) => c2 && setSearch((v) => ({ ...v, near: c2 })))));
  }, [mode, search.near]);

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
            <SegmentedControl.Trigger value="place">Already decided</SegmentedControl.Trigger>
            <SegmentedControl.Trigger value="vote">Feeling democratic?</SegmentedControl.Trigger>
          </SegmentedControl.List>
        </SegmentedControl.Root>
      </div>

      {where === "place" ? (
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
            <Button.Root type="button" variant="neutral" mode="lighter" block onClick={() => setPicking(true)}>
              <i className="ri-map-2-line db-icon" aria-hidden="true" />
              Pick the place
            </Button.Root>
          )}
          <PlacePicker open={picking} onOpenChange={setPicking} title="Where's it at?" cta="Use" onPick={setPlace} />
        </div>
      ) : (
        <div className="db-card section">
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <span className="flex-1">
              <span className="label-md block">Let Dibby help</span>
              <span className="paragraph-xs muted block">Three real spots to start the vote</span>
            </span>
            <Switch.Root checked={who === "dibby"} onCheckedChange={(on) => setWho(on ? "dibby" : "us")} />
          </label>
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
            <Field label="Where-ish" name="area" placeholder="Surry Hills" icon="ri-map-pin-line" maxLength={80} autoComplete="off" hint="Open vote: everyone adds places from the map." />
          )}
        </div>
      )}

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <Label.Root asChild className="mb-2">
          <legend>How Dibby talks</legend>
        </Label.Root>
        <VibePick onPick={setVibe} />
        <p className="paragraph-xs muted mt-2">Dibby&rsquo;s tone in the group chat, and the app&rsquo;s. You can change it later.</p>
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
