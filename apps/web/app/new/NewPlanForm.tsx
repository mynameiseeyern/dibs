"use client";

import { useActionState, useState } from "react";
import { createPlan } from "../actions";
import { Field, FormError } from "@/components/Field";
import { VibePick } from "@/components/VibePick";
import * as Button from "@/components/ui/button";
import * as Label from "@/components/ui/label";
import * as Switch from "@/components/ui/switch";
import * as SegmentedControl from "@/components/ui/segmented-control";
import { PlacePicker, type PickedPlace } from "@/components/PlacePicker";
import { PlaceCard } from "@/components/PlaceCard";

export function NewPlanForm() {
  const [state, action, pending] = useActionState(createPlan, undefined);
  const [where, setWhere] = useState<"vote" | "place">("vote");
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [picking, setPicking] = useState(false);
  return (
    <form action={action} className="form">
      <Field label="Name it" name="title" placeholder="Friday dinner" required maxLength={80} autoComplete="off" />

      <div className="flex flex-col gap-2">
        <Label.Root asChild>
          <span id="where-l">Got a place?</span>
        </Label.Root>
        <input type="hidden" name="where" value={where} />
        <SegmentedControl.Root value={where} onValueChange={(v) => setWhere(v as typeof where)}>
          <SegmentedControl.List aria-labelledby="where-l">
            <SegmentedControl.Trigger value="vote">Put it to a vote</SegmentedControl.Trigger>
            <SegmentedControl.Trigger value="place">I&rsquo;ve got a place</SegmentedControl.Trigger>
          </SegmentedControl.List>
        </SegmentedControl.Root>
      </div>

      {where === "vote" ? (
        <Field
          label="Where-ish"
          name="area"
          placeholder="Surry Hills"
          icon="ri-map-pin-line"
          maxLength={80}
          autoComplete="off"
          hint="Everyone adds places to the vote from the map."
        />
      ) : (
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
      )}
      <Field label="When" name="starts_at" type="datetime-local" hint="Sydney and Melbourne time. Leave it blank to sort it out later." />

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <Label.Root asChild className="mb-2">
          <legend>Vibe</legend>
        </Label.Root>
        <VibePick />
      </fieldset>

      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <Switch.Root name="plus_ones" />
        Plus-ones welcome
      </label>

      <FormError error={state?.error} />

      <div className="dock">
        <div className="dock__inner">
          <Button.Root variant="dibs" size="large" block disabled={pending || (where === "place" && !place)}>
            {pending ? "Making it…" : "Make the plan"}
          </Button.Root>
        </div>
      </div>
    </form>
  );
}
