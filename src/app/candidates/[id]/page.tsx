import Link from "next/link";
import { notFound } from "next/navigation";
import { getCandidate } from "@/lib/candidates";
import { isUuid } from "@/lib/http";
import { ROLE_LABEL } from "@/lib/rubric";
import { RatingBlocks, ScoreBox, StatusTag } from "@/components/ui";
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

export default async function CandidatePage(props: PageProps<"/candidates/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const data = await getCandidate(id);
  if (!data) notFound();
  const { candidate: c, evaluation: ev, emails, actions, rank } = data;
  const p = c.profile;

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm font-bold underline decoration-2 underline-offset-4">← Dashboard</Link>

      {/* Header */}
      <section className="card grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
        <ScoreBox score={ev?.overall_score ?? null} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="tag tag-dark">{ROLE_LABEL[c.role]}</span>
            <StatusTag status={c.status} />
            {ev && <span className="tag">{ev.band}</span>}
            {rank && <span className="tag">Rank #{rank.rank} of {rank.total} {c.role}</span>}
          </div>
          <h1 className="mt-2 text-4xl font-black leading-tight">{c.name}</h1>
          <p className="font-medium">
            {[p?.current_title, p?.location].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 font-mono text-sm">
            {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact details found in CV"}
          </p>
        </div>
        <div className="text-sm md:text-right">
          <div className="label">Experience</div>
          <div className="font-mono font-bold">
            {p?.total_years_experience != null ? `${p.total_years_experience} yrs total` : "—"}
            <br />
            {p?.pm_years_experience != null ? `${p.pm_years_experience} yrs PM` : ""}
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {!ev ? (
            <section className="card p-6">
              <h2 className="h-section">Not evaluated yet</h2>
              <p>{c.last_error ? `Last attempt failed: ${c.last_error}` : "This CV has not been scored."}</p>
              <p className="mt-2 text-sm">Use “Re-run evaluation” on the right.</p>
            </section>
          ) : (
            <>
              {/* Why this score */}
              <section className="card p-6">
                <h2 className="h-section">Why this score</h2>
                <p className="text-lg leading-relaxed">{ev.reasoning}</p>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <div className="label">Strengths</div>
                    <ul className="space-y-2">
                      {ev.strengths.map((s, i) => (
                        <li key={i} className="border-l-[6px] border-ink pl-3">{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="label">Gaps</div>
                    <ul className="space-y-2">
                      {ev.gaps.map((s, i) => (
                        <li key={i} className="border-l-[6px] border-dashed border-ink pl-3">{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {ev.jd_fit_notes && (
                  <p className="mt-6 border-t-2 border-ink pt-3 text-sm">
                    <span className="font-black uppercase">JD notes (not scored): </span>
                    {ev.jd_fit_notes}
                  </p>
                )}
              </section>

              {/* Rubric breakdown */}
              <section className="card p-6">
                <h2 className="h-section">Rubric breakdown · {c.role} rubric</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-ink text-left text-cream">
                        <th className="p-2">Criterion</th>
                        <th className="p-2">Weight</th>
                        <th className="p-2">Rating</th>
                        <th className="p-2 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ev.criteria.map((cr) => (
                        <tr key={cr.id} className="border-b-2 border-ink">
                          <td className="p-2 font-bold">{cr.id} · {cr.name}</td>
                          <td className="p-2 font-mono">{cr.weight}%</td>
                          <td className="p-2"><div className="flex items-center gap-2"><RatingBlocks rating={cr.rating} /><span className="font-mono">{cr.rating}/5</span></div></td>
                          <td className="p-2 text-right font-mono font-bold">{cr.weighted.toFixed(1)}</td>
                        </tr>
                      ))}
                      <tr className="bg-ink text-cream">
                        <td className="p-2 font-black uppercase" colSpan={3}>Weighted total = Σ (rating ÷ 5 × weight)</td>
                        <td className="p-2 text-right font-mono text-lg font-bold">{ev.overall_score.toFixed(1)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 space-y-4">
                  {ev.criteria.map((cr) => (
                    <details key={cr.id} className="card-flat group p-4" open={cr.weight >= 20}>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                        <span className="font-black">{cr.id} · {cr.name}</span>
                        <span className="font-mono text-sm">{cr.rating}/5 <span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span></span>
                      </summary>
                      <p className="mt-3">{cr.rationale}</p>
                      <div className="mt-3">
                        <div className="label">Evidence from CV</div>
                        {cr.evidence.length === 0 ? (
                          <p className="text-sm italic">No evidence found in CV.</p>
                        ) : (
                          <ul className="space-y-2">
                            {cr.evidence.map((e, i) => (
                              <li key={i} className="flex gap-2 text-sm">
                                <span className={`tag h-fit ${e.verified ? "tag-dark" : ""}`} title={e.verified ? "Quote found verbatim in the CV" : "Not found verbatim — check the CV"}>
                                  {e.verified ? "✓ In CV" : "? Check"}
                                </span>
                                <q className="font-mono">{e.quote}</q>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              {/* Interview brief */}
              <section className="card p-6">
                <h2 className="h-section">Interview brief · suggested probes</h2>
                <ol className="space-y-4">
                  {ev.interview_questions.map((qq, i) => (
                    <li key={i} className="grid grid-cols-[auto_1fr] gap-3">
                      <span className="grid h-8 w-8 place-items-center bg-ink font-mono font-bold text-cream">{i + 1}</span>
                      <div>
                        <p className="font-bold">{qq.question}</p>
                        <p className="text-sm"><span className="font-black uppercase">Listen for: </span>{qq.listen_for}</p>
                        {qq.criterion_id && <span className="tag mt-1">{qq.criterion_id}</span>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}

          {/* Profile */}
          {p && (
            <section className="card-flat p-6">
              <h2 className="h-section">Candidate profile (extracted)</h2>
              <p>{p.summary}</p>
              {p.experience.length > 0 && (
                <ul className="mt-4 space-y-1 text-sm">
                  {p.experience.map((x, i) => (
                    <li key={i}><span className="font-bold">{x.title}</span> — {x.company} <span className="font-mono">({x.period})</span></li>
                  ))}
                </ul>
              )}
              {p.education.length > 0 && <p className="mt-3 text-sm"><span className="font-black uppercase">Education: </span>{p.education.join("; ")}</p>}
              {p.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">{p.skills.slice(0, 20).map((s) => <span key={s} className="tag">{s}</span>)}</div>
              )}
            </section>
          )}

          <details className="card-flat p-4">
            <summary className="cursor-pointer font-black uppercase">Original CV text {c.cv_filename ? `· ${c.cv_filename}` : ""}</summary>
            <pre className="mt-3 max-h-[500px] overflow-auto whitespace-pre-wrap font-mono text-xs">{c.cv_text}</pre>
          </details>
        </div>

        {/* Right rail: decision + email + history */}
        <aside className="space-y-8">
          <CandidateActions
            candidate={{ id: c.id, name: c.name, email: c.email, status: c.status }}
            hasEvaluation={!!ev}
            emails={emails}
          />

          <section className="card-flat p-4">
            <h2 className="h-section">Action history</h2>
            <ol className="space-y-3 text-sm">
              {actions.map((a) => (
                <li key={a.id} className="border-l-[3px] border-ink pl-3">
                  <div className="font-bold">
                    {ACTION_LABEL[a.action] ?? a.action}
                    <span className="tag ml-2">{a.actor}</span>
                  </div>
                  <div className="font-mono text-xs">{new Date(a.created_at).toLocaleString("en-IN")}</div>
                  {a.details && <ActionDetail d={a.details} />}
                </li>
              ))}
            </ol>
          </section>
          {ev && (
            <p className="text-xs">
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
  if (d.simulated) parts.push("SIMULATED (dry-run)");
  if (d.error) parts.push(String(d.error));
  if (d.note) parts.push(`Note: ${d.note}`);
  return parts.length ? <div className="text-xs">{parts.join(" · ")}</div> : null;
}
