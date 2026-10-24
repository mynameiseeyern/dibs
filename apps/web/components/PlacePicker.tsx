"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdvancedMarker, ColorScheme, Map, useMap } from "@vis.gl/react-google-maps";
import { GoogleMaps, MAPS_KEY, MAP_ID } from "@/components/maps/GoogleMaps";
import * as Modal from "@/components/ui/modal";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import * as Hint from "@/components/ui/hint";
import { Field } from "@/components/Field";
import { CUSTOM_PLACE_LIMITS, looksLikeAddress, type CustomPlace } from "@dibs/shared/plans";

/** A business picked on the map. The server checks the ID again before it's saved. */
export interface PickedPlace {
  placeId: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  kind: string | null;
}

/** A place typed in instead of picked: a title and an optional address, used as given. */
export type TypedPlace = CustomPlace & { custom: true };
export type PlacePick = PickedPlace | TypedPlace;
export const isTyped = (p: PlacePick): p is TypedPlace => "custom" in p;
/** What a server action takes: a map place's ID, or the typed-in place. */
export const pickArg = (p: PlacePick): string | CustomPlace => (isTyped(p) ? { name: p.name, address: p.address } : p.placeId);

const SYDNEY = { lat: -33.8688, lng: 151.2093 };

/**
 * The map place picker, in a bottom sheet. Search, see the spots on a Google map and in a
 * list, pick one (a real business from Google Places). Or type a place in: a name everyone
 * with the link sees, and an optional address only people in the plan see. Without a browser
 * maps key the search still works as a list.
 */
export function PlacePicker({
  open,
  onOpenChange,
  onPick,
  title,
  cta,
  area,
  exclude = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (place: PlacePick) => void;
  title: string;
  /** Button label; the picked place's name is added after it. */
  cta: string;
  /** Plan area, to bias the first search ("Surry Hills"). */
  area?: string | null;
  /** Place IDs already used (options on the poll), shown as taken. */
  exclude?: string[];
}) {
  const [q, setQ] = useState("");
  const [places, setPlaces] = useState<PickedPlace[]>([]);
  const [picked, setPicked] = useState<PickedPlace | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "off">("idle");
  const [centre, setCentre] = useState<google.maps.LatLngLiteral | null>(null);
  // Not on the map (someone's place, a spot in a park): type it in.
  const [typing, setTyping] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [typedAddress, setTypedAddress] = useState("");
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (query.length < 2) {
      setPlaces([]);
      setStatus("idle");
      return;
    }
    const n = ++seq.current;
    setStatus("loading");
    const t = setTimeout(async () => {
      const sp = new URLSearchParams({ q: query });
      if (centre) {
        sp.set("lat", String(centre.lat));
        sp.set("lng", String(centre.lng));
      } else if (area) sp.set("area", area);
      try {
        const res = await fetch(`/api/places?${sp}`);
        if (n !== seq.current) return;
        if (res.status === 503) return setStatus("off");
        if (!res.ok) return setStatus("error");
        const data = (await res.json()) as { places: PickedPlace[] };
        setPlaces(data.places);
        setPicked((p) => (p && data.places.some((x) => x.placeId === p.placeId) ? p : null));
        setStatus("idle");
      } catch {
        if (n === seq.current) setStatus("error");
      }
    }, 300);
    return () => clearTimeout(t);
    // The centre only biases the next search; moving the map doesn't search again by itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open, area]);

  const reset = (next: boolean) => {
    if (!next) {
      setQ("");
      setPlaces([]);
      setPicked(null);
      setStatus("idle");
      setTyping(false);
      setTypedName("");
      setTypedAddress("");
    }
    onOpenChange(next);
  };

  return (
    <Modal.Root open={open} onOpenChange={reset}>
      <Modal.Content className="max-h-[92dvh] overflow-y-auto">
        <Modal.Header title={title} />
        {typing ? (
          <div className="db-stack">
            <Field
              label="Name"
              name="custom_name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Ee's place"
              maxLength={CUSTOM_PLACE_LIMITS.name}
              autoComplete="off"
              hint="Anyone with the plan link sees this, including the WhatsApp preview."
            />
            {looksLikeAddress(typedName) && (
              <Hint.Root hasError role="status">
                <Hint.Icon as="i" className="ri-eye-line" aria-hidden="true" /> That looks like an address. Anyone with the link will see it. Put it in the address
                below instead?
              </Hint.Root>
            )}
            <Field
              label="Address (optional)"
              name="custom_address"
              value={typedAddress}
              onChange={(e) => setTypedAddress(e.target.value)}
              placeholder="12 Smith St, Newtown"
              maxLength={CUSTOM_PLACE_LIMITS.address}
              autoComplete="street-address"
              icon="ri-lock-line"
              hint="Only people in the plan see this. Leave it out if they already know where."
            />
            <Button.Root type="button" mode="ghost" size="small" onClick={() => setTyping(false)}>
              <i className="ri-arrow-left-line db-icon" aria-hidden="true" />
              Back to the map
            </Button.Root>
          </div>
        ) : (
          <>
        <label htmlFor="place-q" className="sr-only">
            Search for a place
          </label>
          <Input.Root>
            <Input.Wrapper>
              <Input.Icon as="i" className="ri-search-line" aria-hidden="true" />
              <Input.Input
                id="place-q"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={area ? `Dumplings, a bar, bowling… near ${area}` : "Dumplings, a bar, bowling…"}
                autoComplete="off"
                enterKeyHint="search"
              />
            </Input.Wrapper>
          </Input.Root>

          {MAPS_KEY ? (
            <div className="place-map">
              <GoogleMaps>
                <PlaceMap places={places} picked={picked} exclude={exclude} onPick={setPicked} onCentre={setCentre} />
              </GoogleMaps>
            </div>
          ) : null}

          <div aria-live="polite">
            {status === "loading" && <Hint.Root>Looking…</Hint.Root>}
            {status === "off" && <Hint.Root hasError>Place search isn&rsquo;t set up yet. Ask whoever runs Dibby to add the Google key.</Hint.Root>}
            {status === "error" && <Hint.Root hasError>Couldn&rsquo;t search just then. Try again in a sec.</Hint.Root>}
            {status === "idle" && q.trim().length >= 2 && places.length === 0 && <Hint.Root>Nothing open by that name. Try something broader.</Hint.Root>}
            {q.trim().length < 2 && <Hint.Root>Search for a business, or type a place in below.</Hint.Root>}
          </div>

          {places.length > 0 && (
            <ul className="place-list" aria-label="Places">
              {places.map((p) => {
                const taken = exclude.includes(p.placeId);
                const selected = picked?.placeId === p.placeId;
                return (
                  <li key={p.placeId}>
                    <button type="button" className="place-row" aria-pressed={selected} data-selected={selected || undefined} disabled={taken} onClick={() => setPicked(p)}>
                      <i className={`${selected ? "ri-map-pin-fill" : "ri-map-pin-line"} db-icon`} aria-hidden="true" />
                      <span className="place-row__text">
                        <span className="label-md">{p.name}</span>
                        <span className="paragraph-sm muted">
                          {[taken ? "Already on the list" : p.kind, p.address].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {p.rating ? <span className="label-sm muted" aria-label={`Rated ${p.rating.toFixed(1)}`}>{p.rating.toFixed(1)} ★</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
            <Button.Root type="button" mode="ghost" size="small" onClick={() => setTyping(true)}>
              <i className="ri-edit-line db-icon" aria-hidden="true" />
              Not on the map? Type it in
            </Button.Root>
          </>
        )}

        <Modal.Footer>
          {typing ? (
            <Button.Root
              size="large"
              block
              disabled={!typedName.trim()}
              onClick={() => {
                const name = typedName.replace(/\s+/g, " ").trim();
                if (!name) return;
                onPick({ custom: true, name, address: typedAddress.replace(/\s+/g, " ").trim() || null });
                reset(false);
              }}
            >
              {typedName.trim() ? `${cta}: ${typedName.trim()}` : "Name the place"}
            </Button.Root>
          ) : (
            <Button.Root
              size="large"
              block
              disabled={!picked}
              onClick={() => {
                if (!picked) return;
                onPick(picked);
                reset(false);
              }}
            >
              {picked ? `${cta}: ${picked.name}` : "Pick a place"}
            </Button.Root>
          )}
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

function PlaceMap({
  places,
  picked,
  exclude,
  onPick,
  onCentre,
}: {
  places: PickedPlace[];
  picked: PickedPlace | null;
  exclude: string[];
  onPick: (p: PickedPlace) => void;
  onCentre: (c: google.maps.LatLngLiteral) => void;
}) {
  const dark = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches, []);
  return (
    <Map
      mapId={MAP_ID}
      defaultCenter={SYDNEY}
      defaultZoom={13}
      gestureHandling="greedy"
      disableDefaultUI
      clickableIcons={false}
      colorScheme={dark ? ColorScheme.DARK : ColorScheme.LIGHT}
      onIdle={(e) => {
        const c = e.map.getCenter();
        if (c) onCentre(c.toJSON());
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <FitToPlaces places={places} picked={picked} />
      {places.map((p) => {
        const selected = picked?.placeId === p.placeId;
        const taken = exclude.includes(p.placeId);
        return (
          <AdvancedMarker
            key={p.placeId}
            position={{ lat: p.lat, lng: p.lng }}
            title={p.name}
            zIndex={selected ? 2 : 1}
            onClick={() => !taken && onPick(p)}
          >
            <span className="place-pin" data-selected={selected || undefined} data-taken={taken || undefined} aria-hidden="true">
              <i className={selected ? "ri-map-pin-fill" : "ri-map-pin-2-fill"} />
            </span>
          </AdvancedMarker>
        );
      })}
    </Map>
  );
}

/** Frames the results when they change, and pans to the picked one. */
function FitToPlaces({ places, picked }: { places: PickedPlace[]; picked: PickedPlace | null }) {
  const map = useMap();
  const key = places.map((p) => p.placeId).join(",");
  useEffect(() => {
    if (!map || places.length === 0) return;
    if (places.length === 1) {
      map.panTo({ lat: places[0]!.lat, lng: places[0]!.lng });
      map.setZoom(15);
      return;
    }
    const b = new google.maps.LatLngBounds();
    for (const p of places) b.extend({ lat: p.lat, lng: p.lng });
    map.fitBounds(b, 32);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  useEffect(() => {
    if (map && picked) map.panTo({ lat: picked.lat, lng: picked.lng });
  }, [map, picked]);
  return null;
}
