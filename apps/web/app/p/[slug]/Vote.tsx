"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import type { PlanOption } from "@dibs/shared/types";
import type { FormState } from "./actions";
import { Fresh } from "@/components/moments/Fresh";
import { PlacePicker, isTyped, pickArg } from "@/components/PlacePicker";
import type { CustomPlace } from "@dibs/shared/plans";
import { DibbyMark } from "@/components/Logo";
import { PlaceCard } from "@/components/maps/PlaceCard";
import { PlaceDetailsSheet } from "@/components/maps/PlaceDetailsSheet";
import { GoogleMaps } from "@/components/maps/GoogleMaps";
import { DibbyWorking } from "@/components/DibbyWorking";
import { locate } from "@/lib/locate";
import * as Input from "@/components/ui/input";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { send } from "@/lib/send";

export interface VoteRow extends PlanOption {
  votes: number;
  mine: boolean;
}

export function VoteList({
  rows,
  canVote,
  open,
  vote,
  add,
  remove,
  canRemoveAll = false,
  meId = null,
  readOnly = null,
  area,
  askDibby,
  decide,
}: {
  rows: VoteRow[];
  canVote: boolean;
  open: boolean;
  vote: (optionId: string) => Promise<void>;
  add: (s: FormState, f: FormData) => Promise<FormState>;
  /** Take an option off the vote. Rows this person may remove become swipeable. */
  remove?: (optionId: string) => Promise<{ error?: string; label?: string }>;
  /** Hosts can take off any option; everyone else only the ones they added. */
  canRemoveAll?: boolean;
  meId?: string | null;
  /** Set when this person can only look (a maybe, not replied, waitlisted): why, shown when they tap. */
  readOnly?: string | null;
  /** The plan's area, to start the map search near it. */
  area?: string | null;
  /** Dibby adds up to three more spots. Set when this person can add places and Dibby's on. */
  askDibby?: (f: FormData) => Promise<{ error?: string; added?: string[] }>;
  /** Host only: skip the vote and lock in a place from the map. */
  decide?: (pick: string | CustomPlace) => Promise<{ error?: string }>;
}) {
  const [adding, startAdding] = useTransition();
  // The tap moves your vote straight away: counts and bars update here, the server saves it behind,
  // and the next refresh replaces this with the real numbers (one vote per plan, so it moves, not adds).
  const [shownRows, moveVote] = useOptimistic(rows, (current: VoteRow[], optionId: string) =>
    current.map((r) => {
      if (r.id === optionId) return r.mine ? r : { ...r, mine: true, votes: r.votes + 1 };
      if (r.mine) return { ...r, mine: false, votes: Math.max(0, r.votes - 1) };
      return r;
    })
  );
  const [voting, startVote] = useTransition();
  // Leaders first once anyone's voted (ties keep the order they were added), and a long list
  // folds past the top few so the page stays short. Your own pick is never hidden.
  const ranked = shownRows.some((r) => r.votes > 0) ? [...shownRows].sort((a, b) => b.votes - a.votes) : shownRows;
  const [showAll, setShowAll] = useState(false);
  const mineHidden = ranked.findIndex((r) => r.mine) >= FOLD_AT;
  const folded = ranked.length > FOLD_AT + 1 && !showAll && !mineHidden;
  const visible = folded ? ranked.slice(0, FOLD_AT) : ranked;
  const total = shownRows.reduce((n, r) => n + r.votes, 0);
  const top = Math.max(0, ...shownRows.map((r) => r.votes));
  const [picking, setPicking] = useState(false);
  const [asking, setAsking] = useState(false);
  const [ask, setAsk] = useState("");
  const [dibbyBusy, startDibby] = useTransition();
  const [deciding, setDeciding] = useState(false);
  const [viewing, setViewing] = useState<VoteRow | null>(null);
  const [confirming, setConfirming] = useState<VoteRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const canRemove = (r: VoteRow) => !readOnly && Boolean(remove) && open && (canRemoveAll || (meId !== null && r.added_by === meId));

  const confirmRemove = async () => {
    if (!confirming || !remove) return;
    setRemoving(true);
    const res = await remove(confirming.id);
    setRemoving(false);
    setConfirming(null);
    if (res.error) toast.error(res.error);
    else toast.success(`Took ${res.label ?? confirming.label} off the vote`);
  };

  return (
    <GoogleMaps>
    <Fresh>
      {rows.length === 0 && <p className="paragraph-sm muted">No options yet. Add a place, or ask Dibby.</p>}
      {visible.map((r) => {
        const share = total ? Math.round((r.votes / total) * 100) : 0;
        const winning = top > 0 && r.votes === top;
        // The place (Google's photos, stars and reviews, or a typed-in name and address), the
        // tally, then plain buttons: vote, view the place, and delete for whoever may.
        return (
          <article key={r.id} data-fresh-id={r.id} className="vote-card" data-mine={r.mine || undefined} data-winning={winning || undefined} aria-label={r.label}>
            <PlaceCard placeId={r.place_id} name={r.label} address={r.note} />
            <div className="vote-card__tally">
              <span className="vote-card__bar" aria-hidden="true">
                <span style={{ width: `${share}%` }} />
              </span>
              <span className="paragraph-xs muted">
                {r.votes} {r.votes === 1 ? "vote" : "votes"}
                {total ? ` · ${share}%` : ""}
                {winning && total ? " · in front" : ""}
              </span>
            </div>
            <div className="vote-card__actions">
              {open && (
                <Button.Root
                  type="button"
                  variant="primary"
                  mode={r.mine ? "lighter" : "filled"}
                  size="small"
                  className="flex-1"
                  aria-pressed={r.mine}
                  aria-label={r.mine ? `Your pick: ${r.label}` : `Vote for ${r.label}`}
                  disabled={!canVote || (voting && !r.mine)}
                  onClick={() => {
                    if (readOnly) return void toast.info(readOnly);
                    if (r.mine) return;
                    startVote(async () => {
                      moveVote(r.id);
                      await send(() => vote(r.id), { what: "your vote" });
                    });
                  }}
                >
                  <i className={`${r.mine ? "ri-checkbox-circle-fill" : "ri-check-line"} db-icon`} aria-hidden="true" />
                  {r.mine ? "Your pick" : "Vote"}
                </Button.Root>
              )}
              <Button.Root type="button" variant="neutral" mode="lighter" size="small" className="flex-1" aria-label={`View ${r.label}`} onClick={() => setViewing(r)}>
                <i className="ri-eye-line db-icon" aria-hidden="true" />
                View
              </Button.Root>
              {canRemove(r) && (
                <Button.Root type="button" variant="error" mode="lighter" size="small" iconOnly aria-label={`Take ${r.label} off the vote`} onClick={() => setConfirming(r)}>
                  <i className="ri-delete-bin-line db-icon" aria-hidden="true" />
                </Button.Root>
              )}
            </div>
          </article>
        );
      })}

      {folded && (
        <Button.Root type="button" variant="neutral" mode="ghost" size="small" onClick={() => setShowAll(true)}>
          <i className="ri-arrow-down-s-line db-icon" aria-hidden="true" />
          Show {ranked.length - FOLD_AT} more
        </Button.Root>
      )}

      {canVote && open && rows.length < 8 && (
        <div className="flex gap-2">
          {askDibby && (
            <Button.Root type="button" variant="neutral" mode="lighter" className="flex-1" disabled={dibbyBusy} onClick={() => (readOnly ? toast.info(readOnly) : setAsking(true))}>
              <DibbyMark size={20} />
              {dibbyBusy ? "Dibby's on it…" : "Ask Dibby for more"}
            </Button.Root>
          )}
          <Button.Root type="button" variant="neutral" mode="lighter" className="flex-1" disabled={adding} onClick={() => (readOnly ? toast.info(readOnly) : setPicking(true))}>
            <i className="ri-map-pin-add-line db-icon" aria-hidden="true" />
            {adding ? "Adding…" : "Add a place"}
          </Button.Root>
        </div>
      )}
      {decide && open && (
        <Button.Root type="button" mode="ghost" size="small" onClick={() => setDeciding(true)}>
          <i className="ri-map-pin-2-line db-icon" aria-hidden="true" />
          Already decided? Pick the place
        </Button.Root>
      )}

      <Modal.Root open={asking} onOpenChange={(o) => !dibbyBusy && setAsking(o)}>
        <Modal.Content>
          <Modal.Header title="What else are we after?" />
          <Modal.Body>
            <form
              id="ask-more"
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData();
                f.set("ask", ask);
                startDibby(async () => {
                  const here = await locate({ ask: true });
                  if (here) {
                    f.set("near_lat", String(here.lat));
                    f.set("near_lng", String(here.lng));
                  }
                  const res = await askDibby!(f);
                  setAsking(false);
                  if (res.error) toast.error(res.error);
                  else if (res.added?.length) toast.success(`Dibby added ${res.added.length} more to the vote`);
                  else toast.info("Dibby couldn't find anything new for that");
                  setAsk("");
                });
              }}
            >
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input name="ask" value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Somewhere cheaper, a rooftop, more ramen…" maxLength={500} autoComplete="off" autoFocus />
                </Input.Wrapper>
              </Input.Root>
              <p className="paragraph-xs muted">Dibby adds up to three real spots{rows.length ? " it hasn't already suggested" : ""}, near you unless you name a place. What you type goes to an AI provider.</p>
              {dibbyBusy && <DibbyWorking where={area ?? null} />}
            </form>
          </Modal.Body>
          <Modal.Footer>
            <Button.Root type="submit" form="ask-more" variant="dibs" size="large" block disabled={dibbyBusy}>
              {dibbyBusy ? "Dibby's on it…" : "Let Dibby pick"}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {decide && (
        <PlacePicker
          open={deciding}
          onOpenChange={setDeciding}
          title="Where's it at?"
          cta="Lock it in"
          area={area}
          onPick={(p) =>
            startAdding(async () => {
              const res = await decide(pickArg(p));
              if (res.error) toast.error(res.error);
              else toast.success(`Locked in: ${p.name}`);
            })
          }
        />
      )}

      <PlacePicker
        open={picking}
        onOpenChange={setPicking}
        title="Add a place to the vote"
        cta="Add to the vote"
        area={area}
        exclude={rows.map((r) => r.place_id).filter((id): id is string => Boolean(id))}
        onPick={(p) => {
          const f = new FormData();
          if (isTyped(p)) {
            f.set("custom_name", p.name);
            f.set("custom_address", p.address ?? "");
          } else f.set("place_id", p.placeId);
          // Say how it went either way: a toast is hard to miss, unlike a line under the button.
          startAdding(async () => {
            const res = await add(undefined, f);
            if (res?.error) toast.error(res.error);
            else toast.success(`Added ${p.name} to the vote`);
          });
        }}
      />

      <Modal.Root open={Boolean(confirming)} onOpenChange={(o) => !o && !removing && setConfirming(null)}>
        <Modal.Content>
          <Modal.Header title={`Take ${confirming?.label ?? "this"} off the vote?`} />
          <Modal.Body>
            {confirming?.votes
              ? `${confirming.votes} ${confirming.votes === 1 ? "person has" : "people have"} voted for it. Their ${confirming.votes === 1 ? "vote goes" : "votes go"} too, and they can vote again.`
              : "Nobody's voted for it yet."}
          </Modal.Body>
          <Modal.Footer>
            <Button.Root variant="error" mode="lighter" size="large" block disabled={removing} onClick={confirmRemove}>
              {removing ? "Taking it off…" : "Take it off"}
            </Button.Root>
            <Modal.Close asChild>
              <Button.Root variant="neutral" mode="lighter" size="large" block disabled={removing}>
                Keep it
              </Button.Root>
            </Modal.Close>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
      <PlaceDetailsSheet place={viewing && { placeId: viewing.place_id, name: viewing.label, address: viewing.note }} onClose={() => setViewing(null)} />
    </Fresh>
    </GoogleMaps>
  );
}

// Cards are taller than the old rows, so fold after three.
const FOLD_AT = 3;
