# Source review · November 14, 2026

Research preceded implementation. The supplied chat was read through the connected chat tool. Its earlier handoff claims were treated as context only. The current workspace contained no files, repository or project-specific instructions. No earlier project code was reused. This project was authored fresh during the event dates with public npm dependencies.

## Event

[AI@USC official Devpost rules](https://ai-usc.devpost.com/rules): November 14–15, in person at Ginsburg Hall. Submission closes November 15, 2026 at 11:00 AM Pacific. Teams have one to four current USC students. Registration and in-person check-in are participant responsibilities. Public libraries/frameworks/APIs are allowed, while project code/design/prototypes must originate during the event. Required submission assets include prototype URL, description, image, video (maximum three minutes) and slides. Rubric: impact 30%, AI execution 25%, feasibility 25%, UX 20%. The rules were accessible through indexed Devpost content; direct page opening failed. Recheck organizer changes before submission.

## Reservation sources and implementation decisions

| Primary source | Verified scope | Product decision |
| --- | --- | --- |
| [USC LibCal](https://libcal.usc.edu/) | Current student and USC email requirement; one-week booking horizon; two-hour daily maximum | Student eligibility gate, at most 120-minute suggested sessions, official LibCal handoff; official system checks cumulative daily use |
| [Leavey policies](https://libraries.usc.edu/locations/leavey-library/leavey-library-collaborative-workroom-reservation-policies-and-procedures) | Student academic use, advance/day limits, email completion within 30 minutes | Display confirmation requirement; never mark handoff booked |
| [Gaughan & Tiberti technology](https://libraries.usc.edu/locations/gaughan-tiberti-library/gaughan-tiberti-library-technology) | Marshall student credentials required for study-room reservations via EMS | Exclude Marshall results unless user explicitly selects Marshall eligibility; provider rechecks entitlement |
| [USC EMS software](https://software.usc.edu/ems/) and [Provost IT](https://it.provost.usc.edu/services/applications-servers-storage/ems-event-management-system/) | EMS is department managed and requires authorized access | No general student EMS entitlement or universal booking API assumed |
| [USC Computer Science](https://www.cs.usc.edu/) and [Viterbi Ginsburg facility material](https://viterbischool.usc.edu/wp-content/uploads/2024/10/Ginsburg-Hall-Menu-of-Opportunities-Available_October-2024.pdf) | Building/department context only | No public room eligibility/availability API verified. Illustrative pod remains excluded from planner |

The older [Study Space Reservations FAQ](https://libraries.usc.edu/study-space-reservations-faq) contains pandemic-era material. It was not used to override current LibCal instructions. A Marshall test-domain knowledge base surfaced but was not used as authoritative production policy.

## Data provenance

Real: campus building names, approximate building locations, official system links, cited general access rules.
Synthetic: every room identifier, seat count, amenity, walking time, room photo association, inventory window, cancellation/opening event and provider confirmation in demo mode. Unsplash photos do not depict the named USC rooms. Counts represent fixtures, never measured campus inventory or recovered utilization.

No live source was authorized or connected. No USC credentials were collected. No reservation was created, cancelled, transferred or held. A provider integration needs written permission/API access, freshness timestamps, exact date/room/slot identity, entitlement checks, permitted polling/webhooks and confirmed cancellation/booking responses. Unverified releases must never trigger real opening alerts.
