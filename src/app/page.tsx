import Link from "next/link";
import { connection } from "next/server";
import { listCandidates } from "@/lib/candidates";
import Dashboard from "@/components/Dashboard";
import { ErrorBox } from "@/components/ui";

export default async function Home() {
  await connection();
  let candidates;
  try {
    candidates = await listCandidates();
  } catch (e) {
    return (
      <div className="space-y-4">
        <h1 className="text-4xl font-black uppercase">Hiring Dashboard</h1>
        <ErrorBox>Could not load candidates: {e instanceof Error ? e.message : String(e)}</ErrorBox>
        <p className="text-sm">Check DATABASE_URL in .env.local (see README).</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em]">Arjun and the hiring backlog</p>
          <h1 className="text-4xl font-black uppercase leading-none sm:text-5xl">Hiring Dashboard</h1>
        </div>
        <Link href="/candidates/new" className="btn btn-dark">
          + Add CVs
        </Link>
      </div>
      <Dashboard candidates={candidates} />
    </div>
  );
}
