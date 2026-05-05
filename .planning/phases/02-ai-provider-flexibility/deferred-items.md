# Phase 02 — Deferred Items

Items discovered during Phase 02 execution that are explicitly out of scope and not fixed.

## SDK formatting bug — POLISH-01 / POLISH-02 markdown damage

**Found during:** Phase 02 P01 (after running `gsd-sdk query requirements.mark-complete`)

**Issue:** The `requirements.mark-complete` SDK handler injects a stray newline between `**ID` and `**:`, breaking GFM bold rendering. Applied to AI-01/AI-02 in this plan (fixed inline as in-scope) but the same damage was already present on POLISH-01 and POLISH-02 from Phase 1's earlier SDK runs.

**Pre-existing state (lines 14-17 of REQUIREMENTS.md):**

```
- [x] **POLISH-01
**: Commit the 5 in-flight uncommitted files ...
- [x] **POLISH-02
**: Remove Telegram bot integration entirely ...
```

**Why deferred:** Pre-existing damage from a previous phase's SDK invocation. Per executor scope boundary rule, only auto-fix issues caused by the current task's changes. This is a cosmetic GFM rendering issue — it does not affect the source-of-truth completion state (the `[x]` is correct).

**Resolution path:** Either (a) Phase 5 housekeeping pass, (b) fix the SDK handler regex upstream (sdk/src/query/roadmap.ts: `requirementsMarkComplete`), or (c) one-shot manual cleanup the next time REQUIREMENTS.md is otherwise touched.
