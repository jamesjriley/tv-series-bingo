---
phase: 02-ai-provider-flexibility
verified: 2026-05-05T22:15:00Z
status: human_needed
score: 4/4 must-haves structurally verified; 1 truth (live moment generation) requires a human smoke test
overrides_applied: 0
human_verification:
  - test: "Live OpenRouter call with default model"
    expected: "Set OPENROUTER_API_KEY in local .env, leave AI_MODEL unset, run ./run.sh, create a TV-show game from the UI (or curl POST /api/games), see 24-45 moments persisted within ~5-15s with no errors"
    why_human: "Requires a real OpenRouter API key, network egress, and the backend running with .env loaded. Code paths and env contract are structurally correct, but actual moment generation cannot be verified without a live key. Phase has no automated tests."
  - test: "Model swap via AI_MODEL env var"
    expected: "Set AI_MODEL=anthropic/claude-haiku-4.5 in .env, restart the backend, create a new game, confirm via https://openrouter.ai/activity that the request was routed to anthropic/claude-haiku-4.5 — no code change required"
    why_human: "Verifies the goal's no-code-change-swap claim end-to-end. Code paths show settings.ai_model is the only model identifier passed to the OpenRouter payload, so this should work, but a live swap is the only way to confirm the goal's headline behaviour."
  - test: "Free model variant survives a moment-generation call"
    expected: "Set AI_MODEL=meta-llama/llama-3.3-70b-instruct:free, restart, generate moments. Either succeeds (24-45 moments produced) or fails with a 429 rate-limit per the README's documented free-tier warning"
    why_human: "Validates the README example. JSON-mode support varies by provider per IN-03 in the code review — the _parse_json fallback handles markdown-fenced JSON and embedded JSON, so worst case is a slightly-degraded response, not a 500. Worth one live confirmation."
known_quality_issues:
  - id: WR-01
    file: "backend/services/moment_generator.py:137"
    issue: "Brittle response-shape access — res.json()['choices'][0]['message']['content'] raises KeyError/IndexError on OpenRouter error envelopes (200 OK + {'error': ...}). Caller in moments.py:36-40 catches generic Exception, deletes the orphaned game, returns opaque HTTP 500"
    impact_on_goal: "Does not prevent goal achievement under happy path. Affects error-recovery quality. Manifests as 'Failed to generate moments: choices' rather than a diagnostic message."
    severity: warning
    recommendation: "Address before kainga-core deploy (Phase 5) — adds 6 lines, no behaviour change on success path"
  - id: WR-02
    file: "backend/config.py:5"
    issue: "openrouter_api_key defaults to empty string. Backend boots without an API key; only fails on first game creation with HTTP 500. README says key is 'required' but nothing enforces it at startup"
    impact_on_goal: "Does not prevent goal achievement when key is correctly set. Confusing failure mode if key is missing. The deletion-on-failure path destroys user-visible state for what is fundamentally a config error."
    severity: warning
    recommendation: "Optional fail-fast Pydantic field_validator. For family-LAN scope this is annoying-but-recoverable, not a release blocker."
---

# Phase 02: AI Provider Flexibility — Verification Report

**Phase Goal (amended):** Moment generation works with OpenRouter; the model is swapped via the `AI_MODEL` env var with no code changes; `.env.example` documents `OPENROUTER_API_KEY` (required) and `AI_MODEL` (optional, default `openai/gpt-4o-mini`); the root `README.md` explains the model switch including free-model examples.
**Verified:** 2026-05-05T22:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

The goal is split into four observable truths, three of which are fully verified by static inspection of the codebase and one of which (live runtime behaviour of OpenRouter calls) requires a human smoke test because the phase has no automated tests and no live OpenRouter key in the verification environment.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Moment generation goes through OpenRouter (not Anthropic) — code paths point only at OpenRouter, no `anthropic` SDK references survive in `backend/` | VERIFIED | `backend/services/moment_generator.py` imports `httpx` only; module-level `OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"` (line 14); `_call_openrouter` POSTs to that URL with `Authorization: Bearer {settings.openrouter_api_key}` (lines 105-147); both `generate_moments_for_show` (line 150) and `generate_moments_from_transcripts` (line 166) call `await _call_openrouter(...)`. `grep -ri 'anthropic' backend/ --include="*.py"` returns 0 matches. `grep -c 'anthropic' backend/requirements.txt` returns 0. |
| 2 | Model is swappable via `AI_MODEL` env var with no code changes — single source of truth flows from env → Settings.ai_model → OpenRouter payload `model` field | VERIFIED | `backend/config.py:6` defines `ai_model: str = "openai/gpt-4o-mini"` with the `model_config` env-file loader on line 11. `_call_openrouter` sets `payload["model"] = settings.ai_model` (line 118). No model name is hardcoded anywhere — `grep -nE 'claude-sonnet\|claude-haiku\|gpt-4o' backend/` returns matches only in comments / examples / README, never as a literal in the request payload. `docker-compose.yml:12` passes `AI_MODEL=${AI_MODEL:-openai/gpt-4o-mini}` so the container picks up the override path correctly. |
| 3 | `.env.example` documents `OPENROUTER_API_KEY` (required) + `AI_MODEL` (optional, default openai/gpt-4o-mini) with example values | VERIFIED | `.env.example` (9 lines) has `OPENROUTER_API_KEY=sk-or-v1-...your-key-here` on line 2 (with comment "required" on line 1) and three commented `AI_MODEL=...` examples on lines 5-8 covering default, Claude family, and free tier. No `ANTHROPIC_API_KEY` reference. Placeholder is clearly fake — `your-key-here` token. |
| 4 | Root `README.md` explains the model switch including free-model examples | VERIFIED | `README.md` (98 lines) at repo root. Eight `## ` sections in correct order. "Switching the AI model" section has a 4-row table with `openai/gpt-4o-mini` (default), `anthropic/claude-haiku-4.5`, `meta-llama/llama-3.3-70b-instruct:free` ($0), and `google/gemini-2.5-flash`. Free-tier rate-limit warning blockquote present. Privacy section (D-10 mandate) explicit about prompts leaving kainga-core. Deploy section documents docker-compose at `8088:8000` with `kainga-core.local`. |
| 5 | Live moment generation actually succeeds end-to-end with the new code path | UNCERTAIN | Cannot verify programmatically — requires a real OpenRouter API key, network egress, and the backend booted with .env loaded. Surfaced as human verification item (see below). |

**Score:** 4/4 structural truths verified; 1 runtime truth requires human smoke test.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/services/moment_generator.py` | OpenRouter HTTP client with retry-once + JSON-mode + attribution headers | VERIFIED | 215 lines. `_call_openrouter` async helper (line 105) implements: Bearer auth header, `HTTP-Referer: http://kainga-core.local` + `X-Title: TV Series Bingo` attribution, `response_format: {"type": "json_object"}` payload, `httpx.Timeout(60.0, connect=10.0)`, retry-once on `TRANSIENT_STATUS = {408, 429, 500, 502, 503, 504}` and `TRANSIENT_EXC = (TimeoutException, ConnectError, RemoteProtocolError)`, 500ms backoff, `%`-style logger args (no f-strings), no key/prompt/response logging. No `import anthropic`, no Anthropic-SDK calls, no hardcoded model strings. |
| `backend/config.py` | Settings with `openrouter_api_key` + `ai_model` (default `openai/gpt-4o-mini`) | VERIFIED | 14 lines, syntactically valid (`python3 -m py_compile` passes). `Settings` exposes `openrouter_api_key: str = ""`, `ai_model: str = "openai/gpt-4o-mini"`, `database_path`, `host`, `port` plus `model_config` env-file loader. No `anthropic_api_key` field. |
| `backend/requirements.txt` | Backend pinned deps minus `anthropic` | VERIFIED | 7 lines — exactly what plan-01 SUMMARY claims (8 → 7). `httpx>=0.27.0` retained. No `anthropic` dependency. |
| `.env.example` | Env template with `OPENROUTER_API_KEY` (required) + `AI_MODEL` examples | VERIFIED | 9 lines. `OPENROUTER_API_KEY=sk-or-v1-...your-key-here` plus three commented `AI_MODEL=` examples. No `ANTHROPIC_API_KEY`. |
| `docker-compose.yml` | Container env passthrough for OpenRouter | VERIFIED | 19 lines. Environment block has `OPENROUTER_API_KEY=${OPENROUTER_API_KEY}` and `AI_MODEL=${AI_MODEL:-openai/gpt-4o-mini}` with shell-default expansion. Port mapping `8088:8000` matches README. No `ANTHROPIC_API_KEY`. |
| `README.md` (root) | First root README with env contract, model switch, deploy notes | VERIFIED | 98 lines. All 8 mandated sections present (Quick start, Environment variables, Switching the AI model, Verifying the model is being used, Privacy, Development setup, Deploying to kainga-core, Project shape). 4 model examples including `:free`. Privacy concession explicit. No real keys (sk-or-v1- and sk-ant- regex with 20+ chars: 0 matches). |
| `.planning/REQUIREMENTS.md` | AI-01/AI-02 strikethrough + dated amendment notes | VERIFIED | Line 22 (AI-01) and line 23 (AI-02) both show `~~original~~ → **Amended 2026-05-05 in Phase 2 discuss:** new` per D-09 convention. Checkboxes are `[x]` (already marked complete by Plan 02-01 — flagged as auto-fix in 02-02-SUMMARY). Traceability table rows for AI-01/AI-02 unchanged (still "Pending" — `/gsd-transition` updates those at phase close). |
| `.planning/ROADMAP.md` | Phase 2 success criteria amended with strikethrough | VERIFIED | All three criteria amended with `**Amended 2026-05-05 (Phase 2 discuss):**` parenthetical variant. Goal line 39 (still says "either Anthropic or OpenRouter") and phase-list-item line 16 INTENTIONALLY UNCHANGED per CONTEXT.md scope — the criteria carry the refinement; Goal is the high-level statement. |
| `.planning/PROJECT.md` | Multi-provider AI Key Decisions row outcome cell appended | VERIFIED | Line 86 outcome cell now reads `— Pending → Refined 2026-05-05 to OpenRouter-only with model-level provider routing (Phase 2 D-01).` Decision and Rationale cells preserved verbatim. Line 35 (Active section) intentionally unchanged — `/gsd-transition` moves it to Validated at phase close. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `routers/moments.py` callers | `moment_generator.generate_moments_*` | Function signatures unchanged | WIRED | Lines 25, 29, 33 of `routers/moments.py` call `moment_generator.generate_moments_for_show(...)` and `generate_moments_from_transcripts(...)` with the original signatures. The service-layer functions on lines 150 and 166 of `moment_generator.py` accept the same argument shape. No caller code modified. |
| `generate_moments_for_show` | `_call_openrouter` | `await _call_openrouter([system, user])` | WIRED | Line 152 — `text = await _call_openrouter([...system+user messages...])`. |
| `generate_moments_from_transcripts` | `_call_openrouter` | `await _call_openrouter([user])` | WIRED | Line 176 — `text = await _call_openrouter([{"role": "user", "content": prompt}])`. |
| `_call_openrouter` | `https://openrouter.ai/api/v1/chat/completions` | `httpx.AsyncClient.post(OPENROUTER_URL, ...)` | WIRED | Line 14 module constant + line 128 `await client.post(OPENROUTER_URL, headers=headers, json=payload)`. |
| `Settings.openrouter_api_key + ai_model` | `_call_openrouter` headers + payload | `settings.openrouter_api_key` (Bearer) + `settings.ai_model` (model field) | WIRED | Line 112 (`Bearer {settings.openrouter_api_key}`) + line 118 (`"model": settings.ai_model`). Single source of truth for both env-driven values. |
| `docker-compose.yml` env block | Container `Settings` | `OPENROUTER_API_KEY=${OPENROUTER_API_KEY}` + `AI_MODEL=${AI_MODEL:-default}` | WIRED | Lines 11-12. Shell-default expansion ensures container works even if host doesn't set `AI_MODEL`. |
| `README.md` Quick start | `.env.example` + `./run.sh` | `cp .env.example .env` + edit + `./run.sh` | WIRED | README line 10. `run.sh` exists at repo root per RESEARCH verification. |
| `README.md` Switching the AI model | `backend/services/moment_generator.py` settings.ai_model | `AI_MODEL` env var sets model string | WIRED | README correctly documents the var as the single control point that flows to `settings.ai_model`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `_call_openrouter` payload `model` | `settings.ai_model` | `Settings` BaseSettings → `.env` → env var | YES at runtime (when `.env` is loaded) | FLOWING (structural — runtime confirmation requires human smoke) |
| `_call_openrouter` payload `Authorization` | `settings.openrouter_api_key` | `Settings` → `.env` → env var | YES at runtime (assuming user set the key) | FLOWING (structural — runtime confirmation requires human smoke) |
| Container env `AI_MODEL` | `${AI_MODEL:-openai/gpt-4o-mini}` shell expansion | Host env or compose default | YES — explicit default in compose file | FLOWING |
| Container env `OPENROUTER_API_KEY` | `${OPENROUTER_API_KEY}` | Host env or `.env` (compose loads from cwd `.env`) | YES at deploy (assuming key is set on kainga-core) | FLOWING |

No `HOLLOW_PROP` or `DISCONNECTED` cases found. The single conditional is "user must set the key" — that's a documented config requirement, not a code defect (though see WR-02 for fail-fast hardening).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend module imports cleanly | `python3 -m py_compile backend/services/moment_generator.py` | SYNTAX OK | PASS |
| Backend config imports cleanly | `python3 -m py_compile backend/config.py` | SYNTAX OK | PASS |
| `_call_openrouter` exists and is async | `grep -nE "^async def _call_openrouter" backend/services/moment_generator.py` | line 105 match | PASS |
| Both public service functions call the helper | `grep -c "await _call_openrouter" backend/services/moment_generator.py` | 2 | PASS |
| OpenRouter URL is module constant (not magic-string-elsewhere) | `grep -c "openrouter.ai/api/v1/chat/completions" backend/services/moment_generator.py` | 1 | PASS |
| No anthropic imports anywhere in backend Python | `grep -ri 'anthropic' backend/ --include="*.py" \| wc -l` | 0 | PASS |
| No anthropic dependency in supply chain | `grep -c 'anthropic' backend/requirements.txt` | 0 | PASS |
| Live OpenRouter call (smoke) | `./run.sh + curl POST /api/games` | NOT EXECUTED — requires real API key | SKIP (routed to human verification) |

Server-start spot-checks (running uvicorn, hitting endpoints) are skipped because they require a live OpenRouter key the verifier doesn't have. The plans explicitly defer this to user smoke per the User Action Items in 02-01-SUMMARY and 02-03-SUMMARY.

### Requirements Coverage

| Requirement | Source Plan(s) | Description (amended) | Status | Evidence |
|-------------|---------------|----------------------|--------|----------|
| AI-01 | 02-01, 02-02, 02-03 | Single-client via OpenRouter for moment generation; Anthropic models stay reachable via `anthropic/*` model prefix on OpenRouter; same `generate_moments_*` interface preserved | SATISFIED | `_call_openrouter` is the single client (httpx-based, no SDK abstraction). Service functions retain original signatures (`generate_moments_for_show(game_id, show_name)` and `generate_moments_from_transcripts(game_id, source_name, transcripts)`). README Switching-the-AI-model table includes `anthropic/claude-haiku-4.5` to demonstrate Anthropic reachability via prefix. Spec amendment in REQUIREMENTS.md line 22 with strikethrough audit trail. |
| AI-02 | 02-01, 02-02, 02-03 | Config-driven model selection via `AI_MODEL` env var (default `openai/gpt-4o-mini`); `OPENROUTER_API_KEY` required; surfaced in `.env.example` and README. `AI_PROVIDER` dropped — model name embeds the provider on OpenRouter | SATISFIED | `Settings.ai_model: str = "openai/gpt-4o-mini"` (config.py:6) is the single env-driven source consumed by `_call_openrouter` payload. `OPENROUTER_API_KEY` documented in `.env.example`, `docker-compose.yml`, and README env-var table (4 mentions). No `AI_PROVIDER` in code, config, or compose. README's Switching section gives 4 concrete examples spanning openai/anthropic/meta-llama/google. Spec amendment in REQUIREMENTS.md line 23 with strikethrough audit trail. |

Both phase requirements are SATISFIED. No orphaned requirements — REQUIREMENTS.md traceability table maps only AI-01 and AI-02 to Phase 2 (rows 95-96 of the table), and both are claimed in all three plans' frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/services/moment_generator.py` | 87 | `pass` keyword in `_parse_json` | INFO (NOT a stub) | Legitimate exception fall-through pattern: `try: return json.loads(text); except JSONDecodeError: pass` then continue to markdown-fence and brace-extraction fallbacks before raising `ValueError`. Function has three real parse strategies followed by a real raise — not a stub. |
| `backend/services/moment_generator.py` | 137 | Brittle response-shape access (WR-01 from REVIEW) | WARNING | Does not block goal under happy path. Affects error-recovery quality only. Documented in `known_quality_issues` frontmatter. |
| `backend/config.py` | 5 | API key defaults to empty string (WR-02 from REVIEW) | WARNING | Does not block goal when key is set. Affects boot-time validation. Documented in `known_quality_issues` frontmatter. |

No blockers. The two warnings are intentional v1-scope limits per the code review — fixing them is sensible Phase 5 hardening but does not prevent Phase 2's goal (model-swappable moment generation via OpenRouter).

### Human Verification Required

The phase has no automated tests and no live OpenRouter key in the verification environment. The structural goal is fully verified by static inspection — every code path, env var, config field, and doc claim is consistent and wired correctly. What cannot be verified without a key is whether the live OpenRouter call actually succeeds and whether the model swap is observable end-to-end.

Three short smoke tests cover the runtime question:

#### 1. Live default-model call

**Test:**
1. In your local `.env`, set `OPENROUTER_API_KEY=sk-or-v1-<your-real-key>` (get one at https://openrouter.ai/keys)
2. Leave `AI_MODEL` unset (or comment out all the example lines)
3. `./run.sh`
4. In the UI at http://localhost:5173, create a TV-show game with a recognisable show name (e.g. "Brooklyn Nine-Nine")

**Expected:** HTTP 200 from `POST /api/games`; 24-45 moments persisted within 5-15 seconds; the game does not get auto-deleted. No "sk-or-v1-" or "Authorization" strings in uvicorn stdout.

**Why human:** Requires a real OpenRouter API key and live network egress. The structural code path is verified, but live success is the only way to confirm goal-truth #5 ("moment generation works").

#### 2. Model swap with no code change

**Test:**
1. With the backend stopped, edit `.env` to set `AI_MODEL=anthropic/claude-haiku-4.5`
2. Restart the backend (`./run.sh` again)
3. Create a new game
4. Sign in to https://openrouter.ai/activity and inspect the most recent call

**Expected:** The activity row shows `model = anthropic/claude-haiku-4.5`. Game creation succeeds. No code change was required between step 1 and the swap taking effect.

**Why human:** Verifies the goal's no-code-change-swap headline behaviour end-to-end via OpenRouter's external dashboard.

#### 3. Free-model variant survives one call

**Test:**
1. Set `AI_MODEL=meta-llama/llama-3.3-70b-instruct:free`
2. Restart backend, create a game

**Expected:** Either succeeds (moments produced — possibly with the markdown-fence parser fallback if Llama doesn't honour `response_format: json_object` cleanly) OR fails with a 429 rate-limit (per the documented free-tier warning). A 500 with "Failed to generate moments: 'choices'" would confirm WR-01 is biting and warrant fixing it before deploy.

**Why human:** Validates the README's free-model example. Result either confirms goal or surfaces WR-01 as a deploy blocker.

### Gaps Summary

No gaps blocking goal achievement. The phase shipped exactly what its three plans declared:

- **02-01**: backend code (moment_generator.py + config.py + requirements.txt + .env.example + docker-compose.yml) — 5 modifications in commit `191497e`
- **02-02**: spec amendments (REQUIREMENTS.md + ROADMAP.md + PROJECT.md) — 3 modifications in commit `14f798c`
- **02-03**: root README — 1 addition in commit `28f04e8`

Plus a follow-on code review report (`02-REVIEW.md`) committed as `12730c3 docs(02): add code review report`. Total: 9 file changes across 4 commits on `claude/resume-ai-app-ClIA9`, no spillover, no unrelated files in any commit.

The four structural truths are verified by static inspection. The fifth truth (live moment generation) is the only thing standing between this phase and a fully-passed status — and it cannot be verified without a real API key. The known warning-level quality issues (WR-01, WR-02) are documented and do not block the goal under happy path.

**Recommendation:** Run the three human smoke tests above. If all three pass (or test 3 shows the documented 429 rate-limit), Phase 2 is functionally complete. If test 1 fails with "Failed to generate moments: 'choices'", consider patching WR-01 before Phase 5 deploy; otherwise WR-01 + WR-02 are reasonable Phase 5 deploy-hardening targets.

---

_Verified: 2026-05-05T22:15:00Z_
_Verifier: Claude (gsd-verifier)_
