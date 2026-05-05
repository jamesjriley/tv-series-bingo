---
phase: 02-ai-provider-flexibility
plan: 02
subsystem: planning-docs
tags: [docs, spec-amendment, strikethrough, traceability, planning-artifacts]
requirements: [AI-01, AI-02]
dependencies:
  requires: [Plan 02-01 — feat(ai) commit 191497e in chain]
  provides:
    - "Visible-but-superseded audit trail for AI-01/AI-02 scope refinement"
    - "GFM strikethrough convention (D-09) established for the first time in this project"
    - "Phase 2 success criteria match what Plan 02-01 actually shipped"
  affects:
    - ".planning/REQUIREMENTS.md AI-01/AI-02 — strikethrough + dated amendment notes"
    - ".planning/ROADMAP.md Phase 2 success criteria — three lines with strikethrough + dated notes"
    - ".planning/PROJECT.md Multi-provider AI Key Decisions row — single-line outcome append"
tech-stack:
  added: []
  removed: []
  patterns:
    - "GFM strikethrough idiom: ~~original~~ → **Amended YYYY-MM-DD in Phase N discuss:** new"
    - "PROJECT.md table-cell variant: — Pending → Refined YYYY-MM-DD ... (Phase N D-XX)"
    - "Strikethrough opens AFTER bold REQ-ID prefix (Pitfall 8 — no nesting ~~ inside **)"
key-files:
  created:
    - .planning/phases/02-ai-provider-flexibility/02-02-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/PROJECT.md
decisions:
  - "Amended AI-01/AI-02 from Anthropic+OpenRouter dual-client to OpenRouter-only with model-level provider routing (Phase 2 D-01)"
  - "REQUIREMENTS uses 'in Phase 2 discuss' verbatim; ROADMAP uses '(Phase 2 discuss)' parens variant; PROJECT uses '(Phase 2 D-01)' terse table-cell variant — all per RESEARCH.md Q7 verbatim"
  - "Strikethrough convention preserves original wording — audit trail visible, no history rewrite"
  - "AI-01/AI-02 checkboxes already [x] (marked complete by Plan 02-01's requirements mark-complete) — adapted verbatim old_string from [ ] to [x] (Rule 3 auto-fix for blocking issue)"
metrics:
  commit: 14f798c
  commit_subject: "docs(spec): amend AI-01/AI-02 to OpenRouter-only"
  files_changed: 3
  insertions: 6
  deletions: 6
  net_diff: "0 (pure same-line replacements — line counts preserved)"
  tasks_completed: 4
  duration: ~2min
  completed_date: 2026-05-05
---

# Phase 2 Plan 02: Spec Amendment for OpenRouter-only — Summary

GFM strikethrough audit trail applied to three planning files: AI-01 and AI-02 in REQUIREMENTS.md, three Phase 2 success criteria in ROADMAP.md, and the Multi-provider AI row in PROJECT.md Key Decisions. Original wording preserved under `~~strikethrough~~`; new wording follows `→ **Amended 2026-05-05 ...:**` per D-09. One atomic `docs(spec)` commit covering exactly 3 file modifications, 0 additions, 0 deletions, 0 net line change.

## What Got Patched

### `.planning/REQUIREMENTS.md` (lines 22-23)

Both AI-01 and AI-02 lines amended in place. Structural prefix `- [x] **AI-01**:` / `- [x] **AI-02**:` preserved (the `[x]` checkbox state was already set by Plan 02-01's `requirements mark-complete` invocation — the strikethrough opens after the colon-space following the bold REQ ID, never nesting inside the bold).

- **AI-01**: original "Provider-agnostic AI client supporting Anthropic *and* OpenRouter..." struck through; amended note explains single-client via OpenRouter, Anthropic models reachable via `anthropic/*` model prefix, same `generate_moments_*` interface preserved.
- **AI-02**: original "Config-driven provider and model selection via env vars (`AI_PROVIDER=...`)" struck through; amended note explains `AI_MODEL` env var alone (default `openai/gpt-4o-mini`), `OPENROUTER_API_KEY` required, `AI_PROVIDER` dropped because OpenRouter model names embed the provider.

Traceability table rows `| AI-01 | Phase 2 | Pending |` and `| AI-02 | Phase 2 | Pending |` UNCHANGED — those move to "Complete" via `/gsd-transition` at phase close, not in this plan.

### `.planning/ROADMAP.md` (lines 42-45, Phase 2 region)

All three Success Criteria amended in place with the parenthetical convention `**Amended 2026-05-05 (Phase 2 discuss):**`:

1. `~~AI_PROVIDER=openrouter~~` → with `OPENROUTER_API_KEY` set and `AI_MODEL` unset, default model `openai/gpt-4o-mini` is used.
2. `~~AI_PROVIDER=anthropic~~` → setting `AI_MODEL=anthropic/claude-haiku-4.5` (or any model string) routes through that model.
3. `~~.env.example documents AI_PROVIDER and AI_MODEL~~` → `.env.example` documents `OPENROUTER_API_KEY` (required) and `AI_MODEL` (optional, default shown). Root `README.md` explains the model switch with example values including free models.

UNCHANGED per CONTEXT.md scope:
- Line 16 phase-list-item `- [ ] **Phase 2: AI Provider Flexibility** - Multi-provider AI client (Anthropic + OpenRouter) with config-driven swap` (`/gsd-transition` will mark complete at phase close)
- Line 39 `**Goal**: Moment generation works with either Anthropic or OpenRouter; provider is swapped via env var with no code changes` (this is the high-level goal; the specific success criteria carry the refinement)
- Line 41 `**Requirements**: AI-01, AI-02`
- Lines 87-95 (Progress table) — phase-completion concern, not this plan
- Phases 1, 3, 4, 5 sections — completely untouched

### `.planning/PROJECT.md` (line 86, Key Decisions table)

Single-line outcome cell append, the lighter D-08 variant:

`| Multi-provider AI (Anthropic + OpenRouter) | ... | — Pending → Refined 2026-05-05 to OpenRouter-only with model-level provider routing (Phase 2 D-01). |`

Decision (col 1) and Rationale (col 2) cells preserved verbatim. The original `— Pending` text stays — no strikethrough — because the decision wasn't wrong, just refined to a more specific shape.

UNCHANGED:
- Line 35 (Active section) `- [ ] **Multi-provider AI** — config-selectable between Anthropic and OpenRouter; preserves cost flexibility and removes single-vendor dependency` — `/gsd-transition` workflow at end of Phase 2 will move this to Validated. That's a separate workflow.
- Other Key Decisions rows (Polish v1, Drop Telegram bot, PWA, etc.)
- All other sections (What This Is, Validated, Active, Out of Scope, Context, Constraints, Evolution)

## Verification

Static checks (post-commit, all PASS):

| Check | Result |
|-------|--------|
| `git rev-parse --abbrev-ref HEAD` | `claude/resume-ai-app-ClIA9` |
| `git log -1 --format=%s` | `docs(spec): amend AI-01/AI-02 to OpenRouter-only` |
| `git diff-tree HEAD --name-status \| grep -cE "^M"` | `3` |
| `git diff-tree HEAD --name-status \| grep -cE "^[AD]"` | `0` |
| `git show HEAD --stat` | 3 files changed, 6 insertions(+), 6 deletions(-) |
| `git show HEAD:.planning/REQUIREMENTS.md \| grep -c "Amended 2026-05-05 in Phase 2 discuss"` | `2` |
| `git show HEAD:.planning/ROADMAP.md \| grep -c "Amended 2026-05-05 (Phase 2 discuss)"` | `3` |
| `git show HEAD:.planning/PROJECT.md \| grep -c "Refined 2026-05-05"` | `1` |
| `git show HEAD:.planning/REQUIREMENTS.md \| grep -c "~~Provider-agnostic AI client"` | `1` |
| `git show HEAD:.planning/REQUIREMENTS.md \| grep -c "~~Config-driven provider"` | `1` |
| `git show HEAD:.planning/ROADMAP.md \| grep -c '~~Setting \`AI_PROVIDER='` | `2` |
| `git show HEAD:.planning/ROADMAP.md \| grep -c '~~\`.env.example\`'` | `1` |
| ROADMAP Goal line UNCHANGED | `1` match preserved |
| PROJECT.md line 35 (Active section) UNCHANGED | `1` match preserved |
| REQUIREMENTS traceability rows UNCHANGED | `\| AI-01 \| Phase 2 \| Pending \|` and `\| AI-02 \| Phase 2 \| Pending \|` both `1` |
| Spillover check (backend/frontend/docker-compose/README/.env) | `(none)` |
| PLAN-01 `feat(ai)` commit in `git log --oneline -5` | YES (191497e) |

## Self-Check: PASSED

- File `.planning/REQUIREMENTS.md` contains `Amended 2026-05-05 in Phase 2 discuss` × 2 ✓
- File `.planning/ROADMAP.md` contains `Amended 2026-05-05 (Phase 2 discuss)` × 3 ✓
- File `.planning/PROJECT.md` contains `Refined 2026-05-05` × 1 ✓
- Commit `14f798c` exists in `git log` ✓
- Commit `14f798c` covers exactly 3 modifications (REQUIREMENTS.md, ROADMAP.md, PROJECT.md) ✓
- PLAN-01 commit `191497e feat(ai): swap Anthropic SDK for OpenRouter` is in the Phase 2 chain ✓

## Phase 2 Commit Chain Status

Wave 1: `191497e feat(ai): swap Anthropic SDK for OpenRouter` (Plan 02-01) — landed first
Wave 1 docs: `5bfed59 docs(02-01): complete OpenRouter swap plan` (Plan 02-01 SUMMARY/STATE/ROADMAP commit) — landed between PLAN-01 and PLAN-02
Wave 2: `14f798c docs(spec): amend AI-01/AI-02 to OpenRouter-only` (Plan 02-02 — THIS plan) — current HEAD
Wave 2 (parallel sibling): Plan 02-03 (root README) — not yet executed when this plan ran

The spec/code chain is intact: original AI-01/AI-02 (now strikethroughed) ← code shipped via PLAN-01 (feat(ai) on `_call_openrouter` httpx client) ← spec amended via PLAN-02 (this commit) to reflect what shipped. PLAN-03's README (Wave 2 sibling) will land on top, completing the documentation triangle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AI-01 and AI-02 checkboxes were already `[x]` not `[ ]`**

- **Found during:** Pre-flight verification of Task 1
- **Issue:** The plan's verbatim `old_string` for the AI-01 and AI-02 Edit calls assumed `- [ ] **AI-01**:` and `- [ ] **AI-02**:` (unchecked checkboxes). Actual file state showed `- [x] **AI-01**:` and `- [x] **AI-02**:` — Plan 02-01's executor had already run `gsd-sdk query requirements.mark-complete AI-01 AI-02` as part of its Wave 1 close, advancing the checkboxes prematurely. Without adapting, the Edit tool would have failed with "old_string not found" and blocked the entire plan.
- **Fix:** Adapted both Edit `old_string` and `new_string` from `[ ]` to `[x]`. The strikethrough convention itself is preserved exactly per RESEARCH.md Q7 verbatim — only the leading checkbox marker differs from what the plan anticipated.
- **Files modified:** `.planning/REQUIREMENTS.md` (lines 22-23)
- **Commit:** `14f798c`
- **Why this is correct:** The `[x]` state accurately reflects shipping reality (Plan 02-01's code commit `191497e` did ship the requirement). The amendment note still correctly captures the *scope refinement*, not the completion state. Future readers see: "this requirement was ticked because the OpenRouter-only refinement was implemented" rather than the contradictory "ticked but unimplemented original wording".

### Out-of-Scope Discoveries (NOT fixed — logged for awareness)

**2. POLISH-01 and POLISH-02 lines have malformed line breaks**

- **Found during:** Reading REQUIREMENTS.md to verify Task 1 pre-flight state
- **Issue:** Lines 14-17 show literal newlines between `**POLISH-01` / `**POLISH-02` and the closing `**:` markers, breaking the GFM bold rendering on those two lines. POLISH-03 (line 18) is correctly formatted on a single line.
- **Pre-existing:** This damage exists from Phase 1 closure — flagged in this plan's project_notes ("a previous gsd-sdk handler had damaged GFM bold rendering on AI-01/AI-02 and earlier on POLISH-01/02"). The damage on AI-01/AI-02 was apparently fixed by Plan 02-01 (lines 22-23 are now well-formed); the POLISH-01/02 damage at lines 14-17 was NOT fixed.
- **Action taken:** None — out of scope for this plan (Phase 2 spec amendment, not Phase 1 doc hygiene). Logged here for the verifier and future maintenance.
- **Suggested fix:** A future Phase 1 hygiene pass or a one-line cleanup commit could collapse `- [x] **POLISH-01\n**: text` → `- [x] **POLISH-01**: text` for both lines. Trivial and isolated.

## Threat Surface Scan

No new attack surface introduced — docs-only diff. All threats in the plan's `<threat_model>` accounted for:

- **T-02-11 (Tampering):** Mitigated. Per-task acceptance grep'd untouched lines (line 16, line 39, line 41 of ROADMAP; line 35 of PROJECT; traceability rows of REQUIREMENTS) all preserved. `git show HEAD --stat` confirms tiny targeted diff.
- **T-02-12 (Repudiation):** Mitigated by the convention itself. Strikethrough markers `~~Provider-agnostic`, `~~Config-driven`, `~~Setting AI_PROVIDER`, `~~`.env.example`` are all present in HEAD content.
- **T-02-13 (Info Disclosure):** Mitigated. Explicit `git add` of three named files only. Spillover regex (backend|frontend|docker-compose|README|.env) returned empty.
- **T-02-14 (DoS via broken Markdown):** Mitigated. Pitfall 8 honoured — strikethrough opens after bold REQ-ID prefix, not nested inside. Verified by `grep "^- \[x\] \*\*AI-01\*\*: ~~"` returning 1.
- **T-02-15 (Spoofing future amendments):** Accepted. Family-LAN single-developer context.

No threat flags raised (no new endpoints, no new auth surface, no schema changes).

## Next

Plan 02-03 (root README per D-08) is the remaining Wave 2 sibling. It can run now or in parallel — its `files_modified` set is `README.md` (root), zero overlap with this plan's `.planning/*.md` set.

Phase 2 closes when 02-03 lands, then `/gsd-transition 02 → 03` will:
- Move PROJECT.md line 35 from Active → Validated section
- Update REQUIREMENTS.md traceability rows AI-01/AI-02 from Pending → Complete
- Mark line 16 of ROADMAP.md `- [ ] Phase 2: ...` → `- [x] Phase 2: ...`
- Update Progress table row for Phase 2 to Complete

Those structural updates are explicitly out of scope for this PLAN-02 commit — they're phase-transition concerns, not spec-amendment concerns.

## Self-Check: PASSED (verified post-write)

- `.planning/phases/02-ai-provider-flexibility/02-02-SUMMARY.md` exists ✓
- Commit `14f798c docs(spec): amend AI-01/AI-02 to OpenRouter-only` exists in `git log` ✓
- HEAD content: REQUIREMENTS.md `Amended 2026-05-05 in Phase 2 discuss` × 2 ✓
- HEAD content: ROADMAP.md `Amended 2026-05-05 (Phase 2 discuss)` × 3 ✓
- HEAD content: PROJECT.md `Refined 2026-05-05` × 1 ✓
