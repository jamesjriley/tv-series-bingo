---
phase: 02-ai-provider-flexibility
plan: 03
subsystem: docs
tags: [docs, readme, deploy-notes, kainga-core, env-contract, atomic-commit, onboarding]
requirements: [AI-01, AI-02]
dependencies:
  requires: [Plan 02-01 — feat(ai) commit 191497e in chain]
  provides:
    - "First root README.md in the project's history — single canonical onboarding doc"
    - "User-facing surface for the OpenRouter env contract (OPENROUTER_API_KEY + AI_MODEL)"
    - "Documented model-switch mechanic with 4 concrete examples including $0/month free tier"
    - "Documented privacy concession (prompts → OpenRouter + upstream provider, ~30-day logging)"
    - "kainga-core deploy story (docker-compose build/up, port 8088:8000, kainga-core.local)"
    - "Phase 5 / DEPLOY-01 extension hook — Deploy section is structurally extensible (D-08)"
  affects:
    - "README.md (NEW, root) — first time the project has a top-level README"
tech-stack:
  added: []
  removed: []
  patterns:
    - "GFM markdown — H1 title + H2 sections + tables + fenced code blocks + blockquote warning"
    - "Documented env vars match backend/config.py Settings field shape exactly"
    - "Quick-start uses cp .env.example .env idiom established in the project"
key-files:
  created:
    - README.md
    - .planning/phases/02-ai-provider-flexibility/02-03-SUMMARY.md
  modified: []
decisions:
  - "Single root README — not split README + CONTRIBUTING + DEPLOY (family-only project; deferred per CONTEXT.md)"
  - "Privacy section is mandatory and explicit per D-10 + RESEARCH.md Q10 risk #4 — prompts leave kainga-core, family-LAN otherwise self-contained"
  - "Default model openai/gpt-4o-mini called out twice (env table + model table) so the swap-default is unambiguous"
  - "Free model :free variant warning included verbatim per RESEARCH.md Pitfall 2 — rate-limited at peak, experimental, not primary"
  - "Phase 5 extension hook documented in plan but NOT inlined in README — extension is structural (Deploy section can grow), not annotated"
  - "Placeholder pattern is sk-or-v1-<your-key> — angle brackets + single-word marker, easy grep-clearance for real-key leak detection"
metrics:
  commit: 28f04e8
  commit_subject: "docs(readme): add root README with deploy notes"
  files_changed: 1
  insertions: 98
  deletions: 0
  net_diff: "+98 (pure addition — first root README)"
  tasks_completed: 2
  duration: ~3min
  completed_date: 2026-05-05
---

# Phase 2 Plan 03: Root README with Deploy Notes — Summary

The first root `README.md` in the project's history landed in one atomic `docs(readme)` commit. Nine D-08-mandated sections in order: title+blurb, quick start, environment variables, switching the AI model, verifying the model is being used, privacy, development setup, deploying to kainga-core, project shape. Documents the OpenRouter env contract (`OPENROUTER_API_KEY` + `AI_MODEL` default `openai/gpt-4o-mini`), four concrete model examples including the $0/month `:free` variant, the privacy concession (prompts egress OpenRouter + upstream provider with default ~30-day logging), and the kainga-core docker-compose deploy procedure (port 8088 → 8000, `kainga-core.local`). 98 lines, 5.6KB, no real keys leaked, no deferred items inlined.

## What Got Built

### `README.md` (NEW, root) — 98 lines, 5.6KB

**Section 1: Title + blurb.** `# TV Series Bingo` + family-only / kainga-core / not-public blockquote per CLAUDE.md hard constraints + a one-paragraph "what the app actually does" extension (multiplayer, AI generates 24 moments, mark squares, first to a line wins) for first-time readers.

**Section 2: Quick start.** 4 numbered steps per D-08: get OpenRouter key → cp .env.example .env + set OPENROUTER_API_KEY → ./run.sh → open http://localhost:5173. Uses the `sk-or-v1-<your-key>` placeholder format (clearly fake, grep-distinguishable from real `sk-or-v1-...{73+ chars}`).

**Section 3: Environment variables.** 5-row table covering `OPENROUTER_API_KEY` (required), `AI_MODEL` (optional, default openai/gpt-4o-mini), `DATABASE_PATH` (default bingo.db, overridden in Docker to /app/data/bingo.db), `HOST` (0.0.0.0), `PORT` (8000). Matches `backend/config.py` Settings field shape exactly.

**Section 4: Switching the AI model.** Explains the OpenRouter model-name-prefix-as-provider conceptual shift, then a 4-row table:
- `openai/gpt-4o-mini` (default) — ~$0.15/M input, native JSON
- `anthropic/claude-haiku-4.5` — ~$1/M input, closest to original behaviour
- `meta-llama/llama-3.3-70b-instruct:free` — $0/month, rate-limited
- `google/gemini-2.5-flash` — varies, fourth provider example

Closed by the verbatim RESEARCH.md Pitfall 2 blockquote: "OpenRouter's `:free` model variants apply per-minute and per-day rate caps that bite during peak hours. The app retries once on transient errors but won't survive sustained 429 rate-limiting. Use the free tier as a $0/month experiment, not as a primary production path."

**Section 5: Verifying the model is being used.** Explains the quiet-success / warning-on-retry log pattern from Plan 02-01's `_call_openrouter` helper, with a real example log line, and the OpenRouter dashboard activity URL (`https://openrouter.ai/activity`) as an external verification path. Notes the never-logged secrets (API key, prompt body, response body).

**Section 6: Privacy.** Explicit privacy concession per D-10 + RESEARCH.md Q10 risk #4: prompts (show name + YouTube transcript text) leave kainga-core for OpenRouter and the upstream provider; OpenRouter applies default ~30-day logging; nothing else (game state, players, scores, sessions, chat) egresses; this is the *one* external data path in v1; AI prompts are low-sensitivity (TV-show names + already-public YouTube transcripts).

**Section 7: Development setup.** Python 3.11+ + Node 20+. Standard venv → pip install → npm install → `./run.sh` flow, with the note that `./run.sh` handles venv + npm install on first run.

**Section 8: Deploying to kainga-core.** Family-only / LAN / Tailscale framing per CLAUDE.md. Docker procedure: `git pull` → `cp .env.example .env` (edit OPENROUTER_API_KEY) → `docker-compose build` → `docker-compose up -d`. Reachable at `http://kainga-core.local:8088`. Notes the multi-stage Dockerfile (Node 20 build → Python 3.11-slim serve), the `8088:8000` host:container port mapping, and the named volume `bingo-data:/app/data` for SQLite persistence. Operational hints: `docker-compose logs -f tv-bingo`, `docker-compose restart tv-bingo`, `docker-compose up -d --build`.

**Section 9: Project shape.** Five-line bullet list pointing to the entry-point file for each subsystem: `backend/`, `frontend/`, `backend/services/moment_generator.py` (AI swap point), `backend/routers/websocket.py` (multiplayer), `Dockerfile` + `docker-compose.yml` (deploy). Closes by referencing the planning trio (PROJECT.md / REQUIREMENTS.md / ROADMAP.md) for the v1 plan.

## Verification

Static checks (post-commit, all PASS):

| Check | Result |
|-------|--------|
| `git rev-parse --abbrev-ref HEAD` | `claude/resume-ai-app-ClIA9` |
| `git log -1 --format=%s` | `docs(readme): add root README with deploy notes` |
| `git diff-tree --no-commit-id --name-status -r HEAD \| grep -cE '^A'` | `1` |
| `git diff-tree --no-commit-id --name-status -r HEAD \| grep -cE '^[MD]'` | `0` |
| `git show HEAD --stat` | 1 file changed, 98 insertions(+) |
| `wc -l README.md` | `98` (≥70 floor) |
| 9 mandatory sections each appear exactly once | PASS (1×9) |
| `grep -c OPENROUTER_API_KEY README.md` | `4` (≥3) |
| `grep -c AI_MODEL README.md` | `6` (≥4) |
| `grep -c openai/gpt-4o-mini README.md` | `3` (≥2) |
| `grep -c anthropic/claude-haiku-4.5 README.md` | `1` (≥1) |
| `grep -c meta-llama/llama-3.3-70b-instruct:free README.md` | `1` (≥1) |
| `grep -c google/gemini-2.5-flash README.md` | `1` (≥1) |
| `grep -c 30-day README.md` | `1` (Privacy section) |
| `grep -c kainga-core README.md` | `6` (≥3) |
| `grep -c kainga-core.local README.md` | `1` (Deploy section) |
| `grep -c 8088 README.md` | `2` (Deploy + extra context) |
| `grep -c 'docker-compose build' README.md` | `1` |
| `grep -c 'docker-compose up -d' README.md` | `2` |
| `grep -E 'sk-or-v1-[a-zA-Z0-9]{20,}' README.md` | (empty — no real key) |
| `grep -E 'sk-ant-[a-zA-Z0-9]{20,}' README.md` | (empty — no real Anthropic key) |
| `grep -c your-key README.md` | `1` (clear placeholder marker) |
| `grep -ci 'shields.io\|badge\|screenshot\|CONTRIBUTING\|LICENSE' README.md` | `0` (no deferred items leaked) |
| Spillover into backend/frontend/docker-compose/.planning/.env in HEAD commit | `(none)` |
| `frontend/README.md` untouched (Vite scaffold preserved) | YES (no change) |

## Self-Check: PASSED

- File `README.md` exists at repo root (first time) ✓
- File `.planning/phases/02-ai-provider-flexibility/02-03-SUMMARY.md` exists ✓
- Commit `28f04e8 docs(readme): add root README with deploy notes` exists in `git log` ✓
- Commit covers exactly 1 addition (README.md) — no spillover ✓
- All 9 D-08-mandated sections present in HEAD content ✓
- `OPENROUTER_API_KEY` × 4, `AI_MODEL` × 6 in HEAD content ✓
- 4 model examples (openai default + anthropic + meta-llama:free + google) in HEAD content ✓
- No real API keys in HEAD content (sk-or-v1-{20+} and sk-ant-{20+} both empty) ✓
- PLAN-01 commit `191497e feat(ai): swap Anthropic SDK for OpenRouter` is in the Phase 2 chain ✓
- PLAN-02 commit `14f798c docs(spec): amend AI-01/AI-02 to OpenRouter-only` is in the Phase 2 chain ✓
- PLAN-03 commit `28f04e8 docs(readme): add root README with deploy notes` is HEAD ✓

## Phase 2 Commit Chain — COMPLETE

In actual `git log --oneline -6` order (newest first):

```
28f04e8 docs(readme): add root README with deploy notes        ← Plan 02-03 (THIS)
6cd792f docs(02-02): complete spec amendment plan              ← Plan 02-02 close
14f798c docs(spec): amend AI-01/AI-02 to OpenRouter-only       ← Plan 02-02
5bfed59 docs(02-01): complete OpenRouter swap plan             ← Plan 02-01 close
191497e feat(ai): swap Anthropic SDK for OpenRouter            ← Plan 02-01
a4657f0 docs(02): plan AI provider flexibility (3 plans, ...)  ← Phase 2 plan landing
```

The Phase 2 documentation triangle is now complete: code shipped (191497e) ← spec amended to match shipped reality (14f798c) ← user-facing README explaining what shipped (28f04e8). Wave 2 ordering put PLAN-02 before PLAN-03 in the chain — interchangeable per `must_haves` ("Wave 2 ordering with PLAN-02 is interchangeable").

## Deviations from Plan

None — plan executed exactly as written. Both tasks landed cleanly:

- **Task 1** (Create README.md): Pre-flight checks all passed (no existing README, all infrastructure present, PLAN-01 in chain, working tree clean). Wrote 98 lines via `Write` tool, all 9 sections + 5 env vars + 4 model examples + privacy section + deploy section + project shape. All 30+ grep checks in the plan's acceptance criteria passed first-attempt.
- **Task 2** (Stage + commit): `git status` showed exactly `?? README.md` (one line). Explicit `git add README.md`. `git diff --cached --name-status` confirmed exactly `A\tREADME.md`. Single commit `28f04e8` with subject `docs(readme): add root README with deploy notes`. `git diff-tree` confirmed 1 addition / 0 modifications / 0 deletions. No spillover into PLAN-01 or PLAN-02 territory.

## Threat Surface Scan

No new attack surface introduced — docs-only diff. All threats in the plan's `<threat_model>` accounted for:

- **T-02-16 (Info Disclosure — accidental real OpenRouter key):** Mitigated. `grep -E 'sk-or-v1-[a-zA-Z0-9]{20,}' README.md` returned empty; placeholder is `sk-or-v1-<your-key>` (single short bracketed marker, far below the 20-char threshold).
- **T-02-17 (Info Disclosure — accidental real Anthropic key):** Mitigated. `grep -E 'sk-ant-[a-zA-Z0-9]{20,}' README.md` returned empty; the only Anthropic mention is the model-prefix example `anthropic/claude-haiku-4.5` (no key shape).
- **T-02-18 (Tampering — wrong port/env-var/hostname):** Mitigated. Port `8088` × 2, `OPENROUTER_API_KEY` × 4, `kainga-core.local` × 1 all match the verified RESEARCH.md / docker-compose / config.py source-of-truth values.
- **T-02-19 (Spoofing — typo OpenRouter URL):** Mitigated. `grep -cE 'openrouter\.(io|com)' README.md` returned `0`; all 4 OpenRouter URLs use `.ai` correctly (`/keys`, `/activity` × 1 each, plus 2 internal references).
- **T-02-20 (Info Disclosure — public-deploy posture):** Accepted with note. Family-only / LAN / Tailscale framing is explicit in the Deploy section opener and reinforced by the title blockquote. Phase 5 / DEPLOY-01 owns any production-checklist firewall section per D-08 extension hook.
- **T-02-21 (Repudiation — future drops of Privacy section):** Mitigated by git history + structural section ordering.
- **T-02-22 (Info Disclosure — internal hostname):** Accepted. `kainga-core.local` is mDNS, LAN-only, already in `docker-compose.yml` and the deployed `HTTP-Referer` header.
- **T-02-23 (Spoofing — fake "verified" claims):** Accepted. Content is verified against RESEARCH.md / actual file inspection at execution time (run.sh, docker-compose.yml, Dockerfile, .env.example, backend/config.py all read pre-write).

No threat flags raised (no new endpoints, no new auth surface, no schema changes).

## Phase 5 / DEPLOY-01 Extension Hook — Available

The Deploy section is structurally extensible per D-08. Phase 5's DEPLOY-01 plan can add new subsections inside `## Deploying to kainga-core` (e.g. "Production checklist" with firewall guidance, Tailscale setup, backup cadence) without rewriting the existing content. The current Deploy section's commands and port mapping become the foundation; the section grows downward.

## User Action Items (manual steps before next backend run)

These are **NOT blocking** Phase 3 planning — they're operational hygiene from Plan 02-01 that PLAN-03 surfaces in the now-readable README:

1. **Update local `.env`** (gitignored working-tree file, NOT modified by any commit):
   - Remove the line `ANTHROPIC_API_KEY=sk-ant-...` if still present
   - Add `OPENROUTER_API_KEY=sk-or-v1-<your-real-key>` (get one at https://openrouter.ai/keys)
   - Optionally add `AI_MODEL=...` to override the `openai/gpt-4o-mini` default

2. **Top up OpenRouter credits** at https://openrouter.ai/credits (~$5 is plenty for family use), OR set `AI_MODEL=meta-llama/llama-3.3-70b-instruct:free` for $0/month. 402 Payment Required is the failure mode if balance hits 0.

3. **Optional manual smoke test** (RESEARCH.md Q9 — requires .env update first):

   ```bash
   ./run.sh   # boots uvicorn :8000 + vite :5173

   # In another terminal:
   curl -s -X POST http://localhost:8000/api/games \
     -H "Content-Type: application/json" \
     -d '{"source_type":"show","source_name":"Brooklyn Nine-Nine","host_name":"Smoke"}' | jq

   # Expect HTTP 200 + 24-45 moments persisted within ~5-15s
   # Optionally swap AI_MODEL and re-run to verify the model-switch mechanic
   ```

4. **Optional: revoke the now-dormant Anthropic API key** at https://console.anthropic.com/settings/keys for hygiene. Non-blocking. (Per project's "no history rewrite" constraint, past commits with the key may exist in git history; rotation is the right hygiene response.)

5. **Optional: push to origin** — `git push origin claude/resume-ai-app-ClIA9` once happy with the three Phase 2 commits (191497e + 14f798c + 28f04e8).

## Net Phase 2 Deliverables

| Plan | Commit | Files Changed | Description |
|------|--------|---------------|-------------|
| 02-01 | `191497e` | 5 modifications (moment_generator.py, config.py, requirements.txt, .env.example, docker-compose.yml) | OpenRouter httpx swap, retry-once, env-contract narrowing |
| 02-02 | `14f798c` | 3 modifications (REQUIREMENTS.md, ROADMAP.md, PROJECT.md) | Strikethrough spec amendments to match shipping reality |
| 02-03 | `28f04e8` | 1 addition (README.md) | First root README — onboarding + deploy + privacy |

**Total: 5 code/config modifications + 3 spec amendments + 1 new README = 9 file changes across 3 atomic commits.**

## Next

Phase 2 is functionally complete. The remaining workflow steps:

- `/gsd-transition` (or auto-advance) will move PROJECT.md line 35 (Active section "Multi-provider AI") → Validated, mark ROADMAP line 16 `- [ ] Phase 2: ...` → `- [x]`, and update the Progress table row for Phase 2 to Complete.
- The user can then plan Phase 3 (PWA & Visual Polish) — note that APP-04 depends on Pippa running `/gsd-sketch` first, but APP-01/02/03 do not depend on it and can ship independently within the phase.

For this plan specifically, the next executor-action is the metadata commit (SUMMARY + STATE + ROADMAP) which the orchestrator handles automatically.
