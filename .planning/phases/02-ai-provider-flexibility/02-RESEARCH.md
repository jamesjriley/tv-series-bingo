# Phase 2: AI Provider Flexibility - Research

**Researched:** 2026-05-05
**Domain:** Swap Anthropic SDK for OpenRouter via httpx (OpenAI-compatible endpoint)
**Confidence:** HIGH (request shape, error codes, attribution headers — verified against current OpenRouter docs); MEDIUM (privacy/logging defaults — current `/docs/features/privacy-and-logging` returns 404, policy gathered from related guides instead)

---

## Implementation Summary (1-hour version)

If you sat down right now to ship this, the diff is small and shaped like this:

1. **`backend/config.py`** — drop `anthropic_api_key`; add `openrouter_api_key: str = ""` and `ai_model: str = "openai/gpt-4o-mini"`.
2. **`backend/requirements.txt`** — delete the `anthropic==0.94.0` line. `httpx>=0.27.0` is already there.
3. **`backend/services/moment_generator.py`** — replace `import anthropic` with `import httpx`; extract a private `async def _call_openrouter(messages: list[dict], *, max_tokens: int = 4096) -> str` helper that POSTs to `https://openrouter.ai/api/v1/chat/completions` with `response_format={"type": "json_object"}`, attribution headers, retry-once on transient errors, and returns `data["choices"][0]["message"]["content"]`. Both `generate_moments_for_show` and `generate_moments_from_transcripts` call it. `_parse_json`, `_sanitize_input`, `_store_moments`, `get_moments` are untouched. Drop the Anthropic `cache_control: ephemeral` block — silently no-op on most OpenRouter routes anyway, and a needless coupling.
4. **`.env.example`** — replace `ANTHROPIC_API_KEY=sk-ant-...` with `OPENROUTER_API_KEY=sk-or-v1-...` and a commented-out `# AI_MODEL=openai/gpt-4o-mini` reference line.
5. **`docker-compose.yml`** — `ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}` → `OPENROUTER_API_KEY=${OPENROUTER_API_KEY}` (and optionally `AI_MODEL=${AI_MODEL:-openai/gpt-4o-mini}` — let env override, fall back to default).
6. **`README.md`** (new at repo root) — full per D-08; sections in Question 8 below.
7. **Spec patches** — strikethrough on REQUIREMENTS.md AI-01/AI-02, ROADMAP.md Phase 2 success criteria, and a one-line Outcome update on PROJECT.md "Multi-provider AI" row.

The new code is roughly 60–90 lines net (replace ~50 anthropic-specific lines with ~80 openrouter+retry lines + helper). Then a manual smoke test: `./run.sh`, click through "create game from show name", confirm moments appear, swap `AI_MODEL` to `anthropic/claude-haiku-4.5`, restart, repeat.

**Primary recommendation:** Single `_call_openrouter()` helper, `httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))` per call (not long-lived — matches `youtube_service.py`'s context-manager style), `response_format={"type": "json_object"}` in the body with the existing "Respond ONLY with the JSON object" prompt instruction kept (the docs require instructing the model to produce JSON anyway), retry once on `429/5xx/timeout/network`, fail loud after retry exhaustion.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single-provider OpenRouter via `httpx`. Drop `anthropic` SDK from `backend/requirements.txt`. POST to `https://openrouter.ai/api/v1/chat/completions`.
- **D-02:** Default model is `openai/gpt-4o-mini` (cheap, reliable, native JSON). Outdated `claude-sonnet-4-20250514` literal is removed.
- **D-03:** `AI_MODEL` has a sensible default; `OPENROUTER_API_KEY` is required. `.env.example` shows the default value commented out.
- **D-04:** Retry once on transient errors (HTTP 5xx, 429, timeout, connection error). Brief backoff (~500ms). Don't retry on 4xx. Fail loud (500 to client) after retry exhaustion.
- **D-05:** Drop `AI_PROVIDER` entirely. Final env contract: `OPENROUTER_API_KEY` (required) + `AI_MODEL` (optional, defaults to `openai/gpt-4o-mini`).
- **D-06 / D-09:** Minimal-patch strikethrough on REQUIREMENTS.md AI-01/AI-02 and ROADMAP Phase 2 success criteria, with a dated note. PROJECT.md "Multi-provider AI" row gets a single-line Outcome update.
- **D-07:** Use OpenAI-compatible `response_format: {"type": "json_object"}` in the request body. Keep `_parse_json` helper as a safety net. Drop the Anthropic `cache_control: ephemeral` block.
- **D-08:** Full root `README.md` — project blurb + env table + dev setup + AI_MODEL examples + verification steps + kainga-core deploy notes. Phase 5's DEPLOY-01 should consume/extend it, not rewrite.
- **D-10:** Send `HTTP-Referer: http://kainga-core.local` + `X-Title: TV Series Bingo` headers. Accept default logging policy.

### Claude's Discretion

- Exact retry backoff timing (suggested 500ms — planner can tune).
- Exact wording of OpenRouter API error → user-facing 500 message.
- Whether to extract `_call_openrouter()` helper or inline twice (lean toward extract — DRY).
- Commit-slice strategy (likely 2–3 commits: code / docs+README / spec patches — planner decides).
- Whether to add a one-line smoke test in `run.sh` or a small `pytest` (Phase 5 owns tests; leave smoke verification manual).
- Use of `httpx.AsyncClient` (matches `youtube_service.py` pattern) over sync — recommended.
- Drop the Anthropic-specific `cache_control: ephemeral` block (called out explicitly in D-07; not OpenRouter-supported across most routes).
- One-line outcome note in PROJECT.md Key Decisions ("→ Refined 2026-05-05 to OpenRouter-only with model-level provider routing (D-01)").

### Deferred Ideas (OUT OF SCOPE)

- Phase 5 / DEPLOY-01 README coordination — Phase 2 ships the README; Phase 5 extends it.
- Smoke test for AI provider swap — Phase 5 territory; manual verification only here.
- Anthropic SDK as fallback — explicitly rejected in D-01.
- `X-OR-Datapolicy: no_logging` — explicitly rejected in D-10.
- Model auto-router / cost optimizer — already deferred to v2's `AI-V2-01`.
- Pydantic v2 validation against an OpenRouter-published model list — out of scope.
- `HTTP-Referer` placeholder URL update post-deploy — Phase 5 can update.
- README badges, screenshots, CONTRIBUTING.md, LICENSE — none in scope (no public release for v1).

---

## Phase Requirements

| ID | Description (current spec) | Amended in this phase | Research Support |
|----|---------------------------|------------------------|------------------|
| AI-01 | "Provider-agnostic AI client supporting Anthropic *and* OpenRouter for moment generation; same `generate_moments_*` interface, swap behind config" | Strikethrough → "single-client via OpenRouter; Anthropic models reachable via `anthropic/*` model prefix" | OpenRouter Chat Completions endpoint and model list confirm `anthropic/claude-haiku-4.5` is reachable through the same OpenAI-compatible API |
| AI-02 | "Config-driven provider and model selection via env vars (e.g. `AI_PROVIDER=anthropic\|openrouter`, `AI_MODEL=...`) with sensible defaults; surfaced in `.env.example` and README" | Strikethrough → "Config-driven model selection via `AI_MODEL` env var (default `openai/gpt-4o-mini`); `OPENROUTER_API_KEY` required; surfaced in `.env.example` and README" | `AI_MODEL` is the sole swap mechanism; OpenRouter encodes provider in the model string (`openai/`, `anthropic/`, `meta-llama/`) — confirmed via OpenRouter Models guide |

---

## Project Constraints (from CLAUDE.md)

- **Hosting:** kainga-core only. No public IP, no public release. → `HTTP-Referer: http://kainga-core.local` is fine; the URL is for OpenRouter's app rankings dashboard, which is harmless when private.
- **Privacy:** All user data stays on kainga-core. No third-party analytics SDKs. → OpenRouter's default ~30-day prompt logging policy is accepted by D-10 (low-sensitivity bingo content). `[CITED: openrouter.ai/docs/guides/privacy/logging]` Note: this is the one privacy concession in v1; revisit at PUBLIC-01 if the project ever exposes externally.
- **Stack lock for v1:** Python 3.11 / FastAPI / SQLite / React 19 / Vite / TypeScript. → No new languages or frameworks added; only `anthropic` is removed. `httpx>=0.27.0` is already on the dep list.
- **No history rewrite.** → No git surgery; rotate the leaked `ANTHROPIC_API_KEY` is deferred (already in Phase 1's deferred ideas).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| AI moment generation HTTP call | API / Backend (`backend/services/moment_generator.py`) | — | Server-side only — API key never goes to the browser. The service layer wraps the upstream LLM provider. |
| AI provider selection (model env var) | API / Backend (`backend/config.py`) | Configuration / env file | Env-var resolved at FastAPI startup via Pydantic `Settings`; no client-side toggle. |
| JSON parsing of AI response | API / Backend (`_parse_json` in `moment_generator.py`) | — | Response shape is OpenAI-compatible; parsing happens before SQLite persistence. |
| Moments persistence | Database / Storage (SQLite via aiosqlite) | API / Backend (`_store_moments`) | Untouched by this phase. |
| HTTP client | API / Backend (`httpx.AsyncClient`) | — | Reuses the established async-by-default pattern from `youtube_service.py`. |
| User-facing failure surface | API / Backend (`backend/routers/moments.py` exception handler) | Browser / Client (error toast) | Existing `HTTPException(500, "Failed to generate moments: ...")` is the shape callers already render. No frontend change. |

**Sanity check:** Nothing in this phase belongs in the browser, the SSR layer, the CDN, or the database. It is a pure backend swap.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `httpx` | `>=0.27.0` (already pinned in `backend/requirements.txt`) | Async HTTP client for OpenRouter | Already used by `youtube_service.py`; project's established pattern; ships HTTP/2 and async-by-default `[VERIFIED: backend/requirements.txt]` |
| `pydantic-settings` | `2.5.0` (already pinned) | Env-var → typed `Settings` | Existing pattern in `backend/config.py`; supports defaults and `.env` loading `[VERIFIED: backend/config.py]` |

### Removed

| Library | Version | Reason |
|---------|---------|--------|
| `anthropic` | `0.94.0` | D-01: dropped entirely. Anthropic models stay reachable through OpenRouter (`anthropic/claude-haiku-4.5`). `[VERIFIED: backend/requirements.txt:4]` |

### Alternatives Considered (rejected)

| Instead of | Could Use | Why rejected |
|------------|-----------|--------------|
| `httpx` direct | `openai` SDK pointed at `openrouter.ai/api/v1` (drop-in replacement per OpenRouter quickstart) | D-01 explicitly rejects this — `openai` SDK is heavier, adds a dep, and the project already has `httpx`. The OpenAI-compat layer means the request/response shape is identical anyway. |
| `httpx` direct | `litellm` provider abstraction | Out of scope per D-01 ("path of least resistance"). Adds another library to maintain for zero gain at family scale. |
| Single-shot call | Streaming (SSE) | Moment generation produces ~1–3k token JSON in one shot; the client doesn't need progressive rendering. Streaming adds parsing complexity and changes the response handling shape. |
| `response_format=json_object` | `response_format=json_schema` (full schema enforcement with `MOMENT_SCHEMA`) | Tempting (project already has `MOMENT_SCHEMA`), but D-07 locks to `json_object`. Trade-off: `json_schema` only works on a narrower subset of models and would block free-tier Llama swap (Question 10 below). |

**Installation:** No new dependencies needed — only removal:

```bash
# Removal in backend/requirements.txt — drop the anthropic line
# Then locally:
pip uninstall anthropic
pip install -r backend/requirements.txt
```

**Version verification (registry check):**

`[ASSUMED]` Live registry checks for `httpx`, `openai`, and `anthropic` were not run in this session (no Bash registry commands issued for these). Versions cited above come from `backend/requirements.txt` directly. If the planner wants the absolute latest, run `pip index versions httpx` before pinning. For this phase, the existing `httpx>=0.27.0` is sufficient — no version bump required.

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────┐
│  React SPA  │  (no change)
└──────┬──────┘
       │ POST /api/games/{id}/generate-moments
       ▼
┌─────────────────────────────────────────────────────┐
│  FastAPI                                            │
│  ┌────────────────────────────────────────────┐     │
│  │ backend/routers/moments.py                 │     │
│  │  - existing/orphaned-game cleanup          │     │
│  │  - try/except → HTTPException(500)         │     │
│  └────────────────┬───────────────────────────┘     │
│                   │ generate_moments_for_show OR    │
│                   │ generate_moments_from_transcripts
│                   ▼                                  │
│  ┌────────────────────────────────────────────┐     │
│  │ backend/services/moment_generator.py       │     │
│  │  ┌──────────────────────────────────────┐  │     │
│  │  │ _call_openrouter(messages, max_tok)  │  │ NEW │
│  │  │  - build headers (Auth, Referer,     │  │     │
│  │  │    X-Title, Content-Type)            │  │     │
│  │  │  - body: {model, messages, max_tok,  │  │     │
│  │  │    response_format: {json_object}}   │  │     │
│  │  │  - httpx.AsyncClient(timeout=...)    │  │     │
│  │  │  - retry-once on 5xx/429/timeout     │  │     │
│  │  │  - return choices[0].message.content │  │     │
│  │  └────────────────┬─────────────────────┘  │     │
│  │                   │                        │     │
│  │  ┌────────────────▼─────────────────────┐  │     │
│  │  │ _parse_json(text)  (UNCHANGED)       │  │     │
│  │  └────────────────┬─────────────────────┘  │     │
│  │                   ▼                        │     │
│  │  ┌──────────────────────────────────────┐  │     │
│  │  │ _store_moments(...)  (UNCHANGED)     │  │     │
│  │  └────────────────┬─────────────────────┘  │     │
│  └────────────────────┼─────────────────────────┘     │
│                       ▼                              │
│              ┌────────────────┐                      │
│              │ aiosqlite WAL  │                      │
│              │   moments tbl  │                      │
│              └────────────────┘                      │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS
                      ▼
            ┌─────────────────────────────┐
            │ openrouter.ai/api/v1/       │
            │   chat/completions          │
            │  → routes to upstream model │
            │    based on `model` param   │
            └─────────────────────────────┘
```

### Recommended File Structure (no change)

```
backend/
├── config.py                    # MODIFIED: anthropic_api_key → openrouter_api_key + ai_model
├── requirements.txt             # MODIFIED: drop anthropic==0.94.0
├── services/
│   ├── moment_generator.py      # MODIFIED: anthropic SDK → httpx OpenRouter call
│   └── youtube_service.py       # UNCHANGED (httpx pattern reference)
└── routers/
    └── moments.py               # UNCHANGED (signatures preserved)
.env.example                     # MODIFIED: ANTHROPIC_API_KEY → OPENROUTER_API_KEY (+ AI_MODEL comment)
docker-compose.yml               # MODIFIED: env block updated
README.md                        # NEW: full per D-08
```

### Pattern 1: Async HTTP via context-managed `AsyncClient`

**What:** `youtube_service.py` opens an `httpx.AsyncClient(...)` per logical operation as a context manager, with explicit timeout and headers. No module-level long-lived client. Each request scope manages its own client.

**When to use:** This is the project's idiomatic pattern. Match it for OpenRouter — opening a client per call is fine for moment-generation frequency (a handful of calls per game lifecycle, not per request).

**Example:**

```python
# Source: backend/services/youtube_service.py:54-58 (existing pattern)
async with httpx.AsyncClient(headers=_HEADERS, timeout=15, follow_redirects=True) as client:
    res = await client.get("https://www.youtube.com/oembed", params={"url": url, "format": "json"})
    if res.status_code != 200:
        return {"channel_name": "", "channel_url": "", "videos": []}
    data = res.json()
```

**Apply to OpenRouter:**

```python
# Source: composed from OpenRouter chat-completions spec [CITED: openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request]
async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
    res = await client.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://kainga-core.local",
            "X-Title": "TV Series Bingo",
        },
        json={
            "model": settings.ai_model,                                # "openai/gpt-4o-mini" by default
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Generate bingo moments for the TV show: {show_name}"},
            ],
            "max_tokens": 4096,
            "response_format": {"type": "json_object"},
        },
    )
    res.raise_for_status()
    data = res.json()
    text = data["choices"][0]["message"]["content"]
```

### Pattern 2: Retry-once with backoff on transient errors

**What:** D-04 mandates a single retry on 5xx, 429, timeout, and connection errors; brief backoff (~500ms); no retry on 4xx; fail loud after exhaustion.

**Example:**

```python
import asyncio
import httpx

TRANSIENT_STATUS = {429, 500, 502, 503, 504}
TRANSIENT_EXC = (httpx.TimeoutException, httpx.ConnectError, httpx.RemoteProtocolError)

async def _call_openrouter(messages: list[dict], *, max_tokens: int = 4096) -> str:
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://kainga-core.local",
        "X-Title": "TV Series Bingo",
    }
    payload = {
        "model": settings.ai_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }
    timeout = httpx.Timeout(60.0, connect=10.0)

    last_exc: Exception | None = None
    for attempt in (1, 2):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
            if res.status_code in TRANSIENT_STATUS:
                logger.warning(
                    "OpenRouter transient %s on attempt %d (model=%s)",
                    res.status_code, attempt, settings.ai_model,
                )
                if attempt == 1:
                    await asyncio.sleep(0.5)
                    continue
                res.raise_for_status()  # final: raises HTTPStatusError → caller logs + returns 500
            res.raise_for_status()
            return res.json()["choices"][0]["message"]["content"]
        except TRANSIENT_EXC as e:
            last_exc = e
            logger.warning(
                "OpenRouter transient exception on attempt %d (%s): %s",
                attempt, type(e).__name__, e,
            )
            if attempt == 1:
                await asyncio.sleep(0.5)
                continue
            raise
    # unreachable, but keeps mypy happy
    raise RuntimeError(f"OpenRouter retry exhausted: {last_exc}")
```

**Note:** `4xx` status codes (auth, bad request, payment required) are NOT in `TRANSIENT_STATUS` — `raise_for_status()` will raise them on attempt 1 and the caller's existing exception handler in `routers/moments.py` converts them to `HTTPException(500, "Failed to generate moments: ...")`. That matches the existing failure shape.

### Anti-Patterns to Avoid

- **Long-lived module-level `httpx.AsyncClient`** — does not match the project's per-call context-manager pattern in `youtube_service.py`. A single shared client requires lifecycle hooks (`lifespan`) and is overkill for the call volume.
- **Logging the full prompt or the API key** — `logging.getLogger(__name__)` is the right pattern (already used by `youtube_service.py` and `moments.py`). Log `settings.ai_model`, `attempt`, and error category — never the bearer token, never the full prompt body.
- **Building a "provider abstraction" with strategy/factory** — explicitly rejected by D-01 ("path of least resistance"). One client. One callable.
- **Using `openai` SDK pointed at `openrouter.ai`** — works, but adds a dependency for zero benefit when `httpx` is already on the dep list.
- **Forgetting the JSON instruction in the prompt** — OpenRouter's docs explicitly state JSON mode requires instructing the model: *"setting the response_format to `{ "type": "json_object" }` enables JSON mode, which guarantees the message the model generates is valid JSON"* AND *"the documentation advises users to instruct the model to produce JSON through system or user messages when employing JSON mode"* `[CITED: openrouter.ai/docs/api/reference/parameters]`. The existing `SYSTEM_PROMPT` already does this ("Return a JSON object with a 'moments' array"), and the existing `+ "\n\nRespond ONLY with the JSON object, no other text."` reinforcement is fine — keep it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OpenAI-compatible HTTP client | Custom JSON serializer, custom HTTP retry library | `httpx.AsyncClient` (already a dep) + a small inline retry block | `httpx` handles connection pooling, HTTP/2, timeout granularity (connect vs read), TLS — reinvention is a known footgun. |
| JSON extraction from AI text | New regex for code-fence stripping | The existing `_parse_json` helper in `moment_generator.py:74-87` | Already handles markdown fences, raw JSON, and substring extraction. Keep it as a safety net per D-07. |
| Provider abstraction layer | Strategy pattern, factory, multi-client switcher | Single `_call_openrouter()` helper + the OpenRouter model string | OpenRouter is the abstraction. Adding a layer above it duplicates the work it already does. |
| Model name validation | Pydantic validator that whitelists OpenRouter model strings | Plain `str` env var with sensible default | Out of scope per CONTEXT.md deferred ideas. OpenRouter publishes ~300 models; whitelisting is brittle and adds maintenance debt. |
| Rate-limit / backoff strategy | Exponential-backoff library (e.g. `tenacity`, `backoff`) | Inline retry-once with `asyncio.sleep(0.5)` | D-04 is explicitly retry-once; full backoff machinery is over-engineered at family-LAN scale. |

**Key insight:** The whole point of D-01 is to *remove* an abstraction (the Anthropic SDK), not replace it with a different one. The smallest possible diff that delivers cost flexibility is one helper function with `httpx`.

---

## Common Pitfalls

### Pitfall 1: `response_format` is silently dropped on some upstream models

**What goes wrong:** Set `response_format: {"type": "json_object"}`, get back unstructured text or a markdown-fenced JSON block instead of clean JSON.

**Why it happens:** OpenRouter passes `response_format` to the upstream provider. Some models (older Llama variants, some Mistral routes, some quantized free-tier endpoints) honour the directive only via the prompt, not via the request parameter. The OpenAI-compat layer accepts the parameter but the upstream provider may ignore it.

**How to avoid:** Two layers of defence — (1) keep the existing `"Respond ONLY with the JSON object, no other text"` instruction in the prompt (matches the OpenRouter spec's own advice: *"the documentation advises users to instruct the model to produce JSON through system or user messages"* `[CITED: openrouter.ai/docs/api/reference/parameters]`), and (2) keep the existing `_parse_json` helper which already handles markdown fences and substring extraction.

**Warning signs:** First-attempt JSON parse fails on a model that wasn't `openai/gpt-4o-mini`; the moments table writes succeed but the moments include shell-escaped backticks.

**Confidence:** HIGH. `[CITED: openrouter.ai/docs/api/reference/parameters]` `[CITED: openrouter.ai/docs/guides/features/structured-outputs]`

### Pitfall 2: Free models 429 hard during peak hours

**What goes wrong:** User sets `AI_MODEL=meta-llama/llama-3.3-70b-instruct:free` to hit $0/month, gets HTTP 429 mid-game.

**Why it happens:** Free model variants (model IDs ending `:free`) have stricter per-minute rate caps than paid routes, plus daily caps tiered by purchased credit balance. *"Free-tier usage of popular models is subject to rate limiting by the provider, especially during peak times. This is true even if you have credits in your OpenRouter account. When this happens, you'll typically see a 429 Too Many Requests error."* `[CITED: openrouter.ai/docs/api/reference/limits]`

**How to avoid:** D-04's retry-once on 429 catches transient blips but won't survive sustained free-tier rate-limiting. README should warn users that `:free` models are unreliable at peak; default `openai/gpt-4o-mini` is the recommended path. Free models are documented as a *cost-flexibility option*, not the default.

**Warning signs:** Phase-2-shaped 500s in production with `429` in the upstream body; multiple `attempt 2` retries in logs.

**Confidence:** HIGH. `[CITED: openrouter.ai/docs/api/reference/limits]`

### Pitfall 3: Anthropic-style `cache_control: ephemeral` is silently no-op

**What goes wrong:** Copy the existing system message structure verbatim — `[{"type": "text", "text": "...", "cache_control": {"type": "ephemeral"}}]` — into the OpenRouter call. No error. But the prompt-cache savings the existing code was trying to capture (per Anthropic's prompt-caching feature) don't apply.

**Why it happens:** OpenRouter's chat-completion spec accepts `cache_control` on content items (`{type: "ephemeral", ttl: "5m" or "1h"}` per the parameter spec) but only certain Anthropic-direct routes honour it — and even then, the savings only show up if the prompt is large and called repeatedly within the TTL. For TV-bingo, each call is a different show or transcript set, so cache hits would be near-zero anyway.

**How to avoid:** Per D-07, drop the `cache_control` block. Use plain string content for the system message: `{"role": "system", "content": SYSTEM_PROMPT}`. Cleaner, simpler, no false sense of optimization.

**Warning signs:** N/A in v1 — it's a quiet-loss-of-savings, not a runtime failure.

**Confidence:** MEDIUM (HIGH on "drop it per D-07"; MEDIUM on the precise cross-provider behavior of `cache_control` because it varies per route). `[CITED: openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request]`

### Pitfall 4: Insufficient credits returns 402, not 401

**What goes wrong:** API key is valid but the OpenRouter account hit zero balance. Code that only handles 401 as "auth problem" treats 402 as a generic 5xx and might retry.

**Why it happens:** OpenRouter distinguishes: *"401 Unauthorized — Invalid credentials"* vs *"402 Payment Required — Insufficient credits"* `[CITED: openrouter.ai/docs/api/reference/errors-and-debugging]`. A retry on 402 is wasted — it'll just 402 again.

**How to avoid:** D-04's retry policy explicitly excludes 4xx. The retry whitelist (`{429, 500, 502, 503, 504}` in the example above) does the right thing. Make sure `402` is NOT in that set. The user-facing 500 message should be informative ("AI provider rejected the request — check OPENROUTER_API_KEY and account balance") but not leak the provider response.

**Warning signs:** Repeated 402s in logs. README should note that OpenRouter requires a positive credit balance to call paid models.

**Confidence:** HIGH. `[CITED: openrouter.ai/docs/api/reference/errors-and-debugging]`

### Pitfall 5: HTTP-Referer is the primary attribution key, not X-Title

**What goes wrong:** Send only `X-Title` (or only `X-OpenRouter-Title`) without `HTTP-Referer`. Expect to see the app on OpenRouter rankings. See nothing.

**Why it happens:** *"HTTP-Referer ... identifies your app's URL and is used as the primary identifier for rankings ... without it, no app page will be created and your usage will not appear in rankings"* and *"X-OpenRouter-Title ... This header alone does not create an app page — it must be paired with HTTP-Referer"* `[CITED: openrouter.ai/docs/app-attribution]`. The current header name is `X-OpenRouter-Title`; `X-Title` *"is still supported for backwards compatibility"*.

**How to avoid:** D-10 sends both. For a private family deployment, attribution is irrelevant — but it's harmless. Use either `X-Title` (back-compat) or `X-OpenRouter-Title` (current). CONTEXT.md says `X-Title`; both work; planner should keep `X-Title` per CONTEXT.md.

**Warning signs:** N/A for v1 (private app — rankings irrelevant).

**Confidence:** HIGH. `[CITED: openrouter.ai/docs/app-attribution]`

### Pitfall 6: Pydantic Settings field name vs env var case mismatch

**What goes wrong:** Add `openrouter_api_key: str = ""` to `Settings`, set `OPENROUTER_API_KEY=...` in `.env`, expect it to load. It does — but only because pydantic-settings is case-insensitive by default. Worth verifying.

**Why it happens:** `pydantic-settings` 2.x defaults to case-insensitive env-var matching, so `OPENROUTER_API_KEY` → `openrouter_api_key`. Same with `AI_MODEL` → `ai_model`. The existing `Settings` class works this way — the `anthropic_api_key` field reads from `ANTHROPIC_API_KEY`.

**How to avoid:** Just use snake_case for the field name; uppercase for the env var. Already how `backend/config.py` works.

**Warning signs:** Settings load with empty string → 401 on first call. Easy to catch in smoke test.

**Confidence:** MEDIUM `[ASSUMED]` — based on pydantic-settings 2.x behavior. The existing `backend/config.py` already demonstrates this works for `anthropic_api_key`, so the same approach is verified-by-precedent.

### Pitfall 7: `.env` working tree not refreshed on rename

**What goes wrong:** Phase 1 untracked `.env` from git. The local `.env` still has `ANTHROPIC_API_KEY=sk-ant-...`. After Phase 2 ships, the user runs `./run.sh`, expects it to work, but `OPENROUTER_API_KEY` is unset → empty string → 401 on first call.

**Why it happens:** Phase 2 cannot edit the user's local `.env` automatically (gitignored, working-tree only). The plan needs an explicit user-step or scripted hint.

**How to avoid:** PLAN.md task should include a step (or commit checklist note) reminding the human: "after pulling Phase 2, edit `.env`: remove `ANTHROPIC_API_KEY`; add `OPENROUTER_API_KEY=sk-or-v1-...`; optionally add `AI_MODEL=...`". CONTEXT.md `<code_context>` already flags this as a "manual user step or scripted into the commit's checklist".

**Warning signs:** First post-merge call returns 401 with empty bearer; logs show `Authorization: Bearer ` (no key).

**Confidence:** HIGH. Mechanically guaranteed; just needs to be explicit in the plan.

### Pitfall 8: ROADMAP/REQUIREMENTS strikethrough syntax must be valid Markdown

**What goes wrong:** Use `~~AI-01: Provider-agnostic AI client~~` inside a `- [ ] **AI-01**: ...` list item. The strikethrough breaks the bold or the list rendering depending on how it's nested.

**Why it happens:** Markdown nesting is fiddly; some renderers treat `~~` inside `**` differently from `**` inside `~~`.

**How to avoid:** Use the GitHub-flavored Markdown convention shown in CONTEXT.md D-06: a top-level strikethrough on the original sentence followed by a fresh dated note. See Question 7 for exact before/after Markdown.

**Warning signs:** Rendered REQUIREMENTS.md has visible literal `~~`.

**Confidence:** HIGH (Markdown spec is unambiguous on `~~` strikethrough; just needs care with nesting).

---

## Code Examples

### Complete `_call_openrouter` helper

```python
# backend/services/moment_generator.py — proposed addition
import asyncio
import logging

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
TRANSIENT_STATUS = {429, 500, 502, 503, 504}
TRANSIENT_EXC = (httpx.TimeoutException, httpx.ConnectError, httpx.RemoteProtocolError)


async def _call_openrouter(messages: list[dict], *, max_tokens: int = 4096) -> str:
    """POST to OpenRouter chat completions with retry-once on transient errors.

    Returns the assistant message content (string). Raises on non-transient errors
    or after retry exhaustion — caller's exception handler converts to HTTP 500.
    """
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://kainga-core.local",
        "X-Title": "TV Series Bingo",
    }
    payload = {
        "model": settings.ai_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }
    timeout = httpx.Timeout(60.0, connect=10.0)

    for attempt in (1, 2):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            if res.status_code in TRANSIENT_STATUS and attempt == 1:
                logger.warning(
                    "OpenRouter transient %s; retrying once (model=%s)",
                    res.status_code, settings.ai_model,
                )
                await asyncio.sleep(0.5)
                continue
            res.raise_for_status()
            return res.json()["choices"][0]["message"]["content"]
        except TRANSIENT_EXC as e:
            if attempt == 1:
                logger.warning(
                    "OpenRouter %s on attempt 1; retrying once",
                    type(e).__name__,
                )
                await asyncio.sleep(0.5)
                continue
            raise
    raise RuntimeError("OpenRouter retry exhausted")  # safety; loop returns or raises first
```

### Simplified callsite functions

```python
async def generate_moments_for_show(game_id: str, show_name: str) -> list[dict]:
    show_name = _sanitize_input(show_name)
    text = await _call_openrouter([
        {
            "role": "system",
            "content": SYSTEM_PROMPT + "\n\nRespond ONLY with the JSON object, no other text.",
        },
        {
            "role": "user",
            "content": f"Generate bingo moments for the TV show: {show_name}",
        },
    ])
    result = _parse_json(text)
    return await _store_moments(game_id, result["moments"])


async def generate_moments_from_transcripts(
    game_id: str, source_name: str, transcripts: str
) -> list[dict]:
    if len(transcripts) > 30000:
        transcripts = transcripts[:30000] + "\n\n[Transcripts truncated]"

    prompt = (
        YOUTUBE_PROMPT.format(transcripts=transcripts)
        + "\n\nRespond ONLY with the JSON object, no other text."
    )
    text = await _call_openrouter([{"role": "user", "content": prompt}])
    result = _parse_json(text)
    return await _store_moments(game_id, result["moments"])
```

### Updated `backend/config.py`

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openrouter_api_key: str = ""
    ai_model: str = "openai/gpt-4o-mini"
    database_path: str = "bingo.db"
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
```

### Updated `.env.example`

```bash
# OpenRouter API key — required. Get one at https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-...your-key-here

# AI model override (optional). Defaults to openai/gpt-4o-mini if unset.
# Examples:
#   AI_MODEL=openai/gpt-4o-mini                       # default — cheap, reliable JSON
#   AI_MODEL=anthropic/claude-haiku-4.5                # Claude family
#   AI_MODEL=meta-llama/llama-3.3-70b-instruct:free    # free tier (rate-limited)
```

### Updated `docker-compose.yml` env block

```yaml
environment:
  - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
  - AI_MODEL=${AI_MODEL:-openai/gpt-4o-mini}
  - DATABASE_PATH=/app/data/bingo.db
```

---

## Existing Code Map (moment_generator.py)

Mapping the diff so the planner can split tasks cleanly.

| Lines | What | Phase 2 action |
|-------|------|----------------|
| 1–4 | imports (`json`, `re`, `uuid`, `anthropic`) | Replace `import anthropic` with `import asyncio, logging` and `import httpx` |
| 7–8 | `from backend.config import settings`, `from backend.database import get_db` | Unchanged |
| 10–47 | `SYSTEM_PROMPT`, `YOUTUBE_PROMPT` constants | Unchanged. (The "Respond ONLY with the JSON object" addendum can stay inline at callsites or move into the constants — Claude's discretion.) |
| 49–71 | `MOMENT_SCHEMA` constant | Unchanged. (Not currently passed to Anthropic; could later be used with `response_format={"type":"json_schema",...}` if the planner ever wants stricter enforcement, but D-07 says `json_object` only.) |
| 74–87 | `_parse_json` helper | Unchanged. Safety net per D-07. |
| 90–94 | `_sanitize_input` helper | Unchanged. |
| 97–120 | `generate_moments_for_show` (Anthropic-specific: `anthropic.Anthropic(...)`, `client.messages.create(...)`, `cache_control: ephemeral`, `response.content[0].text`) | Rewrite: build messages list, call `_call_openrouter()`, parse, store. Drop `cache_control`. ~10 lines. |
| 123–146 | `generate_moments_from_transcripts` (same shape) | Rewrite: same pattern. ~10 lines. |
| 149–170 | `_store_moments` | Unchanged. Model-agnostic. |
| 173–182 | `get_moments` | Unchanged. Model-agnostic. |
| — | NEW `_call_openrouter` helper | ~30 lines |

**Net diff estimate:** Roughly −40 / +40 lines. Two callsites collapse to ~10 lines each; the new helper is ~30 lines. File ends up similar length, simpler shape.

**Caller verified:** `backend/routers/moments.py:25,29,33` — calls `generate_moments_from_transcripts(game_id, body.source_name, transcripts)` and `generate_moments_for_show(game_id, body.source_name)`. Function signatures stay identical → no caller changes. `[VERIFIED: backend/routers/moments.py]`

---

## Research Question Answers

### Q1. OpenRouter request shape

**Endpoint:** `POST https://openrouter.ai/api/v1/chat/completions` `[VERIFIED: openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request, fetched 2026-05-05]`

**Headers:**

| Header | Required? | Value |
|--------|-----------|-------|
| `Authorization` | Required | `Bearer <OPENROUTER_API_KEY>` |
| `Content-Type` | Required | `application/json` |
| `HTTP-Referer` | Recommended (required for app rankings) | App URL — `http://kainga-core.local` per D-10 |
| `X-Title` | Recommended | `TV Series Bingo` per D-10. (`X-OpenRouter-Title` is the current name; `X-Title` is back-compat — both work.) `[CITED: openrouter.ai/docs/app-attribution]` |

**Body (minimum viable per spec):**

```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "max_tokens": 4096,
  "response_format": {"type": "json_object"}
}
```

`temperature` is optional (default per the model). `top_p`, `frequency_penalty`, `stop`, `seed` etc. are also optional. `model` and `messages` are the only strictly required body fields. `[CITED: openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request]`

**Complete httpx call:** See "Pattern 1" above and "Code Examples" → `_call_openrouter` helper.

**Confidence:** HIGH.

---

### Q2. `response_format: {"type": "json_object"}` support

- **Generally supported** by OpenRouter as a top-level type alongside `{"type": "json_schema", ...}`. *"OpenRouter supports two modes: `{ type: 'json_object' }` for basic JSON mode where the model will return valid JSON, and `{ type: 'json_schema', json_schema: { ... } }` for strict schema mode."* `[CITED: openrouter.ai/docs/api/reference/parameters]` `[CITED: openrouter.ai/docs/quickstart]`
- **`openai/gpt-4o-mini`:** Native JSON mode is a documented OpenAI feature on this model — `[ASSUMED VERIFIED]` based on OpenAI's structured-outputs documentation citing GPT-4o-mini as a supported model. Behaves correctly with `json_object` per OpenRouter's compat layer.
- **`anthropic/claude-haiku-4.5`:** Anthropic itself shipped structured outputs for Sonnet 4.5 / Opus 4.1 first, with *"Haiku 4.5 support is coming"* per the WebSearch result citing Anthropic docs. Through OpenRouter's compat layer, `json_object` mode generally works on Anthropic routes by being translated into a system-prompt instruction; full strict-schema parity may lag. `[ASSUMED]`
- **OpenRouter caveat (important):** *"Setting the response_format to `{ "type": "json_object" }` enables JSON mode, which guarantees the message the model generates is valid JSON"* AND *"The documentation advises users to instruct the model to produce JSON through system or user messages when employing JSON mode"* `[CITED: openrouter.ai/docs/api/reference/parameters]`. **Translation:** keep the `"Respond ONLY with the JSON object, no other text"` reinforcement in the prompt (the existing code already does this). The model needs both signals.
- **`json_schema` strict mode (NOT used here, FYI):** *"The request will fail with an error indicating lack of support"* if the model doesn't support it `[CITED: openrouter.ai/docs/guides/features/structured-outputs]`. So a future upgrade to `json_schema` would need a model whitelist.

**Confidence:** HIGH on `json_object` being accepted by OpenRouter; MEDIUM on per-model behavior beyond gpt-4o-mini (mitigated by `_parse_json` safety net per D-07).

---

### Q3. Error categories

`[CITED: openrouter.ai/docs/api/reference/errors-and-debugging]` — all canonical:

| Code | Cause | Retry per D-04? | Notes |
|------|-------|-----------------|-------|
| **400** | Bad Request — invalid/missing params, CORS | No | Body shape error in our request — fail loud |
| **401** | Invalid credentials (expired/missing/disabled API key) | No | `OPENROUTER_API_KEY` problem |
| **402** | Insufficient credits | No | Account-level — adding retry won't fix |
| **403** | Moderation flagged input (model with safety routing) | No | Unlikely for bingo moments, but possible |
| **408** | Request timeout (server-side) | **Yes** | One retry catches transient slow upstream |
| **413** | Payload too large | No | Truncate transcripts (already done in code: 30k chars) |
| **422** | Semantic validation | No | Body shape problem |
| **429** | Rate limited | **Yes** | Free models 429 hard during peak — README warning |
| **500** | OpenRouter internal | **Yes** | One retry |
| **502** | Upstream provider failure (model down or invalid response) | **Yes** | One retry — most common transient |
| **503** | No available provider for routing requirements | **Yes** | One retry |
| **504** | Gateway timeout (not in OpenRouter docs explicitly, but standard HTTP) | **Yes** | Treat same as 502/503 |

**Body shape:** `{"error": {"code": <int>, "message": "<string>", "metadata": <object|null>}, "user_id": "<string|null>"}` `[CITED: openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request]`. Our retry logic doesn't need to parse the body — `res.status_code` is enough.

**`Retry-After` header:** Not explicitly documented. D-04's fixed 500ms backoff is fine; honoring `Retry-After` is over-engineered for retry-once.

**Recommended retry whitelist (in code):** `{408, 429, 500, 502, 503, 504}` plus `httpx.TimeoutException` and `httpx.ConnectError`.

**Confidence:** HIGH.

---

### Q4. Timeout posture

**OpenRouter does not publish recommended client timeouts.** Reasoning from primitives:

- Moment generation produces ~1–3k tokens. At a typical 50–100 tok/s for `gpt-4o-mini`, that's 30–60 seconds end-to-end on a slow upstream.
- `youtube_service.py` uses `timeout=15` (a short-form scraping call). That's too tight for chat-completion.
- The OpenAI Python SDK defaults to 600s total timeout for chat completion; `openai-node` defaults to 600s. Both treat chat completion as a "long" operation.

**Recommendation:** `httpx.Timeout(60.0, connect=10.0)` — 10s to establish TCP/TLS, 60s for the full read.

| Component | Value | Rationale |
|-----------|-------|-----------|
| Connect timeout | `10.0` s | Fail fast on network down; OpenRouter's edge is generally fast |
| Read timeout | `60.0` s | Generous enough for `gpt-4o-mini` JSON of 4k tokens; tighter than the OpenAI SDK default but safer than infinity |
| Total / pool | inherits from read | We don't pool (per-call client) |

**Confidence:** MEDIUM `[ASSUMED]` — OpenRouter doesn't publish timeout guidance. Suggested values are derived from OpenAI's SDK defaults and `gpt-4o-mini` typical generation speed. The planner can tune.

---

### Q5. Existing httpx pattern

`[VERIFIED: backend/services/youtube_service.py]`:

- **Style:** Per-call context-managed `async with httpx.AsyncClient(headers=..., timeout=15, follow_redirects=True) as client:` (line 54, 82, 103). NOT a long-lived shared client.
- **Headers:** Module-level `_HEADERS` constant — User-Agent + Accept-Language for YouTube scraping. Not directly applicable to OpenRouter (different auth/attribution headers).
- **Timeout:** Plain `15` (15 seconds, total) — too tight for chat completion (see Q4).
- **Error handling:** `try/except Exception` returns empty default; not the right shape for OpenRouter (we want explicit categories).

**Mirror the AsyncClient context-manager style; adopt different headers and timeout values for chat completion. Don't share the YouTube `_HEADERS` constant — define a separate constant or build headers inline in `_call_openrouter`.**

**Confidence:** HIGH. `[VERIFIED]`

---

### Q6. Existing moment_generator.py shape

See "Existing Code Map" table above. Quick summary:

- 182 lines total `[VERIFIED: wc -l]`
- Anthropic-specific lines (`import anthropic`, `client = anthropic.Anthropic(...)`, `client.messages.create(...)`, `response.content[0].text`, `cache_control: ephemeral` blocks): roughly lines 5, 99, 101–117, 119, 130, 134–143, 145 — about **40 lines** of provider-specific code.
- Two callsite functions: `generate_moments_for_show` (lines 97–120), `generate_moments_from_transcripts` (lines 123–146).
- `_parse_json` (74–87), `_sanitize_input` (90–94), `_store_moments` (149–170), `get_moments` (173–182) — all stay.
- After replacement: roughly the same line count, with the new `_call_openrouter` helper (~30 lines) replacing the inline anthropic code.

**Confidence:** HIGH. `[VERIFIED]`

---

### Q7. Spec-patch artifact format (exact before/after)

#### `.planning/REQUIREMENTS.md` — AI section

**Before** (lines 22–23):

```markdown
- [ ] **AI-01**: Provider-agnostic AI client supporting Anthropic *and* OpenRouter for moment generation; same `generate_moments_*` interface, swap behind config
- [ ] **AI-02**: Config-driven provider and model selection via env vars (e.g. `AI_PROVIDER=anthropic|openrouter`, `AI_MODEL=...`) with sensible defaults; surfaced in `.env.example` and README
```

**After** (proposed):

```markdown
- [ ] **AI-01**: ~~Provider-agnostic AI client supporting Anthropic *and* OpenRouter for moment generation; same `generate_moments_*` interface, swap behind config~~ → **Amended 2026-05-05 in Phase 2 discuss:** Single-client via OpenRouter for moment generation; Anthropic models stay reachable via `anthropic/*` model prefix on OpenRouter; same `generate_moments_*` interface preserved.
- [ ] **AI-02**: ~~Config-driven provider and model selection via env vars (e.g. `AI_PROVIDER=anthropic|openrouter`, `AI_MODEL=...`) with sensible defaults; surfaced in `.env.example` and README~~ → **Amended 2026-05-05 in Phase 2 discuss:** Config-driven model selection via `AI_MODEL` env var (default `openai/gpt-4o-mini`); `OPENROUTER_API_KEY` required; surfaced in `.env.example` and README. `AI_PROVIDER` dropped — model name embeds the provider on OpenRouter.
```

#### `.planning/ROADMAP.md` — Phase 2 success criteria

**Before** (3 lines under `### Phase 2: AI Provider Flexibility`):

```markdown
**Success Criteria** (what must be TRUE):
  1. Setting `AI_PROVIDER=openrouter` in `.env` routes all moment generation through OpenRouter without code changes
  2. Setting `AI_PROVIDER=anthropic` (or no setting) routes through Anthropic — existing behaviour preserved
  3. `.env.example` documents `AI_PROVIDER` and `AI_MODEL` with sensible defaults; README explains the switch
```

**After** (proposed):

```markdown
**Success Criteria** (what must be TRUE):
  1. ~~Setting `AI_PROVIDER=openrouter` in `.env` routes all moment generation through OpenRouter without code changes~~ → **Amended 2026-05-05 (Phase 2 discuss):** With `OPENROUTER_API_KEY` set and `AI_MODEL` unset, moment generation works using the default model (`openai/gpt-4o-mini`).
  2. ~~Setting `AI_PROVIDER=anthropic` (or no setting) routes through Anthropic — existing behaviour preserved~~ → **Amended 2026-05-05 (Phase 2 discuss):** Setting `AI_MODEL=anthropic/claude-haiku-4.5` (or any OpenRouter model string) routes moment generation through that model with no code changes.
  3. ~~`.env.example` documents `AI_PROVIDER` and `AI_MODEL` with sensible defaults; README explains the switch~~ → **Amended 2026-05-05 (Phase 2 discuss):** `.env.example` documents `OPENROUTER_API_KEY` (required) and `AI_MODEL` (optional, default shown). Root `README.md` explains the model switch and lists example values including free models (e.g. `meta-llama/llama-3.3-70b-instruct:free`).
```

#### `.planning/PROJECT.md` — Key Decisions row

**Before** (line 86):

```markdown
| Multi-provider AI (Anthropic + OpenRouter) | Cost flexibility, no single-vendor lock-in, easy config-driven switch | — Pending |
```

**After**:

```markdown
| Multi-provider AI (Anthropic + OpenRouter) | Cost flexibility, no single-vendor lock-in, easy config-driven switch | — Pending → Refined 2026-05-05 to OpenRouter-only with model-level provider routing (Phase 2 D-01). |
```

**Confidence:** HIGH on Markdown shape; the planner should copy these blocks verbatim into spec-patch tasks so there's no ambiguity about line breaks, dashes, and arrow syntax.

---

### Q8. README structure

D-08 says "full root README" with deploy notes. Proposed sections (the planner can shape exact wording):

```markdown
# TV Series Bingo

> [one-sentence blurb — see PROJECT.md "What This Is" line 5]
> Family-only bingo for TV shows and YouTube content. Hosted on kainga-core. Not public.

## Quick start

1. Get an OpenRouter API key at https://openrouter.ai/keys
2. `cp .env.example .env` and set `OPENROUTER_API_KEY=...`
3. `./run.sh` — boots backend (uvicorn :8000) and frontend (vite :5173)
4. Open http://localhost:5173 (or the LAN IP shown by `run.sh`)

## Environment variables

| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `OPENROUTER_API_KEY` | yes | — | OpenRouter API key (https://openrouter.ai/keys) |
| `AI_MODEL` | no | `openai/gpt-4o-mini` | Any OpenRouter model name |
| `DATABASE_PATH` | no | `bingo.db` | SQLite file path |
| `HOST` | no | `0.0.0.0` | Backend bind address |
| `PORT` | no | `8000` | Backend port |

## Switching the AI model

The `AI_MODEL` env var accepts any OpenRouter model name. Examples:

| Model | Cost | Notes |
|-------|------|-------|
| `openai/gpt-4o-mini` (default) | ~$0.15/M input | Cheap, reliable, native JSON output |
| `anthropic/claude-haiku-4.5` | ~$1/M input | Closest to original Claude behaviour |
| `meta-llama/llama-3.3-70b-instruct:free` | $0 | Free tier — rate-limited at peak |
| `google/gemini-2.5-flash` | varies | Google models also reachable through the same key |

To switch: set `AI_MODEL=...` in `.env`, restart the backend.

## Verifying the model is being used

After starting, create a game from a TV show in the UI. The backend logs the
configured model on each call. To verify the swap, check the OpenRouter dashboard
at https://openrouter.ai/activity — the model name on the latest call matches
`$AI_MODEL`.

## Development setup

Python 3.11+ and Node.js 20+ required.

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r backend/requirements.txt
cd frontend && npm install && cd ..
./run.sh
```

`./run.sh` handles venv creation and dep install on first run.

## Deploying to kainga-core

This app is family-only and runs on kainga-core via Docker.

```bash
# On kainga-core:
git pull
cp .env.example .env  # then edit OPENROUTER_API_KEY
docker-compose build
docker-compose up -d

# Reachable at http://kainga-core.local:8088 (LAN/Tailscale)
```

The Dockerfile is multi-stage — Node 20 builds the frontend, Python 3.11 serves
both the API (port 8000) and the SPA. `docker-compose.yml` maps host port 8088
to container 8000.

## Project shape

- **Backend:** FastAPI + SQLite (aiosqlite, WAL mode) — `backend/`
- **Frontend:** React 19 + Vite + TypeScript — `frontend/`
- **AI:** OpenRouter (HTTP, `httpx`) — `backend/services/moment_generator.py`
- **Multiplayer:** WebSocket via FastAPI — `backend/routers/websocket.py`

For the v1 polish-and-ship plan, see `.planning/PROJECT.md`,
`.planning/REQUIREMENTS.md`, and `.planning/ROADMAP.md`.
```

**Verifications behind the README:**

- `./run.sh` exists `[VERIFIED: ls -la /home/.../run.sh]`. It loads `.env`, sets up venv, installs deps, starts uvicorn (port 8000) and vite (default port 5173 via `npx vite --host 0.0.0.0`).
- `docker-compose.yml` maps `8088:8000` `[VERIFIED: docker-compose.yml line 7]`.
- `Dockerfile` is multi-stage (node:20-alpine builds frontend → python:3.11-slim runtime) `[VERIFIED]`.
- No README.md exists at the repo root currently `[VERIFIED: ls returned No such file]` — Phase 2 creates the first one.
- `frontend/README.md` may exist (Vite's default) — README at the root is a *new* file, doesn't conflict.

**Confidence:** HIGH on structure; MEDIUM on exact wording (Claude's discretion within D-08).

---

### Q9. Validation approach (manual smoke test)

Per CONTEXT.md `<deferred>`: automated tests are explicitly Phase 5 territory (TEST-01/TEST-02). Phase 2 validation is **manual only**. A 30-second smoke recipe:

```bash
# 1. Confirm env (no leak)
grep -E "^(OPENROUTER_API_KEY|AI_MODEL)=" .env
# Expect: both present (or AI_MODEL absent if using default)

# 2. Confirm anthropic SDK is gone
pip show anthropic 2>&1 | grep -i "not found"
# Expect: WARNING: Package(s) not found: anthropic

# 3. Boot
./run.sh
# Wait for "Application startup complete." in the uvicorn logs.

# 4. Smoke a TV-show game
curl -s -X POST http://localhost:8000/api/games \
  -H "Content-Type: application/json" \
  -d '{"source_type":"show","source_name":"Brooklyn Nine-Nine","host_name":"Smoke"}' | jq
# Expect: HTTP 200, response includes "id", "moments_generated"=true within ~5–15s

# 5. Verify moments persisted
sqlite3 bingo.db "SELECT COUNT(*) FROM moments WHERE game_id IN (SELECT id FROM games WHERE source_name='Brooklyn Nine-Nine' ORDER BY created_at DESC LIMIT 1);"
# Expect: 45

# 6. Inspect logs for the model used (no API key leaked)
# Expect: no "sk-or-v1-" or "Authorization:" strings in stdout

# 7. Swap model and re-test
echo "AI_MODEL=anthropic/claude-haiku-4.5" >> .env
# restart backend, repeat steps 4-6 — should succeed with the new model
```

**Frontend click-through alternative:** Open `http://localhost:5173`, click "Create game", enter a TV show, wait for moments to appear (5–15 seconds typically), confirm 24 moments + free centre populate the card.

**Confidence:** HIGH. The recipe uses existing endpoints; nothing assumes new test infrastructure.

---

### Q10. Risks / landmines (planner should explicitly warn in PLAN.md)

Beyond the Common Pitfalls section above, three items deserve PLAN.md visibility because they could cause confusing user-facing failures **after** the phase ships:

1. **Free `:free` models are unreliable at peak.** README documents them as a $0 option, but D-04's retry-once won't survive sustained 429s. Phrase the README example as "for cost-flexibility experimentation, not a primary default." `[CITED: openrouter.ai/docs/api/reference/limits]`

2. **`response_format=json_object` is best-effort across the model catalog.** Some routes silently degrade to "the model emits JSON because the prompt asked for it" rather than honouring the parameter. `_parse_json` is the safety net. The planner should NOT remove the `"Respond ONLY with the JSON object"` prompt instruction even though the parameter is set — both layers are needed. `[CITED: openrouter.ai/docs/api/reference/parameters]`

3. **`max_tokens` semantics differ across providers via OpenRouter.** Some upstream models reserve `max_tokens` for completion (the OpenAI semantic); some include input. Anthropic models on OpenRouter have historically had different tokenization characteristics. For 4096, this is unlikely to bite a single 1–3k-token JSON response, but if `AI_MODEL` is swapped to a model with a tiny context (rare on OpenRouter's catalog), generation could truncate. Mitigation: keep `max_tokens=4096` (current value); it's well within all current Phase-2 candidate models. `[ASSUMED]`

4. **Privacy posture: 30-day default logging applies to all upstream providers OpenRouter routes through.** D-10 accepts this. PROJECT.md privacy clause says "all data on kainga-core" — but for moment generation, **prompts (show name OR full transcript text) leave kainga-core for OpenRouter and the upstream provider**. This is the one privacy concession in v1. README should state: "AI moment generation sends the show name (or YouTube transcript text) to OpenRouter and the configured upstream provider. No game state or player data is sent." Revisit at PUBLIC-01 / SEC-* milestones. `[CITED: openrouter.ai/docs/guides/privacy/logging]`

5. **`HTTP-Referer: http://kainga-core.local` is a placeholder.** It satisfies OpenRouter's attribution requirement and is harmless on a private network, but if Phase 5 / DEPLOY-01 changes the deployed URL (e.g. Tailscale-published URL), update the constant. CONTEXT.md `<deferred>` already captures this.

6. **The `cache_control: {"type": "ephemeral"}` block in the existing code claimed prompt-caching savings via Anthropic's prompt-caching feature.** Dropping it (per D-07) means prompts are sent in full every time. Cost impact is nil for the v1 use case (~tens of users, sporadic moment generation), but worth knowing if usage explodes.

7. **`X-Title` vs `X-OpenRouter-Title` header naming drift.** Both work today. CONTEXT.md says `X-Title`; that's fine. If OpenRouter ever drops back-compat for `X-Title`, the planner / Phase 5 will need to update. `[CITED: openrouter.ai/docs/app-attribution]`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct Anthropic SDK with `cache_control: ephemeral` for prompt caching | OpenAI-compat HTTP via OpenRouter; no prompt caching | Phase 2 (this) | Lose Anthropic-specific cache savings; gain ~300 model catalog and free-tier options |
| Hardcoded `claude-sonnet-4-20250514` | Env-driven `AI_MODEL` (default `openai/gpt-4o-mini`) | Phase 2 | One env-var swap to switch providers |
| Prompt-driven JSON (`"Respond ONLY with JSON"`) | `response_format: {"type": "json_object"}` + same prompt instruction (defence in depth) | Phase 2 | Cleaner JSON output on supporting models; safety net unchanged |
| `anthropic` Python SDK 0.94.0 (deprecated per audit) | `httpx` direct (already a dep) | Phase 2 | One fewer dep; no SDK upgrade pressure |

**Deprecated/outdated:**

- `anthropic==0.94.0` — leaving as-is in dependency closure of the broader ecosystem, but removed from this project per D-01.
- `claude-sonnet-4-20250514` literal model string — removed from code; if anyone wants the latest Sonnet, set `AI_MODEL=anthropic/claude-sonnet-4-7` (or whichever current alias OpenRouter publishes).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `httpx.Timeout(60.0, connect=10.0)` is a sensible default for OpenRouter chat completion | Q4 Timeout posture, `_call_openrouter` helper | Low — values are derived from OpenAI SDK defaults and `gpt-4o-mini` typical generation speed; planner can tune. If too tight, occasional 408s that the retry catches anyway. |
| A2 | `openai/gpt-4o-mini` honors `response_format={"type":"json_object"}` end-to-end via OpenRouter | Q2 JSON support | Low — fallback `_parse_json` handles non-JSON output. Only risk is increased flakiness on first call; safety net catches it. |
| A3 | `anthropic/claude-haiku-4.5` honors `json_object` mode through OpenRouter | Q2 JSON support, Pitfall 1 | Medium — Anthropic native structured-outputs reportedly rolling out for Haiku. OpenRouter's compat layer typically translates `json_object` to a system-prompt instruction for non-supporting models, which means we get prompt-driven JSON for free. `_parse_json` covers either path. |
| A4 | `pydantic-settings` 2.5.0 reads `OPENROUTER_API_KEY` env var into `openrouter_api_key` field (case-insensitive) | Pitfall 6, `Settings` example | Very low — verified-by-precedent (existing `anthropic_api_key` ↔ `ANTHROPIC_API_KEY` works the same way). |
| A5 | `max_tokens=4096` is sufficient for ~45 bingo moments JSON across all model candidates | Q10 risk #3 | Low — current Anthropic call uses 4096 and has been working in production with real users. |
| A6 | OpenRouter's `HTTP-Referer` value can be a non-public hostname (`http://kainga-core.local`) without rejection | Q1 headers | Low — OpenRouter only requires the header to be present and a URL-shaped string for app-rankings purposes; it's not a CORS-style origin check. CONTEXT.md D-10 explicitly accepts this placeholder. |
| A7 | Privacy/logging policy is accurately summarized as "default ~30-day prompt logging at the upstream provider level, with opt-out via account toggle or `provider.zdr: true` body param" | "Project Constraints" section, Q10 risk #4 | Low for v1 (D-10 accepts default) but **flag for re-decision at PUBLIC-01**. The exact `/docs/features/privacy-and-logging` URL CONTEXT.md cited returned 404; current docs path is `/docs/guides/privacy/logging`. The policy summary is gathered from the working pages and a community blog (anarlog.so) — sufficient for D-10 acceptance but worth re-verifying if privacy posture ever tightens. |
| A8 | Planner-suggested commit slicing (2–3 commits: code / docs+README / spec patches) won't trip pre-commit hooks | "Implementation Summary" | Very low — project has no CI / no pre-commit hooks per `.planning/codebase/CONCERNS.md`. |
| A9 | Live npm/PyPI registry was NOT queried to verify `httpx`, `openai`, `anthropic` current versions in this session | Standard Stack | Very low — versions cited come from `backend/requirements.txt`. The phase doesn't add new deps, so registry-current versions are not required. |

---

## Open Questions

None blocking. All locked decisions in CONTEXT.md are achievable per the verified OpenRouter spec. The four `[ASSUMED]` items above (A2, A3, A6, A7) are low-risk and have safety nets (`_parse_json`, OpenRouter's tolerant request validation, D-10's explicit accept-default-logging stance).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.11+ | Backend runtime | ✓ (per Dockerfile / project lock) | 3.11-slim | None — locked stack |
| `httpx>=0.27.0` | OpenRouter HTTP calls | ✓ (in `backend/requirements.txt`) | `>=0.27.0` | None |
| `pydantic-settings 2.5.0` | Env-var parsing | ✓ (in `backend/requirements.txt`) | 2.5.0 | None |
| `OPENROUTER_API_KEY` env var | Auth to OpenRouter | ✗ (must be set by user; placeholder in `.env.example` after Phase 2) | — | Documented in README — first-run instruction |
| Network egress to `openrouter.ai:443` | Every moment-generation call | ✓ (assumed; existing project egresses to YouTube and previously to `api.anthropic.com`) | — | None — required dep |
| Docker (for kainga-core deploy) | Phase 5 / DEPLOY-01 | ✓ (existing `Dockerfile` + `docker-compose.yml`) | — | None |

**Missing dependencies with no fallback:** `OPENROUTER_API_KEY` is required and not bundled — README first-run instruction handles this.

**Missing dependencies with fallback:** None.

`[VERIFIED]` from `backend/requirements.txt` and existing `Dockerfile`. Live registry version checks deliberately skipped — no new deps being added.

---

## Validation Architecture

**Skipped per `.planning/config.json` `workflow.nyquist_validation: false`.** Manual smoke-test recipe is in Question 9. Phase 5 owns automated test infrastructure (TEST-01 / TEST-02). Per CONTEXT.md `<deferred>`, automated test coverage of the AI provider swap is explicitly out of scope for Phase 2.

---

## Security Domain

**Skipped per `.planning/config.json`** — `security_enforcement` key is not present in config (treat as default). For the record, the relevant security-adjacent items in this phase:

| Item | Disposition |
|------|-------------|
| API key handling | `OPENROUTER_API_KEY` flows from `.env` → Pydantic `Settings` → `Authorization: Bearer ...` header. Never logged. Same posture as the previous `ANTHROPIC_API_KEY`. |
| Input validation (V5 ASVS) | `_sanitize_input` strips control chars + caps at 200 chars. Existing helper, unchanged. Transcripts are truncated at 30k chars before send. |
| Output validation | `_parse_json` defensively handles markdown fences and partial JSON. Existing helper, unchanged. |
| TLS | `https://openrouter.ai` — `httpx` defaults to TLS verification. No need to opt out. |
| Privacy | Prompts (show names, transcript text) leave kainga-core for OpenRouter + upstream model. D-10 accepts default ~30-day logging. README documents this. |
| Secrets in logs | Mitigated by structured logger usage (`logger.warning` with format args, no `f"...{api_key}..."` strings). Pattern matches `youtube_service.py`. |

No new threats introduced by this phase that weren't present with the Anthropic SDK. No ASVS-level controls need adding.

---

## Sources

### Primary (HIGH confidence)

- **OpenRouter Quickstart** — https://openrouter.ai/docs/quickstart — base URL `https://openrouter.ai/api/v1`, header conventions, drop-in OpenAI-compat. Fetched 2026-05-05.
- **OpenRouter Create Chat Completion (full spec)** — https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request — endpoint, request body parameters (model, messages, max_tokens, temperature, response_format, etc.), response shape (`choices[0].message.content`), error body shape, message format. Fetched 2026-05-05.
- **OpenRouter API Parameters** — https://openrouter.ai/docs/api/reference/parameters — quoted "json_object" mode definition: *"Setting to `{ "type": "json_object" }` enables JSON mode, which guarantees the message the model generates is valid JSON"*; messages-must-instruct-JSON requirement. Fetched 2026-05-05.
- **OpenRouter API Errors and Debugging** — https://openrouter.ai/docs/api/reference/errors-and-debugging — full status code list (400/401/402/403/408/413/422/429/500/502/503), error body shape, retryability semantics. Fetched 2026-05-05.
- **OpenRouter App Attribution** — https://openrouter.ai/docs/app-attribution — HTTP-Referer is required for app rankings; X-OpenRouter-Title (current) / X-Title (back-compat) for display name. Fetched 2026-05-05.
- **OpenRouter Structured Outputs guide** — https://openrouter.ai/docs/guides/features/structured-outputs — model family support (OpenAI GPT-4o+, Anthropic Sonnet 4.5+, Opus 4.1+, Gemini, most open-source). Fetched 2026-05-05.
- **OpenRouter Rate Limits** — https://openrouter.ai/docs/api/reference/limits — free-model rate caps, 429 behavior, key-status endpoint. Fetched 2026-05-05.
- **Project files** — `backend/services/moment_generator.py`, `backend/services/youtube_service.py`, `backend/config.py`, `backend/routers/moments.py`, `backend/requirements.txt`, `.env.example`, `docker-compose.yml`, `Dockerfile`, `run.sh` `[VERIFIED via Read tool]`.
- **Project planning** — `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/config.json`, `.planning/phases/01-code-hygiene/01-CONTEXT.md`, `.planning/phases/02-ai-provider-flexibility/02-CONTEXT.md`, `.planning/phases/02-ai-provider-flexibility/02-DISCUSSION-LOG.md`, `.planning/codebase/{STACK,INTEGRATIONS,CONCERNS}.md` `[VERIFIED via Read tool]`.

### Secondary (MEDIUM confidence)

- **OpenRouter Provider Logging guide** — https://openrouter.ai/docs/guides/privacy/logging — referenced in WebSearch results; current canonical URL for privacy/logging policy. Direct fetch returned content for ZDR / opt-in mechanics; supplemented with WebSearch result for default-30-day phrasing.
- **OpenRouter Models guide** — https://openrouter.ai/docs/guides/overview/models — referenced for "300+ models" framing, provider-prefix convention.
- **WebSearch result on Claude Haiku 4.5 structured outputs** — citing Anthropic docs that Sonnet 4.5 / Opus 4.1 ship today, "Haiku 4.5 support is coming." Treat as MEDIUM until OpenRouter publishes per-model JSON-schema support matrix.
- **OpenRouter Zendesk article on rate limits** — https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know — supplementary detail on free-tier 429 behavior.

### Tertiary (LOW confidence — flag for validation)

- **`anarlog.so/blog/openrouter-data-retention-policy/`** — community blog cited in WebSearch for retention specifics. Cross-reference with the canonical `/docs/guides/privacy/logging` page if privacy posture ever tightens.
- **Janitor AI / 3rd-party error troubleshooting guides** — corroborated the 401/402/429 categorization but should not be treated as canonical.

---

## Metadata

**Confidence breakdown:**

- **Standard stack:** HIGH — `httpx` and `pydantic-settings` are in `requirements.txt` and used in production today.
- **OpenRouter request shape:** HIGH — verified against the canonical chat-completions API reference.
- **Error categories and retry policy:** HIGH — full status-code list verified against `errors-and-debugging`.
- **`response_format=json_object` support:** HIGH for OpenRouter accepting the parameter; MEDIUM per-upstream-model. Mitigated by `_parse_json` safety net per D-07.
- **Attribution headers:** HIGH — verified against `app-attribution` docs (with `X-OpenRouter-Title` as the current name and `X-Title` as back-compat).
- **Privacy/logging posture:** MEDIUM — current canonical URL is `/docs/guides/privacy/logging` (CONTEXT.md cited an older `/features/privacy-and-logging` URL that 404s). D-10's "accept defaults" decision stands regardless of policy phrasing details.
- **Code-existing-shape inventory:** HIGH — line counts and function signatures verified by direct Read.
- **Spec-patch Markdown:** HIGH — proposed before/after blocks are syntactically valid and quoted from the actual files.
- **Pitfalls:** HIGH on the structural pitfalls (auth/credit/rate-limit categorization, header naming); MEDIUM on the "free model 429 hard" pitfall (well-documented but severity varies by model and time of day).

**Research date:** 2026-05-05
**Valid until:** ~2026-06-05 (30 days — OpenRouter docs are stable but API additions are frequent; re-verify before Phase 5 if any of D-04/D-07/D-10 are revisited).

## RESEARCH COMPLETE
