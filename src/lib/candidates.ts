import "server-only";
import { logAction, q } from "./db";
import { evaluateCandidate } from "./evaluate";
import type { ActionRecord, CandidateRow, EmailRecord, Evaluation, Profile, Role, Status } from "./types";

const LATEST_EVAL = `LEFT JOIN LATERAL (
  SELECT * FROM evaluations e WHERE e.candidate_id = c.id ORDER BY e.created_at DESC LIMIT 1
) ev ON true`;

export async function listCandidates(): Promise<CandidateRow[]> {
  const rows = await q<CandidateRow & { overall_score: string | null }>(
    `SELECT c.id, c.name, c.email, c.role, c.status, c.created_at, c.last_error,
            ev.overall_score, ev.band, ev.strengths, ev.gaps
       FROM candidates c ${LATEST_EVAL}
      ORDER BY ev.overall_score DESC NULLS LAST, c.created_at DESC`,
  );
  return rows.map((r) => ({ ...r, overall_score: r.overall_score == null ? null : Number(r.overall_score) }));
}

export async function getCandidate(id: string) {
  const [c] = await q<{
    id: string; name: string; email: string | null; phone: string | null; role: Role; status: Status;
    cv_filename: string | null; cv_text: string; profile: Profile | null; last_error: string | null;
    created_at: string; updated_at: string;
  }>("SELECT * FROM candidates WHERE id = $1", [id]);
  if (!c) return null;
  const [ev] = await q<Evaluation & { overall_score: string }>(
    "SELECT * FROM evaluations WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 1",
    [id],
  );
  const emails = await q<EmailRecord>("SELECT * FROM emails WHERE candidate_id = $1 ORDER BY created_at DESC", [id]);
  const actions = await q<ActionRecord>(
    "SELECT * FROM actions WHERE candidate_id = $1 ORDER BY created_at DESC, id DESC",
    [id],
  );
  const rank = ev
    ? (
        await q<{ rank: number; total: number }>(
          `SELECT
             (SELECT count(*) + 1 FROM candidates c ${LATEST_EVAL} WHERE c.role = $1 AND ev.overall_score > $2)::int AS rank,
             (SELECT count(*) FROM candidates c ${LATEST_EVAL} WHERE c.role = $1 AND ev.overall_score IS NOT NULL)::int AS total`,
          [c.role, ev.overall_score],
        )
      )[0]
    : null;
  return {
    candidate: c,
    evaluation: ev ? { ...ev, overall_score: Number(ev.overall_score) } : null,
    emails,
    actions,
    rank,
  };
}

export async function createCandidate(input: { role: Role; cvText: string; filename: string | null; email?: string | null }) {
  const [c] = await q<{ id: string }>(
    `INSERT INTO candidates (name, email, role, cv_filename, cv_text, status)
     VALUES ($1, $2, $3, $4, $5, 'new') RETURNING id`,
    [input.filename?.replace(/\.[^.]+$/, "") || "Unnamed candidate", input.email || null, input.role, input.filename, input.cvText],
  );
  await logAction(c.id, "arjun", "cv_added", { role: input.role, filename: input.filename });
  return c.id;
}

/** Runs Gemini extraction + rubric evaluation and stores the result. Never changes a human decision. */
export async function runEvaluation(id: string) {
  const [c] = await q<{ role: Role; cv_text: string; status: Status; email: string | null }>(
    "SELECT role, cv_text, status, email FROM candidates WHERE id = $1",
    [id],
  );
  if (!c) throw new Error("Candidate not found");
  try {
    const r = await evaluateCandidate(c.role, c.cv_text);
    await q(
      `INSERT INTO evaluations (candidate_id, role, rubric_version, overall_score, band, criteria, strengths, gaps,
                                reasoning, jd_fit_notes, interview_questions, model)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id, c.role, r.rubric_version, r.overall_score, r.band, JSON.stringify(r.criteria),
        JSON.stringify(r.strengths), JSON.stringify(r.gaps), r.reasoning, r.jd_fit_notes,
        JSON.stringify(r.interview_questions), r.model,
      ],
    );
    await q(
      `UPDATE candidates SET name = $2, email = COALESCE(email, $3), phone = $4, profile = $5, last_error = NULL,
              status = CASE WHEN status = 'new' THEN 'evaluated' ELSE status END, updated_at = now()
        WHERE id = $1`,
      [id, r.profile.name, r.profile.email, r.profile.phone, JSON.stringify(r.profile)],
    );
    await logAction(id, "ai", "evaluated", { score: r.overall_score, band: r.band, model: r.model });
    return r;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await q("UPDATE candidates SET last_error = $2, updated_at = now() WHERE id = $1", [id, msg.slice(0, 1000)]);
    await logAction(id, "system", "evaluation_failed", { error: msg.slice(0, 300) });
    throw e;
  }
}
