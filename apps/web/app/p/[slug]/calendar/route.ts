import { loadPlan } from "@/lib/viewer";
import { canAddToCalendar, planIcs } from "@/lib/calendar";
import { siteUrl } from "@/lib/site";

/** The plan as a calendar file. Only once it's locked in and has a time. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = await loadPlan(slug);
  if (!view || !canAddToCalendar(view.plan)) return new Response("Not found", { status: 404 });

  const name = view.plan.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "plan";
  return new Response(planIcs(view.plan, `${siteUrl()}/p/${slug}`), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `${new URL(req.url).searchParams.has("download") ? "attachment" : "inline"}; filename="${name}.ics"`,
      "cache-control": "private, no-store",
    },
  });
}
