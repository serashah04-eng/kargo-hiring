"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Check, Minus, Search } from "lucide-react";
import { STATUSES, STATUS_LABEL, type CandidateRow, type Role, type Status } from "@/lib/types";
import { Avatar, BandChip, ScoreRing, StatusTag } from "./ui";

const SCORE_FILTERS = [
  { label: "Any score", min: 0 },
  { label: "55+ possible", min: 55 },
  { label: "75+ strong", min: 75 },
];

export default function Dashboard({ candidates }: { candidates: CandidateRow[] }) {
  const [role, setRole] = useState<"ALL" | Role>("ALL");
  const [minScore, setMinScore] = useState(0);
  const [status, setStatus] = useState<"ALL" | Status>("ALL");
  const [query, setQuery] = useState("");

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

  const q = query.trim().toLowerCase();
  const shown = candidates.filter(
    (c) =>
      (role === "ALL" || c.role === role) &&
      (status === "ALL" || c.status === status) &&
      (minScore === 0 || (c.overall_score ?? 0) >= minScore) &&
      (!q || c.name.toLowerCase().includes(q)),
  );

  const stats = [
    { label: "Total", value: candidates.length },
    { label: "PM", value: candidates.filter((c) => c.role === "PM").length },
    { label: "Senior PM", value: candidates.filter((c) => c.role === "SPM").length },
    { label: "Reviewed", value: candidates.filter((c) => c.overall_score != null).length },
    { label: "Shortlisted", value: candidates.filter((c) => c.status === "shortlisted" || c.status === "interview_invited").length },
    { label: "Interview-ready", value: candidates.filter((c) => c.status === "interview_invited").length, hi: true },
  ];

  return (
    <div className="space-y-6">
      <section className="card grid grid-cols-3 gap-y-5 p-5 sm:p-6 lg:grid-cols-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="border-l border-line px-3 first:border-l-0 [&:nth-child(4)]:border-l-0 lg:[&:nth-child(4)]:border-l"
          >
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{s.label}</div>
            <div className="mt-1 flex items-center gap-2 text-[34px] leading-none tracking-tight">
              {String(s.value).padStart(2, "0")}
              {s.hi && s.value > 0 && <span className="h-2 w-2 rounded-full bg-[#e8c93a]" />}
            </div>
          </div>
        ))}
      </section>

      <section className="card flex flex-wrap items-center gap-3 p-3">
        <label className="relative min-w-52 flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Search a candidate" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="seg">
          {(["ALL", "PM", "SPM"] as const).map((r) => (
            <button key={r} aria-pressed={role === r} onClick={() => setRole(r)}>
              {r === "ALL" ? "All roles" : r}
            </button>
          ))}
        </div>
        <select className="input w-auto" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} aria-label="Score">
          {SCORE_FILTERS.map((f) => (
            <option key={f.min} value={f.min}>{f.label}</option>
          ))}
        </select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as Status | "ALL")} aria-label="Status">
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </section>

      <section>
        <h2 className="h-section">
          Trusted shortlist <span className="count">{shown.length}</span>
          <span className="ml-auto text-xs font-normal text-muted">Ranked by rubric score within each role</span>
        </h2>

        {candidates.length === 0 ? (
          <div className="card iridescent grain relative overflow-hidden p-10 text-center sm:p-14">
            <div className="relative">
              <p className="text-2xl tracking-tight">Your shortlist will appear here</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Add CVs and each one is scored against the PM or Senior PM rubric, with the evidence behind every score.
              </p>
              <Link href="/candidates/new" className="btn btn-dark mt-6 h-11 px-5">Add your first CV</Link>
            </div>
          </div>
        ) : shown.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">No candidates match these filters.</div>
        ) : (
          <ul className="space-y-3">
            {shown.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/candidates/${c.id}`}
                  className="card group grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4 transition hover:shadow-[0_12px_30px_-14px_rgba(20,20,20,0.25)] lg:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,2fr)_auto_auto]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 text-center text-xs text-muted">
                      {ranks.has(c.id) ? `#${ranks.get(c.id)}` : "–"}
                    </span>
                    <Avatar name={c.name} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium">{c.name}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="chip bg-surface-2">{c.role === "PM" ? "Product Manager" : "Senior PM"}</span>
                      <StatusTag status={c.status} />
                      {c.band && <BandChip band={c.band} />}
                      {c.last_error && <span className="chip bg-pink">Eval failed</span>}
                    </div>
                  </div>
                  <div className="col-span-3 hidden gap-4 text-[13px] sm:grid sm:grid-cols-2 lg:col-span-1">
                    <Points items={c.strengths} ok />
                    <Points items={c.gaps} ok={false} />
                  </div>
                  <ScoreRing score={c.overall_score} />
                  <span className="hidden h-9 w-9 place-items-center rounded-xl border border-line transition group-hover:border-ink group-hover:bg-ink group-hover:text-white lg:grid">
                    <ArrowUpRight size={16} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Points({ items, ok }: { items: string[] | null; ok: boolean }) {
  if (!items) return <p className="text-muted">Not evaluated</p>;
  return (
    <ul className="space-y-1">
      {items.slice(0, 2).map((s, i) => (
        <li key={i} className="flex gap-2">
          <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded ${ok ? "bg-lime" : "bg-pink"}`}>
            {ok ? <Check size={11} strokeWidth={2.5} /> : <Minus size={11} strokeWidth={2.5} />}
          </span>
          <span className="line-clamp-2">{s}</span>
        </li>
      ))}
    </ul>
  );
}
