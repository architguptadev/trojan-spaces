# Devpost submission

## Project name
Trojan Spaces

## Elevator pitch
Find a USC study room that fits your whole group, recover when plans change, and give unused reservations a second chance. Make every room count.

## Inspiration
A group study session starts with a familiar coordination problem: everyone has a different schedule, rooms live in different systems, and one changed reservation can send the group back to square one. We wanted to make that process easier while respecting the rules that keep campus spaces fair.

## What it does
Trojan Spaces turns a plain-language request into editable constraints, collects a group's availability, and ranks feasible rooms and times. When a room becomes unavailable, the planner remembers the request and finds an alternative. A campus map brings discovery into one place. Opt-in cancellation watches and a voluntary release workflow demonstrate how unused reservations could return to the pool after official cancellation and independent availability verification.

The working prototype clearly labels synthetic room inventory and events. Real links lead to official USC booking systems, where the student completes the reservation. The app never says that opening a link booked a room.

## How we built it
Next.js, React and TypeScript power the responsive PWA. Zod validates requests, and a deterministic constraint engine checks capacity, amenities, school eligibility and full group overlap. An optional server-side Gemini integration extracts intent as JSON, which passes the same validation. A labeled local parser makes the demo work without keys. SQLite persists the local demo; a Postgres adapter supports Supabase or another hosted database. Leaflet and OpenStreetMap provide campus context.

The agent persists its constraints, excluded rooms and activity history. A conflict event updates that state and reruns optimization. The release workflow enforces distinct states for official cancellation, user attestation and simulated availability verification.

## Challenges
USC room systems have different permissions. Publicly visible information is not permission to automate booking. We verified general Libraries and Marshall rules, excluded unverified Viterbi eligibility from ranking, and made live availability fail closed until an authorized provider is available.

## Accomplishments
A functioning multi-user scheduling flow, persistent state, explainable room matching, conflict recovery, consent-based demo watches, a guarded release workflow, and an interface that works on a phone. The most important behavior is honesty: no invented live room data and no unconfirmed booking success.

## What we learned
The useful AI work happens between a student's intent and a dependable plan. Language understanding makes the request easier. Explicit constraints and permission checks make the plan trustworthy.

## What's next
Pilot with USC Libraries after obtaining an approved availability feed. Replace fixture room metadata with verified records, add USC SSO, validate authorized cancellation signals and measure scheduling time, successful official handoffs and verified room-hours returned to use. These are proposed metrics, not measured results.

## Built with
next.js, react, typescript, gemini, postgresql, supabase-compatible, sqlite, leaflet, openstreetmap, zod, pwa

Use Gemini and Supabase tags only if those integrations are configured for the submitted demo. The default running build uses the local parser and SQLite.

## Rubric alignment
| Weight | Evidence to show |
| --- | --- |
| Impact 30% | A single request coordinates students and demonstrates unused-room recovery. No fabricated impact numbers. |
| AI 25% | Validated intent extraction plus a persistent agent that replans under unchanged hard constraints. Configure Gemini to demonstrate actual model execution. |
| Feasibility 25% | Running app, persistence, real share links, automated checks and official booking handoff. Integration gaps are explicit. |
| UX 20% | Responsive discovery, map/list switch, editable interpretation, consent and useful empty/error states. |

## Closing line
“We're not building USC more study rooms. We're making every room count.”

## Before submission
Add your team names, actual deployed prototype URL, public repository URL and recorded video URL. Upload the screenshots and pitch deck. Confirm registration, student eligibility, in-person check-in and organizer requirements. The prototype does not submit Devpost or register participants automatically.
