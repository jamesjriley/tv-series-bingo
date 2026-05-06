---
phase: 03-pwa-visual-polish
verified: 2026-05-06T00:00:00Z
status: human_needed
score: 11/11 must-haves verified (automated); 1 success criterion intentionally deferred
overrides_applied: 0
re_verification:
  previous_status: null  # Initial verification
deferred:
  - truth: "The visual design reflects the directions from Pippa's /gsd-sketch exploration — updated colours, typography, and component styles are applied"
    addressed_in: "Phase 3.1 (to be inserted)"
    evidence: "ROADMAP Phase 3 success criterion #4 with explicit '(moves to Phase 3.1 per D-12; Phase 3 verifies on criteria #1–#3 only)'. CONTEXT D-12 'APP-04 sequencing → split into Phase 3.1' confirms the carve-out. APP-04 in REQUIREMENTS.md remains unchecked. Phase 3.1 inserted via /gsd-insert-phase once Pippa runs /gsd-sketch + /gsd-sketch-wrap-up."
human_verification:
  - test: "Open built app in Chromium and confirm Install app prompt"
    expected: "Within ~30s of loading http://localhost:8000 (or :4173 with `npm run preview`), an 'Install app' icon appears in the address bar; clicking it offers to install TV Bingo. After install, the app launches in a standalone window with no browser chrome."
    why_human: "Chromium installability is a UI behaviour driven by Chromium's internal heuristics (manifest validity + SW activation + recent engagement); cannot be tested by grep or curl. This is the primary APP-03 acceptance criterion."
  - test: "DevTools → Application → Service Workers shows sw.js activated"
    expected: "After loading the app, the Service Workers panel lists `sw.js` with status 'activated and running'. Application → Manifest section shows the manifest with three icons rendered, no red warnings."
    why_human: "SW activation is observable only at runtime in a browser; manifest installability warnings are surfaced by Chromium DevTools at runtime, not by static analysis."
  - test: "Maskable icon preview — confirm VUT mark is not cropped"
    expected: "DevTools → Application → Manifest → Icons → click the maskable-512 entry. Preview panel shows the VUT brand mark inside a circle/squircle mask with no chevrons cropped at the edges."
    why_human: "RESEARCH Pitfall 2 explicitly flags this as a verification step — auto-pad may not be enough for the directional VUT chevrons. If cropped, a hand-designed maskable variant becomes a Phase 3.1 backlog item."
  - test: "Offline reload renders SPA shell"
    expected: "After first load, DevTools → Network → Offline → reload. The SPA shell renders (HTML, CSS, JS, fonts via cache); API calls fail gracefully (expected — no offline gameplay per APP-02 spec)."
    why_human: "Workbox precache + runtimeCaching behaviour is observable only by simulating offline in a browser. APP-02 acceptance criterion."
  - test: "iOS Safari Add to Home Screen (optional for v1)"
    expected: "On Safari iOS 15.4+, Share → 'Add to Home Screen' is available. After install, tapping the home-screen icon launches the app fullscreen with no Safari chrome. Icon shows the VUT purple mark (not a screenshot fallback)."
    why_human: "iOS install flow is impossible to test without a real iOS device or simulator. APP-03 second-half acceptance criterion. Per D-04, no apple-touch-icon ships, so iOS <15.4 falls back to a screenshot icon — accepted tradeoff."
  - test: "WebSocket multiplayer still works with SW active"
    expected: "Open two tabs, create a game in tab 1, join with a different player_id in tab 2, mark a square in tab 2 → tab 1 sees the mark in real-time. DevTools → Network → WS shows the connection open and frames flowing."
    why_human: "T-03-02-01 mitigation (no /ws urlPattern in runtimeCaching) is verified by static analysis, but the live behavioural test that WS bypasses the SW and multiplayer sync still works needs human-in-the-loop. Critical regression check — if anything in the SW config interfered with WS, multiplayer sync would break silently."
---

# Phase 3: PWA & Visual Polish Verification Report

**Phase Goal:** Users can install the app to their desktop and tap it open like an app; the interface looks and feels polished.

**Verified:** 2026-05-06
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Verdict

**PARTIAL — PASS-WITH-DEFERRAL.** The PWA mechanics half of Phase 3 (APP-01, APP-02, APP-03) is delivered cleanly: every artefact called for in the plans exists on disk, the manifest and service worker generate correctly from `npm run build`, the static-analysis checks for caching strategies all pass, and the WebSocket-bypass invariant is honoured. **Six items require human verification in a real browser** before APP-01/02/03 can be marked truly green — these are inherent to PWA work (Chromium install prompt, SW activation, maskable preview, offline behaviour, iOS install, WS regression). Automated verification cannot substitute.

**APP-04 (visual polish) is intentionally DEFERRED to Phase 3.1**, which the plans, CONTEXT D-12, and ROADMAP success-criterion #4 footnote all explicitly call out. APP-04 blocks on Pippa running `/gsd-sketch` + `/gsd-sketch-wrap-up` to produce a `sketch-findings-*` skill, then `/gsd-insert-phase 03.1-visual-polish` creates the follow-up phase. Phase 3 as currently scoped (APP-01/02/03 only) is **complete pending UAT**. APP-04 is a known unfinished item with a clear path forward, not a regression or oversight.

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria + Plan Must-Haves Merged)

| #  | Truth                                                                                              | Status     | Evidence |
| -- | -------------------------------------------------------------------------------------------------- | ---------- | -------- |
| 1  | Manifest exists with theme_color #863bff and three icons (192/512/maskable-512)                    | ✓ VERIFIED | `dist/manifest.webmanifest` parses as valid JSON; theme_color="#863bff", icons count=3, srcs=`/icons/pwa-{192,512,maskable-512}.png`, purposes=`['any','any','maskable']` |
| 2  | All three icon assets exist in `frontend/public/icons/` at correct dimensions                      | ✓ VERIFIED | `file pwa-192.png` → 192x192; `pwa-512.png` → 512x512; `pwa-maskable-512.png` → 512x512. All non-zero PNG. |
| 3  | Browser-tab fallbacks (favicon.ico, favicon-32.png) exist                                          | ✓ VERIFIED | `favicon.ico` is multi-resolution ICO (901 B); `favicon-32.png` is 32x32 PNG (465 B) |
| 4  | `frontend/public/icons.svg` deleted from working tree and git                                      | ✓ VERIFIED | `test -f` returns "GONE"; `git log -p -- frontend/public/icons.svg` shows deletion in `16282fa` |
| 5  | `frontend/dev-dist/` listed in `.gitignore`                                                        | ✓ VERIFIED | `.gitignore` line 11: `frontend/dev-dist/` |
| 6  | vite-plugin-pwa@^1.3.0 + @vite-pwa/assets-generator@^1.0.2 in devDependencies, installed           | ✓ VERIFIED | `package.json` lines 30-31; `node_modules/vite-plugin-pwa/` and `node_modules/@vite-pwa/assets-generator/` both present |
| 7  | `npm run build` completes without errors and produces `dist/manifest.webmanifest` + `dist/sw.js`   | ✓ VERIFIED | Fresh build during this verification: exit 0, "PWA v1.3.0 / mode generateSW / precache 8 entries (231.47 KiB)", both files generated |
| 8  | Service worker contains NetworkFirst for /api, CacheFirst for fonts.gstatic.com, no /ws matcher    | ✓ VERIFIED | `dist/sw.js` contains exactly 1× `NetworkFirst`, 2× `CacheFirst` (for googleapis + gstatic), `/api` matcher via `pathname.startsWith("/api")`; grep `/ws` returns 0 matches in `sw.js` |
| 9  | `frontend/index.html` `<meta name="theme-color">` is `#863bff` (not the old `#4f6df5`)            | ✓ VERIFIED | Line 6: `content="#863bff"`; old blue absent |
| 10 | `frontend/src/main.tsx` imports + calls `registerSW` from `virtual:pwa-register` before createRoot | ✓ VERIFIED | Lines 3 (import) and 6 (call) precede `createRoot` on line 15 |
| 11 | `README.md` contains a PWA install paragraph with Chromium and Safari/iOS instructions             | ✓ VERIFIED | Line 90: `## PWA install`; line 92 contains "Install app" (Chromium) and "Add to Home Screen" (Safari/iOS) |
| —  | (DEFERRED) APP-04 visual polish from /gsd-sketch                                                   | ⏸ DEFERRED | Moved to Phase 3.1 per D-12 and ROADMAP SC #4 footnote |
| —  | (HUMAN) Chromium "Install app" prompt appears                                                      | ? HUMAN    | Listed in human_verification |
| —  | (HUMAN) Service worker activates and reaches "running" state                                       | ? HUMAN    | Listed in human_verification |
| —  | (HUMAN) Offline reload renders SPA shell                                                           | ? HUMAN    | Listed in human_verification |
| —  | (HUMAN) iOS Safari Add to Home Screen works                                                        | ? HUMAN    | Listed in human_verification |
| —  | (HUMAN) Maskable icon preview not cropped                                                          | ? HUMAN    | Listed in human_verification |
| —  | (HUMAN) WebSocket multiplayer still works with SW active                                           | ? HUMAN    | Listed in human_verification |

**Score:** 11/11 automated truths verified · 1 truth deferred to Phase 3.1 (APP-04) · 6 human verification items pending UAT.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/public/icons/pwa-192.png` | 192×192 PNG, install-prompt icon | ✓ VERIFIED | 4299 B, dimensions 192×192, non-interlaced |
| `frontend/public/icons/pwa-512.png` | 512×512 PNG, splash icon | ✓ VERIFIED | 24177 B, dimensions 512×512 |
| `frontend/public/icons/pwa-maskable-512.png` | 512×512 PNG with auto-pad, maskable | ✓ VERIFIED | 13047 B, dimensions 512×512 (visual safe-area check is a human item) |
| `frontend/public/favicon.ico` | Multi-res ICO browser-tab fallback | ✓ VERIFIED | 901 B, MS Windows icon resource, 48×48 with PNG data |
| `frontend/public/favicon-32.png` | 32×32 PNG modern browser tab | ✓ VERIFIED | 465 B, dimensions 32×32 |
| `frontend/vite.config.ts` | VitePWA plugin with manifest + workbox config | ✓ VERIFIED | `import { VitePWA }` + full plugin config block; locked decisions D-05/06/07/10/11 honoured |
| `frontend/src/main.tsx` | SW registration via virtual:pwa-register | ✓ VERIFIED | `registerSW({ onRegisteredSW, onRegisterError })` placed before createRoot |
| `frontend/tsconfig.app.json` | `vite-plugin-pwa/client` in types array | ✓ VERIFIED | Line 7: `"types": ["vite/client", "vite-plugin-pwa/client"]` |
| `frontend/index.html` | theme-color = #863bff | ✓ VERIFIED | Line 6 |
| `frontend/package.json` | PWA devDeps + generate-pwa-assets script | ✓ VERIFIED | Lines 9, 30, 31 |
| `.gitignore` | `frontend/dev-dist/` listed | ✓ VERIFIED | Line 11 |
| `README.md` | PWA install paragraph | ✓ VERIFIED | Lines 90-92 |
| `frontend/dist/manifest.webmanifest` | Generated, valid, three icons | ✓ VERIFIED | Reproduced in fresh build during this verification |
| `frontend/dist/sw.js` | Workbox SW with precache + runtimeCaching | ✓ VERIFIED | 8 precache entries; NetworkFirst + 2× CacheFirst; no /ws |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `vite.config.ts` VitePWA.manifest.icons | `frontend/public/icons/pwa-*.png` | vite-plugin-pwa precache scan | ✓ WIRED | sw.js precache list contains `icons/pwa-192.png`, `icons/pwa-512.png`, `icons/pwa-maskable-512.png` with revision hashes — proves the plugin found and ingested the actual files |
| `main.tsx` | `virtual:pwa-register` | vite-plugin-pwa virtual module | ✓ WIRED | Build succeeded with `tsc -b && vite build` exit 0 — virtual module resolved at build time; tsconfig types shim works |
| `dist/sw.js` | `dist/manifest.webmanifest` | Workbox precacheAndRoute | ✓ WIRED | sw.js precache entry: `{url:"manifest.webmanifest",revision:"2a8127044a5255ec6f5b5afc01aaa374"}` |
| `package.json` script `generate-pwa-assets` | `frontend/public/icons/` | `pwa-assets-generator` CLI | ✓ WIRED | Script string present; assets-generator binary in node_modules; both Plan 01 SUMMARY deviations documented (rename + Pillow downsample) confirm the tool actually ran |
| `backend/main.py` SPA fallback | `dist/manifest.webmanifest`, `dist/sw.js`, `dist/icons/*.png` | FastAPI FileResponse via `app.get("/{path:path}")` | ✓ WIRED | `backend/main.py` line 41-48 serves arbitrary files from `frontend/dist/`; no backend changes needed for PWA artefacts to be reachable |
| `frontend/index.html` theme-color | `manifest.webmanifest` theme_color | manual visual consistency (D-05) | ✓ WIRED | Both = `#863bff`; old `#4f6df5` blue removed |

---

## Data-Flow Trace (Level 4)

Phase 3 produces a configuration + asset surface, not a data-rendering component. The "data flow" here is the build-time pipeline — verified end-to-end by:

| Stage | Input | Output | Status |
|-------|-------|--------|--------|
| Source SVG → PNG icons | `frontend/public/favicon.svg` (VUT mark, fill #863bff) | `frontend/public/icons/pwa-*.png` (3 files) | ✓ FLOWING — files exist with correct dimensions, non-zero size |
| Vite config → manifest | `vite.config.ts` VitePWA.manifest object | `dist/manifest.webmanifest` JSON | ✓ FLOWING — fresh build reproduces the exact theme_color, background_color, icons array specified in source |
| Vite config → service worker | `vite.config.ts` workbox.runtimeCaching | `dist/sw.js` registerRoute calls | ✓ FLOWING — minified sw.js contains `NetworkFirst({cacheName:"api-cache",networkTimeoutSeconds:3,...})` and both `CacheFirst` blocks for fonts; static config faithfully compiled to runtime SW |
| main.tsx → SW registration | `registerSW(...)` call | Browser registers `/sw.js` at runtime | ⚠️ STATIC-ONLY — Build-time wiring verified; runtime registration is a human verification item (Chromium DevTools) |

---

## Behavioural Spot-Checks

| Behaviour | Command | Result | Status |
|-----------|---------|--------|--------|
| Build pipeline runs clean | `cd frontend && npm run build` | exit 0; "PWA v1.3.0 mode generateSW precache 8 entries (231.47 KiB)" | ✓ PASS |
| Manifest is valid JSON | `cat dist/manifest.webmanifest | python3 -c "json.load(...)"` | Parses, all locked fields match | ✓ PASS |
| Manifest icons array has all three required entries with correct purposes | `python3 -c "purposes=[...]"` | `['any', 'any', 'maskable']`, srcs all `/icons/pwa-*.png` | ✓ PASS |
| sw.js contains NetworkFirst handler for /api | `grep -c NetworkFirst dist/sw.js` | 1 | ✓ PASS |
| sw.js contains CacheFirst handler for fonts.gstatic.com | `grep -c 'fonts\.gstatic' dist/sw.js` | matched in registerRoute call | ✓ PASS |
| sw.js does NOT route /ws | `grep -c /ws dist/sw.js` | 0 | ✓ PASS |
| sw.js precache contains all three icons + manifest + index.html | grep precache list | All present with revision hashes | ✓ PASS |
| index.html theme-color = #863bff | `grep content=` index.html | `content="#863bff"` | ✓ PASS |
| index.html does not contain old #4f6df5 blue | `grep -c '#4f6df5' index.html` | 0 | ✓ PASS |
| README has PWA install section | `grep -c '## PWA install\|Install app\|Add to Home Screen' README.md` | 2 hits (## PWA install + the body line containing both Install app and Add to Home Screen) | ✓ PASS |
| Backend SPA fallback can serve arbitrary dist files | inspect `backend/main.py` | `app.get("/{path:path}")` + FileResponse from `frontend/dist/` confirmed | ✓ PASS |

**Spot-check skips:** Live install prompt, SW activation, offline reload, maskable rendering, iOS install, WS regression — all routed to human verification (Step 8). Cannot be reliably tested without a browser session and active dev server.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| APP-01 | 03-01-assets, 03-02-wiring | PWA manifest with app icons (192px, 512px, maskable) and theme/background colours matching app palette | ✓ SATISFIED (automated); ? HUMAN (visual maskable check) | Manifest emitted with exact theme_color #863bff, background_color #faf9f7, three icons with correct sizes/purposes; physical PNG files at correct dimensions exist |
| APP-02 | 03-02-wiring | Service worker registered, caching static assets and the SPA shell (network-first for /api/*, no offline gameplay required) | ✓ SATISFIED (automated); ? HUMAN (runtime activation + offline reload) | sw.js generated with 8 precache entries (SPA shell), NetworkFirst handler matches `/api`, no /ws matcher; main.tsx calls registerSW |
| APP-03 | 03-02-wiring | Installable to desktop on Chromium and Safari — "Add to home screen" / "Install app" prompt available, app launches in standalone window | ✓ SATISFIED (automated); ? HUMAN (browser install prompt + standalone launch on both Chromium and Safari) | manifest has `display: standalone`, three valid icon entries, `start_url: /`, `scope: /`, `apple-mobile-web-app-capable=yes` in index.html. Static prerequisites for installability all met. |
| APP-04 | (none — deferred) | Visual polish pass driven by Pippa's /gsd-sketch design exploration | ⏸ DEFERRED | Moved to Phase 3.1 per D-12. ROADMAP SC #4 footnote: "(moves to Phase 3.1 per D-12; Phase 3 verifies on criteria #1–#3 only)". REQUIREMENTS.md shows APP-04 unchecked. Path forward: Pippa runs `/gsd-sketch` → `/gsd-sketch-wrap-up` to produce a `sketch-findings-*` project skill, then `/gsd-insert-phase 03.1-visual-polish` creates the follow-up phase. |

**Orphan check:** REQUIREMENTS.md maps APP-01, APP-02, APP-03, APP-04 to Phase 3. Plans 03-01 and 03-02 collectively claim APP-01, APP-02, APP-03 in their `requirements:` frontmatter. APP-04 is *intentionally* not claimed by either plan — by design, per D-12. This is not an orphan; it's a documented carve-out. Verifier confirms: REQUIREMENTS.md still shows APP-04 as `Pending` with no checkmark, and traceability table shows status `Pending` — the rest of the system already understands APP-04 is not done.

---

## Anti-Patterns Found

Files modified in this phase (per SUMMARYs): `frontend/vite.config.ts`, `frontend/src/main.tsx`, `frontend/tsconfig.app.json`, `frontend/index.html`, `frontend/package.json`, `.gitignore`, `README.md`. Plus binary asset files (no anti-pattern surface).

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | No TODO/FIXME/placeholder/empty-implementation matches found in any modified non-binary file | — | Clean |

The `console.log` calls in `main.tsx` SW registration callbacks are deliberate observability (per RESEARCH §"Service Worker Registration in React") and were specified in the plan, not a stub.

---

## Deferred Items (Step 9b)

| # | Item | Addressed In | Evidence |
|---|------|--------------|----------|
| 1 | APP-04: visual design reflects Pippa's /gsd-sketch direction (updated colours, typography, component styles) | Phase 3.1 (to be inserted via `/gsd-insert-phase` once Pippa wraps her sketch findings into a project-local skill) | ROADMAP Phase 3 success criterion #4 explicit footnote: *"(moves to Phase 3.1 per D-12; Phase 3 verifies on criteria #1–#3 only)"*. CONTEXT D-12: "APP-04 sequencing → split into Phase 3.1." Plan 03-01 and 03-02 both explicitly exclude APP-04 from their `requirements:` frontmatter. PROJECT.md and CLAUDE.md both flag APP-04 as gated on /gsd-sketch. |

This is an **informational deferral**, not a gap. Phase 3 as currently scoped (APP-01/02/03) does not require APP-04 to close. APP-04's path forward is documented and well-understood; it is not abandoned.

---

## Human Verification Required

Six items must be verified in a real browser before Phase 3 can be marked truly complete. Five of them gate APP-01/02/03 acceptance (the static prerequisites are met, but the runtime behaviours can only be observed by a human). The sixth (WebSocket regression) is a critical correctness check that the SW didn't inadvertently break multiplayer.

### 1. Chromium "Install app" prompt

**Test:** With backend + frontend running (`./run.sh` or `docker-compose up`), open `http://localhost:8000` (or `http://localhost:4173` after `npm run preview`) in Chrome/Edge/Brave. Wait ~30 seconds.
**Expected:** "Install app" icon appears in the address bar. Clicking it offers to install TV Bingo. After install, the app launches in a standalone window with no browser chrome.
**Why human:** Chromium's installability heuristics are runtime-only; cannot be tested by static analysis or curl.

### 2. Service worker activation

**Test:** Open the running app in Chromium → DevTools → Application → Service Workers.
**Expected:** `sw.js` listed with status "activated and running". No console errors about `Failed to register a ServiceWorker` or `virtual:pwa-register not found`. Application → Manifest panel shows the manifest with three icons rendered, no red banners.
**Why human:** SW lifecycle and DevTools warnings are runtime-only.

### 3. Maskable icon preview — VUT mark not cropped

**Test:** DevTools → Application → Manifest → Icons → click the maskable-512 entry. Inspect preview.
**Expected:** VUT brand mark fits inside the circle/squircle mask without the directional chevrons being cropped. Mark is centred and fully visible within the 80%-diameter safe zone.
**Why human:** RESEARCH Pitfall 2 explicitly identifies this as a verification step. Auto-pad applies a generic 15% inset; the directional VUT chevrons may not survive aggressive system masks. If cropped, a hand-designed maskable variant becomes a Phase 3.1 backlog item — not a Phase 3 blocker, but worth knowing now.

### 4. Offline reload renders SPA shell

**Test:** Load app once online. DevTools → Network → set throttling to "Offline". Reload the page.
**Expected:** SPA shell renders (HTML + CSS + JS + cached fonts). API calls fail with network error (this is correct — APP-02 spec says "no offline gameplay required").
**Why human:** Workbox precache + runtimeCaching offline behaviour is observable only via the browser's offline simulator.

### 5. iOS Safari Add to Home Screen (optional for v1)

**Test:** Open app in Safari iOS 15.4+ (real device or simulator). Tap Share → "Add to Home Screen".
**Expected:** Option is available. After install, tapping the icon launches the app fullscreen. Icon shows the VUT purple mark (not a screenshot fallback). Per D-04 we did not ship `apple-touch-icon`; iOS <15.4 will fall back to a screenshot, which is the accepted tradeoff.
**Why human:** iOS install flow requires a real iOS device or simulator. Mum/Gordie's primary install target is Chromium desktop, so this is lower-priority — but the APP-03 acceptance criterion mentions Safari explicitly.

### 6. WebSocket multiplayer regression check

**Test:** With the running app (preferably from `dist/` via `npm run preview` so the SW is active), open two browser tabs/windows. Tab 1: create a new game and copy the link. Tab 2: open the link with a different player_id. Tab 2: mark a square. Tab 1: confirm the mark appears in real-time. DevTools → Network → WS tab in either tab should show the WebSocket open with frames flowing.
**Expected:** Multiplayer sync works exactly as it did before Phase 3.
**Why human:** The static-analysis check (no `/ws` urlPattern in sw.js) verifies the *config* is right, but the *runtime* check that WebSocket connections still flow correctly with the SW active is the only thing that proves T-03-02-01 mitigation actually holds in practice. If something subtle in `clientsClaim` or `skipWaiting` interferes with WS handshakes, this catches it.

---

## Gaps Summary

**No automated gaps.** Every must-have, artefact, and key link verified successfully against the codebase. The build is reproducible. The SW is wired. The manifest is correct. The icons exist. The README documents the install flow.

**One intentional deferral.** APP-04 (visual polish) is the only Phase 3 success criterion not addressed by Phase 3 plans — by explicit design (D-12). It moves to Phase 3.1 once Pippa runs `/gsd-sketch` + `/gsd-sketch-wrap-up`. No remediation needed in Phase 3.

**Six human verification items.** These cannot be skipped; PWA installability is fundamentally a runtime browser behaviour. The static prerequisites are all in place — the human checks confirm the runtime payoff actually materialises.

**Recommended next steps:**

1. **UAT now** (Pippa or verifier): Run human verification items 1–4 (Chromium install + SW activation + maskable preview + offline reload) in one ~5-minute session. Item 6 (WS regression) is critical — do not skip. Item 5 (iOS) is nice-to-have for v1 family use; can defer to a real-device check during deploy.
2. **If maskable preview fails (#3)**: Add "Hand-designed maskable variant" to Phase 3.1 backlog. Not a Phase 3 blocker; APP-01 is satisfied because the maskable file exists and matches the spec — visual polish on it belongs with the rest of APP-04 work.
3. **Phase 3.1 trigger** (separate from this verification): Pippa runs `/gsd-sketch` to explore visual directions, then `/gsd-sketch-wrap-up` to encode findings as a project skill, then `/gsd-insert-phase 03.1-visual-polish` to create the follow-up phase. APP-04 closes there.

---

*Verified: 2026-05-06*
*Verifier: Claude (gsd-verifier, Opus 4.7 1M)*
