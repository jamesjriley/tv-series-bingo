# Roadmap: TV Series Bingo — v1 Polish & Ship

## Overview

The app already works and has real users. This milestone plugs the known holes and ships something Mum and Gordie can install to their desktop and tap open like an app. Five phases: clean the working tree and remove dead code, add AI provider flexibility, convert to a PWA with a visual freshen-up, wire local analytics, then validate the fragile bits and deploy to kainga-core.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Code Hygiene** - Commit the 5 in-flight files, drop Telegram, and tighten git tracking
- [ ] **Phase 2: AI Provider Flexibility** - Multi-provider AI client (Anthropic + OpenRouter) with config-driven swap
- [ ] **Phase 3: PWA & Visual Polish** - PWA manifest + service worker + installability, then design-directed UI polish
- [ ] **Phase 4: Local Analytics** - SQLite events pipeline, 12 instrumented events, admin stats page
- [ ] **Phase 5: Tests & Deploy** - Pytest coverage for bingo_checker and card_builder, then deploy to kainga-core

## Phase Details

### Phase 1: Code Hygiene
**Goal**: The codebase is clean — in-flight work committed, Telegram removed, sensitive files out of git going forward
**Depends on**: Nothing (first phase)
**Requirements**: POLISH-01, POLISH-02, POLISH-03
**Success Criteria** (what must be TRUE):
  1. All 5 in-flight files (Help modal, YouTube transcript fallback, logging fixes) are committed on the working branch
  2. Telegram bot code and env vars are gone — no references in services, config, README, or docker-compose
  3. `.env` and `bingo.db*` are untracked by git; `.gitignore` prevents re-addition; `.env.example` reflects current required vars
**Plans**: TBD

### Phase 2: AI Provider Flexibility
**Goal**: Moment generation works with either Anthropic or OpenRouter; provider is swapped via env var with no code changes
**Depends on**: Phase 1
**Requirements**: AI-01, AI-02
**Success Criteria** (what must be TRUE):
  1. Setting `AI_PROVIDER=openrouter` in `.env` routes all moment generation through OpenRouter without code changes
  2. Setting `AI_PROVIDER=anthropic` (or no setting) routes through Anthropic — existing behaviour preserved
  3. `.env.example` documents `AI_PROVIDER` and `AI_MODEL` with sensible defaults; README explains the switch
**Plans**: TBD

### Phase 3: PWA & Visual Polish
**Goal**: Users can install the app to their desktop and tap it open like an app; the interface looks and feels polished
**Depends on**: Phase 2
**Requirements**: APP-01, APP-02, APP-03, APP-04
**Success Criteria** (what must be TRUE):
  1. Chromium shows an "Install app" prompt; clicking it adds the bingo game to the desktop as a standalone window
  2. Safari on iOS shows "Add to Home Screen"; the installed app launches without browser chrome
  3. Installed app loads correctly offline for the SPA shell; API calls attempt network (no offline gameplay required)
  4. The visual design reflects the directions from Pippa's /gsd-sketch exploration — updated colours, typography, and component styles are applied
**Plans**: TBD
**UI hint**: yes

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

### Phase 5: Tests & Deploy
**Goal**: The two fragile services have automated test coverage and the app is running on kainga-core for family use
**Depends on**: Phase 4
**Requirements**: TEST-01, TEST-02, DEPLOY-01
**Success Criteria** (what must be TRUE):
  1. `pytest` passes — all winning patterns (rows, columns, diagonals, full card) and negative cases for bingo_checker are covered
  2. `pytest` passes — card_builder tests verify no duplicates per card, free centre, and correct likelihood-tier distribution including small-pool fallback
  3. The app is accessible to family at kainga-core via LAN and Tailscale; `docker-compose up` is the deploy mechanism; README documents the steps
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Code Hygiene | 0/TBD | Not started | - |
| 2. AI Provider Flexibility | 0/TBD | Not started | - |
| 3. PWA & Visual Polish | 0/TBD | Not started | - |
| 4. Local Analytics | 0/TBD | Not started | - |
| 5. Tests & Deploy | 0/TBD | Not started | - |
