import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { get, put, list, joinGroup, remove } from "../lib/db";
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL to a disposable Postgres test database.");
const owner = randomUUID(),
  id = randomUUID();
try {
  await put(id, owner, "group", {
    id,
    date: "2026-11-15",
    title: "Integration fixture",
    members: [],
  });
  assert.equal(await get(id, randomUUID()), null);
  assert.equal(await get(id, undefined, "plan"), null);
  await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      joinGroup(id, { name: `Fixture ${i}`, start: 14, end: 18 }),
    ),
  );
  assert.equal((await get(id, owner)).members.length, 8);
  assert.equal((await list(owner, "group")).length, 1);
  console.log(
    "PASS: Postgres persistence, owner isolation, kind isolation and eight concurrent group joins.",
  );
} finally {
  await remove(id, owner);
}
process.exit(0);
