import { test } from "node:test";
import assert from "node:assert/strict";
import {
  optimize,
  parseLocal,
  requestSchema,
  type Request,
} from "../lib/planner";
import { rooms } from "../lib/catalog";
const req: Request = {
  people: 4,
  duration: 60,
  earliest: 14,
  latest: 20,
  amenities: ["Whiteboard"],
  school: "usc",
  date: "2026-11-15",
};
test("hard constraints preserve full group overlap, capacity and amenities", () => {
  const members = [
    { name: "A", start: 15, end: 17 },
    { name: "B", start: 16, end: 18 },
  ];
  const matches = optimize(req, members);
  assert.ok(matches.length);
  for (const m of matches) {
    const r = rooms.find((r) => r.id === m.roomId)!;
    assert.ok(m.start >= 16 && m.end <= 17);
    assert.ok(r.capacity >= 4);
    assert.ok(r.amenities.includes("Whiteboard"));
    assert.equal(r.school, "usc");
  }
});
test("does not invent group overlap", () =>
  assert.equal(
    optimize(req, [
      { name: "A", start: 14, end: 15 },
      { name: "B", start: 16, end: 18 },
    ]).length,
    0,
  ));
test("replanning excludes failed inventory and preserves constraints", () => {
  const first = optimize(req, []);
  const next = optimize(req, [], [first[0].roomId]);
  assert.ok(next.length);
  assert.ok(next.every((x) => x.roomId !== first[0].roomId));
});
test("eligibility gates Marshall and excludes unverified Viterbi", () => {
  assert.ok(
    optimize(req, []).every(
      (m) =>
        !m.roomId.startsWith("marshall") && !m.roomId.startsWith("viterbi"),
    ),
  );
  assert.ok(
    optimize({ ...req, school: "marshall" }, []).some((m) =>
      m.roomId.startsWith("marshall"),
    ),
  );
});
test("capacity includes every availability respondent", () => {
  const members = Array.from({ length: 7 }, (_, i) => ({
    name: String(i),
    start: 14,
    end: 20,
  }));
  assert.ok(
    optimize(req, members).every(
      (m) => rooms.find((r) => r.id === m.roomId)!.capacity >= 7,
    ),
  );
});
test("rejects unsupported booking durations and impossible windows", () => {
  assert.equal(
    requestSchema.safeParse({ ...req, duration: 180 }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...req,
      earliest: 19.5,
      latest: 20,
      duration: 60,
    }).success,
    false,
  );
});
test("local parser extracts supported request without inventing eligibility", () => {
  const r = parseLocal(
    "6 people, a screen, 90 minutes, from 2 to 5 pm",
    "2026-11-15",
  );
  assert.deepEqual(
    [r.people, r.duration, r.earliest, r.latest, r.school],
    [6, 90, 14, 17, "usc"],
  );
  assert.deepEqual(r.amenities, ["Display"]);
});
