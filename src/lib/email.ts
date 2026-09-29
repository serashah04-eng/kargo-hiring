import "server-only";
import { z } from "zod";
import { geminiJSON } from "./gemini";
import { ROLE_LABEL } from "./rubric";
import type { Evaluation, Role } from "./types";

const draftSchema = {
  type: "OBJECT",
  properties: { subject: { type: "STRING" }, body: { type: "STRING" } },
  required: ["subject", "body"],
};
const draftValidator = z.object({ subject: z.string().min(3).max(200), body: z.string().min(40) });

export async function draftEmail(
  type: "invite" | "rejection",
  c: { name: string; role: Role },
  ev: Pick<Evaluation, "strengths" | "reasoning"> | null,
) {
  const role = ROLE_LABEL[c.role];
  const firstName = c.name.split(" ")[0];
  const context = ev ? `What stood out in their CV (use at most one specific, genuine detail):\n- ${ev.strengths.join("\n- ")}` : "";

  const prompt =
    type === "invite"
      ? `Write a short, warm interview invitation email from Arjun Mehta, Founder of Kargo (Mumbai freight-forwarding software, Series A), to ${c.name} for the ${role} role.
${context}
Must include, in plain text (no markdown, no placeholders like [date]):
- Greeting using first name "${firstName}"
- 1–2 sentence personalised intro referencing one specific thing from their background
- Invitation to a 45-minute interview with Arjun (in-office in Mumbai or video call)
- Next steps: reply with 2–3 time slots that work over the next week; mention the role is in-office in Mumbai
- Sign-off: "Arjun Mehta\\nFounder, Kargo"
Keep the body under 170 words. Subject: "Interview invitation – ${role}, Kargo".`
      : `Write a short, respectful courtesy email from Arjun Mehta, Founder of Kargo, to ${c.name} who applied for the ${role} role, letting them know Kargo will not be moving forward at this time.
Plain text, no markdown, no placeholders. Greeting with first name "${firstName}". Thank them sincerely, keep it kind and brief, do NOT list reasons or scores, and do not mention AI or rubrics. Optionally encourage them to apply for future roles.
Sign-off: "Arjun Mehta\\nFounder, Kargo". Under 110 words. Subject: "Your application for ${role} at Kargo".`;

  const parsed = draftValidator.safeParse(await geminiJSON(prompt, draftSchema));
  if (!parsed.success) throw new Error("Gemini email draft failed validation");
  return parsed.data;
}

export const emailDryRun = () => process.env.EMAIL_DRY_RUN === "true";

/** Sends via Gmail SMTP when SMTP_USER is set, otherwise Resend. Only ever called from the explicit "Send" action. */
export async function sendEmail(to: string, subject: string, body: string): Promise<{ id: string }> {
  if (emailDryRun()) return { id: `dry-run-${Date.now()}` };
  if (process.env.SMTP_USER) return sendViaSmtp(to, subject, body);

  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set — email service not configured.");
  const from = process.env.EMAIL_FROM || "Kargo Hiring <onboarding@resend.dev>";
  const replyTo = process.env.EMAIL_REPLY_TO || undefined;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: body, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${data?.message || "send failed"}`);
  return { id: data.id };
}

async function sendViaSmtp(to: string, subject: string, body: string) {
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, ""); // Gmail shows app passwords with spaces
  if (!pass) throw new Error("SMTP_PASS is not set — add your Gmail App Password.");
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user, pass },
  });
  try {
    const info = await transport.sendMail({
      // Gmail only sends as the signed-in address; the display name is configurable
      from: { name: process.env.EMAIL_FROM_NAME || "Arjun Mehta, Kargo", address: user },
      to,
      subject,
      text: body,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
    });
    return { id: info.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/535|Invalid login|Username and Password not accepted/i.test(msg)) {
      throw new Error("Gmail rejected the login. Check SMTP_USER and that SMTP_PASS is a Gmail App Password (not your normal password).");
    }
    throw new Error(`Gmail send failed: ${msg}`);
  }
}
