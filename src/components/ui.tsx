import { Check, X } from "lucide-react";
import { STATUS_LABEL, type Status } from "@/lib/types";

const STATUS_TONE: Record<Status, string> = {
  new: "bg-surface-2 text-muted",
  evaluated: "bg-blue",
  shortlisted: "bg-lime",
  interview_invited: "bg-yellow",
  declined: "bg-pink",
  rejection_sent: "bg-pink/60 text-muted",
};

export function StatusTag({ status }: { status: Status }) {
  return <span className={`chip ${STATUS_TONE[status] ?? "bg-surface-2"}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function BandChip({ band }: { band: string }) {
  const tone = band.startsWith("Strong") ? "bg-lime" : band.startsWith("Possible") ? "bg-yellow" : "bg-pink";
  return <span className={`chip ${tone}`}>{band}</span>;
}

/** Circular score (0–100), in the style of Dafi's progress rings. */
export function ScoreRing({ score, size = 52 }: { score: number | null; size?: number }) {
  const stroke = size > 80 ? 8 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const color = score == null ? "#e8e3dd" : score >= 75 ? "#9cb83a" : score >= 55 ? "#e8c93a" : "#e98a93";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efebe5" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className={`absolute font-medium tracking-tight ${size > 80 ? "text-3xl" : "text-sm"}`}>
        {score == null ? "—" : Math.round(score)}
      </span>
    </div>
  );
}

/** 1–5 rating as five soft pills. */
export function RatingBar({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-2 w-5 rounded-full ${i <= rating ? "bg-ink" : "bg-line"}`} />
      ))}
    </div>
  );
}

const GRADIENTS = [
  "linear-gradient(135deg,#f6d3e3,#e3d8f7 55%,#cfe3f5)",
  "linear-gradient(135deg,#f8eb9a,#fad2b6 60%,#f6d3e3)",
  "linear-gradient(135deg,#cfe3f5,#e4eca0 70%)",
  "linear-gradient(135deg,#fad2b6,#e98a93 90%)",
  "linear-gradient(135deg,#e3d8f7,#cfe3f5 50%,#f8eb9a)",
  "linear-gradient(135deg,#9fc3e6,#e3d8f7 70%)",
];

export function gradientFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <span
      className="grain relative grid shrink-0 place-items-center rounded-[14px] font-medium text-ink/80"
      style={{ width: size, height: size, background: gradientFor(name), fontSize: size * 0.34 }}
    >
      {initials}
    </span>
  );
}

/** Two-tone heading: black first line, grey continuation (Dafi style). */
export function Heading({ title, sub }: { title: string; sub?: string }) {
  return (
    <h1 className="text-[34px] font-normal leading-[1.08] tracking-tight sm:text-[42px]">
      {title}
      {sub && (
        <>
          <br />
          <span className="text-muted">{sub}</span>
        </>
      )}
    </h1>
  );
}

export function CheckRow({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3 text-sm">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${ok ? "bg-lime" : "bg-pink"}`}>
        {ok ? <Check size={15} strokeWidth={2.2} /> : <X size={15} strokeWidth={2.2} />}
      </span>
      <span className="pt-1">{children}</span>
    </li>
  );
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-pink/70 p-3 text-sm">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-surface">
        <X size={14} strokeWidth={2.2} />
      </span>
      <span className="pt-0.5">{children}</span>
    </div>
  );
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}
