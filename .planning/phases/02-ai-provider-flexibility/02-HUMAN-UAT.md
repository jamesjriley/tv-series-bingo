---
status: partial
phase: 02-ai-provider-flexibility
source: [02-VERIFICATION.md]
started: 2026-05-05T22:20:00Z
updated: 2026-05-05T22:20:00Z
---

## Current Test

[awaiting human testing — start with test 1]

## Tests

### 1. Live default-model OpenRouter call
expected: With `OPENROUTER_API_KEY` set in local `.env` and `AI_MODEL` unset, `./run.sh` then create a TV-show game from the UI (or `curl POST /api/games`). Expect 24-45 moments persisted within 5-15s with no errors. No `sk-or-v1-` or `Authorization` strings in stdout.
result: [pending]

### 2. Model swap via AI_MODEL env var (no code change)
expected: Edit `.env` to set `AI_MODEL=anthropic/claude-haiku-4.5`, restart backend, create new game. Sign in to https://openrouter.ai/activity — most recent call should show `model = anthropic/claude-haiku-4.5`. Game creation succeeds. No code change between step 1 and swap taking effect.
result: [pending]

### 3. Free model survives one call
expected: Set `AI_MODEL=meta-llama/llama-3.3-70b-instruct:free`, restart, create a game. Either succeeds (moments produced, possibly via markdown-fence fallback) OR fails with 429 rate-limit per documented free-tier warning. A 500 with "Failed to generate moments: 'choices'" would confirm WR-01 is biting.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

None yet — runtime verification pending. Two known warning-level quality issues (WR-01, WR-02) are documented in `02-REVIEW.md` and `02-VERIFICATION.md` `known_quality_issues`; both are non-blocking for Phase 2 goal but worth addressing before Phase 5 deploy.
