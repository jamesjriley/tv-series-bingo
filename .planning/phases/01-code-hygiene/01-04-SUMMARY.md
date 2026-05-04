---
phase: 01-code-hygiene
plan: 04
subsystem: backend
tags: [python, fastapi, pydantic-settings, docker-compose, telegram, git-hygiene, atomic-commit, surgical-excision]

requires:
  - plan: 01-03
    provides: fix(moments) commit on claude/resume-ai-app-ClIA9 — three POLISH-01 commits complete

provides:
  - Telegram bot integration fully excised: service file deleted, import sites cleaned, config fields removed, docker-compose env stripped, .env working-tree cleaned, CLAUDE.md updated to past tense
  - Zero Telegram references in searchable backend surface (grep -ri "telegram" backend/ returns nothing)
  - backend/config.py reduced to 4 fields: anthropic_api_key, database_path, host, port
  - docker-compose.yml environment block contains only ANTHROPIC_API_KEY and DATABASE_PATH

affects: [01-code-hygiene, 01-05]

tech-stack:
  added: []
  patterns:
    - "Surgical-excision discipline: zero-reference criterion — grep -ri 'telegram' backend/ must return nothing after excision commit"
    - "Atomic excision commit: all related files (service deletion, call site cleanup, config, infra, docs) go in one commit — no half-states in history"

key-files:
  created: []
  modified:
    - backend/routers/games.py
    - backend/routers/websocket.py
    - backend/config.py
    - docker-compose.yml
    - CLAUDE.md
  deleted:
    - backend/services/telegram.py

key-decisions:
  - "Verbatim D-14 commit subject: chore(telegram): remove bot integration end-to-end — locked, not paraphrased"
  - "base_url field removed from config.py (D-05): only consumer was telegram.py's game-link builder — confirmed by grep before excision"
  - "BASE_URL env entry removed from docker-compose (D-06 corrected by pattern mapper): 4 lines deleted, not 3 — BASE_URL on line 16 fed nothing after config.py field removal"
  - "lines 44-48 of games.py deleted entirely (not just the notify call): game = await game_service.get_game() on line 44 was dead code once Telegram was gone"
  - ".env cleanup is working-tree-only (gitignored) — confirmed by git check-ignore -v .env before any staging"
  - "Smoke import failure (pydantic_settings not in system Python) is pre-existing environment condition — project runs via Docker, documented in 01-03-SUMMARY.md"

patterns-established:
  - "Zero-reference discipline: after removing a feature, grep -ri '<feature>' <search_path>/ must return nothing before committing"
  - "Explicit staging: git add <file1> <file2> ... — never git add . or -A; .env is gitignored but explicit staging prevents accidents"

requirements-completed: [POLISH-02]

duration: 8min
completed: 2026-05-04
---

# Phase 01 Plan 04: Telegram Excision Summary

**Telegram bot integration surgically excised end-to-end in one atomic commit (df2fe85): service file deleted, both router import/call sites cleaned, 4 config fields removed, docker-compose env stripped to 2 entries, working-tree .env cleaned, CLAUDE.md tense updated to past**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-04T11:30:00Z
- **Completed:** 2026-05-04T11:38:00Z
- **Tasks:** 3
- **Files modified:** 5 (+ 1 deleted, + 1 working-tree-only .env)

## Accomplishments

- Pre-flight verified all 4 files had verbatim before-state matching PATTERNS.md (lines 4/5 of routers, lines 9-12 of config.py, lines 13-16 of docker-compose.yml)
- Applied 5 file mutations: `git rm` telegram.py, 2 edits in games.py, 2 edits in websocket.py, 4-line deletion from config.py, 4-line deletion from docker-compose.yml
- Stripped 4 Telegram/BASE_URL keys from working-tree `.env` (gitignored — never staged); ANTHROPIC_API_KEY retained verbatim
- Updated CLAUDE.md line 40 from "is being **removed**" to "has been **removed**" (past tense per D-08)
- Staged exactly 6 files by explicit name; confirmed no `.env` in index before committing
- Commit `df2fe85` has exactly 1 deletion + 5 modifications; zero `.env` leak

## Task Commits

This plan produces a single atomic commit (Tasks 1-2 prepare, Task 3 stages and commits):

1. **Task 1: Excise Telegram from code/config files** - (mutations applied, not yet committed)
2. **Task 2: Strip .env and update CLAUDE.md** - (working-tree changes, not staged)
3. **Task 3: Stage and atomic commit** - `df2fe85` (chore)

**Atomic commit:** `df2fe85` - `chore(telegram): remove bot integration end-to-end`

## Files Created/Modified

- `backend/services/telegram.py` — **DELETED** (71-line file: notify_game_started + notify_bingo_winner, both silent-fail via `except Exception: pass`)
- `backend/routers/games.py` — Removed `, telegram` from import line 4; removed dead 5-line block (lines 44-48: game fetch + notify_game_started call) from start_game handler
- `backend/routers/websocket.py` — Removed `, telegram` from import line 5; removed 9-line Telegram notification block (lines 94-102) from bingo handler
- `backend/config.py` — Deleted 4 fields: telegram_bot_token, telegram_group_id, telegram_topic_id, base_url; file reduced from 18 to 13 lines
- `docker-compose.yml` — Deleted 4 environment entries: TELEGRAM_BOT_TOKEN, TELEGRAM_GROUP_ID, TELEGRAM_TOPIC_ID, BASE_URL; environment block now has 2 entries only
- `CLAUDE.md` — Line 40 tense fix: "is being **removed**" → "has been **removed**"
- `.env` (working tree only, gitignored) — Removed TELEGRAM_BOT_TOKEN, TELEGRAM_GROUP_ID, TELEGRAM_TOPIC_ID, BASE_URL keys; ANTHROPIC_API_KEY retained

## Decisions Made

- Verbatim commit subject from D-14: `chore(telegram): remove bot integration end-to-end`
- Stage by explicit name only: 5 files via `git add`; telegram.py already staged via `git rm`
- `base_url` removed from both config.py and docker-compose.yml (pattern mapper correction to D-06 — 4 lines deleted, not 3)
- Smoke import failure from system Python is pre-existing environment condition per 01-02 and 01-03 precedent

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Deferred manual action (non-blocking):** The Telegram bot token in @BotFather is now dormant — no code reads it, no env passes it. At your convenience, visit @BotFather → /mybots → select bot → API Token → Revoke to fully retire the token. This is NOT required for Phase 1 to close.

## Threat Surface Scan

No new security-relevant surface introduced. This commit only removes surface:
- Removes TELEGRAM_BOT_TOKEN credential from working-tree .env (T-04-02 mitigated)
- Removes dormant credential passthrough from docker-compose.yml
- Removes dead code paths that silently swallowed exceptions (T-04-04 mitigated)

No new endpoints, auth paths, file access patterns, or schema changes.

## Known Stubs

None.

## Self-Check: PASSED

Checks run after commit df2fe85:

- `git log -1 --format=%s` = `chore(telegram): remove bot integration end-to-end`: CONFIRMED
- `git show HEAD --name-status | grep -cP "^[AMD]\t"` = 6: CONFIRMED
- `git show HEAD --name-status | grep -cP "^D\t"` = 1 (telegram.py): CONFIRMED
- `git show HEAD --name-status | grep -cP "^M\t"` = 5: CONFIRMED
- `git show HEAD --name-status | grep -E "\.env$"` = empty: CONFIRMED
- `grep -ric "telegram" backend/` = 0 (all files show 0): CONFIRMED
- `grep -cE "TELEGRAM|BASE_URL" docker-compose.yml` = 0: CONFIRMED
- `grep -c "base_url\|telegram" backend/config.py` = 0: CONFIRMED
- `test ! -f backend/services/telegram.py` = true: CONFIRMED
- `grep -n "Telegram bot has been" CLAUDE.md` = line 40: CONFIRMED
- `grep -cE "^(TELEGRAM_|BASE_URL=)" .env` = 0: CONFIRMED
- `grep -c "^ANTHROPIC_API_KEY=" .env` = 1: CONFIRMED
- `git check-ignore -v .env` = matches .gitignore rule: CONFIRMED

## Next Phase Readiness

- Commit 4 of 5 for Phase 1 is complete on branch claude/resume-ai-app-ClIA9
- POLISH-02 requirement fully addressed by this single plan
- Ready for Plan 05: `chore(repo): untrack .env and bingo.db*, tighten .gitignore`

---
*Phase: 01-code-hygiene*
*Completed: 2026-05-04*
