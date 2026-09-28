import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Pool, type QueryResultRow } from "pg";

const g = globalThis as unknown as { _pool?: Pool; _schema?: Promise<void> };

function pool() {
  if (!g._pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set. Add your Neon connection string to .env.local.");
    g._pool = new Pool({ connectionString, max: 5 });
  }
  return g._pool;
}

function ensureSchema() {
  if (!g._schema) {
    const sql = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
    g._schema = pool()
      .query(sql)
      .then(() => undefined)
      .catch((e) => {
        g._schema = undefined;
        throw e;
      });
  }
  return g._schema;
}

export async function q<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  await ensureSchema();
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function logAction(
  candidateId: string | null,
  actor: "arjun" | "ai" | "system",
  action: string,
  details?: unknown,
) {
  await q("INSERT INTO actions (candidate_id, actor, action, details) VALUES ($1,$2,$3,$4)", [
    candidateId,
    actor,
    action,
    details ? JSON.stringify(details) : null,
  ]);
}
