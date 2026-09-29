import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { getCandidate } from "@/lib/candidates";
import { isUuid } from "@/lib/http";
import { ROLE_LABEL } from "@/lib/rubric";
import { Avatar, BandChip, CheckRow, RatingBar, ScoreRing, StatusTag } from "@/components/ui";
import CandidateActions from "@/components/CandidateActions";
import { STATUS_LABEL, type Status } from "@/lib/types";

const ACTION_LABEL: Record<string, string> = {
  cv_added: "CV added",
  evaluated: "AI evaluation completed",
  evaluation_failed: "AI evaluation failed",
  decision_shortlist: "Arjun shortlisted candidate",
  decision_decline: "Arjun decided not to move forward",
  decision_reopen: "Arjun reopened decision",
  invite_drafted: "AI drafted interview invite",
  rejection_drafted: "AI drafted courtesy email",
  email_edited: "Arjun edited email",
  invite_sent: "Arjun sent interview invite",
  rejection_sent: "Arjun sent courtesy email",
  email_failed: "Email send failed",
  next_step: "Next step",
};

const ACTOR_TONE: Record<string, string> = { arjun: "bg-yellow", ai: "bg-lavender", system: "bg-blue" };
const Q_TONES = ["bg-yellow", "bg-blue", "bg-lime", "bg-pink", "bg-lavender", "bg-peach"];

export default async function CandidatePage(props: PageProps<"/candidates/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const data = await getCandidate(id);
  if (!data) notFound();
  const { candidate: c, evaluation: ev, emails, actions, rank } = data;
  const p = c.profile;

  return (
    <div className="space-y-6">
      <Link href="/" className="btn btn-ghost -ml-3 h-9 px-3 text-muted">
        <ArrowLeft size={16} /> Dashboard
      </Link>

      {/* Hero */}
      <section className="card iridescent grain relative overflow-hidden p-6 sm:p-8">
        <div className="relative grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-center">
          <Avatar name={c.name} size={76} />
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              <span className="chip bg-white/80">{ROLE_LABEL[c.role]}</span>
              <StatusTag status={c.status} />
              {ev && <BandChip band={ev.band} />}
            </div>
            <h1 className="mt-3 font-serif text-[44px] leading-none tracking-tight sm:text-[54px]">{c.name}</h1>
            <p className="mt-2 text-sm text-ink/70">
              {[p?.current_title, p?.location].filter(Boolean).join(" · ")}
              {p?.total_years_experience != null && ` · ${p.total_years_experience} yrs total`}
              {p?.pm_years_experience != null && ` · ${p.pm_years_experience} yrs PM`}
            </p>
            <p className="mt-1 font-mono text-xs text-ink/60">
              {[c.email, c.phone].filter(Boolean).join("  ·  ") || "No contact details found in CV"}
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-[20px] bg-white/70 p-4 backdrop-blur">
            <ScoreRing score={ev?.overall_score ?? null} size={96} />
            <div className="text-sm">
              <div className="text-muted">Rubric score</div>
              <div className="font-medium">{ev ? `${ev.overall_score.toFixed(1)} / 100` : "Not scored"}</div>
              {rank && <div className="mt-1 text-xs text-muted">Rank #{rank.rank} of {rank.total} {c.role}</div>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {!ev ? (
            <section className="card p-6">
              <h2 className="h-section">Not evaluated yet</h2>
              <p className="text-sm">{c.last_error ? `Last attempt failed: ${c.last_error}` : "This CV has not been scored."}</p>
              <p className="mt-2 text-sm text-muted">Use “Re-run AI evaluation” on the right.</p>
            </section>
          ) : (
            <>
              {/* Why this score */}
              <section className="card p-6">
                <h2 className="text-[28px] leading-tight tracking-tight">
                  Why this score,
                  <br />
                  <span className="text-muted">in plain words.</span>
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed">{ev.reasoning}</p>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      Strengths <span className="count bg-lime">{ev.strengths.length}</span>
                    </div>
                    <ul className="space-y-2">{ev.strengths.map((s, i) => <CheckRow key={i} ok>{s}</CheckRow>)}</ul>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      Gaps <span className="count bg-pink">{ev.gaps.length}</span>
                    </div>
                    <ul className="space-y-2">{ev.gaps.map((s, i) => <CheckRow key={i} ok={false}>{s}</CheckRow>)}</ul>
                  </div>
                </div>
                {ev.jd_fit_notes && (
                  <p className="mt-5 rounded-2xl bg-surface-2 p-3 text-sm">
                    <span className="chip mr-2 bg-blue">JD notes · not scored</span>
                    {ev.jd_fit_notes}
                  </p>
                )}
              </section>

              {/* Rubric breakdown */}
              <section className="card p-6">
                <h2 className="h-section">
                  Rubric breakdown <span className="count">{ev.criteria.length}</span>
                  <span className="ml-auto text-xs font-normal text-muted">{c.role} rubric · Σ (rating ÷ 5 × weight)</span>
                </h2>
                <div className="space-y-2">
                  {ev.criteria.map((cr) => (
                    <details key={cr.id} className="group rounded-2xl bg-surface-2 p-4 open:bg-surface open:ring-1 open:ring-line">
                      <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[1fr_auto_auto_auto]">
                        <span className="min-w-0">
                          <span className="chip mr-2 bg-surface">{cr.id}</span>
                          <span className="text-sm font-medium">{cr.name}</span>
                        </span>
                        <span className="hidden text-xs text-muted sm:block">{cr.weight}%</span>
                        <span className="flex items-center gap-2">
                          <RatingBar rating={cr.rating} />
                          <span className="w-7 text-xs text-muted">{cr.rating}/5</span>
                        </span>
                        <span className="flex items-center gap-2 justify-self-end">
                          <span className="w-10 text-right text-sm font-medium">{cr.weighted.toFixed(1)}</span>
                          <ChevronDown size={16} className="text-muted transition group-open:rotate-180" />
                        </span>
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed">{cr.rationale}</p>
                      <div className="mt-3">
                        <div className="label">Evidence from CV</div>
                        {cr.evidence.length === 0 ? (
                          <p className="text-sm italic text-muted">No evidence found in CV.</p>
                        ) : (
                          <ul className="space-y-2">
                            {cr.evidence.map((e, i) => (
                              <li key={i} className="flex gap-2 text-sm">
                                <span
                                  className={`chip h-fit ${e.verified ? "bg-lime" : "bg-peach"}`}
                                  title={e.verified ? "Quote found word-for-word in the CV" : "Not found word-for-word — check the CV"}
                                >
                                  {e.verified ? "✓ In CV" : "? Check"}
                                </span>
                                <q className="text-ink/80">{e.quote}</q>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </details>
                  ))}
                  <div className="flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-white">
                    <span className="text-sm">Weighted total</span>
                    <span className="text-xl tracking-tight">{ev.overall_score.toFixed(1)}</span>
                  </div>
                </div>
              </section>

              {/* Interview brief */}
              <section className="card p-6">
                <h2 className="h-section">
                  Interview brief <span className="count">{ev.interview_questions.length}</span>
                </h2>
                <ol className="space-y-3">
                  {ev.interview_questions.map((qq, i) => (
                    <li key={i} className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl bg-surface-2 p-4">
                      <span className={`grid h-8 w-8 place-items-center rounded-xl text-sm font-medium ${Q_TONES[i % Q_TONES.length]}`}>{i + 1}</span>
                      <div>
                        <p className="text-[15px] font-medium leading-snug">{qq.question}</p>
                        <p className="mt-1.5 text-sm text-muted">
                          <span className="text-ink">Listen for: </span>
                          {qq.listen_for}
                        </p>
                        {qq.criterion_id && <span className="chip mt-2 bg-surface">{qq.criterion_id}</span>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}

          {/* Profile */}
          {p && (
            <section className="card p-6">
              <h2 className="h-section">Candidate profile</h2>
              <p className="text-sm leading-relaxed">{p.summary}</p>
              {p.experience.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {p.experience.map((x, i) => (
                    <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                      <span><span className="font-medium">{x.title}</span> <span className="text-muted">· {x.company}</span></span>
                      <span className="text-xs text-muted">{x.period}</span>
                    </li>
                  ))}
                </ul>
              )}
              {p.education.length > 0 && <p className="mt-3 text-sm"><span className="text-muted">Education · </span>{p.education.join("; ")}</p>}
              {p.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.skills.slice(0, 20).map((s) => <span key={s} className="chip bg-surface-2 normal-case tracking-normal">{s}</span>)}
                </div>
              )}
            </section>
          )}

          <details className="card group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              Original CV text {c.cv_filename ? `· ${c.cv_filename}` : ""}
              <ChevronDown size={16} className="text-muted transition group-open:rotate-180" />
            </summary>
            <pre className="mt-4 max-h-[500px] overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-4 font-mono text-xs leading-relaxed">{c.cv_text}</pre>
          </details>
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          <CandidateActions candidate={{ id: c.id, name: c.name, email: c.email, status: c.status }} hasEvaluation={!!ev} emails={emails} />

          <section className="card p-5">
            <h2 className="h-section">
              Activity <span className="count">{actions.length}</span>
            </h2>
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-line">
              {actions.map((a) => (
                <li key={a.id} className="relative pl-6 text-sm">
                  <span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ring-2 ring-surface ${ACTOR_TONE[a.actor] ?? "bg-line"}`} />
                  <div className="font-medium">{ACTION_LABEL[a.action] ?? a.action}</div>
                  <div className="text-xs text-muted">
                    <span className="capitalize">{a.actor}</span> · {new Date(a.created_at).toLocaleString("en-IN")}
                  </div>
                  {a.details && <ActionDetail d={a.details} />}
                </li>
              ))}
            </ol>
          </section>
          {ev && (
            <p className="px-2 text-xs text-muted">
              Scored with {ev.model} against {ev.rubric_version} on {new Date(ev.created_at).toLocaleString("en-IN")}.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function ActionDetail({ d }: { d: Record<string, unknown> }) {
  const parts: string[] = [];
  if (d.score != null) parts.push(`Score ${d.score} (${d.band})`);
  if (d.to && typeof d.to === "string" && d.to.includes("@")) parts.push(`To ${d.to}`);
  if (d.from && d.to && !String(d.to).includes("@"))
    parts.push(`${STATUS_LABEL[d.from as Status] ?? d.from} → ${STATUS_LABEL[d.to as Status] ?? d.to}`);
  if (d.step) parts.push(String(d.step));
  if (d.simulated) parts.push("Simulated (dry-run)");
  if (d.error) parts.push(String(d.error));
  if (d.note) parts.push(`Note: ${d.note}`);
  return parts.length ? <div className="mt-0.5 text-xs text-ink/70">{parts.join(" · ")}</div> : null;
}
