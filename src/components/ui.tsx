import { STATUS_LABEL, type Status } from "@/lib/types";

export function StatusTag({ status }: { status: Status }) {
  const dark = status === "shortlisted" || status === "interview_invited";
  const muted = status === "declined" || status === "rejection_sent";
  return (
    <span className={`tag ${dark ? "tag-dark" : ""} ${muted ? "line-through decoration-2" : ""}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function ScoreBox({ score, size = "md" }: { score: number | null; size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <div
      className={`grid place-items-center border-[3px] border-ink font-mono font-bold ${
        score != null && score >= 75 ? "bg-ink text-cream" : "bg-cream"
      } ${lg ? "h-28 w-28 text-4xl" : "h-12 w-16 text-lg"}`}
    >
      {score == null ? "—" : score.toFixed(0)}
      {lg && <span className="-mt-3 text-[10px] tracking-widest">/ 100</span>}
    </div>
  );
}

/** 1–5 rating as five blocks. */
export function RatingBlocks({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-4 w-5 border-2 border-ink ${i <= rating ? "bg-ink" : ""}`} />
      ))}
    </div>
  );
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-[3px] border-ink bg-cream p-3 text-sm font-bold">
      <span className="tag tag-dark mr-2">Error</span>
      {children}
    </div>
  );
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin border-[3px] border-current border-t-transparent" />;
}
