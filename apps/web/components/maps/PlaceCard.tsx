"use client";

import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { isGooglePlaceId, useGoogleMapsReady } from "./GoogleMaps";

/*
 * A place, with Google's photos, star rating and review count, type, price and open-now, from the
 * Places UI Kit compact element. Google renders and attributes it, and its data isn't stored on
 * our side (Places terms only let us keep the place ID). Each card is billed when it loads, so it
 * only loads once it's on screen; a hidden tab's cards wait until the tab opens.
 *
 * Typed-in places, the demo places in local dev, and any card Google can't load show a plain
 * card with the name and address instead.
 */

type Layout = "row" | "tile";

export function PlaceCard({
  placeId,
  name,
  address,
  layout = "row",
}: {
  placeId: string | null;
  name: string;
  /** For typed-in places (only shown to people on the plan) and the fallback. */
  address?: string | null;
  /** row: full width, photo beside the details (poll options). tile: photo on top (Dibby's picks). */
  layout?: Layout;
}) {
  const ready = useGoogleMapsReady();
  const [failed, setFailed] = useState(false);
  if (!ready || !isGooglePlaceId(placeId) || failed) return <PlaceSummary name={name} address={address} placeId={placeId} layout={layout} />;
  return <GooglePlace placeId={placeId} name={name} layout={layout} onFail={() => setFailed(true)} />;
}

function GooglePlace({ placeId, name, layout, onFail }: { placeId: string; name: string; layout: Layout; onFail: () => void }) {
  const places = useMapsLibrary("places");
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load (and pay for) the card only once it scrolls into view.
  useEffect(() => {
    const el = box.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  // Google's element fires gmp-load when it has the place; an error or a long wait falls back.
  // onFail goes through a ref so the page's live refresh doesn't restart this.
  const failRef = useRef(onFail);
  failRef.current = onFail;
  useEffect(() => {
    if (!seen || !places) return;
    const el = box.current?.querySelector("gmp-place-details-compact");
    if (!el) return;
    let done = false;
    const ok = () => {
      done = true;
      setLoaded(true);
    };
    const fail = () => {
      if (!done) failRef.current();
    };
    el.addEventListener("gmp-load", ok);
    el.addEventListener("gmp-error", fail);
    el.addEventListener("gmp-requesterror", fail);
    const timer = setTimeout(fail, 12_000);
    return () => {
      el.removeEventListener("gmp-load", ok);
      el.removeEventListener("gmp-error", fail);
      el.removeEventListener("gmp-requesterror", fail);
      clearTimeout(timer);
    };
  }, [seen, places]);

  return (
    <div ref={box} className={`place-card place-card--${layout}`} data-loaded={loaded || undefined} aria-busy={!loaded}>
      {!loaded && <PlaceSkeleton name={name} layout={layout} />}
      {seen && places && (
        <gmp-place-details-compact orientation={layout === "tile" ? "vertical" : "horizontal"} truncation-preferred="">
          <gmp-place-details-place-request place={placeId}></gmp-place-details-place-request>
          <gmp-place-content-config>
            <gmp-place-media lightbox-preferred=""></gmp-place-media>
            <gmp-place-rating></gmp-place-rating>
            <gmp-place-type></gmp-place-type>
            <gmp-place-price></gmp-place-price>
            {layout === "row" && <gmp-place-address></gmp-place-address>}
            <gmp-place-open-now-status></gmp-place-open-now-status>
            <gmp-place-attribution light-scheme-color="gray" dark-scheme-color="white"></gmp-place-attribution>
          </gmp-place-content-config>
        </gmp-place-details-compact>
      )}
    </div>
  );
}

function PlaceSkeleton({ name, layout }: { name: string; layout: Layout }) {
  return (
    <div className={`place-skeleton place-skeleton--${layout}`} aria-hidden="true">
      <span className="place-skeleton__photo" />
      <span className="place-skeleton__text">
        <span className="label-md">{name}</span>
        <span className="place-skeleton__line" />
      </span>
    </div>
  );
}

export const mapsUrl = (placeId: string, name: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`;

/** The plain card: typed-in places, local dev, or when Google's card can't load. */
function PlaceSummary({ name, address, placeId, layout }: { name: string; address?: string | null; placeId: string | null; layout: Layout }) {
  const maps = isGooglePlaceId(placeId) ? mapsUrl(placeId, name) : null;
  return (
    <div className={`place-summary place-summary--${layout}`}>
      <i className={`${placeId ? "ri-store-2-line" : "ri-home-smile-line"} db-icon`} aria-hidden="true" />
      <span className="place-summary__text">
        <span className="label-md">{name}</span>
        {address ? <span className="paragraph-sm muted">{address}</span> : null}
        {maps ? (
          <a className="paragraph-sm" href={maps} target="_blank" rel="noreferrer">
            Photos and reviews on Google Maps
          </a>
        ) : null}
      </span>
    </div>
  );
}

// Google's Places UI Kit custom elements, for JSX.
type El = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "gmp-place-details": El;
      "gmp-place-opening-hours": El;
      "gmp-place-website": El;
      "gmp-place-phone-number": El;
      "gmp-place-summary": El;
      "gmp-place-reviews": El;
      "gmp-place-details-compact": El & { orientation?: "horizontal" | "vertical"; "truncation-preferred"?: string };
      "gmp-place-details-place-request": El & { place: string };
      "gmp-place-content-config": El;
      "gmp-place-media": El & { "lightbox-preferred"?: string };
      "gmp-place-rating": El;
      "gmp-place-type": El;
      "gmp-place-price": El;
      "gmp-place-address": El;
      "gmp-place-open-now-status": El;
      "gmp-place-attribution": El & { "light-scheme-color"?: "black" | "gray" | "white"; "dark-scheme-color"?: "black" | "gray" | "white" };
    }
  }
}
