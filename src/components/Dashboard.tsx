"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { STATUSES, STATUS_LABEL, type CandidateRow, type Role, type Status } from "@/lib/types";
import { ScoreBox, StatusTag } from "./ui";

const SCORE_FILTERS = [
  { label: "Any score", min: 0 },
  { label: "55+ (possible)", min: 55 },
  { label: "75+ (strong)", min: 75 },
];

export default function Dashboard({ candidates }: { candidates: CandidateRow[] }) {
  const [role, setRole] = useState<"ALL" | Role>("ALL");
  const [minScore, setMinScore] = useState(0);
  const [status, setStatus] = useState<"ALL" | Status>("ALL");

  // Rank within role, since PM and SPM use different rubrics
  const ranks = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of ["PM", "SPM"] as Role[]) {
      candidates
        .filter((c) => c.role === r && c.overall_score != null)
        .sort((a, b) => b.overall_score! - a.overall_score!)
        .forEach((c, i) => m.set(c.id, i + 1));
    }
    return m;
  }, [candidates]);

  const shown = candidates.filter(
    (c) =>
      (role === "ALL" || c.role === role) &&
      (status === "ALL" || c.status === status) &&
      (minScore === 0 || (c.overall_score ?? 0) >= minScore),
  );

  const stats = [
    { label: "Total candidates", value: candidates.length },
    { label: "PM candidates", value: candidates.filter((c) => c.role === "PM").length },
    { label: "SPM candidates", value: candidates.filter((c) => c.role === "SPM").length },
    { label: "Reviewed (AI scored)", value: candidates.filter((c) => c.overall_score != null).length },
    { label: "Shortlisted", value: candidates.filter((c) => c.status === "shortlisted" || c.status === "interview_invited").length },
    { label: "Interview-ready", value: candidates.filter((c) => c.status === "interview_invited").length },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="font-mono text-4xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs font-black uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="card-flat flex flex-wrap items-end gap-4 p-4">
        <div>
          <span className="label">Role</span>
          <div className="flex">
            {(["ALL", "PM", "SPM"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`border-[3px] border-ink px-4 py-2 text-sm font-bold -ml-[3px] first:ml-0 ${role === r ? "bg-ink text-cream" : ""}`}
              >
                {r === "ALL" ? "All" : r}
              </button>
            ))}
          </div>
        </div>
        <label className="min-w-44">
          <span className="label">Score</span>
          <select className="input" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}>
            {SCORE_FILTERS.map((f) => (
              <option key={f.min} value={f.min}>{f.label}</option>
            ))}
          </select>
        </label>
        <label className="min-w-52">
          <span className="label">Status</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status | "ALL")}>
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <div className="ml-auto text-sm font-bold">
          Showing {shown.length} of {candidates.length}
        </div>
      </section>

      <section>
        <h2 className="h-section">Trusted shortlist · ranked by rubric score</h2>
        {candidates.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-2xl font-black uppercase">No candidates yet</p>
            <p className="mt-2">Add CVs to start. Each CV is scored against the PM or SPM rubric.</p>
            <Link href="/candidates/new" className="btn btn-dark mt-6">+ Add first CV</Link>
          </div>
        ) : shown.length === 0 ? (
          <div className="card-flat p-6 text-center font-bold">No candidates match these filters.</div>
        ) : (
          <ul className="space-y-4">
            {shown.map((c) => (
              <li key={c.id} className="card grid grid-cols-[auto_1fr] gap-4 p-4 md:grid-cols-[auto_1.2fr_2fr_auto] md:items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 text-center font-mono text-sm font-bold">
                    {ranks.has(c.id) ? `#${ranks.get(c.id)}` : "–"}
                    <div className="text-[10px]">{c.role}</div>
                  </div>
                  <ScoreBox score={c.overall_score} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-black">{c.name}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="tag">{c.role === "PM" ? "Product Manager" : "Senior PM"}</span>
                    <StatusTag status={c.status} />
                    {c.band && <span className="tag">{c.band}</span>}
                    {c.last_error && <span className="tag tag-dark">Eval failed</span>}
                  </div>
                </div>
                <div className="col-span-2 grid gap-3 text-sm sm:grid-cols-2 md:col-span-1">
                  <div>
                    <div className="label">Key strengths</div>
                    <ul className="list-inside list-['+_'] space-y-0.5">
                      {(c.strengths ?? []).slice(0, 2).map((s, i) => <li key={i} className="line-clamp-2">{s}</li>)}
                      {!c.strengths && <li className="list-none opacity-60">Not evaluated</li>}
                    </ul>
                  </div>
                  <div>
                    <div className="label">Key gaps</div>
                    <ul className="list-inside list-['–_'] space-y-0.5">
                      {(c.gaps ?? []).slice(0, 2).map((s, i) => <li key={i} className="line-clamp-2">{s}</li>)}
                      {!c.gaps && <li className="list-none opacity-60">Not evaluated</li>}
                    </ul>
                  </div>
                </div>
                <Link href={`/candidates/${c.id}`} className="btn col-span-2 md:col-span-1">
                  View details →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
