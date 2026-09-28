"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorBox, Spinner } from "@/components/ui";
import type { Role } from "@/lib/types";

type Job = { name: string; state: "queued" | "scoring" | "done" | "error"; id?: string; error?: string };

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
      <Link href="/" className="text-sm font-bold underline decoration-2 underline-offset-4">← Dashboard</Link>
      <h1 className="text-4xl font-black uppercase">Add candidate CVs</h1>
      <p className="max-w-prose">
        Pick the role, then upload CVs (PDF, DOCX, TXT). Each CV is read, matched to the right job description and
        scored against the {role ? `${role} ` : ""}rubric. Scoring is a recommendation — you make the call.
      </p>

      <form onSubmit={onSubmit} className="card space-y-6 p-6">
        <div>
          <span className="label">1 · Applied role</span>
          <div className="grid grid-cols-2 gap-4">
            {(["PM", "SPM"] as Role[]).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={`border-[3px] border-ink p-4 text-left ${role === r ? "bg-ink text-cream" : "shadow-[4px_4px_0_0_#000]"}`}
              >
                <div className="text-2xl font-black">{r}</div>
                <div className="text-sm font-medium">{r === "PM" ? "Product Manager · 5 criteria" : "Senior Product Manager · 6 criteria"}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">2 · CV</span>
          <div className="mb-3 flex">
            {(["file", "text"] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={`-ml-[3px] border-[3px] border-ink px-4 py-1.5 text-sm font-bold first:ml-0 ${mode === m ? "bg-ink text-cream" : ""}`}
              >
                {m === "file" ? "Upload files" : "Paste text"}
              </button>
            ))}
          </div>
          {mode === "file" ? (
            <label className="block cursor-pointer border-[3px] border-dashed border-ink p-6 text-center">
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md"
                className="sr-only"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              <span className="font-bold">{files.length ? `${files.length} file(s) selected` : "Click to choose CV files"}</span>
              <span className="mt-1 block text-xs">PDF · DOCX · TXT — select several at once for the same role</span>
              {files.length > 0 && (
                <ul className="mt-3 text-left text-sm">
                  {files.map((f) => <li key={f.name} className="truncate">▪ {f.name}</li>)}
                </ul>
              )}
            </label>
          ) : (
            <textarea className="input h-56 font-mono text-sm" placeholder="Paste the full CV text…" value={text} onChange={(e) => setText(e.target.value)} />
          )}
        </div>

        {(mode === "text" || files.length <= 1) && (
          <label className="block">
            <span className="label">3 · Candidate email (optional — otherwise taken from CV)</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </label>
        )}

        {error && <ErrorBox>{error}</ErrorBox>}

        <button className="btn btn-dark w-full py-3 text-base" disabled={busy}>
          {busy ? <><Spinner /> Scoring against rubric…</> : "Add & evaluate"}
        </button>
      </form>

      {jobs.length > 0 && (
        <section className="card-flat p-4">
          <h2 className="h-section">Progress</h2>
          <ul className="space-y-2">
            {jobs.map((j, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`tag ${j.state === "done" ? "tag-dark" : ""}`}>
                  {j.state === "scoring" ? "Scoring…" : j.state}
                </span>
                <span className="font-bold">{j.name}</span>
                {j.state === "scoring" && <Spinner />}
                {j.id && <Link className="underline" href={`/candidates/${j.id}`}>open</Link>}
                {j.error && <span className="w-full pl-2 text-xs">⚠ {j.error}</span>}
              </li>
            ))}
          </ul>
          {done && <Link href="/" className="btn mt-4">Back to dashboard</Link>}
        </section>
      )}
    </div>
  );
}
