# Phase 2: AI Provider Flexibility - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 9 (6 modified code/config + 3 spec patches + 1 new)
**Analogs found:** 7 / 9 (2 are spec-amendment style with no in-repo precedent yet, 1 is green-field README)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/services/moment_generator.py` | service | request-response | `backend/services/youtube_service.py` (httpx async pattern) + self (helpers/sanitiser/store stay) | exact (httpx context-mgr style) |
| `backend/config.py` | config | env-load | self (existing `anthropic_api_key` field is the precedent for the new `openrouter_api_key` field) | exact |
| `backend/requirements.txt` | config | dep-pin | self (line-level deletion only) | exact |
| `.env.example` | config | env-template | self (single-line `KEY=value` precedent) | exact |
| `docker-compose.yml` | config | env-passthrough | self (existing `ANTHROPIC_API_KEY` env line is the swap target) | exact |
| `.planning/REQUIREMENTS.md` | spec patch | doc-amendment | none (D-09 establishes the strikethrough convention here for the first time) | green-field convention |
| `.planning/ROADMAP.md` | spec patch | doc-amendment | none (same as above — D-09 first use) | green-field convention |
| `.planning/PROJECT.md` | spec patch | doc-amendment | none (same as above — single-line outcome update) | green-field convention |
| `README.md` (new, root) | doc | green-field | none (no root README exists; `frontend/README.md` is Vite default, not project-level) | no analog |

---

## Pattern Assignments

### `backend/services/moment_generator.py` (service, request-response)

**Primary analog:** `backend/services/youtube_service.py` (for the new httpx OpenRouter client)
**Secondary analog:** Self — `_parse_json` (lines 74–87), `_sanitize_input` (lines 90–94), `_store_moments` (lines 149–170), `get_moments` (lines 173–182) all stay unchanged.

#### Imports pattern (current state — `moment_generator.py` lines 1-8)

```python
import json
import re
import uuid

import anthropic

from backend.config import settings
from backend.database import get_db
```

**Action:** Replace `import anthropic` with `import asyncio` + `import logging` + `import httpx`. Add `logger = logging.getLogger(__name__)` after the imports, mirroring `youtube_service.py:9` (`logger = logging.getLogger(__name__)`).

#### Async httpx client pattern (analog: `youtube_service.py` lines 52-62)

```python
async def lookup_by_video_url(url: str) -> dict:
    """Resolve a video URL to its channel + recent videos via oEmbed."""
    async with httpx.AsyncClient(headers=_HEADERS, timeout=15, follow_redirects=True) as client:
        res = await client.get(
            "https://www.youtube.com/oembed",
            params={"url": url, "format": "json"},
        )
        if res.status_code != 200:
            return {"channel_name": "", "channel_url": "", "videos": []}

        data = res.json()
```

**Apply to OpenRouter:** per-call context-managed `httpx.AsyncClient` (NOT a long-lived module-level client). Different headers (build inline in `_call_openrouter`, do NOT share `_HEADERS`). Different timeout — use `httpx.Timeout(60.0, connect=10.0)` (chat completion is a long operation; 15s is too tight). Different error handling — `youtube_service.py` returns empty defaults on failure; OpenRouter helper must categorize errors and retry once on transient.

#### Logger pattern (analog: `youtube_service.py` lines 2, 9, 43)

```python
import logging

logger = logging.getLogger(__name__)

# usage at line 43:
logger.warning("Transcript unavailable for %s: %s", video_id, type(e).__name__)
```

**Apply to OpenRouter:** Use the same `logging.getLogger(__name__)` pattern. Use `%`-style format args (NOT f-strings) so the API key can never accidentally be interpolated into a log message. Log: `settings.ai_model`, retry attempt number, error category. Never log: bearer token, full prompt body, response content.

#### Anthropic-specific code to REMOVE (current `moment_generator.py` lines 99-117)

```python
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    system=[
        {
            "type": "text",
            "text": SYSTEM_PROMPT + "\n\nRespond ONLY with the JSON object, no other text.",
            "cache_control": {"type": "ephemeral"},
        }
    ],
    messages=[
        {
            "role": "user",
            "content": f"Generate bingo moments for the TV show: {show_name}",
        }
    ],
)

result = _parse_json(response.content[0].text)
```

**And the second callsite** (lines 130-145):

```python
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

prompt = YOUTUBE_PROMPT.format(transcripts=transcripts) + "\n\nRespond ONLY with the JSON object, no other text."

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    messages=[
        {
            "role": "user",
            "content": prompt,
        }
    ],
)

result = _parse_json(response.content[0].text)
```

**Both callsites** collapse to a single `await _call_openrouter(messages)` call. Drop the hardcoded `claude-sonnet-4-20250514` model literal, drop `cache_control: ephemeral`, drop `response.content[0].text` (OpenAI shape is `data["choices"][0]["message"]["content"]`).

#### NEW `_call_openrouter` helper (composed from RESEARCH.md lines 447-506; verbatim)

Insert after `_sanitize_input` (after current line 94) so it sits before the two callers. Suggested module-level constants near the top of the file (after the `import` block) for `OPENROUTER_URL`, `TRANSIENT_STATUS`, `TRANSIENT_EXC` — keeps the helper body lean.

```python
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

#### Simplified callsite functions (RESEARCH.md lines 511-540 — verbatim)

Replace `generate_moments_for_show` (current lines 97-120) with:

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
```

Replace `generate_moments_from_transcripts` (current lines 123-146) with:

```python
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

**Note on `source_name` parameter:** kept in the signature for caller-compatibility (`backend/routers/moments.py:25` passes it). Currently unused inside the function — that's pre-existing behaviour; leave as-is to keep the diff small.

#### Stays UNTOUCHED

- `SYSTEM_PROMPT` constant (lines 10-25)
- `YOUTUBE_PROMPT` constant (lines 27-47)
- `MOMENT_SCHEMA` constant (lines 49-71) — unused after this phase too; safe to leave
- `_parse_json` (lines 74-87) — D-07 safety net
- `_sanitize_input` (lines 90-94)
- `_store_moments` (lines 149-170)
- `get_moments` (lines 173-182)

---

### `backend/config.py` (config, env-load)

**Analog:** Self — current `anthropic_api_key` field demonstrates the exact pattern for the new fields.

**Current state** (verbatim, lines 1-13):

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    database_path: str = "bingo.db"
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
```

**Target state** (RESEARCH.md lines 544-559 — verbatim):

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

**Diff:** delete line 5 (`anthropic_api_key: str = ""`); insert two replacement lines (`openrouter_api_key: str = ""` and `ai_model: str = "openai/gpt-4o-mini"`). Pydantic-settings 2.x is case-insensitive by default — `OPENROUTER_API_KEY` env var maps to `openrouter_api_key` field automatically (same mechanism as the existing `ANTHROPIC_API_KEY` ↔ `anthropic_api_key`).

**Caller verification:** `grep -rn "anthropic_api_key" backend/` returns three hits — `config.py:5` and two callsites in `moment_generator.py:99,130`. All three are removed in this phase. After the change, `grep -rn "anthropic" backend/` should return zero hits.

---

### `backend/requirements.txt` (config, dep-pin)

**Analog:** Self.

**Current state** (verbatim, lines 1-8):

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
aiosqlite==0.20.0
anthropic==0.94.0
httpx>=0.27.0
youtube-transcript-api==1.2.4
pydantic==2.9.0
pydantic-settings==2.5.0
```

**Action:** Delete line 4 (`anthropic==0.94.0`). No additions — `httpx>=0.27.0` is already line 5. Final file is 7 lines.

---

### `.env.example` (config, env-template)

**Analog:** Self.

**Current state** (verbatim, single line):

```
ANTHROPIC_API_KEY=sk-ant-...your-key-here
```

**Target state** (RESEARCH.md lines 564-572 — verbatim):

```bash
# OpenRouter API key — required. Get one at https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-...your-key-here

# AI model override (optional). Defaults to openai/gpt-4o-mini if unset.
# Examples:
#   AI_MODEL=openai/gpt-4o-mini                       # default — cheap, reliable JSON
#   AI_MODEL=anthropic/claude-haiku-4.5                # Claude family
#   AI_MODEL=meta-llama/llama-3.3-70b-instruct:free    # free tier (rate-limited)
```

**Diff:** Replace the single existing line with the 9-line block above.

**Local `.env` working-tree note** (per RESEARCH.md Pitfall 7, lines 417-427): The user's local `.env` is gitignored and not modified by the commit. PLAN.md must include a one-line user-action note: "After pulling Phase 2: edit local `.env` — remove `ANTHROPIC_API_KEY`, add `OPENROUTER_API_KEY=sk-or-v1-...`, optionally add `AI_MODEL=...`."

---

### `docker-compose.yml` (config, env-passthrough)

**Analog:** Self.

**Current state** (verbatim, lines 1-17):

```yaml
services:
  tv-bingo:
    build: .
    container_name: tv-bingo
    restart: unless-stopped
    ports:
      - "8088:8000"
    volumes:
      - bingo-data:/app/data
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATABASE_PATH=/app/data/bingo.db
    networks:
      - default

volumes:
  bingo-data:
```

**Target state** (RESEARCH.md lines 576-581 — env block only):

```yaml
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - AI_MODEL=${AI_MODEL:-openai/gpt-4o-mini}
      - DATABASE_PATH=/app/data/bingo.db
```

**Diff scope:** Only line 11 changes (`ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}` → two lines: `OPENROUTER_API_KEY=${OPENROUTER_API_KEY}` and `AI_MODEL=${AI_MODEL:-openai/gpt-4o-mini}`). The `${VAR:-default}` shell-expansion pattern lets the env var override the default while still working out-of-the-box if unset. Lines 1-10 and 12-17 unchanged.

---

### `.planning/REQUIREMENTS.md` (spec patch, doc-amendment)

**Analog:** None — D-09 establishes the strikethrough convention here for the first time. Use the GFM strikethrough idiom from RESEARCH.md Q7.

**Current state** (verbatim, lines 22-23):

```markdown
- [ ] **AI-01**: Provider-agnostic AI client supporting Anthropic *and* OpenRouter for moment generation; same `generate_moments_*` interface, swap behind config
- [ ] **AI-02**: Config-driven provider and model selection via env vars (e.g. `AI_PROVIDER=anthropic|openrouter`, `AI_MODEL=...`) with sensible defaults; surfaced in `.env.example` and README
```

**Target state** (RESEARCH.md lines 750-751 — verbatim):

```markdown
- [ ] **AI-01**: ~~Provider-agnostic AI client supporting Anthropic *and* OpenRouter for moment generation; same `generate_moments_*` interface, swap behind config~~ → **Amended 2026-05-05 in Phase 2 discuss:** Single-client via OpenRouter for moment generation; Anthropic models stay reachable via `anthropic/*` model prefix on OpenRouter; same `generate_moments_*` interface preserved.
- [ ] **AI-02**: ~~Config-driven provider and model selection via env vars (e.g. `AI_PROVIDER=anthropic|openrouter`, `AI_MODEL=...`) with sensible defaults; surfaced in `.env.example` and README~~ → **Amended 2026-05-05 in Phase 2 discuss:** Config-driven model selection via `AI_MODEL` env var (default `openai/gpt-4o-mini`); `OPENROUTER_API_KEY` required; surfaced in `.env.example` and README. `AI_PROVIDER` dropped — model name embeds the provider on OpenRouter.
```

**Convention idiom (for any future spec patches):** `~~old text~~ → **Amended YYYY-MM-DD in Phase N discuss:** new text.` GFM strikethrough wraps the entire original sentence (NOT individual words inside `**bold**` — RESEARCH.md Pitfall 8 calls out the nesting hazard). The arrow + dated note follows on the same line.

---

### `.planning/ROADMAP.md` (spec patch, doc-amendment)

**Analog:** Same convention as REQUIREMENTS.md above.

**Current state** (verbatim, lines 38-46):

```markdown
### Phase 2: AI Provider Flexibility
**Goal**: Moment generation works with either Anthropic or OpenRouter; provider is swapped via env var with no code changes
**Depends on**: Phase 1
**Requirements**: AI-01, AI-02
**Success Criteria** (what must be TRUE):
  1. Setting `AI_PROVIDER=openrouter` in `.env` routes all moment generation through OpenRouter without code changes
  2. Setting `AI_PROVIDER=anthropic` (or no setting) routes through Anthropic — existing behaviour preserved
  3. `.env.example` documents `AI_PROVIDER` and `AI_MODEL` with sensible defaults; README explains the switch
**Plans**: TBD
```

**Target state** (success criteria only — RESEARCH.md lines 768-771 — verbatim):

```markdown
**Success Criteria** (what must be TRUE):
  1. ~~Setting `AI_PROVIDER=openrouter` in `.env` routes all moment generation through OpenRouter without code changes~~ → **Amended 2026-05-05 (Phase 2 discuss):** With `OPENROUTER_API_KEY` set and `AI_MODEL` unset, moment generation works using the default model (`openai/gpt-4o-mini`).
  2. ~~Setting `AI_PROVIDER=anthropic` (or no setting) routes through Anthropic — existing behaviour preserved~~ → **Amended 2026-05-05 (Phase 2 discuss):** Setting `AI_MODEL=anthropic/claude-haiku-4.5` (or any OpenRouter model string) routes moment generation through that model with no code changes.
  3. ~~`.env.example` documents `AI_PROVIDER` and `AI_MODEL` with sensible defaults; README explains the switch~~ → **Amended 2026-05-05 (Phase 2 discuss):** `.env.example` documents `OPENROUTER_API_KEY` (required) and `AI_MODEL` (optional, default shown). Root `README.md` explains the model switch and lists example values including free models (e.g. `meta-llama/llama-3.3-70b-instruct:free`).
```

**Note:** Goal line (line 39) and Phase 2 list-item heading (line 16: `- [ ] **Phase 2: AI Provider Flexibility** - Multi-provider AI client...`) are NOT amended — only the three numbered success criteria. CONTEXT.md D-06/D-09 only call out the three success criteria. (Claude's discretion: planner may also patch line 16 for consistency, but D-09 doesn't require it.)

---

### `.planning/PROJECT.md` (spec patch, doc-amendment)

**Analog:** Same strikethrough convention, but a single-line outcome update on a table cell (no full-sentence strikethrough — D-08 says "single-line outcome note").

**Current state** (verbatim, line 86):

```markdown
| Multi-provider AI (Anthropic + OpenRouter) | Cost flexibility, no single-vendor lock-in, easy config-driven switch | — Pending |
```

**Target state** (RESEARCH.md line 785 — verbatim):

```markdown
| Multi-provider AI (Anthropic + OpenRouter) | Cost flexibility, no single-vendor lock-in, easy config-driven switch | — Pending → Refined 2026-05-05 to OpenRouter-only with model-level provider routing (Phase 2 D-01). |
```

**Diff scope:** Only the third table cell of line 86 changes. The Decision and Rationale columns stay as-is so the historical context remains visible.

**Note on PROJECT.md line 35:** `- [ ] **Multi-provider AI** — config-selectable between Anthropic and OpenRouter; preserves cost flexibility and removes single-vendor dependency` is NOT amended per CONTEXT.md scope (only the Key Decisions row gets the outcome note). If the planner wants symmetry, that's Claude's discretion — but D-08 explicitly says "single-line outcome note in Key Decisions table", so leave line 35 untouched.

---

### `README.md` (new, root) — green-field, no analog

**No analog in repo.** No root README exists today (`ls README.md` returned `No such file or directory`). `frontend/README.md` is the Vite scaffold default and is unrelated to project-level docs.

**Reference:** Use the README outline from RESEARCH.md Q8 (lines 796-879) verbatim as the structural template. Sections in order:

1. Title + one-sentence blurb (use PROJECT.md line 5 phrasing)
2. Quick start (4-step list)
3. Environment variables (5-row table: `OPENROUTER_API_KEY`, `AI_MODEL`, `DATABASE_PATH`, `HOST`, `PORT`)
4. Switching the AI model (4-row example table including the `:free` Llama option for $0/month)
5. Verifying the model is being used
6. Development setup (Python 3.11+, Node.js 20+, venv + npm + `./run.sh`)
7. Deploying to kainga-core (Docker build/run, env file location, port mapping `8088:8000`)
8. Project shape (Backend / Frontend / AI / Multiplayer one-liners)

**Verified facts to embed in the README** (so the executor doesn't re-discover):

- `./run.sh` exists and starts uvicorn on `:8000` (verified at `run.sh:40`).
- `docker-compose.yml` maps host `8088` → container `8000` (verified at `docker-compose.yml:7`).
- The Dockerfile is multi-stage: Node 20 builds frontend, Python 3.11-slim serves API + SPA (verified — `Dockerfile` exists per `ls`).
- The OpenRouter free-model warning per RESEARCH.md Pitfall 2 (lines 357-367): `:free` models are rate-limited at peak — README documents them as a $0 cost-flexibility option, not a primary default.
- The privacy concession per RESEARCH.md Q10 risk #4 (line 944): "AI moment generation sends the show name (or YouTube transcript text) to OpenRouter and the configured upstream provider. No game state or player data is sent." This is the one privacy concession in v1 and the README should be explicit about it.

**Out of scope per CONTEXT.md `<deferred>`:** badges, screenshots, CONTRIBUTING.md, LICENSE.

---

## Shared Patterns

### Logging (no API key, no full prompt, no response body)

**Source:** `backend/services/youtube_service.py:2,9,43`

```python
import logging

logger = logging.getLogger(__name__)

# Format-args style (NEVER f-strings with sensitive vars):
logger.warning("Transcript unavailable for %s: %s", video_id, type(e).__name__)
```

**Apply to:** `_call_openrouter` retry warnings. Use `%`-format args. Log fields: `settings.ai_model`, `attempt`, `res.status_code`, `type(e).__name__`. Never log: bearer token, prompt body, response choices.

### Async-by-default

**Source:** `backend/services/moment_generator.py:97,123,149,173` and `backend/services/youtube_service.py:52,80,97`

All public service-layer functions are `async def`. The new `_call_openrouter` helper must be `async def`; both existing public callers (`generate_moments_for_show`, `generate_moments_from_transcripts`) are already async. `backend/routers/moments.py:13` uses `await` on both functions — signatures must stay `async def` to keep the caller working.

### Pydantic Settings env-load

**Source:** `backend/config.py:1-13`

Snake-case field name + uppercase env var. Empty-string default for required-but-not-bundled keys (matches the existing `anthropic_api_key: str = ""` pattern). Sensible default for optional keys (matches `database_path: str = "bingo.db"`). `model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}` stays — it's the project-wide loader pattern.

### Caller signature stability

**Source:** `backend/routers/moments.py:25,29,33`

```python
moments = await moment_generator.generate_moments_from_transcripts(
    game_id, body.source_name, transcripts
)
# ...
moments = await moment_generator.generate_moments_for_show(
    game_id, body.source_name
)
# ...
moments = await moment_generator.generate_moments_for_show(game_id, body.source_name)
```

**Apply to:** Both rewritten functions in `moment_generator.py` MUST keep identical positional signatures: `generate_moments_for_show(game_id: str, show_name: str)` and `generate_moments_from_transcripts(game_id: str, source_name: str, transcripts: str)`. The caller's exception handler at `backend/routers/moments.py:34-40` already converts any service-layer exception to `HTTPException(500, ...)` — `_call_openrouter` should rely on this, NOT add its own try/except for non-transient errors.

### Conventional Commits

**Source:** project-wide convention per CONTEXT.md `<code_context>` "Established Patterns" (line 105) — recent log shows `feat(...)`, `fix(...)`, `chore(...)` prefixes.

**Suggested commit subjects** (CONTEXT.md offers these):
- `feat(ai): swap Anthropic SDK for OpenRouter` — code commit
- `docs(readme): add root README with deploy notes` — README commit
- `docs(spec): amend AI-01/AI-02 to OpenRouter-only` — spec-patch commit

Planner decides 2-vs-3 commit slicing per CONTEXT.md `<decisions>` "Claude's Discretion".

### GFM strikethrough idiom (NEW convention, established by D-09)

```markdown
~~original text~~ → **Amended YYYY-MM-DD in Phase N discuss:** new text.
```

**Apply to:** All three spec patches (REQUIREMENTS.md, ROADMAP.md, PROJECT.md). PROJECT.md uses a lighter variant (no full strikethrough, just `→ Refined YYYY-MM-DD ...` appended in the table cell) per D-08 "single-line outcome note".

**Hazard:** RESEARCH.md Pitfall 8 (lines 429-439) — don't nest `~~` inside `**bold**`. Wrap the whole original sentence outside any bold/italic, then add the dated note after the arrow with its own bold formatting.

---

## No Analog Found

| File | Role | Reason | Substitute Reference |
|------|------|--------|----------------------|
| `README.md` (new, root) | doc | No root README exists; project is brownfield with no doc-writing precedent | RESEARCH.md Q8 (lines 796-879) — full outline; CONTEXT.md D-08 — section requirements |
| `.planning/REQUIREMENTS.md` (spec patch) | doc-amendment | D-09 establishes the strikethrough convention here for the first time; Phase 1 had no spec amendments | RESEARCH.md Q7 (lines 738-789) — exact before/after Markdown verbatim |
| `.planning/ROADMAP.md` (spec patch) | doc-amendment | Same as above | RESEARCH.md Q7 (lines 754-771) |
| `.planning/PROJECT.md` (spec patch) | doc-amendment | Same as above (single-line variant) | RESEARCH.md Q7 (lines 776-786) |

For these four files the executor relies on RESEARCH.md's verbatim before/after blocks rather than an in-repo analog.

---

## Metadata

**Analog search scope:** `backend/services/`, `backend/routers/`, `backend/`, repo root, `.planning/phases/01-code-hygiene/`.
**Files scanned (Read or Grep):** `backend/services/moment_generator.py`, `backend/services/youtube_service.py`, `backend/config.py`, `backend/main.py`, `backend/routers/moments.py`, `backend/requirements.txt`, `.env.example`, `docker-compose.yml`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` (lines 35-54), `.planning/PROJECT.md` (lines 80-89), `.planning/phases/01-code-hygiene/01-CONTEXT.md` (grep — no strikethrough precedent confirmed).
**Pattern extraction date:** 2026-05-05
**Net diff estimate** (per RESEARCH.md line 603): ~−40 / +40 lines on `moment_generator.py`; ~+15 lines across config files; ~+80 lines on the new README; ~+6 lines of strikethrough additions on the three spec files.
