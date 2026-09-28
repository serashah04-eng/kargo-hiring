import { logAction, q } from "@/lib/db";
import { draftEmail } from "@/lib/email";
import { errorResponse, isUuid } from "@/lib/http";
import type { Evaluation, Role } from "@/lib/types";

export const maxDuration = 60;

/** AI drafts an invite or courtesy email. Saved as a draft only — nothing is sent. */
export async function POST(req: Request, ctx: RouteContext<"/api/candidates/[id]/draft">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
  try {
    const { type } = await req.json();
    if (type !== "invite" && type !== "rejection") return Response.json({ error: "Invalid type" }, { status: 400 });

    const [c] = await q<{ name: string; role: Role; email: string | null; status: string }>(
      "SELECT name, role, email, status FROM candidates WHERE id = $1",
      [id],
    );
    if (!c) return Response.json({ error: "Candidate not found" }, { status: 404 });
    const need = type === "invite" ? "shortlisted" : "declined";
    if (c.status !== need) {
      return Response.json(
        { error: type === "invite" ? "Shortlist the candidate before drafting an invite." : "Mark the candidate as not moving forward first." },
        { status: 409 },
      );
    }

    const [ev] = await q<Pick<Evaluation, "strengths" | "reasoning">>(
      "SELECT strengths, reasoning FROM evaluations WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 1",
      [id],
    );
    const d = await draftEmail(type, c, ev ?? null);

    // Replace any unsent draft of the same type
    await q("DELETE FROM emails WHERE candidate_id = $1 AND type = $2 AND status = 'draft'", [id, type]);
    const [email] = await q(
      `INSERT INTO emails (candidate_id, type, to_email, subject, body) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, type, c.email, d.subject, d.body],
    );
    await logAction(id, "ai", `${type}_drafted`, { email_id: email.id });
    return Response.json({ email });
  } catch (e) {
    return errorResponse(e);
  }
}
