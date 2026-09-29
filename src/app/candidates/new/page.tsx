"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, FileText, UploadCloud } from "lucide-react";
import { ErrorBox, Heading, Spinner } from "@/components/ui";
import type { Role } from "@/lib/types";

type Job = { name: string; state: "queued" | "scoring" | "done" | "error"; id?: string; error?: string };

const ROLE_TILES: { role: Role; title: string; meta: string; bg: string }[] = [
  { role: "PM", title: "Product Manager", meta: "5 rubric criteria", bg: "linear-gradient(140deg,#f8eb9a 0%,#fad2b6 45%,#e3d8f7 100%)" },
  { role: "SPM", title: "Senior Product Manager", meta: "6 rubric criteria", bg: "linear-gradient(140deg,#cfe3f5 0%,#e3d8f7 55%,#f6d3e3 100%)" },
];

const JOB_TONE: Record<Job["state"], string> = {
  queued: "bg-surface-2 text-muted",
  scoring: "bg-blue",
  done: "bg-lime",
  error: "bg-pink",
};

export default function AddCandidate() {
  const router = useRouter();
  const [role, setRole] = useState<Role | "">("");
  const [mode, setMode] = useState<"file" | "text">("file");
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitOne(fd: FormData, idx: number) {
    setJobs((j) => j.map((x, i) => (i === idx ? { ...x, state: "scoring" } : x)));
    try {
      const res = await fetch("/api/candidates", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || "Failed"), { id: data.id });
      setJobs((j) => j.map((x, i) => (i === idx ? { ...x, state: "done", id: data.id } : x)));
      return data.id as string;
    } catch (e) {
      const err = e as Error & { id?: string };
      setJobs((j) => j.map((x, i) => (i === idx ? { ...x, state: "error", error: err.message, id: err.id } : x)));
      return null;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!role) return setError("Select the role this candidate applied for.");
    const items: FormData[] = [];
    if (mode === "file") {
      if (!files.length) return setError("Choose at least one CV file.");
      for (const f of files) {
        const fd = new FormData();
        fd.set("role", role);
        fd.set("file", f);
        if (files.length === 1 && email) fd.set("email", email);
        items.push(fd);
      }
      setJobs(files.map((f) => ({ name: f.name, state: "queued" })));
    } else {
      if (text.trim().length < 200) return setError("Paste the full CV text (at least a few paragraphs).");
      const fd = new FormData();
      fd.set("role", role);
      fd.set("text", text);
      if (email) fd.set("email", email);
      items.push(fd);
      setJobs([{ name: "Pasted CV", state: "queued" }]);
    }

    setBusy(true);
    const ids: (string | null)[] = [];
    // Sequential to stay within Gemini rate limits
    for (let i = 0; i < items.length; i++) ids.push(await submitOne(items[i], i));
    setBusy(false);
    router.refresh();
    if (items.length === 1 && ids[0]) router.push(`/candidates/${ids[0]}`);
  }

  const done = jobs.length > 0 && !busy;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/" className="btn btn-ghost -ml-3 h-9 px-3 text-muted">
        <ArrowLeft size={16} /> Dashboard
      </Link>
      <Heading title="Add candidate CVs," sub="scored against the right rubric" />
      <p className="max-w-prose text-sm text-muted">
        Pick the role, then upload CVs (PDF, DOCX, TXT). Each CV is read, matched to the job description and scored
        criterion by criterion. The score is a recommendation — you make the call.
      </p>

      <form onSubmit={onSubmit} className="card space-y-7 p-5 sm:p-7">
        <div>
          <span className="label">1 · Applied role</span>
          <div className="grid gap-3 sm:grid-cols-2">
            {ROLE_TILES.map((t) => {
              const on = role === t.role;
              return (
                <button
                  type="button"
                  key={t.role}
                  onClick={() => setRole(t.role)}
                  aria-pressed={on}
                  className={`grain relative flex h-36 flex-col justify-between overflow-hidden rounded-[20px] p-4 text-left transition ${
                    on ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "opacity-90 hover:opacity-100"
                  }`}
                  style={{ background: t.bg }}
                >
                  <span className="flex items-center justify-between">
                    <span className="chip bg-white/70">{t.role}</span>
                    <span className={`grid h-6 w-6 place-items-center rounded-full ${on ? "bg-ink text-white" : "bg-white/60"}`}>
                      {on && <Check size={14} strokeWidth={2.5} />}
                    </span>
                  </span>
                  <span>
                    <span className="block font-serif text-[26px] leading-none">{t.title}</span>
                    <span className="mt-1 block text-xs text-ink/70">{t.meta}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">2 · CV</span>
            <div className="seg">
              {(["file", "text"] as const).map((m) => (
                <button type="button" key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
                  {m === "file" ? "Upload" : "Paste text"}
                </button>
              ))}
            </div>
          </div>
          {mode === "file" ? (
            <label className="block cursor-pointer rounded-[20px] border-2 border-dashed border-line bg-surface-2 p-8 text-center transition hover:border-ink/30">
              <input type="file" multiple accept=".pdf,.docx,.txt,.md" className="sr-only" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
              <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-surface shadow-sm">
                <UploadCloud size={20} strokeWidth={1.7} />
              </span>
              <span className="block text-sm font-medium">{files.length ? `${files.length} file(s) selected` : "Click to choose CV files"}</span>
              <span className="mt-1 block text-xs text-muted">PDF · DOCX · TXT — select several at once for the same role</span>
              {files.length > 0 && (
                <ul className="mt-4 space-y-1.5 text-left text-sm">
                  {files.map((f) => (
                    <li key={f.name} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
                      <FileText size={15} className="text-muted" />
                      <span className="truncate">{f.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </label>
          ) : (
            <textarea className="input h-56 font-mono text-[13px]" placeholder="Paste the full CV text…" value={text} onChange={(e) => setText(e.target.value)} />
          )}
        </div>

        {(mode === "text" || files.length <= 1) && (
          <label className="block">
            <span className="label">3 · Candidate email (optional — otherwise taken from the CV)</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </label>
        )}

        {error && <ErrorBox>{error}</ErrorBox>}

        <button className="btn btn-dark h-12 w-full text-[15px]" disabled={busy}>
          {busy ? <><Spinner /> Scoring against the rubric…</> : "Add & evaluate"}
        </button>
      </form>

      {jobs.length > 0 && (
        <section className="card p-5">
          <h2 className="h-section">Progress</h2>
          <ul className="space-y-2">
            {jobs.map((j, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm">
                <span className={`chip ${JOB_TONE[j.state]}`}>{j.state === "scoring" ? "Scoring" : j.state}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{j.name}</span>
                {j.state === "scoring" && <Spinner />}
                {j.id && <Link className="text-xs font-medium underline underline-offset-4" href={`/candidates/${j.id}`}>Open</Link>}
                {j.error && <span className="w-full text-xs text-muted">{j.error}</span>}
              </li>
            ))}
          </ul>
          {done && <Link href="/" className="btn mt-4">Back to dashboard</Link>}
        </section>
      )}
    </div>
  );
}
