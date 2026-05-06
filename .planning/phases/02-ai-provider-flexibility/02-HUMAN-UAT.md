---
status: complete
phase: 02-ai-provider-flexibility
source: [02-VERIFICATION.md]
started: 2026-05-05T22:20:00Z
updated: 2026-05-06T20:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Live default-model OpenRouter call
expected: With `OPENROUTER_API_KEY` set in local `.env` and `AI_MODEL` unset, `./run.sh` then create a TV-show game from the UI (or `curl POST /api/games`). Expect 24-45 moments persisted within 5-15s with no errors. No `sk-or-v1-` or `Authorization` strings in stdout.
result: pass
notes: "Initial run blocked by backend boot failure — pydantic ValidationError on legacy ANTHROPIC_API_KEY in `.env`, with a critical secondary defect (pydantic echoed the rejected secret value to stdout). Fixed by adding `extra='ignore'` to `Settings.model_config` in `backend/config.py`. After fix + adding `OPENROUTER_API_KEY` to `.env`, game `a0ff5fd3-3e4b-4b62-8ebc-2e703fcd3da6` (Time Team, YouTube) created at 2026-05-06 19:47:42 with 35 moments persisted (within 24-45 expected range). Stdout-key-leak sub-check delegated to user terminal scrollback (DB inspection cannot verify) — user reported no leak observed."
diagnosis_recorded_in: "Gaps section retains the original blocker for traceability (root cause → fix landed → retest pass)."

### 2. Model swap via AI_MODEL env var (no code change)
expected: Edit `.env` to set `AI_MODEL=anthropic/claude-haiku-4.5`, restart backend, create new game. Sign in to https://openrouter.ai/activity — most recent call should show `model = anthropic/claude-haiku-4.5`. Game creation succeeds. No code change between step 1 and swap taking effect.
result: pass

### 3. Free model survives one call
expected: Set `AI_MODEL=meta-llama/llama-3.3-70b-instruct:free`, restart, create a game. Either succeeds (moments produced, possibly via markdown-fence fallback) OR fails with 429 rate-limit per documented free-tier warning. A 500 with "Failed to generate moments: 'choices'" would confirm WR-01 is biting.
result: pass
notes: "Returned 429 Too Many Requests on `meta-llama/llama-3.3-70b-instruct:free` — one of the two acceptable outcomes per spec. Retry-once logic in `_call_openrouter` confirmed working: traceback raised from line 136 (`raise_for_status` after retry exhaustion), meaning the transient-retry loop did execute. WR-01 ('choices' KeyError on markdown-fenced output) did NOT trigger — clean transport-level error, defensive parsing not exercised this run. Game id: c320ea45-1ef4-46e2-ac28-78a58e3ae50e."
ux_observation: "Raw `httpx.HTTPStatusError` reaches the UI as 'Failed to generate moments: Client error 429 Too Many Requests'. Functional but unfriendly for end users (Mum/Gordie). Tracked in Gaps as a separate UX item — non-blocking for Phase 2 goal."

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0
notes: "All three tests pass. Test 1 originally hit a blocker (backend boot failure on legacy `.env`); root cause patched in `backend/config.py` (added `extra='ignore'`), retest passed via game `a0ff5fd3` (35 moments). Test 2 confirmed model swap works via env var alone (Anthropic Haiku 4.5 visible in OpenRouter activity). Test 3 returned a clean 429 on the free model — one of the two acceptable outcomes; retry-once logic confirmed working; WR-01 not biting on this run. One non-blocking UX gap surfaced (raw httpx errors reach UI) — see Gaps section."

## Gaps

- truth: "Backend boots cleanly with `OPENROUTER_API_KEY` set; Phase 2 refactor preserves backwards-compatible `.env` files containing legacy keys (ANTHROPIC_API_KEY etc.) without crashing or leaking secrets."
  status: failed
  reason: "User reported: backend fails to boot with pydantic ValidationError when `.env` contains legacy ANTHROPIC_API_KEY. Settings model lacks `extra='ignore'`. Critical secondary defect: pydantic's default ValidationError message echoes the rejected value to stdout, leaking the Anthropic API key into terminal scrollback."
  severity: blocker
  test: 1
  artifacts:
    - backend/config.py
  missing:
    - "model_config['extra'] = 'ignore'" in Settings to tolerate legacy/unknown env vars
    - secret-redaction in Settings validation errors (custom validator or env_prefix scoping) to prevent secret echo on misconfig

Also blocks tests 2 and 3 — same backend boot path. Cannot proceed with model-swap or free-model tests until config tolerates leftover env vars.

**Resolution:** Patched in this session — added `"extra": "ignore"` to `Settings.model_config` (backend/config.py:11). Retest passed (game `a0ff5fd3`, 35 moments). Secret-redaction defect remains as a forward-looking item: pydantic-settings still echoes any rejected env var value verbatim, so a typo'd recognised key (e.g. `OPENROUTER_API_KEYY=sk-or-v1-...`) would still leak. Worth a small custom validator in a future polish pass — non-blocking for Phase 2 goal.

- truth: "Backend errors from upstream API failures (rate limits, model errors, network) reach the end user as friendly, non-technical messages — not raw httpx exception strings."
  status: failed
  reason: "Test 3 surfaced this: a 429 from the free model rendered in the UI as 'Failed to generate moments: Client error 429 Too Many Requests' with a raw URL and developer.mozilla.org reference. Functional, but not appropriate for Mum/Gordie. The error mapping layer in `backend/routers/moments.py` and/or the frontend error display should translate transport-level failures into user-facing copy."
  severity: minor
  test: 3
  artifacts:
    - backend/routers/moments.py
    - backend/services/moment_generator.py
  missing:
    - error-class-to-user-message mapping (429 → 'AI service is busy, try again in a moment'; 5xx → 'Couldn't reach AI service'; etc.)
    - frontend treatment of these messages (clearer styling, retry hint)

Two known warning-level quality issues (WR-01, WR-02) documented in `02-REVIEW.md` `known_quality_issues` remain non-blocking for Phase 2 goal but worth addressing before Phase 5 deploy.
