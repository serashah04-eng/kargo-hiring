import "server-only";
import { z } from "zod";
import { geminiJSON, GEMINI_MODEL } from "./gemini";
import { RUBRICS, ROLE_LABEL, RUBRIC_VERSION, jobDescription, rubricText, scoreBand, weightedScore } from "./rubric";
import type { CriterionResult, InterviewQuestion, Profile, Role } from "./types";

const S = (type: string, extra: object = {}) => ({ type, ...extra });
const STR = S("STRING");
const NSTR = S("STRING", { nullable: true });
const ARR = (items: object) => S("ARRAY", { items });

const responseSchema = S("OBJECT", {
  properties: {
    profile: S("OBJECT", {
      properties: {
        name: STR,
        email: NSTR,
        phone: NSTR,
        location: NSTR,
        current_title: NSTR,
        total_years_experience: S("NUMBER", { nullable: true }),
        pm_years_experience: S("NUMBER", { nullable: true }),
        summary: STR,
        experience: ARR(S("OBJECT", { properties: { title: STR, company: STR, period: STR }, required: ["title", "company", "period"] })),
        education: ARR(STR),
        skills: ARR(STR),
      },
      required: ["name", "summary", "experience", "education", "skills"],
    }),
    criteria: ARR(
      S("OBJECT", {
        properties: {
          id: STR,
          rating: S("INTEGER"),
          evidence: ARR(STR),
          rationale: STR,
        },
        required: ["id", "rating", "evidence", "rationale"],
      }),
    ),
    strengths: ARR(STR),
    gaps: ARR(STR),
    reasoning: STR,
    jd_fit_notes: STR,
    interview_questions: ARR(
      S("OBJECT", {
        properties: { criterion_id: STR, question: STR, listen_for: STR },
        required: ["criterion_id", "question", "listen_for"],
      }),
    ),
  },
  required: ["profile", "criteria", "strengths", "gaps", "reasoning", "jd_fit_notes", "interview_questions"],
});

const num = z.number().nullable().optional().transform((v) => v ?? null);
const nstr = z.string().nullable().optional().transform((v) => (v && v.trim() ? v.trim() : null));

function outputValidator(role: Role) {
  const ids = RUBRICS[role].map((c) => c.id);
  return z.object({
    profile: z.object({
      name: z.string().min(1),
      email: nstr,
      phone: nstr,
      location: nstr,
      current_title: nstr,
      total_years_experience: num,
      pm_years_experience: num,
      summary: z.string(),
      experience: z.array(z.object({ title: z.string(), company: z.string(), period: z.string() })),
      education: z.array(z.string()),
      skills: z.array(z.string()),
    }),
    criteria: z
      .array(
        z.object({
          id: z.string(),
          rating: z.number().int().min(1).max(5),
          evidence: z.array(z.string()),
          rationale: z.string().min(1),
        }),
      )
      .refine(
        (cs) => cs.length === ids.length && ids.every((id) => cs.filter((c) => c.id === id).length === 1),
        { message: `criteria must contain exactly: ${ids.join(", ")}` },
      ),
    strengths: z.array(z.string()).min(1),
    gaps: z.array(z.string()).min(1),
    reasoning: z.string().min(1),
    jd_fit_notes: z.string(),
    interview_questions: z.array(
      z.object({ criterion_id: z.string(), question: z.string().min(1), listen_for: z.string() }),
    ).min(1),
  });
}

function buildPrompt(role: Role, cvText: string) {
  const criteria = RUBRICS[role]
    .map((c) => `- ${c.id} | ${c.name} | weight ${c.weight}%\n  Definition: ${c.definition}\n  What strong looks like: ${c.strong}`)
    .join("\n");

  return `You are assisting Arjun Mehta, founder of Kargo, in reviewing a candidate for the ${ROLE_LABEL[role]} role.
You RECOMMEND only. You never decide to hire or reject.

=== KARGO HIRING RUBRIC (source of truth — do not invent or change criteria) ===
${rubricText()}

=== CRITERIA TO SCORE FOR THIS ROLE (${role}) ===
${criteria}

=== JOB DESCRIPTION: ${ROLE_LABEL[role]} ===
${jobDescription(role)}

=== CANDIDATE CV ===
${cvText}
=== END CV ===

Instructions:
1. Extract the candidate profile from the CV (name, contact, titles, years of experience, roles). Use null when absent. Do not guess.
2. Score EVERY criterion listed above (ids exactly: ${RUBRICS[role].map((c) => c.id).join(", ")}) on the rubric's 1–5 scale:
   1 = no evidence, 3 = some relevant evidence, 5 = strong evidence matching "What strong looks like".
   Score only concrete, checkable claims in the CV (numbers, named outcomes, named systems). Vague claims ("passionate", "strong leader") earn no credit.
   Do not reward keyword matches. The past hires named in the rubric are reference points only; do not score the candidate on similarity of company names.
3. evidence: 0–3 short quotes copied VERBATIM from the CV that support the rating. Empty array if there is no evidence.
4. rationale: 1–2 plain sentences explaining the rating, referencing the "What strong looks like" anchor.
5. strengths: 2–4 bullets; gaps: 2–4 bullets. Each one short and specific, tied to rubric criteria.
6. reasoning: 2–4 sentences in plain English for Arjun: why this candidate lands where they do overall.
7. jd_fit_notes: one or two sentences on JD requirements that are NOT rubric criteria (e.g. years of PM experience, Mumbai/in-office). This is informational and is not scored.
8. interview_questions: 4–6 "tell me about a specific time" probes, prioritising the weakest or least-evidenced high-weight criteria. listen_for = what a strong answer contains.`;
}

function normalise(s: string) {
  return s.toLowerCase().replace(/[“”"'‘’`]/g, "").replace(/[^\p{L}\p{N}%₹$.]+/gu, " ").trim();
}

export type EvaluationResult = {
  profile: Profile;
  overall_score: number;
  band: string;
  criteria: CriterionResult[];
  strengths: string[];
  gaps: string[];
  reasoning: string;
  jd_fit_notes: string;
  interview_questions: InterviewQuestion[];
  model: string;
  rubric_version: string;
};

export async function evaluateCandidate(role: Role, cvText: string): Promise<EvaluationResult> {
  const raw = await geminiJSON(buildPrompt(role, cvText), responseSchema);
  const parsed = outputValidator(role).safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Gemini response failed validation: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  const out = parsed.data;
  const cvNorm = normalise(cvText);

  // Score is computed here from the rubric weights, not by the model.
  const criteria: CriterionResult[] = RUBRICS[role].map((c) => {
    const r = out.criteria.find((x) => x.id === c.id)!;
    return {
      id: c.id,
      name: c.name,
      weight: c.weight,
      rating: r.rating,
      weighted: Math.round((r.rating / 5) * c.weight * 10) / 10,
      evidence: r.evidence
        .filter((q) => q.trim())
        .slice(0, 3)
        .map((quote) => ({ quote: quote.trim(), verified: cvNorm.includes(normalise(quote)) })),
      rationale: r.rationale,
    };
  });
  const overall = weightedScore(role, Object.fromEntries(criteria.map((c) => [c.id, c.rating])));

  const validIds = new Set(RUBRICS[role].map((c) => c.id));
  return {
    profile: out.profile,
    overall_score: overall,
    band: scoreBand(overall),
    criteria,
    strengths: out.strengths,
    gaps: out.gaps,
    reasoning: out.reasoning,
    jd_fit_notes: out.jd_fit_notes,
    interview_questions: out.interview_questions.map((qq) => ({
      ...qq,
      criterion_id: validIds.has(qq.criterion_id) ? qq.criterion_id : "",
    })),
    model: GEMINI_MODEL,
    rubric_version: RUBRIC_VERSION,
  };
}
