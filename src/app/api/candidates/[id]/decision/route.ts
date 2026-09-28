import { logAction, q } from "@/lib/db";
import { errorResponse, isUuid } from "@/lib/http";

// Arjun's decision. The AI never calls this.
const DECISIONS = {
  shortlist: "shortlisted",
  decline: "declined",
  reopen: "evaluated",
} as const;

export async function POST(req: Request, ctx: RouteContext<"/api/candidates/[id]/decision">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
  try {
    const { decision, note } = await req.json();
    const status = DECISIONS[decision as keyof typeof DECISIONS];
    if (!status) return Response.json({ error: "Unknown decision" }, { status: 400 });

    const [prev] = await q<{ status: string }>("SELECT status FROM candidates WHERE id = $1", [id]);
    if (!prev) return Response.json({ error: "Candidate not found" }, { status: 404 });
    if (["interview_invited", "rejection_sent"].includes(prev.status) && decision !== "reopen") {
      return Response.json({ error: "An email has already been sent to this candidate." }, { status: 409 });
    }

    await q("UPDATE candidates SET status = $2, updated_at = now() WHERE id = $1", [id, status]);
    await logAction(id, "arjun", `decision_${decision}`, { from: prev.status, to: status, note: note || undefined });
    return Response.json({ ok: true, status });
  } catch (e) {
    return errorResponse(e);
  }
}
