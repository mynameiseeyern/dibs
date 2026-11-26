"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { PLAN_EXTRAS } from "@dibs/shared/plans";
import { locate } from "@/lib/locate";
import { createPlan } from "../actions";
import { FieldError, FormError } from "@/components/Field";
import * as Button from "@/components/ui/button";
import { PlacePicker, isTyped, type PlacePick } from "@/components/PlacePicker";
import { PlaceCard } from "@/components/PlaceCard";
import { DayStrip, dateLabel, sydneyToday, timeLabel } from "@/components/DateTime";
import { DibbyMark } from "@/components/Logo";
import { DibbyWorking } from "@/components/DibbyWorking";
import { AgreeLine } from "@/components/AgreeLine";
import { Chip, SearchChips, type SearchValue } from "./chips";
import { useCyclingPlaceholder } from "./DibbyBubble";
import type { Organising } from "./Organiser";
import { BigTime } from "./BigTime";
import { readPlanText } from "@dibs/shared/plan-text";
import { DibbyAsks, type Pose } from "./DibbyAsks";
import { DibbyHello } from "./DibbyHello";
import "./plan-flow.css";
import "./dibby-asks.css";
import { TIME_PRESETS } from "@dibs/shared/daypart";

type Step = "what" | "when" | "where" | "dibby" | "who";
type Where = "place" | "vote" | "dibby";

/** Ideas for the name. Each one that has a matching category sets it too. */
const IDEAS: { label: string; category?: string }[] = [
  { label: "Dinner", category: "Food" },
  { label: "Drinks", category: "Drinks" },
  { label: "Beach day", category: "Social" },
  { label: "Movie night", category: "Social" },
  { label: "Study sesh" },
  { label: "Birthday", category: "Social" },
];

/** Quick times: parts of the day, not meals. Each is a fixed fact, like any time someone picks. */
const TIMES = TIME_PRESETS;

/** Which screen a field lives on, so a problem from the server takes you back to it. */
const FIELD_STEP: Record<string, Step> = {
  title: "what",
  place: "where",
  area: "where",
  ask: "dibby",
  first_name: "who",
  last_name: "who",
};

function addDay(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "Tomorrow, 7pm", "Sat 31 Oct", "7pm" or null: the answer so far, said back big. */
function whenLine(date: string | null, time: string | null): string | null {
  const today = sydneyToday();
  const day = !date ? null : date === today ? "Today" : date === addDay(today, 1) ? "Tomorrow" : dateLabel(date);
  const at = time ? timeLabel(time) : null;
  return [day, at].filter(Boolean).join(", ") || null;
}

/** Dibby's question on each screen, in his bubble. */
const QUESTION: Record<Step, string> = {
  what: "What are we doing?",
  when: "When are we going?",
  where: "Where are we going?",
  dibby: "What are you after?",
  who: "Last thing, what’s your name?",
};
/** His pose for each question (the app's too), and a smaller Dibby where the answers need the room. */
const POSE: Record<Step, Pose> = { what: "think", when: "phone", where: "point", dibby: "look", who: "hi" };
const SIZE: Record<Step, number> = { what: 112, when: 88, where: 112, dibby: 112, who: 88 };
const ORDER: Step[] = ["what", "when", "where", "dibby", "who"];

/**
 * Making a plan, one question a screen, the same as the app (apps/mobile/app/new.tsx): Dibby asks
 * each one, centred, the question in his speech bubble, and jumps on the spot to the next
 * (DibbyAsks). One thing to answer under him and one button pinned at the bottom. A slim bar beside
 * the back button shows how far through you are.
 *
 * The first screen takes the whole plan as a sentence ("dumplings fri arvo near Newtown" fills in
 * the name, day, time and area with readPlanText, no AI) and skips what it answers; the home page's
 * box sends what you typed as ?q=, which starts it the same way. What, when, where (and what
 * Dibby's after, if Dibby's finding spots), then your name if this browser's never organised.
 * Everything posts together to createPlan.
 */
export function PlanFlow({ organising, searchPass, initialAsk }: { organising: Organising; searchPass?: string; initialAsk?: string }) {
  // Someone new, starting from nothing: Dibby says hi first (DibbyHello decides if this browser has met him).
  const [hello, setHello] = useState(organising.kind === "new" && !initialAsk?.trim());
  const [step, setStep] = useState<Step>("what");
  /** 1 going forward, -1 back: which side the answers slide in from. */
  const [dir, setDir] = useState<1 | -1>(1);
  const [draft, setDraft] = useState("");
  /** A word on the first screen when the typed plan didn't say what it is. */
  const [nudge, setNudge] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [exact, setExact] = useState(false);
  // Nothing picked until someone picks: no option is the "right" one.
  const [where, setWhere] = useState<Where | null>(null);
  const [place, setPlace] = useState<PlacePick | null>(null);
  const [picking, setPicking] = useState(false);
  const [area, setArea] = useState("");
  const [ask, setAsk] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [search, setSearch] = useState<SearchValue>({ spend: null, near: null });
  const [err, setErr] = useState<{ field?: string; msg: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const draftRef = useRef<HTMLInputElement>(null);
  const placeholder = useCyclingPlaceholder(step === "dibby" && ask === "");
  const needsWho = organising.kind === "new";
  // Dibby can be reached two ways: "Not sure? Let Dibby plan it" on the first question, or
  // "Ask Dibby" on where. Back goes the way you came.
  const viaDibby = useRef(false);

  // Dibby searches near you: asked for on "Let Dibby pick", not before. Turning Near me off means no.
  const nearDeclined = useRef(false);
  const [state, action, pending] = useActionState(async (s: Awaited<ReturnType<typeof createPlan>>, f: FormData) => {
    if (f.get("where") === "dibby" && !f.get("near_lat") && !nearDeclined.current) {
      const c = await locate({ ask: true });
      if (c) {
        f.set("near_lat", String(c.lat));
        f.set("near_lng", String(c.lng));
        setSearch((v) => ({ ...v, near: c }));
      }
    }
    return createPlan(s, f);
  }, undefined);

  // Near me is on straight away for Dibby if location's already allowed. Nothing pops up here.
  const locChecked = useRef(false);
  useEffect(() => {
    if (where !== "dibby" || search.near || locChecked.current) return;
    locChecked.current = true;
    locate({ ask: false }).then((c) => c && setSearch((v) => ({ ...v, near: c })));
  }, [where, search.near]);

  // The way through: what → when → where (→ dibby) (→ who), or through Dibby what → when → dibby (→ who).
  const path: Step[] = ["what", "when", ...(viaDibby.current && where === "dibby" ? [] : (["where"] as Step[])), ...(where === "dibby" ? (["dibby"] as Step[]) : []), ...(needsWho ? (["who"] as Step[]) : [])];
  const lastStep = path[path.length - 1];

  const go = (s: Step) => {
    setErr(null);
    setNudge(null);
    setDir(ORDER.indexOf(s) >= ORDER.indexOf(step) ? 1 : -1);
    setStep(s);
    window.scrollTo({ top: 0 });
  };
  const forward = (from: Step) => {
    const nextStep = path[path.indexOf(from) + 1];
    if (nextStep) go(nextStep);
    else submit();
  };
  const submit = () => {
    // Put the keyboard away before the page moves on, or iPhones keep its space.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    formRef.current?.requestSubmit();
  };

  // A problem from the server: back to the screen it's about, with the cursor in the field.
  useEffect(() => {
    if (!state?.error) return;
    const s = state.field ? FIELD_STEP[state.field] : undefined;
    setErr({ field: state.field, msg: state.error });
    if (s) setStep(s);
    requestAnimationFrame(() => {
      const el = state.field ? formRef.current?.querySelector<HTMLElement>(`[name="${state.field}"]:not([type=hidden]), [data-field="${state.field}"]`) : null;
      el?.focus({ preventScroll: true });
    });
  }, [state]);

  /** "Dinner", or a whole sentence typed in: keep what it says, skip what's answered. */
  function answerWhat(raw: string) {
    const text = raw.trim();
    if (!text) return;
    const r = readPlanText(text);
    if (!r.title) {
      // Only a day or time, no name: keep them, and ask for the name.
      if (r.date) setDate(r.date);
      if (r.time) setTime(r.time);
      const got = whenLine(r.date, r.time);
      setNudge(got ? `Got ${got.charAt(0).toLowerCase()}${got.slice(1)}. What are we doing?` : "Give it a name, like “Friday dinner”.");
      return;
    }
    setDraft(text);
    setTitle(r.title);
    setCategory(r.category ?? IDEAS.find((i) => i.label === r.title)?.category ?? null);
    if (r.date) setDate(r.date);
    if (r.time) setTime(r.time);
    if (r.area) setArea(r.area);
    // What you typed is a good brief for Dibby too, if it comes to that.
    if (!ask) setAsk(text);
    if (where === "dibby" && viaDibby.current) {
      setWhere(null);
      viaDibby.current = false;
    }
    // Day and time both said: skip "when".
    go(r.date && r.time ? "where" : "when");
  }

  // Opened from the home page with something already typed: start with it.
  const startedWith = useRef(false);
  useEffect(() => {
    if (startedWith.current || !initialAsk?.trim()) return;
    startedWith.current = true;
    answerWhat(initialAsk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAsk]);

  /** The big button. */
  const next = () => {
    setErr(null);
    if (step === "what") return answerWhat(draft);
    if (step === "when") {
      if (!date && !time) setExact(false);
      return forward("when");
    }
    if (step === "where") {
      if (!where) return setErr({ field: "place", msg: "Pick one to keep going." });
      if (where === "place" && !place) return setErr({ field: "place", msg: "Pick the place, or let the crew vote." });
      return forward("where");
    }
    if (step === "dibby") {
      if (!ask.trim() && !search.spend) return setErr({ field: "ask", msg: "Tell Dibby what you're after, like “dumplings” or “bowling”." });
      return forward("dibby");
    }
    if (step === "who") {
      if (!first.trim()) return setErr({ field: "first_name", msg: "Add your first name." });
      if (!last.trim()) return setErr({ field: "last_name", msg: "Add your last name." });
      return submit();
    }
  };
  const back = () => {
    const i = path.indexOf(step);
    go(i > 0 ? path[i - 1] : "what");
  };

  const errFor = (field: string) => (err?.field === field ? err.msg : undefined);
  const stage = (s: Step): Step => (s === "dibby" ? "where" : s);
  const bar: Step[] = needsWho ? ["what", "when", "where", "who"] : ["what", "when", "where"];
  const at = Math.max(0, bar.indexOf(stage(step)));
  const line = whenLine(date, time);
  const isLast = step === lastStep && step !== "what" && step !== "when" && !(step === "where" && where === "dibby");
  const ready = step === "what" ? Boolean(draft.trim()) : step === "where" ? Boolean(where && (where !== "place" || place)) : step === "dibby" ? Boolean(ask.trim() || search.spend) : true;
  const label = pending
    ? where === "dibby"
      ? "Dibby's on it…"
      : "Making it…"
    : isLast
      ? where === "dibby"
        ? "Let Dibby pick"
        : "Make the plan"
      : step === "when" && !date && !time
        ? "Decide later"
        : "Continue";

  return (
    <form
      ref={formRef}
      noValidate
      className="pf"
      // Posted by hand rather than through the form's action prop, so a problem from the server
      // doesn't wipe what someone typed (React resets a form after its action runs).
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        startTransition(() => action(f));
      }}
      onKeyDown={(e) => {
        // Enter is the big button, on every screen.
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
          e.preventDefault();
          if (!pending) next();
        }
      }}
    >
      {/* Everything the server needs, whichever screen it was answered on. */}
      <input type="hidden" name="where" value={where ?? ""} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="category" value={category ?? ""} />
      <input type="hidden" name="pick_date" value={date ?? ""} />
      <input type="hidden" name="pick_time" value={time ?? ""} />
      <input type="hidden" name="vibe" value="chill" />
      {where !== "place" && <input type="hidden" name="area" value={area} />}
      {where === "dibby" && <input type="hidden" name="ask" value={ask} />}
      {needsWho && (
        <>
          <input type="hidden" name="first_name" value={first} />
          <input type="hidden" name="last_name" value={last} />
        </>
      )}
      {/* Every extra starts on; the organiser can switch any off from the plan. */}
      {PLAN_EXTRAS.map((x) => (
        <input key={x.id} type="hidden" name={`extra_${x.id}`} value="on" />
      ))}
      {where === "place" &&
        place &&
        (isTyped(place) ? (
          <>
            <input type="hidden" name="venue_custom_name" value={place.name} />
            <input type="hidden" name="venue_custom_address" value={place.address ?? ""} />
          </>
        ) : (
          <input type="hidden" name="venue_place_id" value={place.placeId} />
        ))}

      <header className="pf-top">
        {step === "what" ? (
          <Button.Root asChild variant="neutral" mode="ghost" size="large" className="pf-top__back">
            <a href="/" aria-label="Close">
              <Button.Icon as="i" className="ri-close-line" />
            </a>
          </Button.Root>
        ) : (
          <Button.Root type="button" variant="neutral" mode="ghost" size="large" className="pf-top__back" aria-label="Back" onClick={back} disabled={pending}>
            <Button.Icon as="i" className="ri-arrow-left-line" />
          </Button.Root>
        )}
        <div className="pf-steps" role="img" aria-label={`Step ${at + 1} of ${bar.length}`}>
          {bar.map((s, i) => (
            <span key={s} className={i <= at ? "on" : undefined} />
          ))}
        </div>
        <span className="pf-top__gap" />
      </header>

      {/* Dibby asks: centred, the question in his bubble. He jumps on the spot between questions. */}
      {/* Remounted once the hello's over, so he says the first question after landing. */}
      <DibbyAsks key={hello ? "hello" : "asks"} pose={POSE[step]} question={QUESTION[step]} size={SIZE[step]} id="pf-q" />
      {hello ? <DibbyHello onDone={() => setHello(false)} /> : null}

      {err && !err.field && <FormError error={err.msg} />}

      <section key={step} className={`pf-step ${dir === 1 ? "pf-in-next" : "pf-in-back"}`} aria-labelledby="pf-q">
        {step === "what" && (
          <>
            <div>
              <input
                ref={draftRef}
                className="pf-big"
                data-field="title"
                aria-labelledby="pf-q"
                placeholder="Dumplings fri arvo"
                autoComplete="off"
                enterKeyHint="next"
                maxLength={120}
                value={draft}
                aria-invalid={errFor("title") ? true : undefined}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setNudge(null);
                  if (err?.field === "title") setErr(null);
                }}
              />
              {nudge && <p className="paragraph-md muted pf-nudge">{nudge}</p>}
              <FieldError error={errFor("title")} />
            </div>
            <div className="pf-chips">
              {IDEAS.map((i) => (
                <Chip key={i.label} on={title === i.label} onClick={() => answerWhat(i.label)}>
                  {i.label}
                </Chip>
              ))}
            </div>
            <button
              type="button"
              className="pf-dibby-line"
              onClick={() => {
                setWhere("dibby");
                viaDibby.current = true;
                go("when");
              }}
            >
              <DibbyMark size={32} />
              <span>Not sure? Let Dibby plan it</span>
            </button>
          </>
        )}

        {step === "when" && (
          <>
            {line && <p className="pf-echo pf-echo--centre" aria-live="polite">{line}</p>}
            <DayStrip label="Day" value={date} onChange={setDate} bleed />
            {exact ? (
              <div className="pf-exact">
                <p className="label-sm muted">Tap a number to type it</p>
                <BigTime value={time ?? "19:00"} onChange={setTime} />
                <Button.Root type="button" variant="primary" mode="ghost" className="pf-link" onClick={() => setExact(false)}>
                  Back to quick picks
                </Button.Root>
              </div>
            ) : (
              <div className="pf-exact">
                <div className="pf-chips" role="group" aria-label="Time">
                  {TIMES.map((t) => (
                    <Chip key={t.label} on={time === t.at} onClick={() => setTime(time === t.at ? null : t.at)}>
                      {t.label} <span className="pf-chip__at">{timeLabel(t.at)}</span>
                    </Chip>
                  ))}
                </div>
                <Button.Root
                  type="button"
                  variant="primary"
                  mode="ghost"
                  className="pf-link"
                  onClick={() => {
                    if (!time) setTime("19:00");
                    setExact(true);
                  }}
                >
                  Pick an exact time
                </Button.Root>
              </div>
            )}
          </>
        )}

        {step === "where" && (
          <>
            <div className="pf-choices" role="group" aria-label="Where" data-field="place">
              <button type="button" className="pf-choice" aria-pressed={where === "place"} onClick={() => { setWhere("place"); setPicking(true); setErr(null); }}>
                <span className="pf-choice__ico"><i className="ri-map-pin-2-line" aria-hidden="true" /></span>
                <span className="pf-choice__text"><b>{where === "place" && place ? place.name : "I’ve got a spot"}</b><span>{where === "place" && place ? "Tap to change it" : "Find it on the map"}</span></span>
              </button>
              <button type="button" className="pf-choice" aria-pressed={where === "vote"} onClick={() => { setWhere("vote"); setErr(null); }}>
                <span className="pf-choice__ico"><i className="ri-bar-chart-2-line" aria-hidden="true" /></span>
                <span className="pf-choice__text"><b>Let the crew vote</b><span>Everyone chucks in ideas. Most votes wins</span></span>
              </button>
              <button type="button" className="pf-choice" aria-pressed={where === "dibby"} onClick={() => { setWhere("dibby"); viaDibby.current = false; setErr(null); }}>
                <span className="pf-choice__ico pf-choice__ico--dibby"><DibbyMark size={48} /></span>
                <span className="pf-choice__text"><b>Ask Dibby</b><span>Three real spots for the crew to vote on</span></span>
              </button>
            </div>
            <FieldError error={errFor("place")} />
            {where === "place" && place && isTyped(place) && place.address && <p className="paragraph-sm muted">{place.address} · only people in the plan see this</p>}
            <PlacePicker
              open={picking}
              onOpenChange={setPicking}
              title="Where's it at?"
              cta="Use this place"
              pass={searchPass}
              onPick={(p) => {
                setPlace(p);
                setWhere("place");
                setErr(null);
              }}
            />
          </>
        )}

        {step === "dibby" && (
          <>
            <div>
              <input
                className="pf-big"
                data-field="ask"
                aria-labelledby="pf-q"
                value={ask}
                onChange={(e) => {
                  setAsk(e.target.value);
                  if (err?.field === "ask") setErr(null);
                }}
                placeholder={placeholder}
                maxLength={500}
                autoComplete="off"
                aria-invalid={errFor("ask") ? true : undefined}
              />
              <FieldError error={errFor("ask")} />
            </div>
            <SearchChips
              value={search}
              onChange={(v) => {
                if (search.near && !v.near) nearDeclined.current = true;
                if (v.near) nearDeclined.current = false;
                setSearch(v);
              }}
            />
            <p className="paragraph-xs muted">Dibby finds spots, not a day or time. What you type goes to Anthropic, the AI company behind Dibby, so it can find spots. It&rsquo;s not used to train their models.</p>
            {pending && <DibbyWorking where={search.near ? "near you" : null} />}
          </>
        )}

        {step === "who" && (
          <>
            <p className="paragraph-md muted pf-centre">So the crew knows who&rsquo;s organising. No account needed.</p>
            <div className="pf-names">
              <label className="pf-name">
                <span className="label-sm muted">First name</span>
                <input className="pf-big" data-field="first_name" autoComplete="given-name" maxLength={40} value={first} onChange={(e) => setFirst(e.target.value)} aria-invalid={errFor("first_name") ? true : undefined} />
                <FieldError error={errFor("first_name")} />
              </label>
              <label className="pf-name">
                <span className="label-sm muted">Last name</span>
                <input className="pf-big" data-field="last_name" autoComplete="family-name" maxLength={40} value={last} onChange={(e) => setLast(e.target.value)} aria-invalid={errFor("last_name") ? true : undefined} />
                <FieldError error={errFor("last_name")} />
              </label>
            </div>
            <p className="paragraph-sm muted">
              Got an account? <a href="/login?next=/new">Sign in</a>
            </p>
            <AgreeLine />
            {pending && where === "dibby" && <DibbyWorking where={search.near ? "near you" : null} />}
          </>
        )}
      </section>

      <div className="dock">
        <div className="dock__inner">
          <Button.Root type="button" variant={isLast ? "dibs" : "primary"} size="large" block disabled={pending || !ready} onClick={next}>
            {label}
          </Button.Root>
        </div>
      </div>
    </form>
  );
}
