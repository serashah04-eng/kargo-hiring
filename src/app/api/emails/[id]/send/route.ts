import { z } from "zod";
import { logAction, q } from "@/lib/db";
import { emailDryRun, sendEmail } from "@/lib/email";
import { errorResponse, isUuid } from "@/lib/http";

const body = z.object({
  to: z.email(),
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(20).max(10000),
});

/** Triggered only when Arjun clicks Send. Saves his final edits, sends, then updates status + history. */
export async function POST(req: Request, ctx: RouteContext<"/api/emails/[id]/send">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Invalid id" }, { status: 400 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid recipient email, subject and body." }, { status: 400 });
  const { to, subject, body: text } = parsed.data;

  const [email] = await q<{ id: string; candidate_id: string; type: "invite" | "rejection"; status: string; subject: string; body: string }>(
    "SELECT id, candidate_id, type, status, subject, body FROM emails WHERE id = $1",
    [id],
  ).catch(() => []);
  if (!email) return Response.json({ error: "Email not found" }, { status: 404 });
  if (email.status === "sent") return Response.json({ error: "This email was already sent." }, { status: 409 });

  const edited = email.subject !== subject || email.body !== text;
  await q("UPDATE emails SET to_email=$2, subject=$3, body=$4, updated_at=now() WHERE id=$1", [id, to, subject, text]);
  if (edited) await logAction(email.candidate_id, "arjun", "email_edited", { email_id: id, type: email.type });

  // Claim the draft atomically so a double click can't send twice
  const claimed = await q("UPDATE emails SET status='sending' WHERE id=$1 AND status IN ('draft','failed') RETURNING id", [id]);
  if (!claimed.length) return Response.json({ error: "This email is already being sent." }, { status: 409 });

  try {
    const { id: providerId } = await sendEmail(to, subject, text);
    const newStatus = email.type === "invite" ? "interview_invited" : "rejection_sent";
    await q("UPDATE emails SET status='sent', provider_id=$2, sent_at=now(), error=NULL, updated_at=now() WHERE id=$1", [id, providerId]);
    await q("UPDATE candidates SET status=$2, email=COALESCE(email,$3), updated_at=now() WHERE id=$1", [email.candidate_id, newStatus, to]);
    await logAction(email.candidate_id, "arjun", `${email.type}_sent`, {
      email_id: id, to, provider_id: providerId, simulated: emailDryRun() || undefined,
    });
    if (email.type === "invite") {
      await logAction(email.candidate_id, "system", "next_step", {
        step: "Awaiting candidate availability → schedule 45-min interview with Arjun",
      });
    }
    return Response.json({ ok: true, status: newStatus, simulated: emailDryRun() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await q("UPDATE emails SET status='failed', error=$2, updated_at=now() WHERE id=$1", [id, msg.slice(0, 500)]);
    await logAction(email.candidate_id, "system", "email_failed", { email_id: id, error: msg.slice(0, 300) });
    return errorResponse(e, undefined, 502);
  }
}
