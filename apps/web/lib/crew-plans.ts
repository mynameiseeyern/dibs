import "server-only";
import { crewPlanAccess, showCrewOnPlan, type CrewRole, type PlanVisibility } from "@dibs/shared/crews";
import { crews, type CrewRow } from "./crews";

/**
 * Crew plans (ARV-93): the one check every way into a plan goes through. Crew-only plans are
 * for the crew alone (`crewPlanAccess`): anyone else gets what a plan that doesn't exist gets.
 * Called by loadPlan (the plan page, its actions, the app's plan routes), the app's public plan
 * summary, the guest rejoin page and the link preview and card.
 */
export interface CrewGate {
  see: boolean;
  crewId: string | null;
  visibility: PlanVisibility;
  /** The viewer's role in the plan's crew. */
  crewRole: CrewRole | null;
  /** The crew, when the viewer may see which crew it is (showCrewOnPlan). */
  crew: Pick<CrewRow, "id" | "name" | "emoji"> | null;
}

export async function crewGate(plan: { id: string }, viewer: { userId: string | null; onPlan: boolean }): Promise<CrewGate> {
  const { crewId, visibility } = await crews.planCrew(plan);
  if (!crewId && visibility === "link") return { see: true, crewId: null, visibility, crewRole: null, crew: null };
  const crewRole = crewId && viewer.userId ? await crews.roleIn(crewId, viewer.userId) : null;
  const see = crewPlanAccess({ crewId, visibility }, { crewRole, onPlan: viewer.onPlan }) === "see";
  const row = see && crewId && showCrewOnPlan({ crewId, visibility }, { crewRole }) ? await crews.getCrew(crewId) : null;
  return { see, crewId, visibility, crewRole, crew: row ? { id: row.id, name: row.name, emoji: row.emoji } : null };
}
