"use client";

// Dev-only: the Dibs-only components, each in its states (default, active, disabled or
// read-only, loading), so they can be checked in light and dark side by side (ARV-38).

import type { Message, PlanMember } from "@dibs/shared/types";
import * as Badge from "@/components/ui/badge";
import * as Button from "@/components/ui/button";
import { ActionForm } from "@/components/ActionForm";
import { Monogram, MonogramStack } from "@/components/Monogram";
import { VibePick } from "@/components/VibePick";
import { VoteList, type VoteRow } from "../p/[slug]/Vote";
import { WhenWorks } from "../p/[slug]/WhenWorks";
import { Thread } from "../p/[slug]/Thread";
import { Wheel } from "../p/[slug]/bills/Wheel";

const NOW = "2026-10-24T08:00:00Z";
const noop = async () => {};
const ok = async () => ({});
const never = () => new Promise<never>(() => {});

const member = (id: string, name: string, colour: PlanMember["colour"], extra: Partial<PlanMember> = {}): PlanMember => ({
  id,
  plan_id: "p",
  user_id: id,
  guest_id: null,
  role: "guest",
  display_name: name,
  colour,
  rsvp: "in",
  plus_one: false,
  waitlisted: false,
  attended: null,
  dibby_muted: false,
  joined_at: NOW,
  ...extra,
});
const EE = member("ee", "Ee Ng", "violet", { role: "organiser" });
const SAM = member("sam", "Sam Lee", "sun");
const JO = member("jo", "Jo Tan", "mint", { rsvp: "maybe" });
const CREW = [EE, SAM, JO];

const option = (id: string, label: string, note: string | null, votes: number, mine = false): VoteRow => ({
  id,
  plan_id: "p",
  kind: "venue",
  place_id: null,
  label,
  note,
  added_by: "ee",
  created_at: NOW,
  votes,
  mine,
});
const OPTIONS = [option("a", "Ee's place", "12 Smith St, Newtown", 2, true), option("b", "Victoria Park", "By the pool", 1)];

const msg = (id: string, kind: Message["kind"], memberId: string | null, body: string, mins: number): Message => ({
  id,
  plan_id: "p",
  member_id: memberId,
  kind,
  body,
  mentions_dibby: body.includes("@dibby"),
  auto: false,
  template: null,
  created_at: new Date(Date.parse(NOW) + mins * 60_000).toISOString(),
});
const MESSAGES = [
  msg("1", "system", null, "Ee made the plan.", 0),
  msg("2", "text", "sam", "I'm keen. Can we do 7?", 2),
  msg("3", "text", "ee", "@dibby somewhere with dumplings near Haymarket", 3),
  msg("4", "dibby", null, "Say less. Mamak and Din Tai Fung are on the vote.", 3),
];

const whenRows = (mine: boolean) => [
  { id: "t1", label: "Fri 6 Nov", short: "Fri 6 Nov", free: mine ? [EE, SAM] : [SAM], mine, wholeDay: true },
  { id: "t2", label: "Sat 7 Nov", short: "Sat 7 Nov", free: [], mine: false, wholeDay: true },
];

function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="state">
      <span className="state__label">{label}</span>
      {children}
    </div>
  );
}

function Piece({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="section">
      <h2 className="title-h5">{title}</h2>
      <div className="states">{children}</div>
    </section>
  );
}

export function DibsPieces() {
  return (
    <>
      <h2 className="title-h4">Dibby pieces</h2>

      <Piece title="Plan card">
        <State label="Default">
          <article className="db-card db-plan db-card--sticker">
            <div className="plan-card__top">
              <Badge.Root color="success"><Badge.Icon as="i" className="ri-lock-2-line" aria-hidden="true" />Locked in</Badge.Root>
            </div>
            <h3 className="title-h3 plan-title">Friday dumplings</h3>
            <ul className="db-plan__facts">
              <li><i className="ri-calendar-line db-icon" aria-hidden="true" /> Fri 30 Oct · 7:00 pm</li>
              <li><i className="ri-map-pin-line db-icon" aria-hidden="true" /> Mamak Haymarket</li>
            </ul>
            <div className="db-plan__foot">
              <MonogramStack people={[EE, SAM]} />
              <Badge.Root color="accent">2 in</Badge.Root>
            </div>
          </article>
        </State>
        <State label="Called off (disabled)">
          <article className="db-card db-plan">
            <div className="plan-card__top">
              <Badge.Root color="faded"><Badge.Icon as="i" className="ri-close-line" aria-hidden="true" />Called off</Badge.Root>
            </div>
            <h3 className="title-h3 plan-title">Friday dumplings</h3>
            <p className="label-sm plan-card__note plan-card__note--off" role="status">
              <i className="ri-close-circle-line db-icon" aria-hidden="true" />
              <span>This one&rsquo;s not happening. Nobody owes anything for it.</span>
            </p>
          </article>
        </State>
        <State label="Loading">
          <article className="db-card db-plan" aria-busy="true" aria-label="Loading the plan">
            <span className="skeleton skeleton--badge" />
            <span className="skeleton skeleton--title" />
            <span className="skeleton skeleton--line" />
            <span className="skeleton skeleton--line skeleton--short" />
          </article>
        </State>
      </Piece>

      <Piece title="Vote">
        <State label="Open · your pick (active)">
          <VoteList rows={OPTIONS} canVote open vote={noop} add={ok} meId="ee" readOnly={null} area="Newtown" canRemoveAll />
        </State>
        <State label="Read only (maybe)">
          <VoteList rows={OPTIONS} canVote open vote={noop} add={ok} meId="jo" readOnly="You're a maybe, so you can only read along. Tap I'm in to vote and chat." area="Newtown" />
        </State>
        <State label="Closed (disabled)">
          <VoteList rows={OPTIONS} canVote open={false} vote={noop} add={ok} meId="ee" readOnly={null} area="Newtown" />
        </State>
      </Piece>

      <Piece title="Which day works?">
        <State label="Empty (host)">
          <WhenWorks rows={[]} bestId={null} outOf={2} me={EE} readOnly={null} isHost max={4} actions={{ markFree: ok, add: ok }} />
        </State>
        <State label="Ticked (active), with a best day">
          <WhenWorks rows={whenRows(true)} bestId="t1" outOf={2} me={EE} readOnly={null} isHost={false} max={4} actions={{ markFree: ok }} />
        </State>
        <State label="Read only (maybe)">
          <WhenWorks rows={whenRows(false)} bestId="t1" outOf={2} me={JO} readOnly="You're a maybe, so you can only read along." isHost={false} max={4} actions={{ markFree: ok }} />
        </State>
      </Piece>

      <Piece title="Chat">
        <State label="Default (me, a mate, Dibby, system)">
          <Thread messages={MESSAGES} members={CREW} meId="ee" canPost vibe="chill" post={async () => undefined} />
        </State>
        <State label="Read only (maybe)">
          <Thread messages={MESSAGES.slice(0, 2)} members={CREW} meId="jo" canPost readOnly="You're a maybe, so you can only read along." vibe="chill" post={async () => undefined} />
        </State>
      </Piece>

      <Piece title="Bill split">
        <State label="Owes · paid, waiting · square · saving">
          <div className="db-card db-split">
            <div className="db-split__total">
              <span className="label-md">Dinner at Mamak</span>
              <span className="db-split__amount money">$124.00</span>
            </div>
            <div className="db-split__row">
              <Monogram name="Sam Lee" colour="sun" size="sm" />
              <span className="db-split__who">Sam Lee<small>Owes</small></span>
              <span className="db-split__owe">$41.33</span>
            </div>
            <div className="db-split__row">
              <Monogram name="Jo Tan" colour="mint" size="sm" />
              <span className="db-split__who">Jo Tan<small>Says they&rsquo;ve paid</small></span>
              <ActionForm action={noop} size="small" label="Confirm" ariaLabel="Confirm Jo paid" />
            </div>
            <div className="db-split__row">
              <Monogram name="Ee Ng" colour="violet" size="sm" />
              <span className="db-split__who">Ee Ng<small>Paid</small></span>
              <Badge.Root color="success"><Badge.Icon as="i" className="ri-check-line" aria-hidden="true" />Square</Badge.Root>
            </div>
            <div className="db-split__row">
              <Monogram name="Mo Ali" colour="sky" size="sm" />
              <span className="db-split__who">Mo Ali<small>Says they&rsquo;ve paid</small></span>
              <ActionForm action={never} size="small" label="Confirm" ariaLabel="Confirm Mo paid (tap to see Saving…)" />
            </div>
          </div>
        </State>
      </Piece>

      <Piece title="Vibe switch">
        <State label="Default · picked (active)">
          <VibePick value="extra" onPick={() => {}} />
        </State>
      </Piece>

      <Piece title="Spin the wheel">
        <State label="Idle">
          <Wheel names={["Ee", "Sam", "Jo", "Mo"]} loserIndex={null} mode="idle" />
        </State>
        <State label="Landed">
          <Wheel names={["Ee", "Sam", "Jo", "Mo"]} loserIndex={2} mode="landed" />
        </State>
      </Piece>

      <Piece title="Actions">
        <State label="Default · disabled · saving">
          <div className="db-stack">
            <Button.Root block>I&rsquo;ve paid Ee</Button.Root>
            <Button.Root block disabled>I&rsquo;ve paid Ee</Button.Root>
            <ActionForm action={never} block icon="ri-check-line" label="Tap me: I've paid Ee" />
          </div>
        </State>
      </Piece>
    </>
  );
}
