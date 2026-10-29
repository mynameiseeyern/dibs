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
import * as Dropdown from "@/components/ui/dropdown";
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
  lock,
  closes = null,
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
  /** Host only: close the vote now and go with whatever's in front. */
  lock?: () => Promise<void>;
  /** When the vote closes on its own ("Fri 30 Oct · 6:00 pm"), for the host's bar. */
  closes?: string | null;
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
  // One way in for new options (search the map, or let Dibby suggest), and one for the host to
  // finish the vote (go with the leader, or pick somewhere else).
  const [choosingAdd, setChoosingAdd] = useState(false);
  const [locking, setLocking] = useState(false);
  const [lockBusy, startLock] = useTransition();
  const leader = top > 0 ? ranked[0] : null;
  const tied = top > 0 && shownRows.filter((r) => r.votes === top).length > 1;
  // The section heading already says when it closes, so this just says what happens then.
  const auto = closes ? "When voting closes, the top pick locks in on its own." : "Lock it in whenever you're ready.";
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
      {/* The organiser's call, up top where it's seen: who's ahead, that it'll sort itself out at the
          deadline, and the button to lock it in now. */}
      {open && (lock || decide) && rows.length > 0 && (
        <div className="db-card vote-host">
          <div className="vote-host__text">
            <span className="label-md">
              {leader ? (tied ? `It's a tie at ${top} ${top === 1 ? "vote" : "votes"}` : `${leader.label} is ahead with ${top} ${top === 1 ? "vote" : "votes"}`) : "No votes yet"}
            </span>
            <span className="paragraph-xs muted">{auto}</span>
          </div>
          <Button.Root type="button" variant="primary" size="small" disabled={lockBusy} onClick={() => (leader && lock ? setLocking(true) : setDeciding(true))}>
            <i className="ri-lock-2-line db-icon" aria-hidden="true" />
            {lockBusy ? "Locking…" : leader ? "Lock it in" : "Pick it"}
          </Button.Root>
        </div>
      )}
      {rows.length === 0 && <p className="paragraph-sm muted">No options yet. Add a place, or ask Dibby.</p>}
      {open && decide && rows.length === 0 && (
        <Button.Root type="button" mode="ghost" size="small" onClick={() => setDeciding(true)}>
          <i className="ri-map-pin-2-line db-icon" aria-hidden="true" />
          Already decided? Pick the place
        </Button.Root>
      )}
      {visible.map((r) => {
        const share = total ? Math.round((r.votes / total) * 100) : 0;
        const winning = top > 0 && r.votes === top;
        // The place (Google's photos, stars and reviews, or a typed-in name and address), then one
        // row: the tally once anyone's voted, the vote toggle, and a ⋯ menu for details and removing.
        // Removing lives in the menu, not on every card, and only for whoever may.
        return (
          <article key={r.id} data-fresh-id={r.id} className="vote-card" data-mine={r.mine || undefined} data-winning={winning || undefined} aria-label={r.label}>
            <PlaceCard placeId={r.place_id} name={r.label} address={r.note} />
            <div className="vote-card__actions">
              {total > 0 ? (
                <div className="vote-card__tally">
                  <span className="vote-card__bar" aria-hidden="true">
                    <span style={{ width: `${share}%` }} />
                  </span>
                  <span className="paragraph-xs muted">
                    {r.votes} {r.votes === 1 ? "vote" : "votes"}
                    {winning ? " · in front" : ""}
                  </span>
                </div>
              ) : (
                <span className="vote-card__tally" />
              )}
              <Dropdown.Root>
                <Dropdown.Trigger asChild>
                  <Button.Root type="button" variant="neutral" mode="ghost" iconOnly aria-label={`More for ${r.label}`}>
                    <Button.Icon as="i" className="ri-more-fill" />
                  </Button.Root>
                </Dropdown.Trigger>
                <Dropdown.Content align="end" className="w-60">
                  <Dropdown.Item onSelect={() => setViewing(r)}>
                    <i className="ri-information-line db-icon" aria-hidden="true" />
                    See details
                  </Dropdown.Item>
                  {canRemove(r) && (
                    <Dropdown.Item className="text-error-base" onSelect={() => setConfirming(r)}>
                      <i className="ri-delete-bin-line db-icon" aria-hidden="true" />
                      Take it off the vote
                    </Dropdown.Item>
                  )}
                </Dropdown.Content>
              </Dropdown.Root>
              {open && (
                <Button.Root
                  type="button"
                  variant={r.mine ? "primary" : "neutral"}
                  mode={r.mine ? "filled" : "stroke"}
                  iconOnly
                  className="rounded-full"
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
                  <Button.Icon as="i" className="ri-check-line" />
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
        <Button.Root
          type="button"
          variant="neutral"
          mode="stroke"
          disabled={adding || dibbyBusy}
          onClick={() => (readOnly ? toast.info(readOnly) : askDibby ? setChoosingAdd(true) : setPicking(true))}
        >
          <Button.Icon as="i" className="ri-add-line" />
          {adding ? "Adding…" : dibbyBusy ? "Dibby's on it…" : "Add an option"}
        </Button.Root>
      )}

      <Modal.Root open={choosingAdd} onOpenChange={setChoosingAdd}>
        <Modal.Content>
          <Modal.Header title="Add an option" />
          <Modal.Body>
            <div className="flex flex-col gap-3">
              <Button.Root type="button" variant="neutral" mode="lighter" size="large" block onClick={() => { setChoosingAdd(false); setPicking(true); }}>
                <Button.Icon as="i" className="ri-search-line" />
                Search a place
              </Button.Root>
              <Button.Root type="button" variant="primary" mode="lighter" size="large" block onClick={() => { setChoosingAdd(false); setAsking(true); }}>
                <DibbyMark size={20} />
                Let Dibby suggest a few
              </Button.Root>
            </div>
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>

      {lock && leader && (
        <Modal.Root open={locking} onOpenChange={(o) => !lockBusy && setLocking(o)}>
          <Modal.Content>
            <Modal.Header title={tied ? "Lock it in?" : `Lock in ${leader.label}?`} />
            <Modal.Body>
              {tied
                ? `It's a tie, so Dibby spins between the ones in front. Voting closes and everyone sees where it's at.`
                : `It's in front with ${leader.votes} ${leader.votes === 1 ? "vote" : "votes"}. Voting closes and everyone sees where it's at.`}
            </Modal.Body>
            <Modal.Footer>
              <Button.Root
                type="button"
                variant="dibs"
                size="large"
                block
                disabled={lockBusy}
                onClick={() =>
                  startLock(async () => {
                    await send(lock, { what: "that" });
                    setLocking(false);
                  })
                }
              >
                {lockBusy ? "Locking it in…" : tied ? "Spin for it" : `Lock in ${leader.label}`}
              </Button.Root>
              {decide && (
                <Button.Root type="button" variant="neutral" mode="lighter" size="large" block disabled={lockBusy} onClick={() => { setLocking(false); setDeciding(true); }}>
                  Pick somewhere else
                </Button.Root>
              )}
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
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
