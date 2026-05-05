# Phase 2: AI Provider Flexibility - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 02-ai-provider-flexibility
**Areas discussed:** Approach (provider architecture), Default model, Model env var, Failure handling, AI_PROVIDER, JSON mode, README scope, Spec amendment scope, OpenRouter privacy & headers

---

## Initial Gray-Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Client abstraction approach | Strategy pattern w/ separate clients vs unified OpenAI-compat vs LiteLLM. Covers prompt-caching/JSON parity. | |
| Default models per provider | Outdated current model. Defaults per provider, AI_MODEL required vs default. | |
| API key configuration | Separate keys per provider vs single AI_API_KEY vs both keys present. | |
| Failure & fallback behaviour | Fail loud vs retry vs fall back to other provider. | |

**User's choice:** Free-text "Other" — *"happy for paths of least resistance. or, just use openrouter if its more flexible — I may be able to run for free"*
**Notes:** Steered the discussion toward an OpenRouter-only simplification — not selecting from the listed options but reframing the entire approach. Surfaced a tension with the literal ROADMAP success criterion #2 ("`AI_PROVIDER=anthropic` preserves existing behaviour"). Required a follow-up architectural decision before drilling into sub-questions.

---

## Approach (Architecture)

| Option | Description | Selected |
|--------|-------------|----------|
| A — OpenRouter only | Single client, one key, drop Anthropic SDK. Simpler code, free models available. Rewrites criterion #2. | |
| B — Thin shim, both SDKs | Keep Anthropic SDK path, add OpenRouter alternative behind AI_PROVIDER. Matches spec literally. Two code paths. | |
| C — You decide | Pick whichever you think is cleaner given family-only context and cost-flexibility motivation. | ✓ |

**User's choice:** C — You decide
**Claude's resolution:** **A — OpenRouter only.** Rationale: PROJECT.md "cost flexibility, no single-vendor lock-in" is the real driver, OpenRouter delivers it more cleanly than a dual-SDK shim, family-only / kainga-core context doesn't need prompt-caching savings or SDK-level redundancy, Anthropic models stay reachable via `anthropic/*` model prefixes on OpenRouter.

---

## Default Model

| Option | Description | Selected |
|--------|-------------|----------|
| anthropic/claude-haiku-4.5 | Closest to current behaviour. Cheap (~$1/M input). Identical UX for Mum & Gordie. | |
| meta-llama/llama-3.3-70b-instruct:free | Free tier. Decent quality. $0 ongoing if credits hold. Rate-limited. | |
| openai/gpt-4o-mini | Cheap (~$0.15/M input), reliable, strong native JSON output. Different vibe from Claude but solid. | ✓ |

**User's choice:** openai/gpt-4o-mini
**Notes:** Chose reliability + native JSON support over Claude-family continuity. Phase 2 README will document `AI_MODEL` override examples for users who want to switch (including the free Llama option for $0 ongoing).

---

## Model Env Var Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Sensible default, override via env | If AI_MODEL unset, use default. .env.example shows default commented. App works once OPENROUTER_API_KEY is set. | ✓ |
| Required — fail at startup if missing | Pydantic validation raises on startup. Forces explicit choice. More friction. | |

**User's choice:** Sensible default, override via env
**Notes:** Aligns with "path of least resistance" steering. New developer or new install only needs `OPENROUTER_API_KEY` to get going.

---

## Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fail loud (current behaviour) | 500 to client, error logged. No fallback complexity. Family-LAN scale = OK. | |
| Retry once on the same model | Transient errors get one retry with backoff. Then fail loud. Catches network blips. | ✓ |
| Fall back to a second model | Hardcoded backup model if primary fails. More branching, more tests. Probably overkill for v1. | |

**User's choice:** Retry once on the same model
**Notes:** Mid-ground. Catches OpenRouter's occasional 5xx/timeout without complicating the data path. Don't retry on 4xx (auth/bad-request).

---

## AI_PROVIDER Env Var

| Option | Description | Selected |
|--------|-------------|----------|
| Drop it | Under OpenRouter-only there's only one provider. AI_MODEL alone is enough. | ✓ |
| Keep as documented constant | AI_PROVIDER=openrouter documented for future provider abstraction. | |

**User's choice:** Drop it
**Notes:** Final env contract: `OPENROUTER_API_KEY` (required) + `AI_MODEL` (optional, defaults to `openai/gpt-4o-mini`). `ANTHROPIC_API_KEY` is removed.

---

## JSON Output Mode

| Option | Description | Selected |
|--------|-------------|----------|
| response_format=json_object | OpenRouter supports it natively for gpt-4o-mini and most OpenAI/Anthropic models. Cleaner code. | ✓ |
| Prompt-driven (current behaviour) | "Respond ONLY with JSON" in prompt. Works on every model. Slightly brittle. | |
| Both — try JSON mode, fall back | Detect at runtime via try/except. More code, seamless model swapping. | |

**User's choice:** response_format=json_object
**Notes:** Native JSON mode + keep `_parse_json` helper as safety net for any model that ignores the directive.

---

## README Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Thin — env vars + run instructions | Project one-liner, env table, ./run.sh, link to PROJECT.md. ~30 lines. | |
| Medium — add dev setup + model swap examples | Above + venv, npm install, AI_MODEL examples, verification steps. ~80 lines. | |
| Full — includes deploy notes for kainga-core | Above + Docker build/run, deploy steps, troubleshooting. Risks duplicating Phase 5 DEPLOY-01. | ✓ |

**User's choice:** Full — includes deploy notes for kainga-core
**Notes:** Conscious choice; flagged Phase 5 DEPLOY-01 risk. Deferred Ideas section in CONTEXT.md notes that Phase 5 should consume/extend rather than rewrite.

---

## Spec Amendment Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal patch — strikethrough + note | Dated note: "~~AI-01: ...~~ → Amended in Phase 2 discuss: single-client via OpenRouter." Audit trail visible. | ✓ |
| Full rewrite | Rewrite AI-01/AI-02 + criteria cleanly. Loses audit trail in file. | |
| Both — rewrite + log in PROJECT.md Key Decisions | Cleanest spec + clean audit trail in Decisions table. | |

**User's choice:** Minimal patch — strikethrough + note
**Notes:** Strikethrough applies to REQUIREMENTS.md AI-01/AI-02 and ROADMAP Phase 2 success criteria. PROJECT.md "Key Decisions" table also gets a single-line outcome update on the "Multi-provider AI" row (Claude's discretion to keep concise).

---

## OpenRouter Privacy & Headers

| Option | Description | Selected |
|--------|-------------|----------|
| Send HTTP-Referer + X-Title, accept default logging | App attribution helpful (irrelevant for private but harmless). 30-day prompt logging — family bingo content low-sensitivity. Path of least resistance. | ✓ |
| Skip attribution, set X-OR-Datapolicy: no_logging | Tighter privacy, aligns with PROJECT.md "all data on kainga-core". Some models reject no-log. | |
| Both layered — attribution + no-logging | Belt and braces. | |

**User's choice:** Send HTTP-Referer + X-Title, accept default logging
**Notes:** `HTTP-Referer: http://kainga-core.local` (placeholder until DEPLOY-01 confirms final URL) + `X-Title: TV Series Bingo`. Family-only context = bingo moments are low-sensitivity per PROJECT.md privacy framing.

---

## Claude's Discretion

Items where the user delegated implementation choice to Claude:
- Architecture choice (Approach C → resolved to A)
- Exact retry backoff timing (suggest 500ms; planner can tune)
- Exact wording of OpenRouter API error → user-facing 500 message
- Whether to extract `_call_openrouter()` helper or inline twice (lean toward extract)
- Commit-slice strategy (planner decides; suggest 2–3 commits: code / docs / spec)
- Use of `httpx.AsyncClient` over sync (matches established async pattern in `youtube_service.py`)
- Drop Anthropic-specific `cache_control: ephemeral` (not OpenRouter-supported)
- One-line outcome note in PROJECT.md Key Decisions (concise format)

## Deferred Ideas

Captured in CONTEXT.md `<deferred>`:
- Phase 5 DEPLOY-01 should consume/extend Phase 2's README, not rewrite
- Smoke test for AI provider swap → Phase 5 territory
- Anthropic SDK as fallback → v2
- `X-OR-Datapolicy: no_logging` → revisit if PUBLIC-01 milestone happens
- Model auto-optimizer → already deferred in PROJECT.md as `AI-V2-01`
- AI_MODEL whitelist validation → out of scope
- HTTP-Referer placeholder URL → Phase 5 can update post-deploy
- README badges, screenshots, CONTRIBUTING, LICENSE → no public release for v1
