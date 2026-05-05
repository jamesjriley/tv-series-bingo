# TV Series Bingo

## What This Is

A multiplayer bingo web app for TV shows and YouTube content: pick a show or channel, AI generates 24 "moments" likely to happen (catchphrases, visuals, plot beats), players watch together, mark squares as moments occur, first to a line wins. Real users today are Pippa's mum and her partner Gordie, watching shows and YouTube together. Hosted on kainga-core for family/friends use only — not public.

## Core Value

**It works for Mum and Gordie when they want to play, on the show they want to play with.** Card generation is fast and relevant; the game runs without breaking mid-show; they can install it on the desktop and tap it open like an app.

## Requirements

### Validated

<!-- Inferred from existing working code. These are confirmed by real prior use. -->

- ✓ **Create game from TV show name** — autocomplete, AI moment generation from show name — existing
- ✓ **Create game from YouTube channel** — channel search, paste channel/video URL, transcript-driven moment generation — existing
- ✓ **AI-generated bingo moments** — 24 moments + free centre, three likelihood tiers (easy/medium/hard) — existing
- ✓ **5×5 bingo cards** — unique per player, colour-coded by likelihood — existing
- ✓ **Multiplayer via shareable link** — URL-based join, name + persistent player ID — existing
- ✓ **Real-time WebSocket sync** — square marks broadcast to all players, progress visible in sidebar — existing
- ✓ **Bingo detection** — rows, columns, diagonals, full-card variants — existing
- ✓ **Game lifecycle** — lobby → active → finished, host starts the game — existing
- ✓ **Session persistence** — player name + game ID survive page refresh via localStorage — existing
- ✓ **Game history & stats** — leaderboard, games played, basic stats endpoint — existing
- ✓ **SQLite persistence** — aiosqlite + WAL mode, schema auto-init on startup — existing

### Active

<!-- v1 milestone: Polish & ship to Mum and Gordie -->

- [ ] **Land in-flight polish** — commit the 5 uncommitted files (Help modal + ?-button, YouTube transcript fallback to name-based generation, logging fixes in moments.py and youtube_service.py)
- [ ] **Drop Telegram bot** — remove notification code paths, env vars, README references; silent-fails per audit and no value for in-room family use
- [ ] **Multi-provider AI** — config-selectable between Anthropic and OpenRouter; preserves cost flexibility and removes single-vendor dependency
- [ ] **PWA conversion** — manifest, app icons, basic service worker, installable to desktop; users tap an app, not a browser tab
- [ ] **UI freshen-up** — small visual polish pass; design direction driven by Pippa's `/gsd-sketch` exploration (separate upstream activity, output feeds the UI phase)
- [ ] **Local-only analytics** — SQLite `events` table + `/stats` admin page + thin `track()` wrapper, ~12 events, server-side WebSocket events included; no third-party SDKs
- [ ] **Repo/infra hygiene** — `.env` and `bingo.db*` properly out of git going forward (no history rewrite — repo stays private); `.gitignore` tightened
- [ ] **Tests for fragile bits** — unit tests for `bingo_checker` (winning patterns) and `card_builder` (no duplicates, free centre, distribution); pytest, small targeted suite
- [ ] **Deploy to kainga-core** — single-container deployment, accessible to family on LAN/Tailscale

### Out of Scope

<!-- Explicit boundaries with reasoning. Some are deferred to future milestones. -->

- **Full architecture rebuild** — deferred to v2 milestone; will be informed by what v1 analytics teach us about real usage
- **Public release / GitHub showcase** — pet project, family-only for now; possible future milestone if v1 proves stable and Pippa wants to share publicly
- **WebSocket auth/origin validation** — flagged in audit but low urgency on a private LAN deployment; v2 concern
- **Model auto-optimizer** (route to cheapest model per call) — interesting but stretches v1 scope; backlog item, possibly v2
- **Health endpoints / Prometheus metrics / structured-logging infrastructure** — disproportionate to ~tens-of-family-users scale
- **Telegram notifications** — dropped; silent-fails per audit and no value when players are in the same room
- **`bingo.db` git history rewrite** — file is currently tracked but repo is private; clean going forward, don't rewrite past
- **AI moment-quality improvements** — current generation works well enough per real prior use; revisit only if analytics flag a problem
- **Auth system / accounts** — deliberately trust-based via game_id + player_id; family-LAN context doesn't need it

## Context

**Brownfield, not greenfield.** Existing FastAPI + SQLite backend with WebSockets, React 19 + Vite + TypeScript frontend, Anthropic Claude integration for moment generation, YouTube transcript scraping for context. Codebase already mapped — see `.planning/codebase/` (ARCHITECTURE.md, STACK.md, CONCERNS.md, etc.).

**Real users with prior use.** Pippa's mum and Gordie used the previous version and found it valuable. There are known holes Pippa wants plugged before handing the v1 back. The pull to ship is real.

**5 uncommitted in-flight files** on branch `claude/resume-ai-app-ClIA9` are good and will be committed as the first move in v1: a Help modal with how-to-play guidance, a graceful YouTube transcript fallback (when no transcripts available, fall back to name-based moment generation rather than fail the whole game), and proper logging in two services that previously silent-failed.

**Program of work, not a single milestone.** v1 is "polish and ship." v2 is "ideal architecture, driven by what v1 analytics teach us." v2 will be planned via `/gsd-new-milestone` once v1 has been in real use long enough to provide signal.

**Codebase concerns audit (`.planning/codebase/CONCERNS.md`)** flagged several issues. v1 addresses the highest-leverage ones (silent failures, fragile YouTube scraping, no tests on the most critical logic). Lower-priority concerns (CORS hardening, WebSocket auth, dependency updates, no CI) are deferred to v2 — they don't bite at family-LAN scale.

## Constraints

- **Tech stack**: Python 3.11 / FastAPI / SQLite / React 19 / Vite / TypeScript — locked for v1; rebuild conversation belongs in v2
- **Hosting**: kainga-core only — no public IP, family access via LAN or Tailscale
- **Privacy**: All user data stays on kainga-core; no third-party analytics, tracking pixels, or cloud SDKs (per CIO consult — see [[CIO Brief - TV Bingo Analytics Stack]])
- **Budget**: Hobby project — incremental cost only; OpenRouter optionality lets AI spend stay controlled
- **Audience**: Pippa's mum, Gordie, and Pippa's circle. ~Tens of users tops. Performance/scale are not constraints; reliability and feel are.
- **Time**: No hard deadline, but real users are waiting and the pull-to-ship is genuine — favour shipping the polished thing over chasing perfection

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Polish v1, not greenfield rebuild | Mum & Gordie already used it and liked it; faster to fix than rebuild; v2 rebuild informed by real usage data | — Pending |
| Two-milestone program (v1 polish → v2 ideal architecture) | Ship something real to family now; let v1 analytics shape v2 | — Pending |
| Drop Telegram bot | Silent-fails per audit; no value for in-room family use; reduces secrets/setup burden | ✓ Good |
| Local SQLite analytics over PostHog Cloud (or self-host) | Per Suki's brief: proportionate to scale, privacy-clean for family users, owns data for v2 learnings | ✓ Good |
| Multi-provider AI (Anthropic + OpenRouter) | Cost flexibility, no single-vendor lock-in, easy config-driven switch | — Pending → Refined 2026-05-05 to OpenRouter-only with model-level provider routing (Phase 2 D-01). |
| PWA over native or browser-only | "Drop to desktop, feels like an app" without app-store overhead | — Pending |
| UI direction via Pippa's Claude-driven sketch exploration | Pippa explores the look/feel via `/gsd-sketch` upstream; sketch findings feed the UI polish phase with concrete design intent | — Pending |
| Internal-only deployment for v1 (no public release) | Pet project, family users, kainga-core hosting; revisit public release as a future milestone | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-04 after initialization*
