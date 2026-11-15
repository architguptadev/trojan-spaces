import { z } from "zod";
import { rooms } from "./catalog";
export const requestSchema = z
  .object({
    people: z.number().int().min(1).max(20),
    duration: z.number().int().min(30).max(120).multipleOf(30),
    earliest: z.number().min(8).max(21),
    latest: z.number().min(8.5).max(23),
    amenities: z
      .array(z.enum(["Whiteboard", "Display", "Outlets", "Natural light"]))
      .max(4),
    school: z.enum(["usc", "marshall"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine(
    (v) => v.latest - v.earliest >= v.duration / 60,
    "The time window must fit the session.",
  );
export type Request = z.infer<typeof requestSchema>;
export type Member = { name: string; start: number; end: number };
export type Match = {
  roomId: string;
  start: number;
  end: number;
  score: number;
  reason: string;
};
export function optimize(
  req: Request,
  members: Member[],
  blocked: string[] = [],
): Match[] {
  const out: Match[] = [];
  req = { ...req, people: Math.max(req.people, members.length) };
  for (const room of rooms) {
    if (
      room.school === "unverified" ||
      (room.school === "marshall" && req.school !== "marshall") ||
      room.capacity < req.people ||
      req.amenities.some((a) => !room.amenities.includes(a)) ||
      blocked.includes(room.id)
    )
      continue;
    for (
      let start = Math.ceil(req.earliest * 2) / 2;
      start + req.duration / 60 <= req.latest;
      start += 0.5
    ) {
      const end = start + req.duration / 60;
      if (members.some((m) => start < m.start || end > m.end)) continue;
      // Deterministic synthetic inventory only. Never represents a live USC calendar.
      if (
        (room.id === "leavey-203" && start >= 18) ||
        (room.id === "science-204" && start < 16)
      )
        continue;
      const score = Math.round(
        100 -
          room.minutes -
          (room.capacity - req.people) * 2 -
          (start - req.earliest) * 2,
      );
      out.push({
        roomId: room.id,
        start,
        end,
        score,
        reason: `Fits ${req.people} people · ${members.length ? "everyone is free" : "fits your time window"} · ${room.minutes} min illustrative walk`,
      });
    }
  }
  return out
    .sort((a, b) => b.score - a.score || a.start - b.start)
    .filter((m, i, a) => a.findIndex((x) => x.roomId === m.roomId) === i);
}
export function parseLocal(text: string, date: string): Request {
  const people = Number(
    text.match(/(\d+)\s*(?:people|person|friends|students)/i)?.[1] || 4,
  );
  const minutes = text.match(/(\d+)\s*(?:minutes|mins)/i);
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours|hrs|hour)/i);
  const duration = minutes
    ? Number(minutes[1])
    : hours
      ? Number(hours[1]) * 60
      : 60;
  const toHour = (n: string, mer?: string) => {
    let v = Number(n);
    if (mer?.toLowerCase() === "pm" && v < 12) v += 12;
    if (mer?.toLowerCase() === "am" && v === 12) v = 0;
    return v;
  };
  const range = text.match(
    /(?:from|between)?\s*(\d{1,2})\s*(am|pm)?\s*(?:-|to|and)\s*(\d{1,2})\s*(am|pm)/i,
  );
  let earliest = 14,
    latest = 20;
  if (range) {
    earliest = toHour(range[1], range[2] || range[4]);
    latest = toHour(range[3], range[4]);
  }
  const after = text.match(/after\s*(\d{1,2})\s*(am|pm)/i);
  if (after) earliest = toHour(after[1], after[2]);
  const amenities: Request["amenities"] = [];
  if (/whiteboard/i.test(text)) amenities.push("Whiteboard");
  if (/screen|display|monitor/i.test(text)) amenities.push("Display");
  if (/outlet|power/i.test(text)) amenities.push("Outlets");
  if (/sun|natural light/i.test(text)) amenities.push("Natural light");
  return requestSchema.parse({
    people,
    duration,
    earliest,
    latest,
    amenities,
    school: "usc",
    date,
  });
}
export const time = (n: number) =>
  `${Math.floor(n) % 12 || 12}${n % 1 ? ":30" : ""} ${n >= 12 ? "PM" : "AM"}`;
