# Roadmap: TV Series Bingo — v1 Polish & Ship

## Overview

The app already works and has real users. This milestone plugs the known holes and ships something Mum and Gordie can install to their desktop and tap open like an app. Six phases: clean the working tree and remove dead code, add AI provider flexibility, convert to a PWA with a visual freshen-up, wire local analytics, deploy to kainga-core for family use, then validate the fragile bits with pytest coverage.

**Phase 5/6 split (decided 2026-05-06):** The original Phase 5 bundled DEPLOY-01 with TEST-01 and TEST-02. After Phase 3 UAT surfaced four PWA-install tests deferred to a real HTTPS deployment, Pippa elected to deploy ahead of writing tests so the family can actually start using the installed app and so the deferred PWA verification can close. Phase 5 now scopes to DEPLOY-01 only; TEST-01/02 move to Phase 6.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Code Hygiene** - Commit the 5 in-flight files, drop Telegram, and tighten git tracking
- [x] **Phase 2: AI Provider Flexibility** - Multi-provider AI client (Anthropic + OpenRouter) with config-driven swap (completed 2026-05-05)
- [ ] **Phase 3: PWA & Visual Polish** - PWA manifest + service worker + installability, then design-directed UI polish
- [ ] **Phase 4: Local Analytics** - SQLite events pipeline, 12 instrumented events, admin stats page
- [ ] **Phase 5: Deploy** - Deploy to kainga-core via Caddy + docker-compose; LAN-only HTTPS so the family can install the PWA on Android (closes 4 deferred Phase 3 UAT items)
- [ ] **Phase 6: Tests** - Pytest coverage for `bingo_checker` and `card_builder`, the two fragile services flagged in Phase 1's concerns audit

## Phase Details

### Phase 1: Code Hygiene
**Goal**: The codebase is clean — in-flight work committed, Telegram removed, sensitive files out of git going forward
**Depends on**: Nothing (first phase)
**Requirements**: POLISH-01, POLISH-02, POLISH-03
**Success Criteria** (what must be TRUE):
  1. All 5 in-flight files (Help modal, YouTube transcript fallback, logging fixes) are committed on the working branch
  2. Telegram bot code and env vars are gone — no references in services, config, README, or docker-compose
  3. `.env` and `bingo.db*` are untracked by git; `.gitignore` prevents re-addition; `.env.example` reflects current required vars
**Plans:** 5 plans
- [x] 01-01-PLAN.md — Commit 1/5: Help modal (POLISH-01a) — frontend/src/pages/Help.tsx + App.tsx + global.css
- [x] 01-02-PLAN.md — Commit 2/5: YouTube transcript fallback + logging (POLISH-01b) — backend/services/youtube_service.py
- [x] 01-03-PLAN.md — Commit 3/5: Moments router logging fix (POLISH-01c) — backend/routers/moments.py
- [x] 01-04-PLAN.md — Commit 4/5: Telegram excision end-to-end (POLISH-02) — 6 files + .env working-tree strip
- [x] 01-05-PLAN.md — Commit 5/5: Repo hygiene (POLISH-03) — idempotent untrack + .gitignore wildcard + frontend/bingo.db deletion + push to origin

### Phase 2: AI Provider Flexibility
**Goal**: Moment generation works with either Anthropic or OpenRouter; provider is swapped via env var with no code changes
**Depends on**: Phase 1
**Requirements**: AI-01, AI-02
**Success Criteria** (what must be TRUE):
  1. ~~Setting `AI_PROVIDER=openrouter` in `.env` routes all moment generation through OpenRouter without code changes~~ → **Amended 2026-05-05 (Phase 2 discuss):** With `OPENROUTER_API_KEY` set and `AI_MODEL` unset, moment generation works using the default model (`openai/gpt-4o-mini`).
  2. ~~Setting `AI_PROVIDER=anthropic` (or no setting) routes through Anthropic — existing behaviour preserved~~ → **Amended 2026-05-05 (Phase 2 discuss):** Setting `AI_MODEL=anthropic/claude-haiku-4.5` (or any OpenRouter model string) routes moment generation through that model with no code changes.
  3. ~~`.env.example` documents `AI_PROVIDER` and `AI_MODEL` with sensible defaults; README explains the switch~~ → **Amended 2026-05-05 (Phase 2 discuss):** `.env.example` documents `OPENROUTER_API_KEY` (required) and `AI_MODEL` (optional, default shown). Root `README.md` explains the model switch and lists example values including free models (e.g. `meta-llama/llama-3.3-70b-instruct:free`).
**Plans:** 3 plans
- [x] 02-01-PLAN.md — Code swap: moment_generator.py → OpenRouter httpx; config + requirements + .env.example + docker-compose
- [x] 02-02-PLAN.md — Spec amendments: strikethrough patches on REQUIREMENTS.md AI-01/AI-02 + ROADMAP Phase 2 success criteria + PROJECT.md Key Decisions row
- [x] 02-03-PLAN.md — Root README.md: env contract, model switch, kainga-core deploy notes per D-08

### Phase 3: PWA & Visual Polish
**Goal**: Users can install the app to their desktop and tap it open like an app; the interface looks and feels polished
**Depends on**: Phase 2
**Requirements**: APP-01, APP-02, APP-03, APP-04
**Success Criteria** (what must be TRUE):
  1. Chromium shows an "Install app" prompt; clicking it adds the bingo game to the desktop as a standalone window
  2. Safari on iOS shows "Add to Home Screen"; the installed app launches without browser chrome
  3. Installed app loads correctly offline for the SPA shell; API calls attempt network (no offline gameplay required)
  4. The visual design reflects the directions from Pippa's /gsd-sketch exploration — updated colours, typography, and component styles are applied *(moves to Phase 3.1 per D-12; Phase 3 verifies on criteria #1–#3 only)*
**Plans:** 2 plans
- [x] 03-01-assets-PLAN.md — Tooling & assets: install vite-plugin-pwa + @vite-pwa/assets-generator, generate PNG/ICO icons from favicon.svg, delete icons.svg sprite, gitignore dev-dist
- [x] 03-02-wiring-PLAN.md — PWA wiring: VitePWA plugin in vite.config.ts, registerSW in main.tsx, theme-color meta tag update, tsconfig type shim, README PWA install paragraph

### Phase 4: Local Analytics
**Goal**: Usage data is captured locally in SQLite and visible on an admin stats page — no third-party services
**Depends on**: Phase 3
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03
**Success Criteria** (what must be TRUE):
  1. Playing a game to completion produces event rows in the `events` SQLite table — card_create_started through bingo_achieved are all recorded
  2. WebSocket connect and disconnect events appear in the same table with the same distinct_id as the player's frontend events
  3. Visiting `/stats` shows a dashboard with the 6 charts (card creation funnel, source-type breakdown, game completion rate, retention by week, square-marking activity, abandonment points)
**Plans**: TBD
**UI hint**: yes

### Phase 5: Deploy
**Goal**: The app is running on kainga-core for family use over LAN-only HTTPS, so Mum and Gordie can install the PWA on their Android devices
**Depends on**: Phase 4
**Requirements**: DEPLOY-01
**Success Criteria** (what must be TRUE):
  1. `docker-compose up` on kainga-core boots the app stack (FastAPI + frontend + Caddy reverse proxy) cleanly from a fresh checkout
  2. The app is reachable on the kainga-core LAN over **HTTPS** (cert strategy decided during planning research — Caddy local CA, mkcert, or other; constrained to LAN only, no public exposure)
  3. From an Android phone on the kainga-core LAN, the PWA install prompt appears and the app installs to the home screen with the correct manifest icon (closes deferred Phase 3 UAT tests 1, 2, 3, 4)
  4. README documents the deploy steps (LAN access, cert install for client devices, env vars, restart procedure)
**Constraints (from Pippa, 2026-05-06):**
  - LAN only — no Tailscale provisioning in this phase (existing CLAUDE.md note about LAN/Tailscale stands as a v2/future option)
  - Caddy is the reverse proxy (existing config in home lab docs)
  - docker-compose is the deploy mechanism
  - Defer to home lab + system docs for kainga-core specifics; surface unknowns via /csuite (Suki is CIO advisor)
**Plans**: TBD

### Phase 6: Tests
**Goal**: The two fragile services flagged in Phase 1's concerns audit have automated test coverage so future changes don't regress winning-pattern detection or card composition
**Depends on**: Phase 5
**Requirements**: TEST-01, TEST-02
**Success Criteria** (what must be TRUE):
  1. `pytest` passes — all winning patterns (rows, columns, diagonals, full card) and negative cases for `bingo_checker` are covered
  2. `pytest` passes — `card_builder` tests verify no duplicates per card, free centre, and correct likelihood-tier distribution including small-pool fallback
  3. CI or pre-commit-style hook runs the suite (mechanism TBD during planning — could be a make target, a pre-push git hook, or a docker-compose `test` service)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Code Hygiene | 5/5 | Complete | 2026-05-04 |
| 2. AI Provider Flexibility | 3/3 | Complete | 2026-05-05 |
| 3. PWA & Visual Polish | 2/2 | UAT partial — 4 items deferred to Phase 5 | - |
| 4. Local Analytics | 0/TBD | Not started | - |
| 5. Deploy | 0/TBD | Not started | - |
| 6. Tests | 0/TBD | Not started | - |
