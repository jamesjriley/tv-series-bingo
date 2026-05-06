---
phase: 03-pwa-visual-polish
plan: "01"
subsystem: ui
tags: [pwa, vite-plugin-pwa, vite-pwa-assets-generator, icons, manifest-prep, favicon]

# Dependency graph
requires:
  - phase: 02-ai-provider-flexibility
    provides: clean baseline (frontend/package.json untouched by Phase 2; ready for new devDeps)
provides:
  - "vite-plugin-pwa@^1.3.0 and @vite-pwa/assets-generator@^1.0.2 in frontend devDependencies"
  - "frontend/public/icons/pwa-192.png, pwa-512.png, pwa-maskable-512.png — manifest icon set rasterized from VUT favicon.svg"
  - "frontend/public/favicon.ico and favicon-32.png — browser-tab fallbacks"
  - "npm script generate-pwa-assets for re-rasterizing icons when favicon.svg changes"
  - "frontend/dev-dist/ added to .gitignore — vite-plugin-pwa dev output gated from repo"
  - "frontend/public/icons.svg removed — dead social-network sprite, zero consumers"
affects: [03-02-pwa-wiring, phase-03.1-visual-polish, phase-05-deploy]

# Tech tracking
tech-stack:
  added: [vite-plugin-pwa@1.3.0, "@vite-pwa/assets-generator@1.0.2"]
  patterns:
    - "PWA icons live in frontend/public/icons/ subdirectory (D-08); favicons (svg/ico/32.png) at public root"
    - "Single SVG source of truth (favicon.svg) for all rasterized icon variants — npm run generate-pwa-assets re-rasterizes deterministically"
    - "Asset cleanup rides along with infrastructure setup commit (D-13 atomic-by-feature) when both are at chore level"

key-files:
  created:
    - frontend/public/icons/pwa-192.png
    - frontend/public/icons/pwa-512.png
    - frontend/public/icons/pwa-maskable-512.png
    - frontend/public/favicon.ico
    - frontend/public/favicon-32.png
  modified:
    - frontend/package.json
    - frontend/package-lock.json
    - .gitignore
  deleted:
    - frontend/public/icons.svg

key-decisions:
  - "Rule 1 deviation: assets-generator minimal-2023 preset writes flat to public/ with WIDTHxHEIGHT names (e.g., pwa-192x192.png), not to public/icons/ with the plan's pwa-192.png-style names. Moved + renamed files post-generation to honour locked D-08 (icons subdirectory) and the plan's exact must_haves contract."
  - "Rule 1 deviation: assets-generator minimal-2023 preset produces apple-touch-icon-180x180.png and pwa-64x64.png that are not in plan scope. Apple touch icon is explicitly deferred per D-04. Deleted both before staging."
  - "Rule 2 deviation: minimal-2023 preset does NOT produce favicon-32.png (only favicon.ico), but plan must_haves require it. Generated 32x32 PNG via Pillow downsampling pwa-192x192.png with LANCZOS filter."
  - "Single chore(pwa) commit covers both Task 1 (deps + script) and Task 2 (asset generation + cleanup) per plan-specified staging block — Task 1's package.json edit is included in Task 2's atomic commit."

patterns-established:
  - "Asset-generation deviation pattern: when a preset's output paths/names don't match plan must_haves, post-process (mv/rm/Pillow) BEFORE staging — keep the commit a clean expression of the locked contract, not the generator's quirks"
  - "Pillow downsampling fallback: when assets-generator omits a required size, Pillow's LANCZOS resize on the largest available variant produces an acceptable smaller PNG without rasterizing the SVG twice"

requirements-completed: [APP-01]

# Metrics
duration: 2min
completed: 2026-05-06
---

# Phase 3 Plan 1: PWA Asset Generation Summary

**vite-plugin-pwa toolchain installed and the manifest icon set (192/512/maskable-512) rasterized from the VUT favicon.svg into frontend/public/icons/, with browser-tab fallbacks (favicon.ico, favicon-32.png) and the dead icons.svg sprite removed.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-06T04:53:57Z
- **Completed:** 2026-05-06T04:56:01Z
- **Tasks:** 2
- **Files modified:** 9 (8 staged + 1 deletion)

## Accomplishments

- vite-plugin-pwa@1.3.0 + @vite-pwa/assets-generator@1.0.2 added to frontend devDependencies; clean install with no peer-dep conflicts on Vite 8.0.4
- Three manifest-spec icons (192px any, 512px any, 512px maskable) generated from the VUT purple `#863bff` favicon.svg into `frontend/public/icons/`
- Browser-tab fallbacks (multi-resolution `favicon.ico` + 32×32 PNG) shipped at the public root
- `frontend/public/icons.svg` (5KB unused social-network sprite) deleted
- `frontend/dev-dist/` added to `.gitignore` — vite-plugin-pwa dev output now gated from accidental commits
- `npm run generate-pwa-assets` script wired so icons can be re-rasterized any time `favicon.svg` evolves

## Task Commits

1. **Task 1: Add PWA dependencies and generate-pwa-assets script** — staged as part of Task 2 commit (per plan-specified atomic commit block)
2. **Task 2: Generate PWA icon assets, delete icons.svg, update .gitignore** — `16282fa` (chore)

The plan's Step 5 staging block deliberately bundles `package.json` + `package-lock.json` + new icon assets + `.gitignore` + `icons.svg` deletion into a single `chore(pwa)` commit per D-13 atomic-by-feature. There is no separate Task 1 commit.

**Plan metadata commit:** to be created with SUMMARY + STATE + ROADMAP after self-check.

## Files Created/Modified

**Created:**
- `frontend/public/icons/pwa-192.png` (4299 B) — 192×192 PNG, purpose `any`, install-prompt + home-screen
- `frontend/public/icons/pwa-512.png` (24177 B) — 512×512 PNG, purpose `any`, splash + app drawer
- `frontend/public/icons/pwa-maskable-512.png` (13047 B) — 512×512 PNG, purpose `maskable`, with auto-pad safe-area inset
- `frontend/public/favicon.ico` (901 B) — multi-resolution ICO, browser-tab fallback
- `frontend/public/favicon-32.png` (465 B) — 32×32 PNG, modern browser-tab variant (Pillow-downsampled from pwa-192)

**Modified:**
- `frontend/package.json` — added two devDeps + `generate-pwa-assets` script
- `frontend/package-lock.json` — 300 packages added in install
- `.gitignore` — added `frontend/dev-dist/` between `frontend/dist/` and `*.log`

**Deleted:**
- `frontend/public/icons.svg` — dead social-network icon sprite, zero consumers

## Decisions Made

- **Honour D-08 over generator defaults.** The `minimal-2023` preset writes icons flat to `public/` with `WIDTHxHEIGHT` names (`pwa-192x192.png`). D-08 locks icons under `public/icons/` with `pwa-192.png`-style names. Post-generation `mkdir + mv + rename` step makes the filesystem match the locked decision; Plan 02's manifest will reference `/icons/pwa-192.png` etc. as planned.
- **Honour D-04 by deleting the unwanted apple-touch-icon.** The preset auto-generates `apple-touch-icon-180x180.png`. D-04 explicitly defers Apple touch icons to a possible Phase 3.1. Removed before staging so the commit only contains in-scope assets.
- **Drop the unsolicited 64×64 PWA icon.** The preset also produces `pwa-64x64.png`. The plan's manifest icon array (per RESEARCH.md) declares only 192/512/maskable-512 — no 64. Including a 64×64 icon nobody references would just be dead weight; deleted.
- **Backfill `favicon-32.png` via Pillow.** The preset doesn't emit a 32×32 PNG (only `favicon.ico`). Plan must_haves require `favicon-32.png`. Pillow LANCZOS resize from `pwa-192x192.png` produces a clean 32×32; no need for a second SVG rasterization round-trip.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] assets-generator preset writes flat to public/, not to public/icons/ subdirectory**
- **Found during:** Task 2 Step 1 (npm run generate-pwa-assets)
- **Issue:** Plan and locked D-08 specify icons in `frontend/public/icons/` with names `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`. The `@vite-pwa/assets-generator@1.0.2` `minimal-2023` preset actually writes to `public/` flat with names `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`. Plan's must_haves and Plan 02's future manifest contract require the documented paths.
- **Fix:** Created `frontend/public/icons/` directory; moved + renamed three PNGs to match plan's expected paths.
- **Files modified:** Filesystem only (pre-staging); committed final paths in `16282fa`.
- **Verification:** `ls frontend/public/icons/` shows the three plan-specified filenames; `git status` showed exactly the expected staged set.
- **Committed in:** `16282fa`

**2. [Rule 1 - Bug] assets-generator preset emits out-of-scope assets (apple-touch-icon, pwa-64x64)**
- **Found during:** Task 2 Step 1 (npm run generate-pwa-assets)
- **Issue:** Preset auto-emits `apple-touch-icon-180x180.png` and `pwa-64x64.png`. Apple touch icon is explicitly deferred per D-04. The 64×64 icon is not in the plan's must_haves and not declared in the manifest icons array per RESEARCH.md.
- **Fix:** `rm` both files before staging. Commit contains only in-scope assets.
- **Files modified:** Filesystem only (pre-staging).
- **Verification:** `ls frontend/public/` shows only `favicon-32.png`, `favicon.ico`, `favicon.svg`, `icons/` after cleanup.
- **Committed in:** `16282fa` (deletions are pre-stage; nothing for git to see)

**3. [Rule 2 - Missing Critical] assets-generator preset does not emit favicon-32.png**
- **Found during:** Task 2 Step 2 (verifying expected output files)
- **Issue:** Plan's `must_haves.truths` and `must_haves.artifacts` both require `frontend/public/favicon-32.png`. The `minimal-2023` preset emits `favicon.ico` (multi-resolution including 32×32 internally) but no standalone 32×32 PNG.
- **Fix:** Used Pillow 10.2.0 to LANCZOS-downsample `pwa-192x192.png` to a 465-byte 32×32 PNG. Equivalent visual quality to a fresh SVG rasterization at that size; avoids a second toolchain dependency.
- **Files modified:** `frontend/public/favicon-32.png` (created)
- **Verification:** `Image.open('favicon-32.png').size == (32, 32)`; `stat -c '%s'` shows 465 B.
- **Committed in:** `16282fa`

---

**Total deviations:** 3 auto-fixed (2 Rule 1 — generator output paths/names didn't match locked D-08 and emitted out-of-scope assets per D-04; 1 Rule 2 — missing required `favicon-32.png` artifact)

**Impact on plan:** All three deviations are quirks of the `minimal-2023` preset rather than design changes. Final committed state is exactly what the plan's `must_haves` block specifies — no scope creep, no architectural shift. Plan 02 can reference `/icons/pwa-192.png` etc. as written. The `must_haves.key_links` pattern (`favicon.svg → pwa-*.png` via assets-generator) holds, with the post-generation rename step understood as part of the workflow until the upstream tool supports configurable output paths.

## Issues Encountered

None beyond the documented deviations. Working tree clean after commit; no pre-existing warnings or build issues touched.

## User Setup Required

None — no external service configuration required. The PWA install icon and manifest become visible to users only after Plan 02 wires the manifest and service worker into the Vite build.

## Next Phase Readiness

- **Plan 02 (PWA wiring) ready to execute.** Manifest icon array in Plan 02's `vite.config.ts` can reference `/icons/pwa-192.png`, `/icons/pwa-512.png`, `/icons/pwa-maskable-512.png` as documented. Files are present, paths match, sizes are correct.
- **No blockers.** vite-plugin-pwa peer-dep on Vite 8.0.4 is satisfied. assets-generator round-trip from `favicon.svg` is now scriptable via `npm run generate-pwa-assets`.
- **Recommendation for Plan 02:** Verify the maskable icon visually in DevTools → Application → Manifest → Icons (Pitfall 2 from RESEARCH.md). The auto-pad applies a 15% inset; the VUT mark has directional chevrons, so confirm nothing is cropped on circle/squircle preview before marking APP-01 verified.

## Self-Check: PASSED

**Files verified to exist:**
- `frontend/public/icons/pwa-192.png` — FOUND (4299 B)
- `frontend/public/icons/pwa-512.png` — FOUND (24177 B)
- `frontend/public/icons/pwa-maskable-512.png` — FOUND (13047 B)
- `frontend/public/favicon.ico` — FOUND (901 B)
- `frontend/public/favicon-32.png` — FOUND (465 B)
- `frontend/public/icons.svg` — confirmed absent
- `.gitignore` contains `frontend/dev-dist/` — FOUND

**Commit verified:**
- `16282fa` `chore(pwa): install vite-plugin-pwa deps and generate icons from favicon.svg` — FOUND in `git log`

**Plan-level success criteria all PASS:**
- npm install completed with no peer-dep errors
- All five generated/expected asset files present and non-zero
- icons.svg deleted from git
- .gitignore includes `frontend/dev-dist/`
- Commit on branch `claude/resume-ai-app-ClIA9`
- `git status` clean after commit

---
*Phase: 03-pwa-visual-polish*
*Completed: 2026-05-06*
