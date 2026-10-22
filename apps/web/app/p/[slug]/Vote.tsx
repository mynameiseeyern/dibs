"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import type { PlanOption } from "@dibs/shared/types";
import type { FormState } from "./actions";
import { Fresh } from "@/components/moments/Fresh";
import { PlacePicker } from "@/components/PlacePicker";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

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
  const total = shownRows.reduce((n, r) => n + r.votes, 0);
  const top = Math.max(0, ...shownRows.map((r) => r.votes));
  const [picking, setPicking] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<VoteRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const canRemove = (r: VoteRow) => !readOnly && Boolean(remove) && open && (canRemoveAll || (meId !== null && r.added_by === meId));
  const anyRemovable = rows.some(canRemove);

  const confirmRemove = async () => {
    if (!confirming || !remove) return;
    setRemoving(true);
    const res = await remove(confirming.id);
    setRemoving(false);
    setConfirming(null);
    setOpenRow(null);
    if (res.error) toast.error(res.error);
    else toast.success(`Took ${res.label ?? confirming.label} off the vote`);
  };

  return (
    <Fresh>
      {rows.length === 0 && <p className="paragraph-sm muted">No options yet. Add a place, or ask Dibby.</p>}
      {anyRemovable && (
        <p className="paragraph-xs muted">{canRemoveAll ? "Swipe an option left to take it off." : "Swipe a place you added left to take it off."}</p>
      )}
      {shownRows.map((r) => {
        const share = total ? Math.round((r.votes / total) * 100) : 0;
        const winning = top > 0 && r.votes === top;
        const option = (
          <button
            type="button"
            className={`db-vote${winning ? " db-vote--winning" : ""}`}
            aria-pressed={r.mine}
            disabled={!canVote || !open}
            aria-busy={voting && r.mine ? true : undefined}
            onClick={() => {
              if (openRow === r.id) return setOpenRow(null);
              if (readOnly) return void toast.info(readOnly);
              if (r.mine) return;
              startVote(async () => {
                moveVote(r.id);
                await vote(r.id);
              });
            }}
          >
            <span className="db-vote__title">{r.label}</span>
            <span className="db-vote__meta">
              {r.votes} {r.votes === 1 ? "vote" : "votes"}
              {r.mine ? " · you voted" : ""}
              {r.note ? ` · ${r.note}` : ""}
            </span>
            <span className="db-vote__count">{r.votes}</span>
            <span className="db-vote__bar">
              <span style={{ width: `${share}%` }} />
            </span>
          </button>
        );
        return canRemove(r) ? (
          <SwipeRow
            key={r.id}
            freshId={r.id}
            open={openRow === r.id}
            onOpenChange={(o) => setOpenRow(o ? r.id : null)}
            label={r.label}
            onDelete={() => setConfirming(r)}
          >
            {option}
          </SwipeRow>
        ) : (
          <div key={r.id} data-fresh-id={r.id}>
            {option}
          </div>
        );
      })}

      {canVote && open && rows.length < 8 && (
        <Button.Root type="button" variant="neutral" mode="lighter" block disabled={adding} onClick={() => (readOnly ? toast.info(readOnly) : setPicking(true))}>
          <i className="ri-map-pin-add-line db-icon" aria-hidden="true" />
          {adding ? "Adding…" : "Add a place"}
        </Button.Root>
      )}

      <PlacePicker
        open={picking}
        onOpenChange={setPicking}
        title="Add a place to the vote"
        cta="Add"
        area={area}
        exclude={rows.map((r) => r.place_id).filter((id): id is string => Boolean(id))}
        onPick={(p) => {
          const f = new FormData();
          f.set("place_id", p.placeId);
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
    </Fresh>
  );
}

const REVEAL = 96;

/**
 * Swipe left to show Delete behind a vote option. Tapping the option while it's open closes it.
 * Keyboard and screen readers get the same Delete button: tabbing to it slides the row open.
 */
function SwipeRow({
  freshId,
  open,
  onOpenChange,
  label,
  onDelete,
  children,
}: {
  freshId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const axis = useRef<"x" | "y" | null>(null);
  const moved = useRef(false);
  const [drag, setDrag] = useState<number | null>(null);
  const offset = drag ?? (open ? -REVEAL : 0);

  return (
    <div className="vote-swipe" data-fresh-id={freshId}>
      <button
        type="button"
        className="vote-swipe__delete"
        aria-label={`Take ${label} off the vote`}
        onFocus={() => onOpenChange(true)}
        onClick={onDelete}
      >
        <i className="ri-delete-bin-line db-icon" aria-hidden="true" />
        <span>Delete</span>
      </button>
      <div
        className="vote-swipe__front"
        data-dragging={drag !== null || undefined}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          start.current = { x: e.clientX, y: e.clientY, base: open ? -REVEAL : 0 };
          axis.current = null;
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (!axis.current) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
            if (axis.current === "x") e.currentTarget.setPointerCapture(e.pointerId);
          }
          if (axis.current !== "x") return;
          moved.current = true;
          setDrag(Math.max(-REVEAL - 24, Math.min(0, s.base + dx)));
        }}
        onPointerUp={() => {
          if (drag !== null) onOpenChange(drag < -REVEAL / 2);
          setDrag(null);
          start.current = null;
        }}
        onPointerCancel={() => {
          setDrag(null);
          start.current = null;
        }}
        // A swipe isn't a tap: don't let it vote.
        onClickCapture={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
