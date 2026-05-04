# TV Series Bingo

Brownfield FastAPI + React multiplayer bingo app for TV shows and YouTube content. Real users (Pippa's mum and Gordie). v1 milestone is polish-and-stabilise, hosted on kainga-core, family-only, **never public release**.

## Where to look first

- **`.planning/PROJECT.md`** — what this is, core value, validated capabilities, active scope, out of scope, constraints, key decisions
- **`.planning/REQUIREMENTS.md`** — 15 v1 requirements with REQ-IDs and phase traceability
- **`.planning/ROADMAP.md`** — 5 phases, requirement mappings, success criteria
- **`.planning/STATE.md`** — current phase, status, blockers
- **`.planning/codebase/`** — pre-existing codebase map (ARCHITECTURE, STACK, CONCERNS, etc.) from prior `/gsd-map-codebase`

## Workflow

This project uses GSD (Get Shit Done). Standard commands:

- `/gsd-progress` — orient yourself; shows current phase, status, next action
- `/gsd-plan-phase N` — plan phase N (research → plan → plan-check)
- `/gsd-execute-phase N` — execute the plans in phase N
- `/gsd-ui-phase N` — generate UI design contract for UI-bearing phases (3, 4)
- `/gsd-next` — auto-advance to the next logical step

Config: YOLO mode (auto-approve), coarse granularity, parallel execution, phase research + plan-check + verifier all enabled, budget model profile (haiku for researchers, sonnet for roadmapper).

## Hard constraints

- **Hosting**: kainga-core only. No public IP, no public release. Family access via LAN / Tailscale.
- **Privacy**: All user data stays on kainga-core. No third-party analytics, tracking, or cloud SDKs (per [[CIO Brief - TV Bingo Analytics Stack]] in the C-Suite folder — local SQLite events table + `/stats` page).
- **Stack lock for v1**: Python 3.11 / FastAPI / SQLite / React 19 / Vite / TypeScript. Architecture rebuild belongs in v2, driven by what v1 analytics teach.
- **No history rewrite** of the existing git repo — repo is private, clean going forward is enough.

## Open dependency

Phase 3's APP-04 (visual polish) depends on Pippa running `/gsd-sketch` to explore design directions. PWA mechanics (APP-01/02/03) don't depend on it and can ship first within the phase.

## Brownfield notes

- Branch in flight: `claude/resume-ai-app-ClIA9` (1 commit ahead of origin before this session). Phase 1 commits the 5 uncommitted files as its first move.
- Existing concerns audit at `.planning/codebase/CONCERNS.md` flagged many issues — v1 addresses the highest-leverage ones (silent failures, fragile YouTube scraping, no tests on critical logic). The rest defer to v2.
- Telegram bot has been **removed** in Phase 1 (not kept) — silent-fails per audit, no value for in-room family use.
