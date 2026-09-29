import Link from "next/link";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { listCandidates } from "@/lib/candidates";
import Dashboard from "@/components/Dashboard";
import { ErrorBox, Heading } from "@/components/ui";

export default async function Home() {
  await connection();
  let candidates;
  try {
    candidates = await listCandidates();
  } catch (e) {
    return (
      <div className="space-y-4">
        <Heading title="Hello Arjun," sub="something went wrong" />
        <ErrorBox>Could not load candidates: {e instanceof Error ? e.message : String(e)}</ErrorBox>
        <p className="text-sm text-muted">Check DATABASE_URL in .env.local (see README).</p>
      </div>
    );
  }

  const waiting = candidates.filter((c) => c.status === "evaluated").length;
  const sub =
    candidates.length === 0
      ? "let's start clearing the backlog"
      : waiting > 0
        ? `${waiting} candidate${waiting === 1 ? " is" : "s are"} waiting for your call`
        : "your backlog is all caught up";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Heading title="Hello Arjun," sub={sub} />
        <Link href="/candidates/new" className="btn btn-dark h-11 px-5">
          <Plus size={16} /> Add CVs
        </Link>
      </div>
      <Dashboard candidates={candidates} />
    </div>
  );
}
