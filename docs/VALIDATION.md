# Verification record

Source revision: `500b7a1` (November 14, 2026 Pacific). Later documentation and screenshot changes do not alter the application.

- Production build and TypeScript checks: passed.
- Seven planner unit tests: passed.
- Six browser/API scenarios: passed (desktop persistence/replanning, mobile/map, ownership and state guards, multi-user groups, watch/release interface, official booking popup with no confirmation claim).
- Postgres 17 integration: passed (persistence, owner and record-kind isolation, eight concurrent group joins).
- Docker production image: built on Node 24 Linux ARM64. Running container returned a valid synthetic plan and successfully wrote SQLite data as an unprivileged user.
- [GitHub CI run](https://github.com/architguptadev/trojan-spaces/actions/runs/43687635275): passed, including Postgres, build and browser checks.
- Pitch deck: six slides rendered and visually reviewed; package/layout/import checks passed. No PowerPoint-native application test was performed.
- Screenshots: captured from the running app and inspected on desktop/mobile.

Not exercised: hosted Supabase connectivity, Gemini with an actual API key, institutional SSO, real availability/cancellation/booking APIs, external alert delivery or public deployment. No real reservation was made or cancelled. The video deliverable is a 110-second recording script, not a recorded video.
