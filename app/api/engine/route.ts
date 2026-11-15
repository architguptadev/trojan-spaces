import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { get, put, list, remove, joinGroup } from "@/lib/db";
import { interpret } from "@/lib/ai";
import { requestSchema, optimize } from "@/lib/planner";
import { rooms } from "@/lib/catalog";
export const runtime = "nodejs";
const memberSchema = z
  .object({
    name: z.string().trim().min(1).max(35),
    start: z.number().min(8).max(22),
    end: z.number().min(8.5).max(23),
  })
  .refine((m) => m.end > m.start);
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host"))
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  const owner = req.cookies.get("spaces_session")?.value || randomUUID();
  const respond = (body: unknown, status = 200) => {
    const res = NextResponse.json(body, { status });
    res.cookies.set("spaces_session", owner, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  };
  try {
    const raw = await req.text();
    if (raw.length > 12000) return respond({ error: "Request too large" }, 413);
    const b = JSON.parse(raw);
    let result: any;
    switch (b.action) {
      case "state":
        result = {
          plans: await list(owner, "plan"),
          watches: await list(owner, "watch"),
          releases: await list(owner, "release"),
        };
        break;
      case "interpret":
        result = await interpret(
          z.string().min(3).max(1200).parse(b.text),
          z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .parse(b.date),
        );
        break;
      case "plan": {
        const request = requestSchema.parse(b.request);
        const members = z
          .array(memberSchema)
          .max(20)
          .parse(b.members || []);
        request.people = Math.max(request.people, members.length);
        const id = randomUUID();
        const matches = b.mode === "live" ? [] : optimize(request, members);
        result = {
          id,
          request,
          members,
          matches,
          blocked: [],
          mode: b.mode === "live" ? "live" : "demo",
          status: matches.length ? "suggested" : "no_match",
          events: [
            {
              at: new Date().toISOString(),
              text: matches.length
                ? "Constraints checked. Synthetic options ranked."
                : "No verified availability. Check the official booking system.",
            },
          ],
        };
        await put(id, owner, "plan", result);
        break;
      }
      case "replan": {
        const p = await get(b.id, owner);
        if (!p) throw new Error("Plan not found");
        if (p.mode !== "demo")
          throw new Error("No authorized live source is connected.");
        p.blocked = [
          ...new Set([
            ...p.blocked,
            ...(p.matches[0] ? [p.matches[0].roomId] : []),
          ]),
        ];
        p.matches = optimize(p.request, p.members, p.blocked);
        p.status = p.matches.length ? "replanned" : "no_match";
        p.events.push({
          at: new Date().toISOString(),
          text:
            "Demo conflict received. Rechecked eligibility, amenities and every group member; " +
            (p.matches.length
              ? "found an alternative."
              : "no feasible alternative remains. Widen your constraints."),
        });
        await put(p.id, owner, "plan", p);
        result = p;
        break;
      }
      case "handoff": {
        const p = await get(b.id, owner);
        if (!p) throw new Error("Plan not found");
        const room = rooms.find((r) => r.id === b.roomId);
        if (!room || !p.matches.some((m: any) => m.roomId === room.id))
          throw new Error("Choose a current suggested room");
        p.status = "official_handoff";
        p.events.push({
          at: new Date().toISOString(),
          text: "Official booking link opened. Reservation is not confirmed by Trojan Spaces.",
        });
        await put(p.id, owner, "plan", p);
        result = { ...p, url: room.url };
        break;
      }
      case "watch": {
        if (b.mode !== "demo")
          throw new Error(
            "Live alerts require an authorized availability integration.",
          );
        if (b.consent !== true) throw new Error("Opt in to enable alerts");
        const request = requestSchema.parse(b.request);
        result = {
          id: randomUUID(),
          request,
          status: "watching",
          mode: "demo",
          createdAt: new Date().toISOString(),
          notice:
            "In-app synthetic alerts only. No USC calendars are being polled.",
        };
        await put(result.id, owner, "watch", result);
        break;
      }
      case "watch_check": {
        const w = await get(b.id, owner);
        if (!w || w.mode !== "demo") throw new Error("Watch not found");
        const matches = optimize(w.request, []);
        w.status = matches.length ? "demo_opening" : "watching";
        w.notice = matches.length
          ? `Synthetic opening detected at ${rooms.find((r) => r.id === matches[0].roomId)?.building}. Check official availability before booking.`
          : "No feasible synthetic opening. Your watch stays active.";
        await put(w.id, owner, "watch", w);
        result = w;
        break;
      }
      case "delete_watch":
        await remove(z.string().parse(b.id), owner);
        result = { ok: true };
        break;
      case "release": {
        const room = rooms.find((r) => r.id === b.roomId);
        if (!room) throw new Error("Room not found");
        result = {
          id: randomUUID(),
          roomId: room.id,
          status: "awaiting_official_cancellation",
          mode: "demo",
          createdAt: new Date().toISOString(),
        };
        await put(result.id, owner, "release", result);
        break;
      }
      case "release_cancelled": {
        const r = await get(b.id, owner);
        if (!r || r.status !== "awaiting_official_cancellation")
          throw new Error("Release is not ready");
        if (b.attest !== true)
          throw new Error("Confirm cancellation in the official system first");
        r.status = "awaiting_availability_verification";
        await put(r.id, owner, "release", r);
        result = r;
        break;
      }
      case "release_verify": {
        const r = await get(b.id, owner);
        if (
          !r ||
          r.status !== "awaiting_availability_verification" ||
          r.mode !== "demo"
        )
          throw new Error(
            "Availability must be verified by an authorized provider",
          );
        r.status = "demo_availability_verified";
        r.notice =
          "Synthetic verification only. No real room was released or transferred.";
        await put(r.id, owner, "release", r);
        result = r;
        break;
      }
      case "group_create": {
        result = {
          id: randomUUID(),
          title: z.string().min(1).max(60).parse(b.title),
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .parse(b.date),
          members: z
            .array(memberSchema)
            .max(20)
            .parse(b.members || []),
        };
        await put(result.id, owner, "group", result);
        break;
      }
      case "group_read": {
        const g = await get(z.string().uuid().parse(b.id), undefined, "group");
        if (!g || !Array.isArray(g.members)) throw new Error("Group not found");
        result = g;
        break;
      }
      case "group_join": {
        result = await joinGroup(
          z.string().uuid().parse(b.id),
          memberSchema.parse(b.member),
        );
        break;
      }
      default:
        return respond({ error: "Unknown action" }, 400);
    }
    return respond(result);
  } catch (e) {
    return respond(
      {
        error:
          e instanceof z.ZodError
            ? "Check your constraints: " +
              e.issues.map((i) => i.message).join("; ")
            : e instanceof Error
              ? e.message
              : "Unable to complete request",
      },
      400,
    );
  }
}
