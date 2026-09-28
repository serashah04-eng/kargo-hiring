"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <div className="space-y-8">
      <section className="card p-4">
        <h2 className="h-section">Your decision</h2>
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          Status: <StatusTag status={c.status} />
        </div>
        <p className="mb-4 text-xs">The score is a recommendation. Nothing happens to this candidate until you act.</p>

        {!locked && (
          <div className="grid gap-3">
            {c.status !== "shortlisted" && (
              <button className="btn btn-dark" disabled={!hasEvaluation || !!busy} onClick={() => decide("shortlist")}>
                {busy === "shortlist" ? <Spinner /> : "✓"} Shortlist for interview
              </button>
            )}
            {c.status !== "declined" && (
              <button className="btn" disabled={!hasEvaluation || !!busy} onClick={() => decide("decline")}>
                {busy === "decline" ? <Spinner /> : "✕"} Not moving forward
              </button>
            )}
            {(c.status === "shortlisted" || c.status === "declined") && (
              <button className="btn" disabled={!!busy} onClick={() => decide("reopen")}>
                ↺ Undo decision
              </button>
            )}
          </div>
        )}
        {locked && <p className="text-sm font-bold">Email sent — decision recorded.</p>}

        <button
          className="mt-4 w-full text-left text-xs font-bold underline decoration-2 underline-offset-4 disabled:opacity-40"
          disabled={!!busy}
          onClick={() => run("eval", () => post(`/api/candidates/${c.id}/evaluate`))}
        >
          {busy === "eval" ? "Re-running evaluation…" : hasEvaluation ? "↻ Re-run AI evaluation" : "↻ Run AI evaluation"}
        </button>
        {error && <div className="mt-3"><ErrorBox>{error}</ErrorBox></div>}
        {notice && <p className="mt-3 border-[3px] border-ink bg-ink p-2 text-sm font-bold text-cream">{notice}</p>}
      </section>

      {draftType && (
        <section className="card p-4">
          <h2 className="h-section">{draftType === "invite" ? "Interview invite" : "Courtesy email"}</h2>
          {!draft ? (
            <button
              className="btn btn-dark w-full"
              disabled={!!busy}
              onClick={() => run("draft", () => post(`/api/candidates/${c.id}/draft`, { type: draftType }))}
            >
              {busy === "draft" ? <><Spinner /> Drafting…</> : `Draft ${draftType === "invite" ? "interview invite" : "courtesy email"}`}
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
                  setNotice(r.simulated ? "Sent in DRY-RUN mode (no real email). Status updated." : `Email sent to ${v.to}. Status updated.`);
                })
              }
            />
          )}
        </section>
      )}

      {sent.length > 0 && (
        <section className="card-flat p-4">
          <h2 className="h-section">Sent emails</h2>
          <ul className="space-y-3">
            {sent.map((e) => (
              <li key={e.id} className="text-sm">
                <details>
                  <summary className="cursor-pointer font-bold">
                    <span className="tag tag-dark mr-2">{e.type}</span>
                    {e.subject}
                  </summary>
                  <p className="mt-1 font-mono text-xs">To {e.to_email} · {e.sent_at && new Date(e.sent_at).toLocaleString("en-IN")}{e.provider_id?.startsWith("dry-run") ? " · DRY-RUN" : ""}</p>
                  <pre className="mt-2 whitespace-pre-wrap border-2 border-ink p-2 font-sans text-xs">{e.body}</pre>
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
      <p className="text-xs">AI draft — review before sending. Nothing is sent until you click Send.</p>
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
        <span className="label">Body</span>
        {editing ? (
          <textarea className="input h-72 text-sm" value={body} onChange={(e) => setBody(e.target.value)} />
        ) : (
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-[3px] border-ink p-3 font-sans text-sm">{body}</pre>
        )}
      </label>

      {!confirm ? (
        <div className="grid grid-cols-2 gap-3">
          <button className="btn" disabled={!!busy} onClick={() => setEditing((v) => !v)}>
            {editing ? "Done editing" : "Edit"}
          </button>
          <button className="btn btn-dark" disabled={!!busy || !to.includes("@")} onClick={() => setConfirm(true)}>
            Send
          </button>
        </div>
      ) : (
        <div className="border-[3px] border-ink p-3">
          <p className="mb-3 text-sm font-bold">Send this email to {to}?</p>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn" disabled={busy === "send"} onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn btn-dark" disabled={busy === "send"} onClick={() => onSend({ to, subject, body })}>
              {busy === "send" ? <><Spinner /> Sending</> : "Yes, send"}
            </button>
          </div>
        </div>
      )}
      <button className="text-xs font-bold underline decoration-2 underline-offset-4 disabled:opacity-40" disabled={!!busy} onClick={onRegenerate}>
        {busy === "draft" ? "Regenerating…" : "↻ Regenerate draft (discards edits)"}
      </button>
    </div>
  );
}
