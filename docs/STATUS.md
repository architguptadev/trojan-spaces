# Implementation status

## Implemented and locally exercised
Discovery and filtering, responsive UI, map, validated local natural-language parsing, group invite links and availability persistence, constraint matching, saved plans, conflict-triggered replanning, consent-based synthetic watches, cancellation/release state ordering, official handoff and PWA offline fallback. Postgres adapter and Gemini adapter are implemented.

## External dependencies
- Live room inventory and real cancellation watches: require permission and provider credentials. No connector is silently substituted with scraping.
- Direct booking and cancellation: require authorized APIs and provider confirmation. Current product uses official handoff.
- Gemini execution: requires `GEMINI_API_KEY`. The current no-key demo uses the labeled local parser. Gemini network behavior has not been tested with a key.
- Hosted Postgres: requires `DATABASE_URL`. Local SQLite is exercised; remote database connectivity has not been tested without credentials.
- Public hosting: repository includes a Dockerfile and deployment instructions. A public prototype URL requires a hosting account/deployment credential.
- Devpost: submission text, screenshots, slides and video script are prepared. Team details, registration/check-in and a recorded video remain participant actions.

## MVP limits
Approximate building pins, synthetic room metadata and photo associations; no verified room-level inventory. Group responses apply to the shared study date. Bearer group links provide access, no USC identity verification. Guest sessions use random cookies and are not institutional authentication. No alert delivery outside the app, no scheduled monitoring, no production abuse controls or automatic retention deletion. Session/private state isolates casual access but a USC deployment needs SSO, monitoring, rate limiting, retention and a security review. The server checks session ownership, validation, release ordering and same-origin browser writes.
