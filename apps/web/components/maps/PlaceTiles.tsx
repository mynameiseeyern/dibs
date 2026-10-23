"use client";

import { useState } from "react";
import { GoogleMaps } from "./GoogleMaps";
import { PlaceCard } from "./PlaceCard";
import { PlaceDetailsSheet } from "./PlaceDetailsSheet";

/**
 * The places Dibby put on the vote, as a row of tiles under its reply: photo, stars, reviews,
 * type and price from Google. "View" opens the full place.
 */
export function PlaceTiles({ places }: { places: { placeId: string; name: string; onVote: boolean }[] }) {
  const [viewing, setViewing] = useState<{ placeId: string; name: string } | null>(null);
  if (places.length === 0) return null;
  return (
    <GoogleMaps>
      <ul className="place-tiles" aria-label="Places Dibby found">
        {places.map((p) => (
          <li key={p.placeId} className="place-tile">
            <PlaceCard placeId={p.placeId} name={p.name} layout="tile" />
            <div className="place-tile__foot">
              <span className="paragraph-xs muted">{p.onVote ? "On the vote" : "Taken off the vote"}</span>
              <button type="button" className="place-tile__view" onClick={() => setViewing(p)} aria-label={`View ${p.name}`}>
                View
              </button>
            </div>
          </li>
        ))}
      </ul>
      <PlaceDetailsSheet place={viewing} onClose={() => setViewing(null)} />
    </GoogleMaps>
  );
}
