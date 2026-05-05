# Phase 2: AI Provider Flexibility - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the hardcoded `anthropic.Anthropic` client in `backend/services/moment_generator.py` with a single OpenRouter-only client, configured via env vars. Two callsites today (`generate_moments_for_show`, `generate_moments_from_transcripts`) — both move to one OpenAI-compatible httpx call to `https://openrouter.ai/api/v1`. Add `OPENROUTER_API_KEY` and `AI_MODEL` to env contract; drop `anthropic` SDK from `requirements.txt`. Patch `REQUIREMENTS.md` AI-01/AI-02 + ROADMAP Phase 2 success criteria to reflect the single-provider-via-OpenRouter approach (model name is the swap, not provider name). Write a full root README that explains the model switch and includes deploy notes for kainga-core.

**Scope amendment from original spec:** AI-01 originally said "Provider-agnostic AI client supporting Anthropic *and* OpenRouter — same interface, swap behind config." Discussion landed on **OpenRouter-only** because (a) cost-flexibility — the actual driver per PROJECT.md — is fully delivered, (b) Anthropic models stay reachable via OpenRouter routing (`anthropic/claude-haiku-4.5`, `anthropic/claude-sonnet-4-7`), (c) one client = no abstraction layer to maintain, (d) the user can hit free models (Llama, Mistral, DeepSeek) for $0/month if those credits hold. The spec amendment is captured by D-09 (minimal-patch strikethrough on REQUIREMENTS.md) and Phase 1's D-13 commitment to add `AI_PROVIDER`/`AI_MODEL` is consciously honoured by adding `AI_MODEL` only — `AI_PROVIDER` becomes redundant under OpenRouter-only.

</domain>

<decisions>
## Implementation Decisions

### Provider & Client Architecture
- **D-01:** **Single-provider OpenRouter**. Drop direct `anthropic` SDK entirely. Replace with one OpenAI-compatible HTTP client targeting `https://openrouter.ai/api/v1/chat/completions`. Use `httpx` (already in `requirements.txt`) rather than the `openai` SDK — lighter, project already uses `httpx` for YouTube scraping. Remove `anthropic==0.94.0` from `backend/requirements.txt`.
- **D-02:** Default model is **`openai/gpt-4o-mini`** when `AI_MODEL` is unset. Cheap, reliable, strong native JSON output. Outdated `claude-sonnet-4-20250514` literal in current code is removed.

### Env Var Contract
- **D-03:** `AI_MODEL` has a **sensible default** (`openai/gpt-4o-mini`); user can override via env. App works out of the box once `OPENROUTER_API_KEY` is set. `.env.example` shows the default value commented out for reference.
- **D-05:** **Drop `AI_PROVIDER` entirely** — under OpenRouter-only there's only one provider. Less env-var noise. `AI_MODEL` alone is enough since OpenRouter model names embed the provider (`anthropic/...`, `openai/...`, `meta-llama/...`).
- Final env contract for AI: `OPENROUTER_API_KEY` (required) + `AI_MODEL` (optional, defaults to `openai/gpt-4o-mini`). `ANTHROPIC_API_KEY` is removed from `backend/config.py` Settings and from `.env.example`.

### Failure & Reliability
- **D-04:** **Retry once on the same model** on transient errors (HTTP 5xx, 429, timeout, connection error). Brief backoff (e.g. 500ms). Don't retry on 4xx (auth/bad-request). After retry exhaustion, fail loud — 500 to client, error logged. No fallback-to-different-model branching for v1.

### Request Shape
- **D-07:** Use OpenAI-compatible **`response_format: {"type": "json_object"}`** in the request body. `gpt-4o-mini` and most OpenAI/Anthropic-family models on OpenRouter support this. Cleaner than prompt-driven parsing. **Keep `_parse_json` helper** (existing in `moment_generator.py`) as a safety net for any model that ignores the directive.
- Drop the Anthropic-specific `cache_control: {"type": "ephemeral"}` block — not supported by OpenRouter's OpenAI-compat layer for most models. *(Claude's discretion — flagged here for visibility.)*
- **D-10:** Send attribution headers on every request: `HTTP-Referer: http://kainga-core.local` (or final deployed URL — placeholder for now) and `X-Title: TV Series Bingo`. Accept OpenRouter's default 30-day prompt logging policy — family-bingo content is low-sensitivity per PROJECT.md privacy section.

### Spec Amendments (this phase produces them as artifacts)
- **D-06 / D-09:** **Minimal-patch style.** In `REQUIREMENTS.md` AI-01/AI-02, add a strikethrough on the original wording with a dated note: `~~AI-01: Provider-agnostic AI client supporting Anthropic and OpenRouter~~ → Amended 2026-05-05 in Phase 2 discuss: single-client via OpenRouter; Anthropic models reachable via 'anthropic/*' model prefix.` Same approach for the three ROADMAP Phase 2 success criteria. Keeps audit trail visible.
- Update `PROJECT.md` "Key Decisions" table: the row "Multi-provider AI (Anthropic + OpenRouter)" gets a follow-up note in the Outcome column: `→ Refined 2026-05-05 to OpenRouter-only with model-level provider routing (D-01).` *(Claude's discretion to keep this concise — single line.)*
- These spec edits ride along in the same commit(s) as the code change for atomicity. Plan to slice TBD by planner.

### Documentation
- **D-08:** **Full root `README.md`** — project blurb, env var table, dev setup (Python venv + npm install + `./run.sh`), example `AI_MODEL` values (`openai/gpt-4o-mini`, `anthropic/claude-haiku-4.5`, `meta-llama/llama-3.3-70b-instruct:free`), how to verify the model is being used, AND deploy notes for kainga-core (Docker build/run, env file location, port). **Phase 5's DEPLOY-01 should consume/extend this README rather than rewrite it** — captured in Deferred Ideas as a Phase 5 coordination note.

### Claude's Discretion
- Exact retry backoff timing (suggest 500ms; planner can tune).
- Exact wording of OpenRouter API error → user-facing 500 message in `moment_generator.py`.
- Whether to extract a tiny `_call_openrouter()` helper or inline the httpx call twice (lean toward extract — DRY between `generate_moments_for_show` and `generate_moments_from_transcripts`).
- Commit-slice strategy for the phase (likely 2 commits: code + docs/spec, or 3: code, README, spec patches — planner decides).
- Whether to add a one-line smoke test in `run.sh` or a small `pytest` (Phase 5 owns the test suite — leave smoke verification manual for now unless trivial).
- Use of `httpx.AsyncClient` (matches existing async pattern in `youtube_service.py`) over sync.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — v1 polish-and-ship vision; "cost flexibility, no single-vendor lock-in" decision; family-only kainga-core hosting; privacy posture (all data on kainga-core).
- `.planning/REQUIREMENTS.md` AI-01, AI-02 — locked acceptance criteria (will be amended in this phase per D-06/D-09).
- `.planning/ROADMAP.md` §"Phase 2: AI Provider Flexibility" — phase goal + 3 success criteria (will be amended per D-09).
- `CLAUDE.md` — project orientation; mentions "Phase 2 AI provider flexibility" as upcoming.

### Phase 1 carry-forward
- `.planning/phases/01-code-hygiene/01-CONTEXT.md` — D-13 (defer `AI_PROVIDER`/`AI_MODEL` to Phase 2 — being honoured here, but as `AI_MODEL` only); D-15 (stay on `claude/resume-ai-app-ClIA9` branch); commit-slicing convention (atomic by feature).

### Codebase audit (informs implementation)
- `.planning/codebase/CONCERNS.md` — flags "AI client tightly coupled to Anthropic SDK" and "no retry on transient API errors". Phase 2 addresses both.
- `.planning/codebase/STACK.md` — `httpx>=0.27.0` already a dep; `anthropic 0.94.0` to be removed.
- `.planning/codebase/INTEGRATIONS.md` — current external integrations; OpenRouter swap goes here.
- `.planning/codebase/STRUCTURE.md` — service layer pattern (`backend/services/*.py`).

### Files touched in this phase
- `backend/services/moment_generator.py` — primary rewrite. Two functions, anthropic SDK → httpx OpenRouter call.
- `backend/config.py` — replace `anthropic_api_key` with `openrouter_api_key` + `ai_model`.
- `backend/requirements.txt` — drop `anthropic==0.94.0`.
- `.env.example` — replace `ANTHROPIC_API_KEY` with `OPENROUTER_API_KEY` and add commented `AI_MODEL` default reference.
- `.env` *(working tree, gitignored)* — local env update needed (manual user step or scripted into the commit's checklist).
- `README.md` *(new, root)* — full README per D-08.
- `.planning/REQUIREMENTS.md` — strikethrough patch on AI-01, AI-02.
- `.planning/ROADMAP.md` — strikethrough patch on Phase 2 success criteria.
- `.planning/PROJECT.md` — single-line outcome note on the "Multi-provider AI" Key Decision row.

### OpenRouter docs (researcher should fetch current versions)
- `https://openrouter.ai/docs/quickstart` — auth, base URL, headers.
- `https://openrouter.ai/docs/api-reference/chat-completions` — request shape, `response_format`, supported models.
- `https://openrouter.ai/docs/features/app-attribution` — `HTTP-Referer` + `X-Title` header conventions.
- `https://openrouter.ai/docs/features/privacy-and-logging` — default 30-day logging, opt-out via `X-OR-Datapolicy: no_logging` (not used per D-10).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`httpx`** already in `backend/requirements.txt` (`httpx>=0.27.0`) and used by `youtube_service.py` for transcript scraping. Reuse `httpx.AsyncClient` for OpenRouter calls — matches established async pattern.
- **`_parse_json` helper** in `backend/services/moment_generator.py` (lines 74–87) — keep as safety net even with native JSON mode. Already handles markdown code fences, raw JSON, and substring extraction.
- **`_sanitize_input`** in same file (lines 90–94) — keep, model-agnostic input cleaning.
- **`_store_moments`** + `get_moments` in same file — completely model-agnostic, untouched by this phase.
- **Pydantic Settings** in `backend/config.py` (lines 1–13) — drop `anthropic_api_key`, add `openrouter_api_key` and `ai_model: str = "openai/gpt-4o-mini"` field with `Field(default=...)`.

### Established Patterns
- **`logging.getLogger(__name__)`** — `youtube_service.py` and (post-Phase 1) `moments.py` both use this; new OpenRouter client logging should mirror it. Log retries, model name, error category — never log the API key or full prompt.
- **Async-by-default** — both moment-generation functions are `async def`; HTTP client must be async.
- **Conventional Commits** — recent log shows `feat(...)`, `fix(...)`, `chore(...)` prefixes. Phase 2 commits follow the same shape (suggested subjects: `feat(ai): swap Anthropic SDK for OpenRouter` / `docs(readme): add root README with deploy notes` / `docs(spec): amend AI-01/AI-02 to OpenRouter-only`).
- **No CI / no pre-commit hooks** — manual verification of clean git state after each commit (per Phase 1 precedent).

### Integration Points
- `backend/routers/moments.py` (post-Phase 1) calls `generate_moments_for_show()` and `generate_moments_from_transcripts()`. **Function signatures stay identical** — caller code is unaffected. Logger context (`game_id`, `body.source_name`) is already in place from Phase 1's `cd054a7` commit.
- `backend/main.py` instantiates `Settings()` at module load — config changes propagate automatically.
- `docker-compose.yml` (post-Phase 1, env block has 2 entries: `ANTHROPIC_API_KEY`, `DATABASE_PATH`) — needs update: replace `ANTHROPIC_API_KEY` line with `OPENROUTER_API_KEY` (and optionally `AI_MODEL`).

### What's NOT Touched
- `backend/services/youtube_service.py` — separate concern, untouched.
- `backend/services/bingo_checker.py`, `card_builder.py` — Phase 5 territory.
- All frontend code — unaffected; the moment-generation API contract from the React app's POV is unchanged.

</code_context>

<specifics>
## Specific Ideas

- **"Path of least resistance"** is the steering preference for this phase — keep the diff small, the abstraction lean, and the env contract minimal. No future-proofing for hypothetical providers.
- **"I may be able to run for free"** is a real motivation — the chosen default (`openai/gpt-4o-mini`) is cheap, but the user can override `AI_MODEL=meta-llama/llama-3.3-70b-instruct:free` to drop ongoing AI cost to $0 if free credits hold. README should document this with a concrete example line.
- **OpenRouter as model router, not provider abstraction** — the swap mechanism is the OpenRouter model name string, not an `AI_PROVIDER` enum. This is the conceptual shift from the original AI-01 wording.
- **Anthropic models stay reachable** — anyone wanting to revert to Claude sets `AI_MODEL=anthropic/claude-haiku-4.5`. README should call this out so the OpenRouter-only choice doesn't feel like a Claude-removal.

</specifics>

<deferred>
## Deferred Ideas

Captured here so they're not lost, but explicitly **out of scope for Phase 2**:

- **Phase 5 / DEPLOY-01 README coordination** — Phase 2 produces a full root README with kainga-core deploy notes (D-08). Phase 5 should **consume/extend** this README (e.g. add a "Production checklist" section) rather than rewriting it. Flag for Phase 5 plan-phase to read this CONTEXT.md.
- **Smoke test for AI provider swap** — Manual verification only in Phase 2. Phase 5 (TEST-01/TEST-02) covers test infrastructure; consider a tiny `test_moment_generator_smoke.py` there if not already in scope.
- **Anthropic SDK as fallback** — explicitly rejected in D-01. v2 milestone may reintroduce direct-SDK paths for caching wins if analytics show cost pressure on OpenRouter routing.
- **`X-OR-Datapolicy: no_logging`** — explicitly rejected in D-10 (default logging accepted). Revisit if v2 includes a "share publicly" milestone (PUBLIC-01).
- **Model auto-router / cost optimizer** — already deferred in PROJECT.md as v2's `AI-V2-01`. Don't reinvent.
- **Pydantic v2 `Field(...)` validation on `AI_MODEL`** — could validate model strings against an OpenRouter-published list. Out of scope; default + freeform string is fine for v1.
- **`HTTP-Referer` placeholder URL** — using `http://kainga-core.local` as a placeholder until DEPLOY-01 confirms the final reachable URL. Phase 5 can update.
- **README badges, screenshots, CONTRIBUTING.md, LICENSE** — none in scope. Family-only project; PROJECT.md already states "no public release for v1."

</deferred>

---

*Phase: 02-ai-provider-flexibility*
*Context gathered: 2026-05-05*
