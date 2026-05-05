# Requirements: TV Series Bingo

**Defined:** 2026-05-04
**Core Value:** It works for Mum and Gordie when they want to play, on the show they want to play with — fast, relevant, doesn't break mid-show, installable to the desktop like an app.

> **Brownfield baseline:** Validated capabilities (game creation, multiplayer WebSocket sync, bingo detection, etc.) are documented in [PROJECT.md → Requirements → Validated](./PROJECT.md). Those exist today and are confirmed by prior real use; v1 requirements below are the polish/stabilise additions.

## v1 Requirements

Requirements for the v1 milestone — polish & ship to Mum and Gordie on kainga-core.

### Polish

- [x] **POLISH-01
**: Commit the 5 in-flight uncommitted files as the first move (Help modal + `?` button, YouTube transcript fallback to name-based generation, logging fixes in `moments.py` and `youtube_service.py`)
- [x] **POLISH-02
**: Remove Telegram bot integration entirely — delete `services/telegram.py` callsites, remove `TELEGRAM_*` env vars, drop README references and config
- [x] **POLISH-03**: Repo and infra hygiene — `.env` no longer tracked (current and future), `bingo.db*` untracked, `.gitignore` tightened, `.env.example` reflects current required vars (no history rewrite — repo is private)

### AI

- [x] **AI-01**: ~~Provider-agnostic AI client supporting Anthropic *and* OpenRouter for moment generation; same `generate_moments_*` interface, swap behind config~~ → **Amended 2026-05-05 in Phase 2 discuss:** Single-client via OpenRouter for moment generation; Anthropic models stay reachable via `anthropic/*` model prefix on OpenRouter; same `generate_moments_*` interface preserved.
- [x] **AI-02**: ~~Config-driven provider and model selection via env vars (e.g. `AI_PROVIDER=anthropic|openrouter`, `AI_MODEL=...`) with sensible defaults; surfaced in `.env.example` and README~~ → **Amended 2026-05-05 in Phase 2 discuss:** Config-driven model selection via `AI_MODEL` env var (default `openai/gpt-4o-mini`); `OPENROUTER_API_KEY` required; surfaced in `.env.example` and README. `AI_PROVIDER` dropped — model name embeds the provider on OpenRouter.

### App Experience

- [ ] **APP-01**: PWA manifest with app icons (192px, 512px, maskable) and theme/background colours that match the app palette
- [ ] **APP-02**: Service worker registered, caching static assets and the SPA shell (network-first for `/api/*`, no offline gameplay required)
- [ ] **APP-03**: Installable to desktop on Chromium and Safari — "Add to home screen" / "Install app" prompt available, app launches in standalone window
- [ ] **APP-04**: Visual polish pass driven by Pippa's `/gsd-sketch` design exploration; concrete colour/typography/spacing/component-style updates derived from the resulting sketch findings skill

### Analytics

- [ ] **ANALYTICS-01**: SQLite `events` table (id, ts, distinct_id, session_id, event, props_json) with frontend `track(event, props)` wrapper module; events batched to `/api/events` endpoint
- [ ] **ANALYTICS-02**: Twelve domain events instrumented — `card_create_started`, `card_create_submitted`, `card_create_failed`, `card_created`, `card_link_shared`, `game_joined`, `square_marked`, `square_unmarked`, `bingo_achieved`, `game_abandoned`, `card_revisited`, plus server-side `ws_connected` and `ws_disconnected`; `distinct_id` forwarded through WS handshake so client and server attribute to the same user
- [ ] **ANALYTICS-03**: Admin-gated `/stats` page in the existing FastAPI/React app showing ~6 charts: card-creation funnel, source-type breakdown, game-completion rate, retention by week, square-marking activity over time, abandonment points

### Quality

- [ ] **TEST-01**: Pytest suite for `backend/services/bingo_checker.py` covering all winning patterns (rows, columns, diagonals, full card) plus negative cases
- [ ] **TEST-02**: Pytest suite for `backend/services/card_builder.py` verifying no duplicate moments per card, free centre, likelihood-tier distribution behaves correctly under varying moment-pool sizes (incl. small-pool fallback)

### Deployment

- [ ] **DEPLOY-01**: Deploy v1 to kainga-core — single-container deployment, accessible to family on LAN/Tailscale; documented in README; existing deploy approach (Dockerfile + docker-compose) reused

## v2 Requirements

Deferred to a future milestone. Not in current roadmap. Will be planned via `/gsd-new-milestone` once v1 has been in use long enough for analytics to inform priorities.

### Architecture

- **ARCH-01**: Modern architecture rebuild — driven by what v1 analytics teach us; stack and approach to be re-evaluated at the time

### Security

- **SEC-01**: WebSocket origin/auth validation — reject connections that can't prove `player_id` belongs to `game_id`
- **SEC-02**: CORS hardening — restrict from `*` to the deployed origin(s)

### AI

- **AI-V2-01**: Model auto-optimizer — route per call to the cheapest model that produces acceptable moments; possibly via a quality eval loop

### Observability

- **OBSV-01**: Health endpoint, structured logging, metrics — appropriate to a public deployment when/if v1 is exposed beyond family

### Public Release

- **PUBLIC-01**: GitHub showcase readiness — history scrub of secrets, README polish for "anyone with Claude Code can run this", optional demo mode with canned moments

## Out of Scope

Explicitly excluded from this project (or this milestone). Documented to prevent re-adding.

| Feature | Reason |
|---------|--------|
| User accounts / auth system | Deliberate trust-based design via game_id + player_id; family-LAN context doesn't need it |
| Telegram notifications | Silent-fails per audit; no value when players are in the same room watching together |
| `bingo.db` git history rewrite | Repo is private, no need to scrub history; clean going forward is enough |
| AI moment-quality refactor | Current generation works well per real prior use; revisit only if v1 analytics flag a problem |
| Public hosting / SaaS deployment | v1 is family-only on kainga-core; public exposure is a separate future milestone |
| Health endpoints / Prometheus / structured-log infra | Disproportionate to ~tens-of-family-users scale; v2 territory if it ever ships publicly |
| Cookie banner / consent UI | Local-only analytics, no cookies, no third-party — nothing to consent to |

## Traceability

Populated by the roadmapper during phase creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| POLISH-01 | Phase 1 | Complete |
| POLISH-02 | Phase 1 | Complete |
| POLISH-03 | Phase 1 | Complete |
| AI-01 | Phase 2 | Complete |
| AI-02 | Phase 2 | Complete |
| APP-01 | Phase 3 | Pending |
| APP-02 | Phase 3 | Pending |
| APP-03 | Phase 3 | Pending |
| APP-04 | Phase 3 | Pending |
| ANALYTICS-01 | Phase 4 | Pending |
| ANALYTICS-02 | Phase 4 | Pending |
| ANALYTICS-03 | Phase 4 | Pending |
| TEST-01 | Phase 5 | Pending |
| TEST-02 | Phase 5 | Pending |
| DEPLOY-01 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15 ✓
- Unmapped: 0

---
*Requirements defined: 2026-05-04*
*Last updated: 2026-05-04 — traceability populated by roadmapper*
