"use client";

import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import * as Modal from "@/components/ui/modal";
import * as Button from "@/components/ui/button";
import { isGooglePlaceId, useGoogleMapsReady } from "./GoogleMaps";
import { mapsUrl } from "./PlaceCard";

/**
 * "View" on a place: Google's full place details (photos, reviews, opening hours, website,
 * phone) in a bottom sheet, with a link out to Google Maps. Loads only while open.
 */
export function PlaceDetailsSheet({
  place,
  onClose,
}: {
  place: { placeId: string | null; name: string; address?: string | null } | null;
  onClose: () => void;
}) {
  const ready = useGoogleMapsReady();
  const google = Boolean(place && ready && isGooglePlaceId(place.placeId));
  return (
    <Modal.Root open={Boolean(place)} onOpenChange={(o) => !o && onClose()}>
      <Modal.Content className="max-h-[92dvh] overflow-y-auto">
        <Modal.Header title={place?.name ?? ""} />
        {place && google ? (
          <GoogleDetails placeId={place.placeId!} />
        ) : place ? (
          <Modal.Body>{place.address ?? "No more details for this one."}</Modal.Body>
        ) : null}
        {place && isGooglePlaceId(place.placeId) && (
          <Modal.Footer>
            <Button.Root asChild variant="neutral" mode="lighter" size="large" block>
              <a href={mapsUrl(place.placeId, place.name)} target="_blank" rel="noreferrer">
                <i className="ri-map-2-line db-icon" aria-hidden="true" />
                Open in Google Maps
              </a>
            </Button.Root>
          </Modal.Footer>
        )}
      </Modal.Content>
    </Modal.Root>
  );
}

function GoogleDetails({ placeId }: { placeId: string }) {
  const places = useMapsLibrary("places");
  const box = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = box.current?.querySelector("gmp-place-details");
    if (!el) return;
    const ok = () => setLoaded(true);
    el.addEventListener("gmp-load", ok);
    return () => el.removeEventListener("gmp-load", ok);
  }, [places]);
  return (
    <div ref={box} className="place-details" aria-busy={!loaded}>
      {!loaded && <p className="paragraph-sm muted">Loading photos and reviews…</p>}
      {places && (
        <gmp-place-details>
          <gmp-place-details-place-request place={placeId}></gmp-place-details-place-request>
          <gmp-place-content-config>
            <gmp-place-media lightbox-preferred=""></gmp-place-media>
            <gmp-place-rating></gmp-place-rating>
            <gmp-place-type></gmp-place-type>
            <gmp-place-price></gmp-place-price>
            <gmp-place-address></gmp-place-address>
            <gmp-place-opening-hours></gmp-place-opening-hours>
            <gmp-place-website></gmp-place-website>
            <gmp-place-phone-number></gmp-place-phone-number>
            <gmp-place-summary></gmp-place-summary>
            <gmp-place-reviews></gmp-place-reviews>
            <gmp-place-attribution light-scheme-color="gray" dark-scheme-color="white"></gmp-place-attribution>
          </gmp-place-content-config>
        </gmp-place-details>
      )}
    </div>
  );
}
