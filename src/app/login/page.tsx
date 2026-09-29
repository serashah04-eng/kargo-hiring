"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Logo } from "@/components/Nav";
import { ErrorBox, Spinner } from "@/components/ui";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sign in failed");
      const next = new URLSearchParams(window.location.search).get("next");
      // Full navigation so the new cookie is sent with every request
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-7">
        <Logo size={44} />
        <h1 className="mt-5 text-[30px] leading-[1.1] tracking-tight">
          Welcome back,
          <br />
          <span className="text-muted">sign in to Kargo Hiring</span>
        </h1>

        <label className="mt-6 block">
          <span className="label">Password</span>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-10 pr-11"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {error && <div className="mt-4"><ErrorBox>{error}</ErrorBox></div>}

        <button className="btn btn-dark mt-5 h-11 w-full" disabled={busy || !password}>
          {busy ? <><Spinner /> Signing in…</> : "Sign in"}
        </button>
        <p className="mt-4 text-center text-xs text-muted">The password is the APP_PASSWORD set for this app.</p>
      </form>
    </div>
  );
}
