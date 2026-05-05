---
phase: 02-ai-provider-flexibility
reviewed: 2026-05-05T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - backend/config.py
  - backend/requirements.txt
  - backend/services/moment_generator.py
  - docker-compose.yml
  - .env.example
  - README.md
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-05
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

The OpenRouter SDK swap is clean, well-scoped, and reads correctly. The HTTP client uses `httpx.AsyncClient` with sane connect/read timeouts (10s/60s), retry-once on a defensible set of transient statuses (408/429/500/502/503/504) and exception classes (`TimeoutException`, `ConnectError`, `RemoteProtocolError`), and honours OpenRouter's recommended attribution headers (`HTTP-Referer`, `X-Title`). Secret-handling in logs is genuinely careful: only the model name, status code, and exception class are logged on retry warnings — never the API key, prompt body, or response content. The README's explicit claim about logging matches the implementation.

Config drift between `backend/config.py`, `.env.example`, and `docker-compose.yml` is minor and self-consistent. The `anthropic` removal from `requirements.txt` is clean, and no leftover `anthropic`/`claude` references survive in `backend/`.

Two warnings worth addressing before this ships:

1. **Brittle response-shape access** — `res.json()["choices"][0]["message"]["content"]` will raise `KeyError`/`IndexError`/`TypeError` if OpenRouter returns a 200 with an error envelope or a malformed body, producing an opaque 500 ("'choices'") rather than a diagnostic one.
2. **No fail-fast on missing API key** — `openrouter_api_key` defaults to `""`, so the backend boots happily without a key and only fails when the first game is created (returning 500 and silently deleting the orphaned game). The README marks it "required" but nothing enforces that at startup.

The rest are info-level: dependency pinning inconsistency, an unguarded transcript injection surface, and JSON-mode support varying by upstream model.

## Warnings

### WR-01: Brittle response-shape access can mask OpenRouter error envelopes

**File:** `backend/services/moment_generator.py:137`
**Issue:** After `res.raise_for_status()` succeeds, the code does:

```python
return res.json()["choices"][0]["message"]["content"]
```

OpenRouter occasionally returns 200 OK with an error envelope (e.g., `{"error": {"code": "...", "message": "..."}}`) when an upstream provider fails in a way OpenRouter doesn't surface as a non-2xx. This path will raise `KeyError: 'choices'` or `IndexError` (empty list), which the caller in `routers/moments.py:36-40` catches as a generic `Exception`, deletes the game, and returns `HTTP 500: Failed to generate moments: 'choices'`. The user gets a cryptic error and the game is silently destroyed.

**Fix:** Validate the envelope before indexing and raise a more informative error that the caller's logger can capture meaningfully:

```python
res.raise_for_status()
data = res.json()
if "error" in data:
    err = data["error"]
    raise RuntimeError(
        f"OpenRouter returned error envelope: "
        f"{err.get('code', '?')} {err.get('message', '?')[:200]}"
    )
choices = data.get("choices") or []
if not choices or "message" not in choices[0]:
    raise RuntimeError(f"OpenRouter response missing choices: {str(data)[:200]}")
return choices[0]["message"].get("content", "")
```

This keeps the existing retry-once semantics intact (the validation only runs after `raise_for_status` returns cleanly) and gives operators a real error string to grep for.

### WR-02: No fail-fast validation of `OPENROUTER_API_KEY` at startup

**File:** `backend/config.py:5`
**Issue:** `openrouter_api_key: str = ""` defaults to an empty string. If `.env` is missing or the key is unset, the backend boots successfully, the frontend loads, and the user gets through game-creation flow before hitting a 401 from OpenRouter. The caller in `routers/moments.py:36-40` then catches the resulting exception, **deletes the just-created game**, and returns a 500. The user sees "Failed to generate moments: Client error '401 Unauthorized'..." and the game vanishes.

For a family-only app this is annoying but recoverable. Worth flagging because:
- The README explicitly says the key is "required" but nothing enforces it.
- The deletion-on-failure path destroys user-visible state for what is fundamentally a config error.
- A startup check costs nothing and turns a confusing runtime failure into a clear boot error.

**Fix:** Add a startup validator (in `backend/main.py` or as a Pydantic validator on `Settings`):

```python
# In backend/config.py
from pydantic import field_validator

class Settings(BaseSettings):
    openrouter_api_key: str = ""
    # ...

    @field_validator("openrouter_api_key")
    @classmethod
    def _key_present(cls, v: str) -> str:
        if not v or v.startswith("sk-or-v1-...") or "your-key-here" in v:
            raise ValueError(
                "OPENROUTER_API_KEY is unset or still the .env.example placeholder. "
                "Set it in .env — see README.md."
            )
        return v
```

If a stricter validator feels too aggressive for local dev (e.g., during tests), an alternative is a soft check in the FastAPI startup hook that logs a loud `logger.error(...)` once at boot and a clearer error message in the moments router when the key is empty (return 503 with "AI provider not configured" rather than 500).

## Info

### IN-01: Inconsistent dependency pinning style

**File:** `backend/requirements.txt:4`
**Issue:** All packages are pinned to exact versions (`==`) except `httpx>=0.27.0`. This is the only direct dep without an upper bound, which means a future `httpx==1.0` could ship a breaking change and silently break the build on the next `pip install -r`. The `anthropic` SDK previously pulled `httpx` transitively; now that it's a direct dep used for the OpenRouter call path, it deserves the same pinning treatment as the rest.

**Fix:**
```
httpx==0.27.2
```
Or use a compatible-release pin: `httpx~=0.27.0` (allows 0.27.x patch updates only).

### IN-02: Transcript content is interpolated directly into the prompt

**File:** `backend/services/moment_generator.py:172-176`
**Issue:** `YOUTUBE_PROMPT.format(transcripts=transcripts)` interpolates user-controlled YouTube transcript text directly into the system prompt. A malicious or unusual transcript could attempt prompt injection (e.g. instructing the model to disregard the surrounding instructions and emit attacker-chosen output). For a family-only app reading public YouTube transcripts, the practical risk is near-zero — the worst case is a slightly weird bingo card. Worth noting because:
- The 30k-char truncation (line 169) is for context-window cost, not safety.
- `response_format: {"type": "json_object"}` and the downstream `_parse_json` filter give some structural protection, but a sufficiently determined transcript could still produce garbage moments.

No action required for v1's family deployment. Flag if the surface is ever exposed beyond family.

### IN-03: `response_format: {"type": "json_object"}` support varies by upstream model

**File:** `backend/services/moment_generator.py:121`
**Issue:** The README's "Switching the AI model" table lists `meta-llama/llama-3.3-70b-instruct:free` and `google/gemini-2.5-flash` as supported. OpenRouter's JSON-mode support is uneven across providers — OpenAI and Anthropic models honour it; some Llama deployments and older Gemini versions do not, and OpenRouter's behaviour in those cases varies between "ignore the parameter" (returns prose with maybe-JSON inside) and "reject the request with 400". The fallback parser at `_parse_json` (lines 82-95) handles the first case (markdown fences and embedded JSON), so this is mostly self-mitigating.

**Fix:** Either (a) note in the README's model table which entries have native JSON mode and which rely on the parser fallback, or (b) leave as-is — the current code is resilient to both. The default (`openai/gpt-4o-mini`) supports it natively, so the happy path is fine. No code change required.

### IN-04: `docker-compose.yml` doesn't expose `HOST` / `PORT`, but README documents them

**File:** `docker-compose.yml:10-13`
**Issue:** The README's env-var table lists `HOST` and `PORT` as overridable. The `Dockerfile` sets `ENV HOST=0.0.0.0` and `ENV PORT=8000` as defaults. `docker-compose.yml` doesn't surface them in the `environment:` block, so an operator who reads only `docker-compose.yml` (not the Dockerfile) might not realise they can override them via `.env`. For Docker-deployed instances they're effectively pinned to the Dockerfile values unless someone adds them to compose.

This is not a bug — the values are correct for kainga-core's deployment — but it's a small drift between docs and config that could mildly confuse a future operator.

**Fix (optional):** Either add them to `docker-compose.yml` for symmetry:
```yaml
environment:
  - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
  - AI_MODEL=${AI_MODEL:-openai/gpt-4o-mini}
  - DATABASE_PATH=/app/data/bingo.db
  - HOST=${HOST:-0.0.0.0}
  - PORT=${PORT:-8000}
```
Or note in the README that `HOST` / `PORT` are dev-only knobs and Docker fixes them at `0.0.0.0:8000` (with the host port mapped via `8088:8000`). The latter matches reality more honestly.

---

_Reviewed: 2026-05-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
