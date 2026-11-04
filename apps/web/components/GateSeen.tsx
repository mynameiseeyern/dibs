"use client";

import { useEffect, useRef } from "react";
import type { Gate } from "@dibs/shared/metrics";
import { trackGate } from "@/app/gate-actions";

/** Logs `gate_shown` once when a funnel gate appears on screen. Renders nothing. */
export function GateSeen({ gate, planId }: { gate: Gate; planId: string | null }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void trackGate(gate, "shown", planId).catch(() => {});
  }, [gate, planId]);
  return null;
}
