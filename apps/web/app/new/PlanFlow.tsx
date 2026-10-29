"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { PLAN_EXTRAS } from "@dibs/shared/plans";
import { locate } from "@/lib/locate";
import { createPlan } from "../actions";
import { Field, FieldError, FormError } from "@/components/Field";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import { PlacePicker, isTyped, type PlacePick } from "@/components/PlacePicker";
import { PlaceCard } from "@/components/PlaceCard";
import { DayStrip, dateLabel, sydneyToday, timeLabel } from "@/components/DateTime";
import { DibbyMark, LogoMark } from "@/components/Logo";
import { DibbyWorking } from "@/components/DibbyWorking";
import { Chip, SearchChips, type SearchValue } from "./chips";
import { useCyclingPlaceholder } from "./DibbyBubble";
import { Organiser, type Organising } from "./Organiser";
import { BigTime } from "./BigTime";
import "./plan-flow.css";

type Step = "intro" | "what" | "when" | "where" | "dibby" | "who";
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

/** Quick times. Each is a fixed fact, like any time someone picks. */
const TIMES = [
  { label: "Brunch", at: "10:00" },
  { label: "Lunch", at: "12:30" },
  { label: "Arvo", at: "15:00" },
  { label: "Drinks", at: "18:00" },
  { label: "Dinner", at: "19:00" },
  { label: "Late", at: "21:00" },
];

/** Which screen a field lives on, so a problem from the server takes you back to it. */
const FIELD_STEP: Record<string, Step> = {
  title: "what",
  place: "where",
  area: "where",
  ask: "dibby",
  first_name: "who",
  last_name: "who",
  adult: "who",
  email: "who",
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

/**
 * Making a plan, one question a screen: what, when, where. "Where" can hand over to Dibby,
 * who finds three real spots to vote on. Someone new gets a short intro first, and a guest
 * who's never organised says who they are last. Everything posts together to createPlan.
 */
export function PlanFlow({ organising, intro, searchPass }: { organising: Organising; intro: boolean; searchPass?: string }) {
  const [step, setStep] = useState<Step>(intro ? "intro" : "what");
  // The intro's Make plans: a white circle grows from the button, then the first question lands.
  const [revealing, setRevealing] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [exact, setExact] = useState(false);
  const [where, setWhere] = useState<Where>("vote");
  const [place, setPlace] = useState<PlacePick | null>(null);
  const [picking, setPicking] = useState(false);
  const [ask, setAsk] = useState("");
  const [search, setSearch] = useState<SearchValue>({ spend: null, near: null });
  const [err, setErr] = useState<{ field?: string; msg: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const placeholder = useCyclingPlaceholder(step === "dibby" && ask === "");
  const needsWho = organising.kind === "new";
  // Dibby can be reached two ways: "Not sure? Let Dibby plan it" on the first question, or
  // "Let Dibby find three" on where. Back goes the way you came.
  const fromWhere = useRef(false);

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

  const go = (s: Step) => {
    setErr(null);
    setStep(s);
    window.scrollTo({ top: 0 });
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

  // The first question gets the cursor, so the keyboard's up when it lands.
  useEffect(() => {
    if (step !== "what") return;
    const t = setTimeout(() => titleRef.current?.focus({ preventScroll: true }), revealing ? 700 : 50);
    return () => clearTimeout(t);
  }, [step, revealing]);

  const start = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return go("what");
    setRevealing(true);
    setTimeout(() => go("what"), 560);
  };

  const errFor = (field: string) => (err?.field === field ? err.msg : undefined);
  const lastStep: Step = where === "dibby" ? "dibby" : "where";
  const submitLabel = pending ? (where === "dibby" ? "Dibby's on it…" : "Making it…") : where === "dibby" ? "Let Dibby pick" : "Make the plan";

  const next = () => {
    if (step === "what") {
      if (!title.trim() && where !== "dibby") {
        setErr({ field: "title", msg: "Give it a name, like “Friday dinner”." });
        return titleRef.current?.focus();
      }
      // Next (not "Not sure?") means you're picking the place yourself, unless you chose Dibby there.
      if (where === "dibby" && !fromWhere.current) setWhere("vote");
      return go("when");
    }
    if (step === "when") return go(where === "dibby" ? "dibby" : "where");
    if (step === "where") {
      if (where === "dibby") return go("dibby");
      if (where === "place" && !place) {
        setErr({ field: "place", msg: "Pick the place, or put it to a vote." });
        return;
      }
      return needsWho ? go("who") : formRef.current?.requestSubmit();
    }
    if (step === "dibby") {
      if (!ask.trim() && !search.spend) {
        setErr({ field: "ask", msg: "Tell Dibby what you're after, like “dumplings” or “bowling”." });
        return;
      }
      return needsWho ? go("who") : formRef.current?.requestSubmit();
    }
  };
  const back = () => {
    if (step === "when") return go("what");
    if (step === "where") return go("when");
    if (step === "dibby") return go(where === "dibby" && !fromWhere.current ? "when" : "where");
    if (step === "who") return go(lastStep);
    if (step === "what" && intro) {
      setRevealing(false);
      return go("intro");
    }
  };
  const stepNo = step === "what" ? 1 : step === "when" ? 2 : 3;
  const line = whenLine(date, time);

  return (
    <form
      ref={formRef}
      noValidate
      className="pf"
      // Posted by hand rather than through the form's action prop, so a problem from the server
      // doesn't wipe the names someone typed (React resets a form after its action runs).
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        startTransition(() => action(f));
      }}
      onKeyDown={(e) => {
        // Enter means Next, not "make the plan" before you've seen the rest.
        if (e.key === "Enter" && e.target instanceof HTMLInputElement && step !== "who") {
          e.preventDefault();
          next();
        }
      }}
      onInput={(e) => {
        const name = (e.target as HTMLInputElement).name;
        if (err?.field && name === err.field) setErr(null);
      }}
    >
      {/* Everything the server needs, whichever screen it was answered on. */}
      <input type="hidden" name="where" value={where} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="category" value={category ?? ""} />
      <input type="hidden" name="pick_date" value={date ?? ""} />
      <input type="hidden" name="pick_time" value={time ?? ""} />
      <input type="hidden" name="vibe" value="chill" />
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

      {step === "intro" && (
        <section className={`pf-intro${revealing ? " pf-intro--leaving" : ""}`} aria-labelledby="pf-intro-h">
          <header className="pf-intro__top">
            <span className="wordmark pf-intro__mark">
              <LogoMark size={32} />
              dibby
            </span>
            <a className="pf-intro__about" href="/about">
              About
            </a>
          </header>
          <div className="pf-intro__body">
            <div className="pf-hello">
              <img className="pf-hello__dibby" src="/crew/lime.png" alt="Dibby saying hi" width={148} height={148} />
              <p className="pf-hello__hi">Hey, I&rsquo;m Dibby!</p>
            </div>
            <h1 id="pf-intro-h" className="title-h2">
              Get out of the group chat.
            </h1>
            <p className="paragraph-lg">Everyone&rsquo;s keen till someone has to pick a day. Make the plan, drop the link in the chat, and the crew taps in. No app needed.</p>
          </div>
          <div className="pf-intro__dock">
            <Button.Root type="button" variant="dibs" size="large" block onClick={start}>
              Make plans
            </Button.Root>
            <p className="paragraph-sm pf-intro__signin">
              Got an account? <a href="/login?next=/">Sign in</a>
            </p>
          </div>
          <span className="pf-reveal" aria-hidden="true" />
        </section>
      )}

      {step !== "intro" && (
        <header className="pf-top">
          {step === "what" && !intro ? (
            <span className="pf-top__gap" />
          ) : (
            <Button.Root type="button" variant="neutral" mode="ghost" size="large" className="pf-top__back" aria-label="Back" onClick={back} disabled={pending}>
              <Button.Icon as="i" className="ri-arrow-left-line" />
            </Button.Root>
          )}
          <div className="pf-steps" role="img" aria-label={`Step ${stepNo} of 3`}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={n <= stepNo ? "on" : undefined} />
            ))}
          </div>
          <span className="pf-top__gap" />
        </header>
      )}

      {err && !err.field && <FormError error={err.msg} />}

      {/* 1 · What */}
      <section className="pf-step" hidden={step !== "what"} key={`what-${step === "what"}`}>
        <label className="pf-q pf-rise" htmlFor="pf-title">
          What are we doing?
        </label>
        <div className="pf-rise" style={{ "--d": "60ms" } as React.CSSProperties}>
          <input
            ref={titleRef}
            id="pf-title"
            className="pf-big"
            data-field="title"
            placeholder="Friday dinner"
            autoComplete="off"
            maxLength={80}
            value={title}
            aria-invalid={errFor("title") ? true : undefined}
            onChange={(e) => {
              setTitle(e.target.value);
              setCategory(IDEAS.find((i) => i.label === e.target.value)?.category ?? null);
              if (err?.field === "title") setErr(null);
            }}
          />
          <FieldError error={errFor("title")} />
        </div>
        <div className="pf-rise" style={{ "--d": "120ms" } as React.CSSProperties}>
          <p className="label-sm muted pf-chiplabel">Or tap one</p>
          <div className="pf-chips">
            {IDEAS.map((i) => (
              <Chip
                key={i.label}
                on={title === i.label}
                onClick={() => {
                  setTitle(i.label);
                  setCategory(i.category ?? null);
                  if (err?.field === "title") setErr(null);
                }}
              >
                {i.label}
              </Chip>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="pf-dibby-line pf-rise"
          style={{ "--d": "180ms" } as React.CSSProperties}
          onClick={() => {
            setWhere("dibby");
            fromWhere.current = false;
            go("when");
          }}
        >
          <DibbyMark size={32} />
          <span>Not sure? Let Dibby plan it</span>
        </button>
      </section>

      {/* 2 · When */}
      <section className="pf-step" hidden={step !== "when"}>
        <div className="pf-head">
          <h1 className="pf-q">When are we going?</h1>
          <p className={`pf-echo${line ? "" : " pf-echo--empty"}`} aria-live="polite">
            {line ?? "Pick a day and a time"}
          </p>
        </div>
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
            <p className="label-sm muted pf-chiplabel">What time?</p>
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
      </section>

      {/* 3 · Where */}
      <section className="pf-step" hidden={step !== "where"}>
        <h1 className="pf-q">Where at?</h1>
        <div className="pf-choices" role="group" aria-label="Where" data-field="place">
          <button type="button" className="pf-choice" aria-pressed={where === "place"} onClick={() => { setWhere("place"); if (!place) setPicking(true); setErr(null); }}>
            <span className="pf-choice__ico"><i className="ri-map-pin-2-line" aria-hidden="true" /></span>
            <span className="pf-choice__text"><b>I&rsquo;ve got a spot</b><span>Pick it on the map</span></span>
          </button>
          <button type="button" className="pf-choice" aria-pressed={where === "vote"} onClick={() => { setWhere("vote"); setErr(null); }}>
            <span className="pf-choice__ico"><i className="ri-bar-chart-2-line" aria-hidden="true" /></span>
            <span className="pf-choice__text"><b>Put it to a vote</b><span>Anyone going adds places. Top pick wins</span></span>
          </button>
          <button type="button" className="pf-choice" aria-pressed={where === "dibby"} onClick={() => { setWhere("dibby"); fromWhere.current = true; setErr(null); }}>
            <span className="pf-choice__ico pf-choice__ico--dibby"><DibbyMark size={48} /></span>
            <span className="pf-choice__text"><b>Let Dibby find three</b><span>Three real spots to start the vote</span></span>
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
        {where === "vote" && <Field label="Where-ish (optional)" name="area" placeholder="Surry Hills" icon="ri-map-pin-line" maxLength={80} autoComplete="off" error={errFor("area")} />}
        <PlacePicker
          open={picking}
          onOpenChange={setPicking}
          title="Where's it at?"
          cta="Use this place"
          pass={searchPass}
          onPick={(p) => {
            setPlace(p);
            setErr(null);
          }}
        />
      </section>

      {/* Dibby's brief */}
      <section className="pf-step" hidden={step !== "dibby"}>
        <label className="pf-q" htmlFor="pf-ask">
          What are you after?
        </label>
        <div>
          <Input.Root hasError={Boolean(errFor("ask"))}>
            <Input.Wrapper>
              <Input.Input id="pf-ask" name="ask" value={ask} onChange={(e) => setAsk(e.target.value)} placeholder={placeholder} maxLength={500} autoComplete="off" aria-invalid={errFor("ask") ? true : undefined} />
            </Input.Wrapper>
          </Input.Root>
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
        <p className="paragraph-sm muted">Dibby picks three real spots to vote on, and the crew can add more. It won&rsquo;t pick a day or time for you. What you type goes to an AI provider.</p>
        {pending && <DibbyWorking where={search.near ? "near you" : null} />}
      </section>

      {/* Who's organising: only someone who's never organised on this browser. */}
      {needsWho && (
        <section className="pf-step" hidden={step !== "who"}>
          <h1 className="pf-q">One last thing</h1>
          <Organiser who={organising} errorFor={errFor} />
          {pending && where === "dibby" && <DibbyWorking where={search.near ? "near you" : null} />}
        </section>
      )}

      {step !== "intro" && (
        <div className="dock">
          <div className="dock__inner">
            {step === "who" || ((step === "where" || step === "dibby") && step === lastStep && !needsWho) ? (
              <Button.Root key="make" type={step === "who" ? "submit" : "button"} variant="dibs" size="large" block disabled={pending} onClick={step === "who" ? undefined : next}>
                {submitLabel}
              </Button.Root>
            ) : (
              <Button.Root key="next" type="button" size="large" block onClick={next}>
                Next
              </Button.Root>
            )}
            {step === "when" && (
              <Button.Root
                type="button"
                variant="neutral"
                mode="ghost"
                block
                onClick={() => {
                  setDate(null);
                  setTime(null);
                  setExact(false);
                  next();
                }}
              >
                Decide later
              </Button.Root>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
