"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, AdvancedMarker, ColorScheme, Map, useMap } from "@vis.gl/react-google-maps";
import * as Modal from "@/components/ui/modal";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import * as Hint from "@/components/ui/hint";

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

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// Advanced markers need a map ID. Google's demo ID works until a real one is set.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";
const SYDNEY = { lat: -33.8688, lng: 151.2093 };

/**
 * The map place picker, in a bottom sheet. Search, see the spots on a Google map and in a
 * list, pick one. Every pick is a real business from Google Places. Without a browser maps
 * key it still works as a list.
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
  onPick: (place: PickedPlace) => void;
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
    }
    onOpenChange(next);
  };

  return (
    <Modal.Root open={open} onOpenChange={reset}>
      <Modal.Content className="max-h-[92dvh] overflow-y-auto">
        <Modal.Header title={title} />
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
            <APIProvider apiKey={MAPS_KEY} region="AU" language="en-AU">
              <PlaceMap places={places} picked={picked} exclude={exclude} onPick={setPicked} onCentre={setCentre} />
            </APIProvider>
          </div>
        ) : null}

        <div aria-live="polite">
          {status === "loading" && <Hint.Root>Looking…</Hint.Root>}
          {status === "off" && <Hint.Root hasError>Place search isn&rsquo;t set up yet. Ask whoever runs dibs to add the Google key.</Hint.Root>}
          {status === "error" && <Hint.Root hasError>Couldn&rsquo;t search just then. Try again in a sec.</Hint.Root>}
          {status === "idle" && q.trim().length >= 2 && places.length === 0 && <Hint.Root>Nothing open by that name. Try something broader.</Hint.Root>}
          {q.trim().length < 2 && <Hint.Root>Search for a business. Only real, open places can go on a plan.</Hint.Root>}
        </div>

        {places.length > 0 && (
          <ul className="place-list" role="listbox" aria-label="Places">
            {places.map((p) => {
              const taken = exclude.includes(p.placeId);
              const selected = picked?.placeId === p.placeId;
              return (
                <li key={p.placeId} role="option" aria-selected={selected} aria-disabled={taken}>
                  <button type="button" className="place-row" data-selected={selected || undefined} disabled={taken} onClick={() => setPicked(p)}>
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

        <Modal.Footer>
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
