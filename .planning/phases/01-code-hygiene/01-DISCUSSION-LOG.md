# Phase 1: Code Hygiene - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 01-code-hygiene
**Areas discussed:** Commit slicing, Telegram cleanup scope, Local DB & data preservation, Phase commit structure, Additional (README / run.sh / CLAUDE.md)

---

## Commit Slicing

### Q: How should the 5 in-flight files be sliced into commits?

| Option | Description | Selected |
|--------|-------------|----------|
| 3 atomic by feature | Help modal (3 files) / YouTube fallback / moments.py logging | ✓ |
| 2 commits: frontend + backend | Help modal frontend / backend logging + YouTube fallback | |
| 1 lumped commit | All 5 files together | |

**User's choice:** 3 atomic by feature (recommended).
**Notes:** Aligns with GSD atomic-commit norm; cleanest git log for revert/bisect.

### Q: Should the CSS change for the Help modal stay with the Help commit or be split?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep with Help modal commit | Atomic by feature, not by file type | ✓ |
| Separate styles commit | Extra granularity but breaks "one feature, one commit" | |

**User's choice:** Keep with Help modal commit.

---

## Telegram Cleanup Scope

### Q: Should `base_url` (config field) go with the Telegram removal?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove it | grep confirms only used in `telegram.py` for the "Join the game" link | ✓ |
| Keep it | Leaves dead config | |

**User's choice:** Remove it.
**Notes:** Confirmed via grep — `base_url` is referenced only at `telegram.py:28-29`.

### Q: What about the live Telegram credentials in your `.env` file?

| Option | Description | Selected |
|--------|-------------|----------|
| Wipe from `.env` in this phase | Remove the three TELEGRAM_* lines as part of POLISH-02 | ✓ |
| Leave `.env` alone | Code stops referencing them; lines remain stale | |
| Wipe + revoke now | Wipe AND revoke bot in @BotFather before commit | |

**User's choice:** Wipe from `.env` in this phase. Revocation deferred as a manual follow-up.

### Q: Should we also rotate `ANTHROPIC_API_KEY` (the audit recommended it)?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer rotation | Repo is private, family-only, no history rewrite per PROJECT.md | ✓ |
| Rotate now in this phase | Belt-and-braces; adds out-of-band step | |

**User's choice:** Defer rotation.
**Notes:** Recorded in Deferred Ideas for future public-release milestone consideration.

---

## Local DB & Data Preservation

### Q: How should we handle the existing root `bingo.db` (has Mum & Gordie's prior game data)?

| Option | Description | Selected |
|--------|-------------|----------|
| Untrack, keep local file | `git rm --cached`; working-tree file stays put with prior data intact | ✓ |
| Untrack and wipe + regenerate | Loses prior history; clean but destructive | |

**User's choice:** Untrack, keep local file.

### Q: What about the duplicate `frontend/bingo.db`?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete entirely | Frontend has no DB layer per ARCHITECTURE; no data loss | ✓ |
| Just untrack, leave file | Confusing — implies frontend uses a DB | |

**User's choice:** Delete entirely.

### Q: Tighten `.gitignore` beyond current state?

| Option | Description | Selected |
|--------|-------------|----------|
| Add explicit `bingo.db*` and refresh comments | Wildcard catches `-wal` / `-shm`; more durable | ✓ |
| Leave as-is | Current rules technically work | |

**User's choice:** Add `bingo.db*` wildcard with inline comments.

---

## Phase Commit Structure

### Q: How should Phase 1's three deliverables (POLISH-01/02/03) commit?

| Option | Description | Selected |
|--------|-------------|----------|
| Per requirement | POLISH-01 = 3 commits; POLISH-02 = 1; POLISH-03 = 1; total 5 | ✓ |
| Per file domain | Group by backend/frontend/infra | |
| One phase commit | Single "Phase 1" commit | |

**User's choice:** Per requirement (5 commits total).

### Q: Branch strategy — stay on `claude/resume-ai-app-ClIA9` or create a phase branch?

| Option | Description | Selected |
|--------|-------------|----------|
| Stay on current branch | `branching_strategy: none` in config; private repo, no PR review | ✓ |
| New phase branch (`gsd/phase-1-code-hygiene`) | Cleaner separation but config says no branching | |

**User's choice:** Stay on current branch.

### Q: Should `.env.example` get an update in Phase 1, or leave for Phase 2?

| Option | Description | Selected |
|--------|-------------|----------|
| Touch lightly in Phase 1 | Confirm only `ANTHROPIC_API_KEY`; brief comment line | ✓ |
| Skip — leave entirely for Phase 2 | Current state already correct | |
| Forward-load now | Pre-populate `AI_PROVIDER` / `AI_MODEL` placeholders | |

**User's choice:** Touch lightly in Phase 1.

---

## Additional (Round 2)

### Q: Should Phase 1 add a top-level `README.md`?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to Phase 5 / DEPLOY-01 | Deploy README already in Phase 5 scope | ✓ |
| Add a stub README in Phase 1 | Slight scope creep but reasonable | |
| Skip entirely for v1 | CLAUDE.md is enough orientation | |

**User's choice:** Defer to Phase 5.

### Q: Touch `run.sh` (CONCERNS.md flagged it as exporting unfiltered `.env`)?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer | Out of POLISH scope; CONCERNS audit prioritises Low | ✓ |
| Fix in this phase | Quick win — swap to python-dotenv or guarded sourcing | |

**User's choice:** Defer.

### Q: Should `CLAUDE.md` orientation tense be refreshed in this phase?

| Option | Description | Selected |
|--------|-------------|----------|
| Update tense in same commit as POLISH-02 | Tiny edit, rides along with Telegram excision | ✓ |
| Leave for `/gsd-transition` or end-of-phase update | GSD's natural doc-update flow | |

**User's choice:** Update tense in POLISH-02 commit.

---

## Claude's Discretion

- Exact commit message wording (subject + body) — follow Conventional Commits style already in repo.
- Whether to run lint/typecheck before commit — yes if configured, skip silently if not.
- Order of removals within the Telegram commit (file deletion vs. import strip).

## Deferred Ideas

- Telegram bot revocation in @BotFather (manual follow-up).
- `ANTHROPIC_API_KEY` rotation (defer to public-release milestone).
- Root `README.md` (Phase 5).
- `run.sh` `.env` sourcing fix (v2 or Phase 5 deploy work).
- Forward-loading `AI_PROVIDER` / `AI_MODEL` in `.env.example` (Phase 2 owns it).
- `bingo.db` git history scrub (explicit project policy: no history rewrite).
