"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { PLAN_EXTRAS } from "@dibs/shared/plans";
import { TIME_PRESETS } from "@dibs/shared/daypart";
import { readPlanText, saysLater } from "@dibs/shared/plan-text";
import { locate } from "@/lib/locate";
import { createPlan } from "../actions";
import { FieldError } from "@/components/Field";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import * as Badge from "@/components/ui/badge";
import { PlacePicker, isTyped, type PlacePick } from "@/components/PlacePicker";
import { PlaceCard } from "@/components/PlaceCard";
import { DayStrip, dateLabel, sydneyToday, timeLabel } from "@/components/DateTime";
import { DibbyMark } from "@/components/Logo";
import { DibbyWorking } from "@/components/DibbyWorking";
import { DibbyLive, type DibbyState } from "@/components/DibbyLive";
import { Chip, SearchChips, SPENDS, type SearchValue } from "./chips";
import { useCyclingPlaceholder } from "./DibbyBubble";
import type { Organising } from "./Organiser";
import { BigTime } from "./BigTime";
import "./plan-flow.css";
import "./plan-chat.css";

type Step = "what" | "when" | "where" | "dibby" | "who";
type Where = "place" | "vote" | "dibby";

/** Ideas for the name. Each one that has a matching category sets it too. Same as the form. */
const IDEAS: { label: string; category?: string }[] = [
  { label: "Dinner", category: "Food" },
  { label: "Drinks", category: "Drinks" },
  { label: "Beach day", category: "Social" },
  { label: "Movie night", category: "Social" },
  { label: "Study sesh" },
  { label: "Birthday", category: "Social" },
];

const TIMES = TIME_PRESETS;

/** Which turn a field lives on, so a problem from the server takes you back to it. */
const FIELD_STEP: Record<string, Step> = {
  title: "what",
  place: "where",
  area: "where",
  ask: "dibby",
  first_name: "who",
  last_name: "who",
};

/** How long Dibby "reads" before answering. Long enough to see, short enough not to wait on. */
const THINK_MS = 650;
const TALK_MS = 900;
/** Stop typing this long and Dibby tilts its head. */
const PAUSE_MS = 1500;

function addDay(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "Tomorrow, 7pm", "Sat 31 Oct", "7pm" or null: the answer so far, said back. */
function whenLine(date: string | null, time: string | null): string | null {
  const today = sydneyToday();
  const day = !date ? null : date === today ? "Today" : date === addDay(today, 1) ? "Tomorrow" : dateLabel(date);
  const at = time ? timeLabel(time) : null;
  return [day, at].filter(Boolean).join(", ") || null;
}

/** "Today, 3pm" → "today, 3pm" mid-sentence; day names keep their capital ("Sat 7 Nov"). */
const lc = (s: string) => s.replace(/^(Today|Tomorrow)\b/, (w) => w.toLowerCase());
const pick = <T,>(xs: T[], seed: string) => xs[[...seed].reduce((n, c) => n + c.charCodeAt(0), 0) % xs.length];

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Making a plan as a chat with Dibby. Same questions, controls and checks as the old one-a-screen
 * form (PlanFlow): what, when, where, then Dibby's brief or your name. The difference is how it
 * feels: Dibby asks, your answers stack up as replies you can tap to change, and you can type
 * instead of tapping. Typing "dumplings fri arvo near Newtown" answers what and when in one go
 * (readPlanText: only words you typed, never a made-up day or time). Everything posts together to
 * createPlan, exactly like the form.
 */
export function PlanChat({ organising, searchPass, initialAsk }: { organising: Organising; searchPass?: string; initialAsk?: string }) {
  const [step, setStep] = useState<Step>("what");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [exact, setExact] = useState(false);
  const [where, setWhere] = useState<Where | null>(null);
  const [place, setPlace] = useState<PlacePick | null>(null);
  const [picking, setPicking] = useState(false);
  const [area, setArea] = useState("");
  const [ask, setAsk] = useState("");
  const [search, setSearch] = useState<SearchValue>({ spend: null, near: null });
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [err, setErr] = useState<{ field?: string; msg: string } | null>(null);
  // What someone typed for a turn, shown as their reply. Tapping a chip after replaces it.
  const [said, setSaid] = useState<Partial<Record<Step, string>>>({});
  // Dibby's reaction to the last answer, said before the next question.
  const [acks, setAcks] = useState<Partial<Record<Step, string>>>({});
  // A one-off line from Dibby on this turn ("Moved it to Sat").
  const [aside, setAside] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [visited, setVisited] = useState<Step[]>(["what"]);

  // Dibby's mood
  const [typing, setTyping] = useState(false);
  const [talking, setTalking] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [beat, setBeat] = useState(0);
  const [oops, setOops] = useState(false);
  const lastBeat = useRef(0);
  const pauseT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const formRef = useRef<HTMLFormElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const turnRefs = useRef<Partial<Record<Step, HTMLElement | null>>>({});
  const placeholder = useCyclingPlaceholder(step === "dibby" && ask === "");
  const needsWho = organising.kind === "new";
  // Dibby can be reached two ways: "Not sure? Let Dibby plan it" on the first question, or
  // "Ask Dibby" on where.
  const fromWhere = useRef(false);
  // Tapped an earlier answer to change it: once it's answered, carry on from here.
  const resume = useRef<Step | null>(null);

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

  useEffect(() => {
    if (where !== "dibby" || search.near) return;
    locate({ ask: false }).then((c) => c && setSearch((v) => ({ ...v, near: c })));
  }, [where, search.near]);

  // The turns, in order, for the way you're going.
  const viaDibby = where === "dibby" && !fromWhere.current;
  const path: Step[] = ["what", "when", ...(viaDibby ? (["dibby"] as Step[]) : (["where", ...(where === "dibby" ? ["dibby"] : [])] as Step[])), ...(needsWho ? (["who"] as Step[]) : [])];
  const at = path.indexOf(step);
  const lastStep = path[path.length - 1];

  /** Dibby "reads" your answer, then the next turn lands. */
  const go = (s: Step, ack?: string) => {
    setErr(null);
    setAside(null);
    setDraft("");
    if (ack !== undefined) setAcks((a) => ({ ...a, [s]: ack }));
    setVisited((v) => (v.includes(s) ? v : [...v, s]));
    setStep(s);
    const wait = reducedMotion() ? 0 : THINK_MS;
    setTyping(wait > 0);
    setTimeout(() => {
      setTyping(false);
      setTalking(true);
      setTimeout(() => setTalking(false), TALK_MS);
      requestAnimationFrame(() => turnRefs.current[s]?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" }));
    }, wait);
  };

  /** Forward from a turn: back to where you were if you'd jumped back, otherwise the next one. */
  const forward = (from: Step, ack?: string) => {
    const nextIdx = path.indexOf(from) + 1;
    const r = resume.current;
    if (r && path.indexOf(r) >= nextIdx) {
      resume.current = null;
      return go(r, ack);
    }
    resume.current = null;
    return go(path[nextIdx], ack);
  };

  // A problem from the server: back to the turn it's about, and Dibby says so.
  useEffect(() => {
    if (!state?.error) return;
    const s = state.field ? FIELD_STEP[state.field] : undefined;
    setErr({ field: state.field, msg: state.error });
    setOops(true);
    setTimeout(() => setOops(false), 1600);
    if (s) setStep(s);
  }, [state]);

  // The box gets the cursor as each turn lands (after Dibby's done "reading").
  useEffect(() => {
    if (typing || pending || step === "who" || picking) return;
    const t = setTimeout(() => composerRef.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [step, typing, pending, picking]);

  // Opened from the home page with something already typed: send it.
  const sentInitial = useRef(false);
  useEffect(() => {
    if (sentInitial.current || !initialAsk?.trim()) return;
    sentInitial.current = true;
    answerWhat(initialAsk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAsk]);

  const submit = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    formRef.current?.requestSubmit();
  };

  /** "Dinner tomorrow 7pm": a name, and maybe the day and time too. */
  function answerWhat(text: string) {
    const raw = text.trim();
    if (!raw) {
      setErr({ field: "title", msg: "Give it a name, like “Friday dinner”." });
      return;
    }
    const r = readPlanText(raw);
    const name = r.title ?? "";
    if (!name) {
      // Only a day or time, no name: keep them, and ask for the name.
      if (r.date) setDate(r.date);
      if (r.time) setTime(r.time);
      setSaid((s) => ({ ...s, what: raw }));
      setAside(r.date || r.time ? `Got it, ${lc(whenLine(r.date, r.time) ?? "")}. And what are we doing?` : "Give it a name, like “Friday dinner”.");
      return;
    }
    setTitle(name);
    setCategory(r.category ?? IDEAS.find((i) => i.label === name)?.category ?? null);
    if (r.date) setDate(r.date);
    if (r.time) setTime(r.time);
    if (r.area) setArea(r.area);
    // What you typed is a good brief for Dibby too, if it comes to that.
    if (!ask) setAsk(raw);
    setSaid((s) => ({ ...s, what: raw }));
    if (where === "dibby" && !fromWhere.current) setWhere(null);
    const love = pick(["love it", "keen", "yes", "big fan"], name);
    // Day and time both said: skip "when".
    if (r.date && r.time) return go("where", `${name}, ${whenLine(r.date, r.time)}. ${love[0].toUpperCase()}${love.slice(1)}.`);
    return forward("what", `${name}, ${love}.`);
  }

  function answerWhen(text: string) {
    if (saysLater(text)) return decideLater(text);
    const r = readPlanText(text);
    if (!r.date && !r.time) {
      setSaid((s) => ({ ...s, when: text }));
      setAside("Didn’t catch a day there. Try “Sat 7pm”, or tap one.");
      return;
    }
    const d = r.date ?? date;
    const t = r.time ?? time;
    setDate(d);
    setTime(t);
    setSaid((s) => ({ ...s, when: text }));
    leaveWhen(d, t);
  }

  function leaveWhen(d: string | null, t: string | null) {
    const line = whenLine(d, t);
    forward("when", line ? `${line}, locked in.` : "No stress, sort the day out later.");
  }

  function decideLater(text?: string) {
    setDate(null);
    setTime(null);
    setExact(false);
    setSaid((s) => ({ ...s, when: text ?? "Decide later" }));
    forward("when", "No stress, sort the day out later.");
  }

  /** Typed on "where": "vote", "you pick", or what you're after (Dibby finds spots for it). */
  function answerWhere(text: string) {
    const lower = text.toLowerCase();
    setSaid((s) => ({ ...s, where: text }));
    if (/\b(vote|poll|crew|everyone)\b/.test(lower)) {
      setWhere("vote");
      return forward("where", "The crew can vote then.");
    }
    setWhere("dibby");
    fromWhere.current = true;
    if (!/^(you pick|dibby|idk|not sure|dunno|anywhere|ask dibby)\b/.test(lower)) setAsk(text);
    return go("dibby", "On it.");
  }

  /** "Sam Lee": first and last name. */
  function answerWho(text: string) {
    const parts = text.trim().split(/\s+/);
    const f = parts[0] ?? "";
    const l = parts.slice(1).join(" ") || last;
    setFirst(f);
    setLast(l);
    setDraft("");
    if (!l) {
      setAside(`Hey ${f}! And your last name?`);
      return;
    }
    requestAnimationFrame(submit);
  }

  /** "Actually, make it Saturday": a day or time typed on a later turn moves it. */
  function correction(text: string): boolean {
    if (step === "what" || step === "when") return false;
    const r = readPlanText(text);
    if (!r.date && !r.time) return false;
    if (r.title && !/^(actually|make it|change|move)/i.test(text)) return false;
    const d = r.date ?? date;
    const t = r.time ?? time;
    setDate(d);
    setTime(t);
    setSaid((s) => ({ ...s, when: whenLine(d, t) ?? text }));
    setDraft("");
    setAside(`Done, moved it to ${lc(whenLine(d, t) ?? "")}.`);
    return true;
  }

  const send = () => {
    if (pending) return;
    const text = step === "dibby" ? ask : draft;
    if (step !== "dibby" && !text.trim()) return;
    setPaused(false);
    if (step !== "dibby" && correction(text)) return;
    if (step === "what") answerWhat(text);
    else if (step === "when") answerWhen(text);
    else if (step === "where") answerWhere(text);
    else if (step === "dibby") next();
    else if (step === "who") answerWho(text);
  };

  /** The big button: the same checks as the form's Next. */
  const next = () => {
    if (step === "when") return leaveWhen(date, time);
    if (step === "where") {
      if (!where) return setErr({ field: "place", msg: "Pick one to keep going." });
      if (where === "dibby") return go("dibby", "On it.");
      if (where === "place" && !place) return setErr({ field: "place", msg: "Pick the place, or let the crew vote." });
      const ack = where === "place" && place ? `${place.name}, nice.` : "The crew can vote then.";
      return needsWho ? forward("where", ack) : submit();
    }
    if (step === "dibby") {
      if (!ask.trim() && !search.spend) return setErr({ field: "ask", msg: "Tell Dibby what you're after, like “dumplings” or “bowling”." });
      return needsWho ? forward("dibby", "Sweet, I’ll find three spots.") : submit();
    }
    if (step === "who") {
      if (!first.trim()) return setErr({ field: "first_name", msg: "Add your first name." });
      if (!last.trim()) return setErr({ field: "last_name", msg: "Add your last name." });
      return submit();
    }
  };

  const back = () => {
    const i = path.indexOf(step);
    if (i > 0) {
      resume.current = null;
      go(path[i - 1]);
    }
  };

  /** Tap an earlier answer to change it. */
  const edit = (s: Step) => {
    if (pending) return;
    resume.current = step;
    go(s);
  };

  // Typing makes Dibby nod; stopping makes it tilt its head.
  const onType = (v: string) => {
    if (step === "dibby") setAsk(v);
    else setDraft(v);
    if (err?.field && (err.field === "title" || err.field === "ask")) setErr(null);
    setPaused(false);
    const now = Date.now();
    if (now - lastBeat.current > 280) {
      lastBeat.current = now;
      setBeat((b) => b + 1);
    }
    clearTimeout(pauseT.current);
    if (v) pauseT.current = setTimeout(() => setPaused(true), PAUSE_MS);
  };

  const composerValue = step === "dibby" ? ask : draft;
  const mood: DibbyState = pending ? "working" : oops ? "oops" : typing ? "thinking" : talking ? "talking" : focused ? (composerValue ? (paused ? "waiting" : "listening") : "attentive") : "idle";
  const moodWord: Partial<Record<DibbyState, string>> = { listening: "listening…", attentive: "listening…", waiting: "listening…", thinking: "typing…", working: "on it…", oops: "hmm…" };

  const errFor = (field: string) => (err?.field === field ? err.msg : undefined);
  const line = whenLine(date, time);
  const submitLabel = pending ? (where === "dibby" ? "Dibby's on it…" : "Making it…") : where === "dibby" ? "Let Dibby pick" : "Make the plan";

  /** Your answer to a turn, as a reply bubble. */
  const answer = (s: Step): string | null => {
    if (said[s]) return said[s]!;
    if (s === "what") return title || (viaDibby ? "Not sure, let Dibby plan it" : null);
    if (s === "when") return line ?? "Decide later";
    if (s === "where") return where === "place" ? (place?.name ?? null) : where === "vote" ? `Let the crew vote${area ? ` · ${area}` : ""}` : where === "dibby" ? "Ask Dibby" : null;
    if (s === "dibby") return [ask, search.spend ? SPENDS.find((x) => x.id === search.spend)?.label : null, search.near ? "Near me" : null].filter(Boolean).join(" · ") || null;
    if (s === "who") return [first, last].filter(Boolean).join(" ") || null;
    return null;
  };

  const QUESTION: Record<Step, string> = {
    what: "What are we doing?",
    when: "When are we going?",
    where: "Where are we going?",
    dibby: "What are you after?",
    who: "Last thing, what’s your name?",
  };

  const showHero = step === "what" && visited.length === 1;
  const composerPlaceholder =
    step === "what" ? "Dumplings fri arvo near Newtown" : step === "when" ? "Sat 7pm, or tap below" : step === "where" ? "Type what you’re after, or tap one" : step === "dibby" ? placeholder : "First and last name";
  const bigButton =
    step === "when" ? (
      <Button.Root key="next" type="button" size="large" block onClick={next}>
        Next
      </Button.Root>
    ) : step === "where" && where && where !== "dibby" && (where !== "place" || place) ? (
      needsWho ? (
        <Button.Root key="next" type="button" size="large" block onClick={next}>
          Next
        </Button.Root>
      ) : (
        <Button.Root key="make" type="button" variant="dibs" size="large" block disabled={pending} onClick={next}>
          {submitLabel}
        </Button.Root>
      )
    ) : step === "where" && where === "dibby" ? (
      <Button.Root key="next" type="button" size="large" block onClick={next}>
        Next
      </Button.Root>
    ) : step === lastStep && (step === "dibby" || step === "who") ? (
      <Button.Root key="make" type="button" variant="dibs" size="large" block disabled={pending} onClick={next}>
        {submitLabel}
      </Button.Root>
    ) : step === "dibby" ? (
      <Button.Root key="next" type="button" size="large" block onClick={next}>
        Next
      </Button.Root>
    ) : null;

  /** One of Dibby's messages: the reaction, then the question, big while it's the current turn. */
  const dibbySays = (s: Step, children?: React.ReactNode) => (
    <div className="pc-dibby">
      <DibbyMark size={32} />
      <div className="pc-dibby__body">
        <div className="db-msg__name">
          Dibby <Badge.Root color="accent" className="ai-tag">AI</Badge.Root>
        </div>
        {acks[s] && <p className="pc-ack">{acks[s]}</p>}
        {children}
      </div>
    </div>
  );

  return (
    <form
      ref={formRef}
      noValidate
      className="pf pc"
      onSubmit={(e) => {
        e.preventDefault();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        const f = new FormData(e.currentTarget);
        startTransition(() => action(f));
      }}
      onKeyDown={(e) => {
        // Enter sends what's in the box; it never submits the plan by surprise.
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
          e.preventDefault();
          if (e.target === composerRef.current) send();
          else if (step === "who") next();
        }
      }}
    >
      {/* Everything the server needs, whichever turn it was answered on. Same as the form. */}
      <input type="hidden" name="where" value={where ?? ""} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="category" value={category ?? ""} />
      <input type="hidden" name="pick_date" value={date ?? ""} />
      <input type="hidden" name="pick_time" value={time ?? ""} />
      <input type="hidden" name="vibe" value="chill" />
      <input type="hidden" name="area" value={where === "vote" || where === "dibby" ? area : ""} />
      <input type="hidden" name="ask" value={where === "dibby" ? ask : ""} />
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

      {/* Dibby, up top once the chat's going. */}
      <header className="pc-top" data-shown={!showHero || undefined}>
        {at > 0 ? (
          <Button.Root type="button" variant="neutral" mode="ghost" size="large" className="pf-top__back" aria-label="Back" onClick={back} disabled={pending}>
            <Button.Icon as="i" className="ri-arrow-left-line" />
          </Button.Root>
        ) : (
          <span className="pf-top__gap" />
        )}
        <div className="pc-top__who">
          {!showHero && <DibbyLive state={mood} beat={beat} size="xs" />}
          <div className="pc-top__name">
            <span className="label-md">Dibby</span>
            <span className="paragraph-xs muted" aria-live="polite">
              {moodWord[mood] ?? "here to help"}
            </span>
          </div>
        </div>
        <div className="pf-steps pc-top__steps" role="img" aria-label={`Step ${Math.min(at + 1, 3)} of 3`}>
          {[0, 1, 2].map((n) => (
            <span key={n} className={n <= at ? "on" : undefined} />
          ))}
        </div>
      </header>

      {showHero && (
        <div className="pc-hero">
          <DibbyLive state={mood} beat={beat} size="md" />
          <p className="pc-hero__hi">Hey, I&rsquo;m Dibby!</p>
        </div>
      )}

      <div className="pc-log" aria-live="polite">
        {path.map((s, i) => {
          if (!visited.includes(s) && s !== step) return hidden(s);
          const current = s === step;
          const past = i < at;
          if (!current && !past) return hidden(s);
          const reply = past ? answer(s) : null;
          const landing = current && typing;
          return (
            <section key={s} className={`pc-turn${current ? " pc-turn--now" : ""}`} ref={(el) => void (turnRefs.current[s] = el)}>
              {landing ? (
                <div className="pc-dibby">
                  <DibbyMark size={32} />
                  <p className="db-msg__bubble pc-typing" aria-label="Dibby is typing">
                    <span className="dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </p>
                </div>
              ) : (
                dibbySays(
                  s,
                  <>
                  {current ? (
                    <h1 className="pf-q pc-q">{QUESTION[s]}</h1>
                  ) : (
                    <p className="pc-q pc-q--past">{QUESTION[s]}</p>
                  )}
                  {current && s === "who" && <p className="paragraph-md muted">So the crew knows who&rsquo;s organising. No account needed.</p>}
                  {current && s === "when" && (
                    <p className={`pf-echo${line ? "" : " pf-echo--empty"}`} aria-live="polite">
                      {line ?? "Pick a day and a time"}
                    </p>
                  )}
                  </>
                )
              )}

              {/* The controls, under the question. Mounted for every turn on the path so their
                  hidden fields post, shown only on the current one. */}
              <div className="pc-controls" hidden={!current || landing}>
                {controls(s)}
              </div>

              {current && !landing && (aside || (err && !err.field)) && (
                <div className="pc-dibby pc-dibby--aside pop-in">
                  <DibbyMark size={32} />
                  <p className="db-msg__bubble">{aside ?? `Hmm. ${err?.msg}`}</p>
                </div>
              )}

              {past && reply && (
                <button type="button" className="pc-reply pop-in" onClick={() => edit(s)} disabled={pending} aria-label={`${reply}. Tap to change`}>
                  <span className="pc-reply__bubble">{reply}</span>
                  <span className="pc-reply__edit paragraph-xs">
                    <i className="ri-pencil-line" aria-hidden="true" /> Change
                  </span>
                </button>
              )}
            </section>
          );
        })}
        {pending && (
          <div className="pc-dibby pop-in">
            <DibbyMark size={32} />
            <div className="db-msg__bubble">{where === "dibby" ? <DibbyWorking where={search.near ? "near you" : area || null} /> : <p className="paragraph-sm typing">Making it<span className="dots" aria-hidden="true"><i /><i /><i /></span></p>}</div>
          </div>
        )}
      </div>

      <PlacePicker
        open={picking}
        onOpenChange={setPicking}
        title="Where's it at?"
        cta="Use this place"
        pass={searchPass}
        onPick={(p) => {
          setPlace(p);
          setSaid((s) => ({ ...s, where: undefined }));
          setErr(null);
        }}
      />

      <div className="dock pc-dock">
        <div className="dock__inner">
          {bigButton}
          {step !== "who" && (
            <div className="pc-composer">
              <Input.Root hasError={Boolean(errFor(step === "dibby" ? "ask" : "title")) && (step === "what" || step === "dibby")}>
                <Input.Wrapper>
                  <Input.Input
                    ref={composerRef}
                    aria-label={step === "dibby" ? "What are you after?" : "Message Dibby"}
                    value={composerValue}
                    onChange={(e) => onType(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => {
                      setFocused(false);
                      setPaused(false);
                    }}
                    placeholder={composerPlaceholder}
                    maxLength={step === "dibby" ? 500 : 120}
                    autoComplete="off"
                    enterKeyHint="send"
                    disabled={pending}
                  />
                </Input.Wrapper>
              </Input.Root>
              <Button.Root type="button" size="medium" className="pc-send" aria-label="Send" onClick={send} disabled={pending || (step !== "dibby" && !draft.trim())}>
                <Button.Icon as="i" className="ri-arrow-up-line" />
              </Button.Root>
            </div>
          )}
        </div>
      </div>
    </form>
  );

  /** A turn not reached yet: just its fields, so the form still posts them. */
  function hidden(s: Step) {
    return (
      <div key={s} hidden>
        {controls(s)}
      </div>
    );
  }

  /** The form's own controls for each turn. */
  function controls(s: Step) {
    if (s === "what")
      return (
        <>
          <FieldError error={errFor("title")} />
          <div>
            <p className="label-sm muted pf-chiplabel">Or tap one</p>
            <div className="pf-chips">
              {IDEAS.map((i) => (
                <Chip key={i.label} on={title === i.label} onClick={() => answerWhat(i.label)}>
                  {i.label}
                </Chip>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="pf-dibby-line"
            onClick={() => {
              setWhere("dibby");
              fromWhere.current = false;
              setSaid((x) => ({ ...x, what: "Not sure, let Dibby plan it" }));
              go("when", "No worries, I’ll find spots once we’ve got a day.");
            }}
          >
            <DibbyMark size={32} />
            <span>Not sure? Let Dibby plan it</span>
          </button>
        </>
      );
    if (s === "when")
      return (
        <>
          <DayStrip
            label="Day"
            value={date}
            onChange={(d) => {
              setDate(d);
              setSaid((x) => ({ ...x, when: undefined }));
            }}
            bleed
          />
          {exact ? (
            <div className="pf-exact">
              <p className="label-sm muted">Tap a number to type it</p>
              <BigTime
                value={time ?? "19:00"}
                onChange={(t) => {
                  setTime(t);
                  setSaid((x) => ({ ...x, when: undefined }));
                }}
              />
              <Button.Root type="button" variant="primary" mode="ghost" className="pf-link" onClick={() => setExact(false)}>
                Back to quick picks
              </Button.Root>
            </div>
          ) : (
            <div className="pf-exact">
              <p className="label-sm muted pf-chiplabel">What time?</p>
              <div className="pf-chips" role="group" aria-label="Time">
                {TIMES.map((t) => (
                  <Chip
                    key={t.label}
                    on={time === t.at}
                    onClick={() => {
                      setTime(time === t.at ? null : t.at);
                      setSaid((x) => ({ ...x, when: undefined }));
                    }}
                  >
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
          <Button.Root type="button" variant="neutral" mode="stroke" className="pc-later" onClick={() => decideLater()}>
            Decide later
          </Button.Root>
        </>
      );
    if (s === "where")
      return (
        <>
          <div className="pf-choices" role="group" aria-label="Where" data-field="place">
            <button type="button" className="pf-choice" aria-pressed={where === "place"} onClick={() => { setWhere("place"); setSaid((x) => ({ ...x, where: undefined })); if (!place) setPicking(true); setErr(null); }}>
              <span className="pf-choice__ico"><i className="ri-map-pin-2-line" aria-hidden="true" /></span>
              <span className="pf-choice__text"><b>I&rsquo;ve got a spot</b><span>Already know where? Find it on the map</span></span>
            </button>
            <button type="button" className="pf-choice" aria-pressed={where === "vote"} onClick={() => { setWhere("vote"); setSaid((x) => ({ ...x, where: undefined })); setErr(null); }}>
              <span className="pf-choice__ico"><i className="ri-bar-chart-2-line" aria-hidden="true" /></span>
              <span className="pf-choice__text"><b>Let the crew vote</b><span>Everyone chucks in ideas. Most votes wins</span></span>
            </button>
            <button type="button" className="pf-choice" aria-pressed={where === "dibby"} onClick={() => { setWhere("dibby"); fromWhere.current = true; setSaid((x) => ({ ...x, where: undefined })); setErr(null); }}>
              <span className="pf-choice__ico pf-choice__ico--dibby"><DibbyMark size={48} /></span>
              <span className="pf-choice__text"><b>Ask Dibby</b><span>Dibby digs up three real spots for the crew to vote on</span></span>
            </button>
          </div>
          <FieldError error={errFor("place")} />
          {where === "place" && place && (
            <PlaceCard
              name={place.name}
              detail={isTyped(place) ? (place.address ? `${place.address} · only people in the plan see this` : null) : [place.kind, place.address].filter(Boolean).join(" · ")}
              onChange={() => setPicking(true)}
            />
          )}
          {where === "vote" && (
            <div className="flex flex-col gap-2">
              <label className="label-sm" htmlFor="pc-area">
                Roughly where? (optional)
              </label>
              <Input.Root hasError={Boolean(errFor("area"))}>
                <Input.Wrapper>
                  <Input.Icon as="i" className="ri-map-pin-line" aria-hidden="true" />
                  <Input.Input id="pc-area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Surry Hills" maxLength={80} autoComplete="off" />
                </Input.Wrapper>
              </Input.Root>
              <FieldError error={errFor("area")} />
            </div>
          )}
        </>
      );
    if (s === "dibby")
      return (
        <>
          <FieldError error={errFor("ask")} />
          <SearchChips
            value={search}
            onChange={(v) => {
              if (search.near && !v.near) nearDeclined.current = true;
              if (v.near) nearDeclined.current = false;
              setSearch(v);
            }}
          />
          <p className="paragraph-sm muted">Dibby picks three real spots to vote on, and the crew can add more. It won&rsquo;t pick a day or time for you. What you type goes to an AI provider.</p>
        </>
      );
    // who
    return (
      <>
        <div className="pf-names">
          <label className="pf-name">
            <span className="label-sm muted">First name</span>
            <input className="pf-big" name="first_name" autoComplete="given-name" maxLength={40} value={first} onChange={(e) => setFirst(e.target.value)} aria-invalid={errFor("first_name") ? true : undefined} />
            <FieldError error={errFor("first_name")} />
          </label>
          <label className="pf-name">
            <span className="label-sm muted">Last name</span>
            <input className="pf-big" name="last_name" autoComplete="family-name" maxLength={40} value={last} onChange={(e) => setLast(e.target.value)} aria-invalid={errFor("last_name") ? true : undefined} />
            <FieldError error={errFor("last_name")} />
          </label>
        </div>
        <p className="paragraph-sm muted">
          Got an account? <a href="/login?next=/chat">Sign in</a>
        </p>
      </>
    );
  }
}
