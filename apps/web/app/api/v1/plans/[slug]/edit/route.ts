import type { PlanEditResult, PlanEditState } from "@dibs/shared/api";
import { PLAN_CATEGORIES, countIn, isPlanExtra, wrapState } from "@dibs/shared/plans";
import { maxVotes } from "@dibs/shared/votes";
import { apiError, apiJson, readBody } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { store } from "@/lib/store";
import { formatWhen } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";
import {
  cancelPlan,
  openVote,
  setArea,
  setCapacity,
  setCategory,
  setDescription,
  setDibbyVolume,
  setExtra,
  setMultiVote,
  setPlace,
  setPlusOnes,
  setTitle,
  setVibe,
  setVoteDeadline,
  setWhen,
} from "@/app/p/[slug]/manage/actions";

export const dynamic = "force-dynamic";

/**
 * The app's Edit plan (hosts only). GET: what the edit screen shows. POST { field, value }: one
 * change, through the web's own Edit actions (app/p/[slug]/manage/actions.ts), so the rules, the
 * chat note and the "Updated" tag are the same wherever it's changed.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const state = await forApp(req, () => editState(slug));
  if (state === "missing") return apiError("This plan doesn't exist any more.", 404);
  if (state === "not-host") return apiError("Only hosts can change the plan.", 403);
  return apiJson(state);
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await readBody(req);
  const out = await forApp(req, async (): Promise<{ error: string; status: number } | PlanEditResult> => {
    const view = await loadPlan(slug);
    if (!view) return { error: "This plan doesn't exist any more.", status: 404 };
    if (!view.isHost) return { error: "Only hosts can change the plan.", status: 403 };
    const res = await apply(slug, body);
    if (res.error) return { error: res.error, status: 400 };
    const [detail, state] = await Promise.all([planDetail(slug), editState(slug)]);
    if (!detail) return { error: "This plan doesn't exist any more.", status: 404 };
    return { detail, state: typeof state === "string" ? null : state };
  });
  if ("error" in out) return apiError(out.error, out.status);
  return apiJson(out);
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

async function apply(slug: string, body: Record<string, unknown>): Promise<{ error?: string }> {
  const v = body.value as unknown;
  switch (body.field) {
    case "title":
      return setTitle(slug, str(v));
    case "category":
      return setCategory(slug, str(v));
    case "description":
      return setDescription(slug, str(v));
    case "area":
      return setArea(slug, str(v));
    case "when":
      return setWhen(slug, str(v));
    case "vote_deadline":
      return setVoteDeadline(slug, str(v));
    case "capacity":
      return setCapacity(slug, typeof v === "number" ? v : null);
    case "plus_ones":
      return setPlusOnes(slug, v === true);
    case "multi_vote":
      return setMultiVote(slug, v === true);
    case "extra": {
      const e = v as { extra?: unknown; on?: unknown } | null;
      if (!e || !isPlanExtra(e.extra)) return { error: "That's not something you can switch." };
      return setExtra(slug, e.extra, e.on === true);
    }
    case "place": {
      const p = v as { place_id?: unknown; name?: unknown; address?: unknown } | null;
      if (p && typeof p.place_id === "string") return setPlace(slug, p.place_id);
      if (p && typeof p.name === "string") return setPlace(slug, { name: p.name, address: typeof p.address === "string" ? p.address : "" });
      return { error: "Pick a place." };
    }
    case "open_vote":
      return openVote(slug);
    case "vibe":
      if (v !== "chill" && v !== "extra" && v !== "straight") return { error: "Pick how Dibby talks." };
      await setVibe(slug, v);
      return {};
    case "volume":
      if (v !== "quiet" && v !== "normal" && v !== "loud") return { error: "Pick how chatty Dibby is." };
      await setDibbyVolume(slug, v);
      return {};
    case "cancel":
      try {
        await cancelPlan(slug);
      } catch (e) {
        // cancelPlan ends with redirect() for the web page; here the app just wants the result.
        if (!(e instanceof Error && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT"))) throw e;
      }
      return {};
    default:
      return { error: "Nothing to change." };
  }
}

/** The same values the web's Edit page gets (app/p/[slug]/manage/page.tsx). */
async function editState(slug: string): Promise<PlanEditState | "missing" | "not-host"> {
  const view = await loadPlan(slug);
  if (!view) return "missing";
  if (!view.isHost) return "not-host";
  const { plan, members } = view;
  const [options, profile] = await Promise.all([store.listOptions(plan.id), view.organiser ? store.getProfile(view.organiser.id).catch(() => null) : null]);
  const saved = profile?.plan_categories ?? [];
  return {
    status: plan.status,
    title: plan.title,
    category: plan.category ?? null,
    description: plan.description ?? null,
    categories: [...new Set([...saved, ...PLAN_CATEGORIES.map((c) => c.label)])],
    extras_off: plan.extras_off ?? [],
    starts_at: plan.starts_at,
    when_label: formatWhen(plan.starts_at),
    vote_deadline: plan.vote_deadline,
    deadline_label: formatWhen(plan.vote_deadline),
    venue: plan.venue_name,
    area: plan.area,
    option_count: options.length,
    capacity: plan.capacity,
    going: countIn(members),
    plus_ones: plan.plus_ones,
    multi_vote: maxVotes(plan) > 1,
    vibe: plan.vibe,
    volume: plan.dibby_volume ?? "normal",
    wrap_early: wrapState(plan) === "early",
  };
}
