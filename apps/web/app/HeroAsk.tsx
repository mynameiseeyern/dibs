"use client";

import { useRef, useState } from "react";
import * as Button from "@/components/ui/button";
import * as Input from "@/components/ui/input";
import { DibbyLive, type DibbyState } from "@/components/DibbyLive";
import { Chip } from "./new/chips";
import "./new/plan-flow.css";
import "./new/plan-chat.css";

const IDEAS = ["Dinner", "Drinks", "Beach day", "Movie night"];

/**
 * The home page's way in: say what you're doing to Dibby and the chat at /new picks it up (?q=).
 * A plain GET form, so it works before the page's scripts load. Dibby listens as you type.
 */
export function HeroAsk() {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [beat, setBeat] = useState(0);
  const last = useRef(0);
  const pause = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mood: DibbyState = focused ? (text ? (paused ? "waiting" : "listening") : "attentive") : "idle";

  return (
    <form className="hero-ask" action="/new" method="get">
      <div className="hero-ask__dibby">
        <DibbyLive state={mood} beat={beat} size="md" />
      </div>
      <label className="hero-ask__q" htmlFor="hero-q">
        What are we doing?
      </label>
      <div className="pc-composer">
        <Input.Root size="large">
          <Input.Wrapper>
            <Input.Input
              id="hero-q"
              name="q"
              value={text}
              placeholder="Dumplings fri arvo near Newtown"
              autoComplete="off"
              maxLength={200}
              enterKeyHint="send"
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                setPaused(false);
              }}
              onChange={(e) => {
                setText(e.target.value);
                setPaused(false);
                const now = Date.now();
                if (now - last.current > 280) {
                  last.current = now;
                  setBeat((b) => b + 1);
                }
                clearTimeout(pause.current);
                if (e.target.value) pause.current = setTimeout(() => setPaused(true), 1500);
              }}
            />
          </Input.Wrapper>
        </Input.Root>
        <Button.Root type="submit" size="medium" className="pc-send" aria-label="Start the plan">
          <Button.Icon as="i" className="ri-arrow-up-line" />
        </Button.Root>
      </div>
      <div className="pf-chips hero-ask__ideas">
        {IDEAS.map((i) => (
          <Chip key={i} on={false} onClick={() => (window.location.href = `/new?q=${encodeURIComponent(i)}`)}>
            {i}
          </Chip>
        ))}
      </div>
    </form>
  );
}
