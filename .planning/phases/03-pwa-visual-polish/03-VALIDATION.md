---
phase: 03
slug: pwa-visual-polish
status: reconstructed
nyquist_compliant: false
wave_0_complete: n/a
created: 2026-05-06
reconstructed_from: [03-01-assets-PLAN.md, 03-02-wiring-PLAN.md, 03-01-assets-SUMMARY.md, 03-02-wiring-SUMMARY.md, 03-VERIFICATION.md]
---

# Phase 3 — Validation Strategy (reconstructed, manual-only)

> Reconstructed retroactively from completed phase artefacts. Phase 3 was executed without a Nyquist plan because the project deliberately defers test-framework setup to Phase 5 (REQ TEST-01). This document records the validation that *did* happen (verifier-driven shell-grep checks against build artefacts) and the manual-only items that gate APP-03.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no vitest/jest/pytest/playwright installed in the repo |
| **Config file** | None |
| **Quick run command** | `cd frontend && npm run build` (build itself is the closest thing to a test — exit 0 means tsc + vite + vite-plugin-pwa all agreed) |
| **Full suite command** | None — see `Manual-Only Verifications` below |
| **Estimated runtime** | n/a |

**Why no framework yet:** Per `.planning/REQUIREMENTS.md`, **TEST-01 (test infrastructure) is scheduled in Phase 5**. The project explicitly chose not to scaffold vitest/pytest in earlier phases to avoid duplicate setup work. Until TEST-01 lands, the closest substitute for "did the build still work" is the verifier's shell-grep checks, which are recorded in `03-VERIFICATION.md`.

---

## Sampling Rate

- **After every task commit:** Verifier-style shell checks from each plan's `<verify><automated>` block (run on demand, not in a watcher).
- **Before phase close:** `03-VERIFICATION.md` re-runs all 11 must-have checks against the live build output.
- **Max feedback latency:** ~30 s (one `npm run build` round-trip).

This is below the Nyquist bar a real test runner would provide. The checks exist; they just don't live in a CI-runnable harness yet.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01-assets | 1 | APP-01 | T-03-01-01 | npm install only adds vetted vite-plugin-pwa packages; no peer-dep override | shell-grep | `grep '"vite-plugin-pwa"' frontend/package.json && grep '"@vite-pwa/assets-generator"' frontend/package.json && ls frontend/node_modules/vite-plugin-pwa` | ✅ verifier ran | ✅ green (one-shot) |
| 03-01-02 | 01-assets | 1 | APP-01 | T-03-01-03 | Generated icons match locked sizes/purposes; no extra files leak into commit | shell + file existence | `ls frontend/public/icons/{pwa-192,pwa-512,pwa-maskable-512}.png frontend/public/favicon.ico frontend/public/favicon-32.png && grep 'frontend/dev-dist' .gitignore && test ! -f frontend/public/icons.svg` | ✅ verifier ran | ✅ green (one-shot) |
| 03-02-01 | 02-wiring | 2 | APP-01, APP-02 | T-03-02-03 | NetworkFirst on `/api`; CacheFirst on Google Fonts; no `/ws` runtimeCaching matcher | shell-grep on source config | `grep 'VitePWA\|NetworkFirst\|CacheFirst\|fonts.gstatic.com\|autoUpdate\|"#863bff"' frontend/vite.config.ts && ! grep '/ws' frontend/vite.config.ts \| grep -A2 runtimeCaching` | ✅ verifier ran | ✅ green (one-shot) |
| 03-02-02 | 02-wiring | 2 | APP-01, APP-02, APP-03 | T-03-02-01, T-03-02-04 | SW registers via virtual:pwa-register; built SW has no /ws route; manifest contains only origin-relative paths | build + grep on dist/ artefacts | `cd frontend && npm run build && grep -q NetworkFirst dist/sw.js && grep -q CacheFirst dist/sw.js && ! grep -q '/ws' dist/sw.js && python3 -c "import json; m=json.load(open('dist/manifest.webmanifest')); assert m['theme_color']=='#863bff' and len(m['icons'])==3"` | ✅ verifier ran | ✅ green (one-shot) |

**Status legend:** ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · *(one-shot)* = ran during verifier sweep, not in a persistent test runner.

---

## Wave 0 Requirements

*None — by deliberate roadmap choice.*

The project's REQUIREMENTS.md schedules **TEST-01 (test framework infrastructure) in Phase 5**, not Phase 3. Adding vitest/playwright to validate APP-01/02/03 retroactively would duplicate setup work TEST-01 will redo properly with a holistic test strategy. The right time to add automated regression tests for the build-output assertions in this phase is when TEST-01 stands up the harness.

When that happens, Phase 5 should backfill:

1. **APP-01 vitest spec** — assert `dist/manifest.webmanifest` parses, `theme_color === "#863bff"`, `background_color === "#faf9f7"`, exactly three icon entries with sizes/purposes from D-07.
2. **APP-02 vitest spec** — assert `dist/sw.js` contains `NetworkFirst`, `CacheFirst`, and zero `/ws` references; assert precache list contains the three icons + `manifest.webmanifest` + `index.html`.
3. **APP-03 playwright spec (or skip)** — driving Chromium's installability heuristics from CI is hard and brittle. Realistic option: a smoke test that loads the served `dist/`, checks the manifest is reachable, and confirms `navigator.serviceWorker.ready` resolves. The full "Install app" prompt remains a manual UAT.

---

## Manual-Only Verifications

These cannot be replaced by automation in v1. They are the same six items already enumerated in `03-VERIFICATION.md` `human_verification`. Reproduced here so VALIDATION.md is self-contained.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chromium "Install app" prompt appears in address bar | APP-03 | Chromium installability heuristics are runtime-only and depend on engagement signals; cannot be triggered from CLI | Run backend (`./run.sh`) or `npm run preview`, open `http://localhost:8000` (or `:4173`) in Chrome/Edge/Brave, wait ~30 s, confirm Install icon appears in address bar |
| Service worker reaches "activated and running" | APP-02 | SW lifecycle is observable only in DevTools at runtime | DevTools → Application → Service Workers → confirm `sw.js` activated; no console errors about virtual:pwa-register |
| Maskable icon not cropped under circle/squircle mask | APP-01 | RESEARCH Pitfall 2: auto-pad may not protect VUT chevrons; visual-only check | DevTools → Application → Manifest → click maskable-512 entry; confirm chevrons fully visible inside the safe zone |
| Offline reload renders SPA shell | APP-02 | Workbox precache offline behaviour observable only via browser offline simulator | Load app once online; DevTools → Network → Offline → reload; SPA shell renders, API calls fail (expected) |
| iOS Safari Add to Home Screen works | APP-03 | Requires real iOS device or simulator | Open in Safari iOS 15.4+ → Share → Add to Home Screen → confirm option present and standalone launch shows VUT mark |
| WebSocket multiplayer still works with SW active | APP-02 (regression) | T-03-02-01 mitigation is a runtime invariant — only a real two-tab session proves the SW didn't accidentally interfere with WS handshakes | Run app from `dist/` via `npm run preview`; open two tabs; create game in tab 1, join in tab 2 with different player_id; mark a square in tab 2; confirm tab 1 sees mark in real-time; DevTools → Network → WS shows frames flowing |

---

## Validation Sign-Off

- [x] All tasks had `<automated>` verify blocks (run on demand by verifier)
- [x] Manual-only items recorded with reproducible browser steps
- [x] No watch-mode flags claimed
- [ ] Persistent test runner — **deferred to Phase 5 (TEST-01)**
- [ ] `nyquist_compliant: true` — **NOT achieved**; one-shot shell verification is below the Nyquist bar a real test runner would provide

**Approval:** retroactive — recorded 2026-05-06 against an already-shipped phase. Re-evaluate after TEST-01 lands.

---

## Validation Audit 2026-05-06

| Metric | Count |
|--------|-------|
| Gaps found | 3 (APP-01, APP-02, APP-03) |
| Resolved by adding tests | 0 |
| Escalated to manual-only | 3 (per user decision: defer test-framework bootstrap to Phase 5 TEST-01) |
| Backfill items recorded for Phase 5 | 2 (vitest specs for APP-01 and APP-02) + 1 conditional (playwright smoke for APP-03) |

**Audit verdict:** Phase 3 ships **without persistent automated regression tests** by deliberate roadmap design. The verifier already confirmed all 11 must-haves against build output (see `03-VERIFICATION.md`), so the phase is functionally validated for one-shot delivery. True Nyquist compliance arrives with TEST-01 in Phase 5.
