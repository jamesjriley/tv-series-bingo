# Phase 1: Code Hygiene - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean the working tree and remove dead code so subsequent phases build on a tidy base. Three deliverables: (1) commit the 5 in-flight files (Help modal, YouTube transcript fallback, logging fixes), (2) remove the Telegram bot integration entirely, (3) untrack `.env` and `bingo.db*` from git going forward and tighten `.gitignore`. **No git history rewrite** — repo is private, clean going forward is sufficient.

</domain>

<decisions>
## Implementation Decisions

### Commit Slicing — POLISH-01 (in-flight files)
- **D-01:** Three atomic commits by feature, not one lumped commit:
  1. **Help modal** — `frontend/src/pages/Help.tsx` (new) + `frontend/src/App.tsx` (mount + `?` button) + `frontend/src/styles/global.css` (modal styles)
  2. **YouTube transcript fallback + logging** — `backend/services/youtube_service.py`
  3. **Moments router logging** — `backend/routers/moments.py`
- **D-02:** CSS change for the Help modal stays in the Help commit (atomic by feature, not by file type).

### Telegram Removal — POLISH-02
- **D-03:** Delete `backend/services/telegram.py` entirely.
- **D-04:** Strip imports + call sites from:
  - `backend/routers/games.py` (line 4 import; line 46 `notify_game_started` call)
  - `backend/routers/websocket.py` (line 5 import; lines 94–102 the bingo-winner notify block)
- **D-05:** Remove **all four** Telegram-tied fields from `backend/config.py` lines 9–12: `telegram_bot_token`, `telegram_group_id`, `telegram_topic_id`, **and** `base_url` (grep confirms `base_url` is only used inside `telegram.py` to build the "Join the game" link).
- **D-06:** Remove the three `TELEGRAM_*` env entries from `docker-compose.yml` lines 13–15.
- **D-07:** Wipe the three `TELEGRAM_*` lines from the working `.env` file as part of this commit. Telegram bot revocation in @BotFather is **not** required to unblock Phase 1 — captured as a deferred manual follow-up (see Deferred Ideas).
- **D-08:** Update `CLAUDE.md` orientation file: change "Telegram bot is being **removed** in Phase 1" → "Telegram bot has been **removed** in Phase 1". Ride along in the same commit as the Telegram excision.
- **D-09:** No README updates needed — `frontend/README.md` has no Telegram refs and there is no root `README.md` yet.

### Repo / Infra Hygiene — POLISH-03
- **D-10:** `git rm --cached .env bingo.db bingo.db-wal bingo.db-shm` — untrack from git. **Working-tree files stay put**, preserving Mum & Gordie's prior real-use game data in the local DB.
- **D-11:** Delete `frontend/bingo.db` **entirely** (file removal, not just untrack). It's an accidental duplicate — frontend has no DB layer per ARCHITECTURE; backend's root `bingo.db` is the only source of truth.
- **D-12:** Tighten `.gitignore` — change `bingo.db` (specific filename) to `bingo.db*` wildcard so `-wal` / `-shm` are caught implicitly; add brief inline comments. Keep existing `.env` and `.claude/` exclusions.
- **D-13:** `.env.example` — leave the existing single `ANTHROPIC_API_KEY=...` line; optionally add a one-line comment header. Phase 2 (AI Provider Flexibility) will properly add `AI_PROVIDER` / `AI_MODEL`. Do **not** forward-load Phase 2 vars now (avoids coupling phases).

### Phase Commit Structure
- **D-14:** **Five commits total** for the phase, in this order:
  1. `feat(help): in-app Help modal with how-to-play guidance` (POLISH-01a)
  2. `feat(youtube): graceful transcript fallback + logging` (POLISH-01b)
  3. `fix(moments): proper logging in moment generation router` (POLISH-01c)
  4. `chore(telegram): remove bot integration end-to-end` — service file deletion, both routers, config fields incl. `base_url`, docker-compose, `.env` lines, `CLAUDE.md` tense update (POLISH-02)
  5. `chore(repo): untrack .env and bingo.db*, tighten .gitignore` (POLISH-03)
- **D-15:** Stay on existing branch `claude/resume-ai-app-ClIA9` — no new phase branch. Aligns with `branching_strategy: none` in config; private repo; no PR review process. Push to origin after the phase verifies.

### Claude's Discretion
- Exact wording of commit messages (subject + body) — follow existing repo style (Conventional Commits-ish: `docs:`, `feat:`, `fix:`, `chore:`).
- Whether to run lint/typecheck before each commit — yes if the project has them configured, skip silently if not.
- Order of removals within the Telegram commit (file deletion vs. import strip — pick whatever produces a clean atomic diff).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — v1 polish-and-ship vision; family-only kainga-core hosting; no public release; brownfield baseline.
- `.planning/REQUIREMENTS.md` — POLISH-01, POLISH-02, POLISH-03 acceptance criteria.
- `.planning/ROADMAP.md` §"Phase 1: Code Hygiene" — phase goal + 3 success criteria.
- `CLAUDE.md` — project orientation; current Telegram-removal hint to be updated in this phase.

### Codebase audit (informs what to fix and what to defer)
- `.planning/codebase/CONCERNS.md` — flags `.env` and `bingo.db*` tracking, Telegram silent-fail handling, `run.sh` unfiltered `.env` export. Phase 1 addresses the first two; `run.sh` is deferred (see Deferred Ideas).
- `.planning/codebase/ARCHITECTURE.md` — confirms backend-only DB access (frontend bingo.db is accidental).
- `.planning/codebase/STRUCTURE.md` — repo layout reference for the `git rm --cached` paths.

### Files touched in this phase (existing code)
- `frontend/src/pages/Help.tsx` *(new, untracked)* — Help modal page component.
- `frontend/src/App.tsx` — Help mount + `?` button.
- `frontend/src/styles/global.css` — Help modal styles.
- `backend/services/youtube_service.py` — transcript fallback to name-based generation + logging.
- `backend/routers/moments.py` — logging fix.
- `backend/services/telegram.py` *(to be deleted)*.
- `backend/routers/games.py` lines 4, 46 — Telegram import + call site.
- `backend/routers/websocket.py` lines 5, 94–102 — Telegram import + winner notify block.
- `backend/config.py` lines 9–12 — Telegram + `base_url` settings.
- `docker-compose.yml` lines 13–15 — Telegram env passthrough.
- `.env`, `.env.example`, `.gitignore`.
- `bingo.db`, `bingo.db-wal`, `bingo.db-shm`, `frontend/bingo.db`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Existing Pydantic Settings class** (`backend/config.py`) — drop the four Telegram-tied fields; the `model_config` (env_file loading) stays.
- **Existing FastAPI router pattern** in `games.py` and `websocket.py` — the Telegram call sites are isolated `await telegram.notify_*` calls, easy to excise without restructuring.
- **`.gitignore`** already lists `.env` and `bingo.db` individually — confirms the *intent* was correct; the *action* (`git rm --cached`) is what's missing. Convert specific filenames to `bingo.db*` wildcard.

### Established Patterns
- **Conventional Commits** evident in recent log (`docs:`, `fix:`, `feat:` prefixes). Phase 1 commits follow the same shape.
- **`logging.getLogger(__name__)`** pattern used in `youtube_service.py` already — moments.py logging fix should mirror this rather than introduce a new logger style.
- **No CI / no pre-commit hooks** — manual verification of clean git state after each commit.

### Integration Points
- `backend/main.py` does not import telegram directly; only the two routers do. Removing telegram is local to those two router files + the service file.
- `init_db()` in `backend/database.py` regenerates schema if `bingo.db` is missing — confirms preserving the local DB file is *optional* but safe (the user's choice, D-10, is to preserve it).

</code_context>

<specifics>
## Specific Ideas

- "5 commits, atomic, easy to revert any single concern" — explicit user preference for granularity that matches the GSD norm.
- "Don't lose Mum & Gordie's game data" — preserving `bingo.db` working-tree file is part of the v1 brownfield baseline, not just a hygiene step.
- The Telegram removal should feel **surgical**: one commit, end-to-end, no leftovers (config, env, docs, code all in the same atomic excision).

</specifics>

<deferred>
## Deferred Ideas

Captured here so they're not lost, but explicitly **out of scope for Phase 1**:

- **Telegram bot revocation in @BotFather** — manual user step, not blocking Phase 1. Token effectively goes dormant once `.env` lines are wiped and code references are gone. Add a personal todo to revoke when convenient.
- **`ANTHROPIC_API_KEY` rotation** — CONCERNS.md flagged the key as exposed in git history. Repo is private and no history rewrite per PROJECT.md. Defer to a future public-release milestone (currently v2's `PUBLIC-01` candidate).
- **Root `README.md`** — Phase 5 / `DEPLOY-01` already covers user-facing deploy README. Adding a stub now would duplicate effort.
- **`run.sh` `.env` sourcing fix** — CONCERNS.md flags it as Low priority. Out of POLISH scope for Phase 1; revisit in v2 or fold into Phase 5 deploy work if it bites.
- **Forward-loading `AI_PROVIDER` / `AI_MODEL` in `.env.example`** — Phase 2 will introduce these properly with code support. Adding placeholders now couples the phases unnecessarily.
- **`bingo.db` git history scrub / BFG repo-cleaner** — explicitly out of scope per PROJECT.md ("no history rewrite"). Repo is private; clean going forward is enough.

</deferred>

---

*Phase: 01-code-hygiene*
*Context gathered: 2026-05-04*
