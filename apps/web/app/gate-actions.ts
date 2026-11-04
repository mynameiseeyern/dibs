"use server";

import { GATES, type Gate } from "@dibs/shared/metrics";
import { currentOrganiser } from "@/lib/auth";
import { track } from "@/lib/events";
import { currentGuest } from "@/lib/guest";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A funnel gate was shown, or someone did what it asked. Who it was comes from this browser's
 * session, never from the page; the plan ID is only kept when it looks like one. Never throws.
 */
export async function trackGate(gate: Gate, step: "shown" | "converted", planId: string | null): Promise<void> {
  if (!GATES.includes(gate)) return;
  const [organiser, guest] = await Promise.all([currentOrganiser(), currentGuest()]);
  if (!organiser && !guest) return;
  await track({
    name: step === "shown" ? "gate_shown" : "gate_converted",
    planId: planId && UUID.test(planId) ? planId : null,
    userId: organiser?.id ?? null,
    guestId: organiser ? null : (guest?.id ?? null),
    props: { gate },
  });
}
