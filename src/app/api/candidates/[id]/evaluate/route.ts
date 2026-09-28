import { runEvaluation } from "@/lib/candidates";
import { errorResponse, isUuid } from "@/lib/http";

export const maxDuration = 120;

export async function POST(_req: Request, ctx: RouteContext<"/api/candidates/[id]/evaluate">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
  try {
    const r = await runEvaluation(id);
    return Response.json({ ok: true, score: r.overall_score });
  } catch (e) {
    return errorResponse(e);
  }
}
