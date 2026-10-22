import type { Plan } from "@dibs/shared/types";
import { formatShort } from "./time";

/** The status chip for a plan: same words and colours on the plan page and Your plans. */
export function planStatus(plan: Plan): { label: string; tone: string; icon: string } {
  switch (plan.status) {
    case "voting":
      return { label: plan.vote_deadline ? `Voting · closes ${formatShort(plan.vote_deadline)}` : "Voting", tone: "warning", icon: "ri-time-line" };
    case "locked":
      return { label: "Locked in", tone: "success", icon: "ri-lock-2-line" };
    case "wrapped":
      return { label: "Wrapped", tone: "primary", icon: "ri-flag-line" };
    default:
      return { label: "Called off", tone: "faded", icon: "ri-close-line" };
  }
}
