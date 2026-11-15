import Database from "better-sqlite3";
import postgres from "postgres";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
let local: Database.Database | undefined;
let remote: ReturnType<typeof postgres> | undefined;
async function db() {
  if (process.env.DATABASE_URL) {
    remote ??= postgres(process.env.DATABASE_URL, { max: 5 });
    await remote`CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, owner TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL)`;
    return remote;
  }
  mkdirSync(".data", { recursive: true });
  local ??= new Database(join(".data", "spaces.sqlite"));
  local.pragma("journal_mode = WAL");
  local.exec(
    "CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, owner TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL)",
  );
  return local;
}
export async function put(
  id: string,
  owner: string,
  kind: string,
  data: unknown,
) {
  const d = await db();
  const s = JSON.stringify(data);
  if (typeof d === "function")
    await d`INSERT INTO records VALUES (${id},${owner},${kind},${s}) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data WHERE records.owner=EXCLUDED.owner`;
  else
    d.prepare(
      "INSERT INTO records VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data WHERE records.owner=excluded.owner",
    ).run(id, owner, kind, s);
}
export async function get(
  id: string,
  owner?: string,
  kind?: string,
): Promise<any> {
  const d = await db();
  const rows =
    typeof d === "function"
      ? owner
        ? await d`SELECT * FROM records WHERE id=${id} AND owner=${owner}`
        : await d`SELECT * FROM records WHERE id=${id}`
      : owner
        ? d
            .prepare("SELECT * FROM records WHERE id=? AND owner=?")
            .all(id, owner)
        : d.prepare("SELECT * FROM records WHERE id=?").all(id);
  const row = rows[0] as { data: string; kind: string } | undefined;
  return row && (!kind || row.kind === kind) ? JSON.parse(row.data) : null;
}
export async function list(owner: string, kind: string) {
  const d = await db();
  const rows =
    typeof d === "function"
      ? await d`SELECT * FROM records WHERE owner=${owner} AND kind=${kind}`
      : d
          .prepare("SELECT * FROM records WHERE owner=? AND kind=?")
          .all(owner, kind);
  return rows.map((r: any) => JSON.parse(r.data));
}
export async function remove(id: string, owner: string) {
  const d = await db();
  if (typeof d === "function")
    await d`DELETE FROM records WHERE id=${id} AND owner=${owner}`;
  else d.prepare("DELETE FROM records WHERE id=? AND owner=?").run(id, owner);
}

export async function joinGroup(
  id: string,
  member: { name: string; start: number; end: number },
) {
  const d = await db();
  const append = (row: any) => {
    if (!row) throw new Error("Group not found");
    const g = JSON.parse(row.data);
    if (g.members.length >= 20) throw new Error("Group is full");
    g.members.push(member);
    return g;
  };
  if (typeof d === "function")
    return d.begin(async (tx) => {
      const rows =
        await tx`SELECT * FROM records WHERE id=${id} AND kind='group' FOR UPDATE`;
      const g = append(rows[0]);
      await tx`UPDATE records SET data=${JSON.stringify(g)} WHERE id=${id} AND kind='group'`;
      return g;
    });
  return d
    .transaction(() => {
      const row = d
        .prepare("SELECT * FROM records WHERE id=? AND kind='group'")
        .get(id);
      const g = append(row);
      d.prepare("UPDATE records SET data=? WHERE id=?").run(
        JSON.stringify(g),
        id,
      );
      return g;
    })
    .immediate();
}
