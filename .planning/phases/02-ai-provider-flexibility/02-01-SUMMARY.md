---
phase: 02-ai-provider-flexibility
plan: 01
subsystem: backend/ai
tags: [ai, openrouter, httpx, atomic-commit, backend, config]
requirements: [AI-01, AI-02]
dependencies:
  requires: [Phase 1 — code-hygiene complete; httpx>=0.27.0 already pinned]
  provides:
    - "_call_openrouter helper with retry-once on transient errors (408/429/5xx + httpx.Timeout/Connect/RemoteProtocol exceptions)"
    - "OpenRouter env contract: OPENROUTER_API_KEY + AI_MODEL (default openai/gpt-4o-mini)"
    - "Plan 02-02 unblocked — spec patches in REQUIREMENTS.md/ROADMAP.md/PROJECT.md (Wave 2)"
    - "Plan 02-03 unblocked — root README documenting the model switch (Wave 2)"
  affects:
    - "backend/services/moment_generator.py — AI client now httpx-based, not anthropic SDK"
    - "backend/config.py — Settings field rename (anthropic_api_key → openrouter_api_key + ai_model)"
    - "backend/requirements.txt — anthropic dependency removed from supply chain"
    - "User local .env (gitignored, NOT modified by commit) — manual update step required"
tech-stack:
  added: []  # httpx>=0.27.0 already pinned; no new deps
  removed: [anthropic==0.94.0]
  patterns:
    - "Async-by-default service layer (matches youtube_service.py)"
    - "%-style format args in logger calls (no f-strings around secrets — T-02-01 mitigation)"
    - "Module-level constants for URL/transient sets (OPENROUTER_URL, TRANSIENT_STATUS, TRANSIENT_EXC)"
    - "Caller signature stability — backend/routers/moments.py untouched"
key-files:
  created: []
  modified:
    - backend/services/moment_generator.py
    - backend/config.py
    - backend/requirements.txt
    - .env.example
    - docker-compose.yml
decisions:
  - "Single-provider OpenRouter via httpx (D-01) — no abstraction layer, lighter than openai SDK"
  - "Default model openai/gpt-4o-mini (D-02) — cheap, native JSON, no rate-limit issues at family-LAN scale"
  - "Retry whitelist {408, 429, 500, 502, 503, 504} (D-04) — 408 added per RESEARCH.md Q3"
  - "AI_PROVIDER dropped (D-05) — model name embeds provider on OpenRouter (anthropic/*, openai/*, etc)"
  - "response_format: json_object (D-07) — clean JSON mode, _parse_json kept as safety net"
  - "Attribution headers: HTTP-Referer + X-Title (D-10) — accept default 30-day OpenRouter logging"
metrics:
  commit: 191497e
  commit_subject: "feat(ai): swap Anthropic SDK for OpenRouter"
  files_changed: 5
  insertions: 82
  deletions: 42
  net_diff: "+40 lines (close to RESEARCH.md estimate of -40/+40 on moment_generator.py)"
  tasks_completed: 5
  duration: ~10min
  completed_date: 2026-05-05
---

# Phase 2 Plan 01: Swap Anthropic SDK for OpenRouter — Summary

OpenRouter HTTP client (httpx) replaces the direct Anthropic SDK in `moment_generator.py`, with retry-once on transient errors, JSON-mode requests, and attribution headers. Env contract collapses to `OPENROUTER_API_KEY` + `AI_MODEL` (default `openai/gpt-4o-mini`). Function signatures preserved — caller code untouched. One atomic commit covers 5 file modifications.

## What Got Built

### Code (`backend/services/moment_generator.py`)

- New `_call_openrouter(messages, *, max_tokens=4096) -> str` async helper:
  - POSTs to `https://openrouter.ai/api/v1/chat/completions` with `httpx.AsyncClient` per-call (matches youtube_service.py pattern)
  - Headers: `Authorization: Bearer ${OPENROUTER_API_KEY}`, `Content-Type: application/json`, `HTTP-Referer: http://kainga-core.local`, `X-Title: TV Series Bingo`
  - Payload: `{model, messages, max_tokens, response_format: {type: "json_object"}}`
  - Timeout: `httpx.Timeout(60.0, connect=10.0)`
  - Retry-once on `{408, 429, 500, 502, 503, 504}` HTTP statuses OR `(httpx.TimeoutException, httpx.ConnectError, httpx.RemoteProtocolError)` exceptions; 500ms backoff
  - Logs `res.status_code`, `settings.ai_model`, `type(e).__name__` only — never bearer token, never prompt body, never response body
  - Uses `%`-style format args in `logger.warning(...)` calls (T-02-01 secrets-safe logging)

- `generate_moments_for_show(game_id, show_name)` collapses from 24 lines to 14: sanitise → `await _call_openrouter([system, user])` → `_parse_json` → `_store_moments`. Signature unchanged.

- `generate_moments_from_transcripts(game_id, source_name, transcripts)` collapses from 24 lines to 13: truncate → format prompt → `await _call_openrouter([user])` → `_parse_json` → `_store_moments`. Signature unchanged. `source_name` parameter retained unused-in-body for caller compatibility (pre-existing behaviour).

- Untouched: `SYSTEM_PROMPT`, `YOUTUBE_PROMPT`, `MOMENT_SCHEMA`, `_parse_json`, `_sanitize_input`, `_store_moments`, `get_moments`.

- Module-level constants added: `OPENROUTER_URL`, `TRANSIENT_STATUS = {408, 429, 500, 502, 503, 504}`, `TRANSIENT_EXC = (httpx.TimeoutException, httpx.ConnectError, httpx.RemoteProtocolError)`.

- Imports: `asyncio`, `logging`, `httpx` added; `anthropic` removed.

### Config (`backend/config.py`)

- Settings field rename: `anthropic_api_key: str = ""` → `openrouter_api_key: str = ""` + `ai_model: str = "openai/gpt-4o-mini"`.
- `AI_PROVIDER` consciously NOT added (D-05) — under OpenRouter-only, the model name string embeds the provider.
- `model_config` env-file loader untouched.

### Supply chain (`backend/requirements.txt`)

- `anthropic==0.94.0` removed. File goes from 8 → 7 lines. `httpx>=0.27.0` retained (no add).

### Env templates

- `.env.example` rewritten: active `OPENROUTER_API_KEY=sk-or-v1-...your-key-here` + 3 commented `AI_MODEL=...` examples (default, Claude-family revert, free `meta-llama/llama-3.3-70b-instruct:free`). Placeholder is clearly fake — awk-regex check confirms no real key leaked.
- `docker-compose.yml` env block: `ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}` → `OPENROUTER_API_KEY=${OPENROUTER_API_KEY}` + `AI_MODEL=${AI_MODEL:-openai/gpt-4o-mini}`. The `${VAR:-default}` shell-expansion makes the container work out-of-the-box even if the host doesn't set `AI_MODEL`.

## Verification

Static checks (post-commit, all PASS):

| Check | Result |
|-------|--------|
| `git log -1 --format=%s` | `feat(ai): swap Anthropic SDK for OpenRouter` |
| `git show HEAD --name-status` | 5 `M` lines, 0 `A`/`D` lines |
| `git show HEAD` includes `.env`/README/.planning/ | NONE |
| `grep -ric 'anthropic' backend/` | 0 across all 18 files |
| `grep -c 'anthropic' backend/requirements.txt` | 0 |
| `grep -c 'ANTHROPIC_API_KEY' .env.example docker-compose.yml` | 0 |
| `grep -c 'openrouter_api_key' backend/config.py` | 1 |
| `grep -c 'ai_model: str = "openai/gpt-4o-mini"'` | 1 |
| `grep -c 'async def _call_openrouter'` | 1 |
| `grep -c 'await _call_openrouter'` | 2 |
| `grep -c 'TRANSIENT_STATUS = {408, 429, 500, 502, 503, 504}'` | 1 |
| `grep -cE 'logger\.(info\|warning\|error\|exception)\(\s*f"'` | 0 |
| `python3 -m py_compile backend/services/moment_generator.py` | SYNTAX OK |
| `python3 -m py_compile backend/config.py` | SYNTAX OK |
| `grep -c "AI_MODEL" docker-compose.yml` | 1 (with `${VAR:-default}` expansion verified) |
| `grep -c "your-key-here" .env.example` | 1 (clear placeholder) |

## Self-Check: PASSED

- File `backend/services/moment_generator.py` exists and contains `_call_openrouter` ✓
- File `backend/config.py` exists with new fields ✓
- File `backend/requirements.txt` exists, anthropic removed ✓
- File `.env.example` exists with new env contract ✓
- File `docker-compose.yml` exists with new env block ✓
- Commit `191497e` exists in `git log` ✓

## Deferred Issues

**Settings smoke via `python3 -c "from backend.config import settings"`** could not be exercised in the local environment because `pydantic_settings` is not in the system Python (only available inside the project's Docker container). This matches the precedent set in Phase 1 (STATE.md "Smoke import failure (fastapi not in system Python) is pre-existing environment condition — project runs via Docker, not a regression"). `python3 -m py_compile` confirms the file is syntactically valid; field access semantics will be exercised on the next backend boot via `./run.sh` or `docker compose up`.

**Optional manual smoke (live OpenRouter call via `./run.sh` + curl)** was not attempted by the executor — requires the user to first update local `.env` per the user_setup checklist. Surfaced as user-action TODO below.

## Deviations from Plan

None — plan executed exactly as written. All 5 tasks landed in one atomic `feat(ai)` commit covering exactly the 5 modifications the plan declared.

## User Action Items (manual steps before next backend run)

These are NOT blocking the next plans (02-02 / 02-03 in Wave 2 can both run now), but are required before the backend can actually generate moments at runtime:

1. **Update local `.env`** (gitignored working-tree file, NOT modified by this commit):
   - Remove the line `ANTHROPIC_API_KEY=sk-ant-...`
   - Add `OPENROUTER_API_KEY=sk-or-v1-<your-real-key>` (get one at https://openrouter.ai/keys)
   - Optionally add `AI_MODEL=...` to override the `openai/gpt-4o-mini` default

2. **Top up OpenRouter credits** at https://openrouter.ai/credits (~$5 is plenty for family use), OR plan to use a `:free` model variant (e.g. `AI_MODEL=meta-llama/llama-3.3-70b-instruct:free`). 402 Payment Required is the failure mode if the balance is exhausted.

3. **Optional: revoke the now-dormant Anthropic API key** at https://console.anthropic.com/settings/keys for hygiene. Non-blocking. (Per project's "no history rewrite" constraint, past commits with the key may exist in git history; rotation is the right hygiene response.)

4. **Optional live smoke** (after step 1):

   ```bash
   ./run.sh   # boots uvicorn :8000 + vite :5173

   # In another terminal:
   curl -s -X POST http://localhost:8000/api/games \
     -H "Content-Type: application/json" \
     -d '{"source_type":"show","source_name":"Brooklyn Nine-Nine","host_name":"Smoke"}' | jq

   # Expect HTTP 200 + 24-45 moments persisted within ~5-15s
   # Inspect uvicorn stdout — no "sk-or-v1-" or "Authorization" strings expected
   ```

## Next

Wave 2 of Phase 2 is now unblocked:

- **Plan 02-02** — spec patches (strikethrough on REQUIREMENTS.md AI-01/AI-02 + ROADMAP.md Phase 2 success criteria + PROJECT.md Key Decisions row)
- **Plan 02-03** — root README with deploy notes for kainga-core

Both can run in parallel since they touch disjoint file sets and both depend only on this plan's HEAD commit existing.
