"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronDown, Pencil, RotateCcw, Send, Sparkles, X } from "lucide-react";
import type { EmailRecord, Status } from "@/lib/types";
import { ErrorBox, Spinner, StatusTag } from "./ui";

type Props = {
  candidate: { id: string; name: string; email: string | null; status: Status };
  hasEvaluation: boolean;
  emails: EmailRecord[];
};

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function CandidateActions({ candidate: c, hasEvaluation, emails }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const draftType = c.status === "shortlisted" ? "invite" : c.status === "declined" ? "rejection" : null;
  const draft = emails.find((e) => e.type === draftType && (e.status === "draft" || e.status === "failed"));
  const sent = emails.filter((e) => e.status === "sent");

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const decide = (decision: "shortlist" | "decline" | "reopen") =>
    run(decision, () => post(`/api/candidates/${c.id}/decision`, { decision }));

  const locked = c.status === "interview_invited" || c.status === "rejection_sent";

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="text-[22px] leading-tight tracking-tight">
          Your decision,
          <br />
          <span className="text-muted">the AI only recommends.</span>
        </h2>
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-muted">Status</span> <StatusTag status={c.status} />
        </div>

        {!locked && (
          <div className="mt-4 grid gap-2">
            {c.status !== "shortlisted" && (
              <button className="btn btn-dark h-11" disabled={!hasEvaluation || !!busy} onClick={() => decide("shortlist")}>
                {busy === "shortlist" ? <Spinner /> : <Check size={16} />} Shortlist for interview
              </button>
            )}
            {c.status !== "declined" && (
              <button className="btn h-11" disabled={!hasEvaluation || !!busy} onClick={() => decide("decline")}>
                {busy === "decline" ? <Spinner /> : <X size={16} />} Not moving forward
              </button>
            )}
            {(c.status === "shortlisted" || c.status === "declined") && (
              <button className="btn btn-ghost h-10 text-muted" disabled={!!busy} onClick={() => decide("reopen")}>
                <RotateCcw size={15} /> Undo decision
              </button>
            )}
          </div>
        )}
        {locked && <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm">Email sent — decision recorded.</p>}

        <button
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-40"
          disabled={!!busy}
          onClick={() => run("eval", () => post(`/api/candidates/${c.id}/evaluate`))}
        >
          {busy === "eval" ? <Spinner /> : <RotateCcw size={13} />}
          {busy === "eval" ? "Re-running evaluation…" : hasEvaluation ? "Re-run AI evaluation" : "Run AI evaluation"}
        </button>
        {error && <div className="mt-3"><ErrorBox>{error}</ErrorBox></div>}
        {notice && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-lime p-3 text-sm">
            <Check size={16} /> {notice}
          </p>
        )}
      </section>

      {draftType && (
        <section className="card overflow-hidden">
          <div className="iridescent grain relative px-5 py-4">
            <div className="relative flex items-center justify-between">
              <h2 className="text-[17px] font-medium tracking-tight">{draftType === "invite" ? "Interview invite" : "Courtesy email"}</h2>
              <span className="chip bg-white/80">
                <Sparkles size={11} /> AI draft
              </span>
            </div>
          </div>
          <div className="p-5">
            {!draft ? (
              <button
                className="btn btn-dark h-11 w-full"
                disabled={!!busy}
                onClick={() => run("draft", () => post(`/api/candidates/${c.id}/draft`, { type: draftType }))}
              >
                {busy === "draft" ? <><Spinner /> Drafting…</> : <><Sparkles size={15} /> Draft {draftType === "invite" ? "interview invite" : "courtesy email"}</>}
              </button>
            ) : (
              <Composer
                key={draft.id}
                draft={draft}
                fallbackTo={c.email}
                busy={busy}
                onRegenerate={() => run("draft", () => post(`/api/candidates/${c.id}/draft`, { type: draftType }))}
                onSend={(v) =>
                  run("send", async () => {
                    const r = await post(`/api/emails/${draft.id}/send`, v);
                    setNotice(r.simulated ? "Sent in dry-run mode (no real email). Status updated." : `Email sent to ${v.to}. Status updated.`);
                  })
                }
              />
            )}
          </div>
        </section>
      )}

      {sent.length > 0 && (
        <section className="card p-5">
          <h2 className="h-section">
            Sent emails <span className="count">{sent.length}</span>
          </h2>
          <ul className="space-y-2">
            {sent.map((e) => (
              <li key={e.id}>
                <details className="group rounded-2xl bg-surface-2 p-3 text-sm">
                  <summary className="flex cursor-pointer list-none items-center gap-2">
                    <span className={`chip ${e.type === "invite" ? "bg-yellow" : "bg-pink"}`}>{e.type}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{e.subject}</span>
                    <ChevronDown size={15} className="shrink-0 text-muted transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-xs text-muted">
                    To {e.to_email} · {e.sent_at && new Date(e.sent_at).toLocaleString("en-IN")}
                    {e.provider_id?.startsWith("dry-run") ? " · dry-run" : ""}
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-surface p-3 font-sans text-xs leading-relaxed">{e.body}</pre>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Composer({
  draft,
  fallbackTo,
  busy,
  onRegenerate,
  onSend,
}: {
  draft: EmailRecord;
  fallbackTo: string | null;
  busy: string | null;
  onRegenerate: () => void;
  onSend: (v: { to: string; subject: string; body: string }) => void;
}) {
  const [to, setTo] = useState(draft.to_email || fallbackTo || "");
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Review before sending. Nothing is sent until you click Send.</p>
      {draft.status === "failed" && <ErrorBox>Last send failed: {draft.error}</ErrorBox>}
      <label className="block">
        <span className="label">To</span>
        <input className="input" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="candidate@email.com" />
      </label>
      <label className="block">
        <span className="label">Subject</span>
        <input className="input" value={subject} readOnly={!editing} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Message</span>
        {editing ? (
          <textarea className="input h-72 leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} />
        ) : (
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3.5 font-sans text-sm leading-relaxed">{body}</pre>
        )}
      </label>

      {!confirm ? (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn h-11" disabled={!!busy} onClick={() => setEditing((v) => !v)}>
            {editing ? <><Check size={15} /> Done</> : <><Pencil size={15} /> Edit</>}
          </button>
          <button className="btn btn-dark h-11" disabled={!!busy || !to.includes("@")} onClick={() => setConfirm(true)}>
            <Send size={15} /> Send
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-yellow/70 p-3">
          <p className="mb-3 text-sm font-medium">Send this email to {to}?</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn h-10" disabled={busy === "send"} onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn btn-dark h-10" disabled={busy === "send"} onClick={() => onSend({ to, subject, body })}>
              {busy === "send" ? <><Spinner /> Sending</> : "Yes, send"}
            </button>
          </div>
        </div>
      )}
      <button
        className="inline-flex items-center gap-1.5 text-xs text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-40"
        disabled={!!busy}
        onClick={onRegenerate}
      >
        <RotateCcw size={13} /> {busy === "draft" ? "Regenerating…" : "Regenerate draft (discards edits)"}
      </button>
    </div>
  );
}
