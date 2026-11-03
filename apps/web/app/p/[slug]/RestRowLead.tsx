"use client";

import { PlaceThumb, usePlacePhoto } from "@/components/maps/PlaceThumb";

/** The tappable part of an "Also in the running" row: Google's photo (or an icon), name, votes. */
export function RestRowLead({ placeId, label, meta }: { placeId: string | null; label: string; meta: string }) {
  const { ref, photo } = usePlacePhoto(placeId);
  return (
    <>
      <PlaceThumb placeId={placeId} photo={photo} thumbRef={ref} />
      <span className="vote-row__text">
        <span className="label-md vote-row__name">{label}</span>
        <span className="paragraph-xs muted">{meta}</span>
        <span className="paragraph-xs vote-row__more">
          Photos and details
          {/* Google asks that a photo credits who took it. */}
          {photo?.by && <span className="vote-row__credit muted"> · photo by {photo.by}</span>}
        </span>
      </span>
    </>
  );
}
