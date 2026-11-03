"use client";

import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { isGooglePlaceId, useGoogleMapsReady } from "./GoogleMaps";

/*
 * A small square of a place's first Google photo, for compact rows ("Also in the running").
 * Fetched in the browser with the Maps JavaScript API and never stored (Places terms: we keep the
 * place ID only). Each load is billed, so it waits until the row is on screen, and a place is
 * fetched once per page load however often the vote refreshes.
 *
 * Google asks that a photo shows who took it, so `usePlacePhoto` also returns the credit for the
 * row to show. Typed-in places, demo places and places without photos keep the icon.
 */

type Photo = { uri: string; by: string | null } | null;
const cache = new Map<string, Promise<Photo>>();

export function usePlacePhoto(placeId: string | null) {
  const ready = useGoogleMapsReady();
  const places = useMapsLibrary("places");
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  const [photo, setPhoto] = useState<Photo>(null);
  const google = ready && isGooglePlaceId(placeId);

  useEffect(() => {
    const el = ref.current;
    if (!google || !el || seen) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setSeen(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [google, seen]);

  useEffect(() => {
    if (!seen || !places || !google || !placeId) return;
    let live = true;
    if (!cache.has(placeId)) {
      cache.set(
        placeId,
        (async () => {
          try {
            const place = new places.Place({ id: placeId });
            await place.fetchFields({ fields: ["photos"] });
            const first = place.photos?.[0];
            if (!first) return null;
            return { uri: first.getURI({ maxWidth: 160, maxHeight: 160 }), by: first.authorAttributions?.[0]?.displayName ?? null };
          } catch {
            return null;
          }
        })()
      );
    }
    cache.get(placeId)!.then((p) => live && setPhoto(p));
    return () => {
      live = false;
    };
  }, [seen, places, google, placeId]);

  return { ref, photo };
}

/** The 48px square: Google's photo once it's in, the icon until then (or for good). */
export function PlaceThumb({
  placeId,
  photo,
  thumbRef,
}: {
  placeId: string | null;
  photo: Photo;
  thumbRef: React.Ref<HTMLSpanElement>;
}) {
  return (
    <span ref={thumbRef} className="vote-row__icon" data-photo={photo ? "" : undefined} aria-hidden="true">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google's photo URL, not ours to optimise
        <img src={photo.uri} alt="" className="vote-row__photo" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <i className={`${placeId ? "ri-store-2-line" : "ri-home-smile-line"} db-icon`} />
      )}
    </span>
  );
}
