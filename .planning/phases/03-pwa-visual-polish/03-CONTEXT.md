# Phase 3: PWA & Visual Polish - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert the app to an installable PWA on Chromium and Safari (manifest + icons + service worker, SPA shell loads offline, `/api/*` stays network-first, standalone window) and apply visual polish driven by Pippa's `/gsd-sketch` findings.

**Sketch dependency carve-out:** PWA mechanics (APP-01, APP-02, APP-03) ship first within Phase 3 and do **not** depend on sketch findings. APP-04 (visual polish) blocks on Pippa's `/gsd-sketch` exploration; per D-08 it's deferred to a Phase 3.1 inserted after sketch findings are wrapped into a project-local skill (`/gsd-sketch-wrap-up`). Phase 3 closes when APP-01/02/03 verify; Phase 3.1 picks up APP-04 separately.

**theme-color cleanup ride-along:** `frontend/index.html` currently declares `<meta name="theme-color" content="#4f6df5">` (a blue that matches neither the sage in-app palette nor the chosen VUT-purple icon). This phase corrects it to the chosen manifest `theme_color` value (D-05) so the meta tag and the manifest agree.

</domain>

<decisions>
## Implementation Decisions

### App Icon Design (the decisions the user selected to discuss)

- **D-01: Reuse the existing VUT favicon as the icon source.** `frontend/public/favicon.svg` (the purple Very Useful Technology brand mark, fill `#863bff`) is the single source of truth for all generated icon sizes. Zero new design work in this phase. Conscious tradeoff: the purple VUT mark differs from the sage in-app palette, but the user owns VUT and a family-internal app within the VUT universe is on-brand for them.
- **D-02: PNG generation via `@vite-pwa/assets-generator`.** Official Workbox/`vite-plugin-pwa` companion CLI. One source SVG → all sizes via an `npm run generate-pwa-assets` script (or equivalent). Pairs naturally with the `vite-plugin-pwa` toolchain selected as Claude's Discretion below (D-09).
- **D-03: Maskable variant uses auto-pad.** The generator adds the safe-area padding to produce `pwa-maskable-512.png` from the same source SVG. No separate hand-designed maskable variant. Acceptable visual tradeoff for the family-LAN scope; the VUT mark has enough negative space around it that auto-padding will not crop badly on circle/squircle adaptive-icon shapes.
- **D-04: Icon files shipped in this phase.**
  - `frontend/public/icons/pwa-192.png` (192×192) — APP-01 spec minimum
  - `frontend/public/icons/pwa-512.png` (512×512) — APP-01 spec minimum
  - `frontend/public/icons/pwa-maskable-512.png` (512×512, with auto-pad) — APP-01 spec minimum
  - `frontend/public/favicon.ico` (16/32 multi-resolution) — browser tab fallback
  - `frontend/public/favicon-32.png` (32×32) — modern browser tab
  - `frontend/public/favicon.svg` *(existing, kept)* — modern browser tab
  - **Out of scope:** Apple touch icon (180×180) and iOS splash screens deliberately deferred — Mum and Gordie's primary install target is Chromium on desktop, not iOS Add-to-Home-Screen. APP-03's Safari criterion is met without these (Safari falls back to the manifest icons). If iOS install ergonomics turn out to need work, Phase 3.1 or a backlog item picks it up.

### Manifest Properties

- **D-05: `theme_color = "#863bff"`** (VUT purple) — match the icon. Standalone-window chrome and mobile status bar render purple, consistent with the install icon. The `<meta name="theme-color">` tag in `frontend/index.html` is updated to the same value in the same commit (replaces the current `#4f6df5` blue). The mismatch with the sage in-app palette is accepted as the tradeoff for keeping the VUT identity on the install surface.
- **D-06: `background_color`** — Claude's Discretion. Suggest `#faf9f7` (warm-50, the in-app body background) so the launch splash blends into the loaded app rather than flashing a different colour. Planner can pick `#ffffff` (surface white) if it tests cleaner — minor visual call.
- **D-07: Other manifest fields** (Claude's Discretion, sane defaults expected):
  - `name`: "TV Bingo" (matches `<title>`)
  - `short_name`: "TV Bingo"
  - `display`: `standalone`
  - `start_url`: `/`
  - `scope`: `/`
  - `id`: `/` (or stable equivalent)
  - `orientation`: omit (let device decide)
  - `description`: short — "Multiplayer TV-show bingo." Planner can refine.
  - `lang`: `"en"`

### File Layout

- **D-08: Icons live under `frontend/public/icons/`.** Subdirectory keeps the public root tidy. Manifest references `/icons/pwa-192.png`, `/icons/pwa-512.png`, `/icons/pwa-maskable-512.png`. `favicon.svg`, `favicon.ico`, and `favicon-32.png` stay at the public root for browser-tab fallback.
- **D-09: Delete `frontend/public/icons.svg`** in the same commit as the icon work. Grep confirms zero consumers — it's a sprite of social-network icons (Bluesky, Discord, GitHub, X, etc.) left over from a VUT site template, unused by this app. Atomic cleanup; ~5KB of dead static gone.

### Claude's Discretion (areas not selected for discussion — these defaults stand unless plan-phase research surfaces a reason to revisit)

- **D-10: PWA toolchain → `vite-plugin-pwa`.** Workbox-based Vite plugin. Auto-generates manifest output, registers the service worker, precaches the build output. Pairs with `@vite-pwa/assets-generator` (D-02). Aligns with "path of least resistance" steering (Phase 2 specifics carry-forward) and avoids hand-rolled `sw.js` + manual `manifest.webmanifest` maintenance.
- **D-11: Service worker caching strategy → Workbox defaults.**
  - **SPA shell** — precache the build output (`index.html`, JS/CSS bundles, icons) — ships with the SW.
  - **`/api/*`** — `NetworkOnly` or `NetworkFirst` (planner picks; spec says "network-first, no offline gameplay required"). No background sync, no offline queue.
  - **`/ws/*`** — explicitly excluded from SW handling (WebSocket upgrade requests should bypass).
  - **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`) — `CacheFirst` with reasonable expiration (Workbox recipe). Improves repeat-visit load.
  - **Update UX** — `registerType: 'autoUpdate'` (skipWaiting + clientsClaim). No in-app "New version available — refresh?" prompt for v1; family-LAN context, single-tab use, low-friction update is fine. Revisit in v2 if analytics show stale-version behaviour.
- **D-12: APP-04 sequencing → split into Phase 3.1.** Phase 3 ships APP-01/02/03 only and verifies on those. APP-04 (visual polish from sketch findings) is inserted as Phase 3.1 *after* Pippa runs `/gsd-sketch` and `/gsd-sketch-wrap-up` to produce a `sketch-findings-*` skill. Mechanism: `/gsd-insert-phase` creates `03.1-visual-polish` once the skill exists. ROADMAP Phase 3 success criterion #4 (sketch-driven visuals) moves to Phase 3.1; Phase 3 verifier checks success criteria #1, #2, #3 only.
- **D-13: Commit slicing** — Claude's Discretion. Suggested 2-3 atomic commits per Phase 1/2 precedent (Conventional Commits):
  - `feat(pwa): manifest, icons, and service worker via vite-plugin-pwa` (touches `vite.config.ts`, `package.json`, `frontend/public/icons/*`, `frontend/public/favicon.{ico,svg,png}`, `frontend/index.html` theme-color fix)
  - `chore(public): drop unused icons.svg sprite` (deletion only — could ride along in the feat commit if planner prefers atomic-by-feature over split)
  - Branch: stay on `claude/resume-ai-app-ClIA9` (Phase 1 D-15 carry-forward).
- **D-14: README update** — minor edit to root `README.md` "PWA install" subsection (under the deploy/usage area). Single paragraph: "On Chromium-based browsers, an 'Install app' icon appears in the address bar; on Safari/iOS, use Share → Add to Home Screen." No new top-level section. Phase 5 / DEPLOY-01 may extend further; this is just the user-facing note that install works.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — v1 polish-and-ship vision; "drop to desktop, feels like an app" PWA framing; family-only kainga-core hosting; APP-04 sketch dependency note.
- `.planning/REQUIREMENTS.md` APP-01, APP-02, APP-03, APP-04 — locked acceptance criteria.
- `.planning/ROADMAP.md` §"Phase 3: PWA & Visual Polish" — phase goal + 4 success criteria. Per D-12, criterion #4 will move to Phase 3.1 (sketch-driven visual polish) inserted via `/gsd-insert-phase` once sketch findings exist.
- `CLAUDE.md` — project orientation; "Phase 3's APP-04 (visual polish) depends on Pippa running /gsd-sketch" — confirmed and acted on by D-12.

### Prior phase carry-forward
- `.planning/phases/01-code-hygiene/01-CONTEXT.md` — D-15 (stay on `claude/resume-ai-app-ClIA9` branch); commit-slicing convention (atomic by feature, Conventional Commits).
- `.planning/phases/02-ai-provider-flexibility/02-CONTEXT.md` — "path of least resistance" steering preference (specifics section); README extension precedent (D-08, Phase 5 extends rather than rewrites).

### Codebase audit (informs implementation surface)
- `.planning/codebase/STACK.md` — Vite 8.0.4, React 19.2.4, no test framework; `httpx`/`anthropic` are backend-only — frontend deps stay minimal.
- `.planning/codebase/STRUCTURE.md` — `frontend/public/` for static assets; `frontend/dist/` is the Vite build output; `backend/main.py` SPA fallback serves arbitrary files from `frontend/dist/` so manifest + sw.js + icon files route through it without backend changes.
- `.planning/codebase/CONCERNS.md` — flags Google-Fonts external dependency (subject to D-11 cache strategy); flags WebSocket origin/auth gap (out of scope for this phase, deferred to v2 SEC-01).

### Files touched in this phase
- `frontend/vite.config.ts` — add `vite-plugin-pwa` config (per D-10).
- `frontend/package.json` — add `vite-plugin-pwa` and `@vite-pwa/assets-generator` to `devDependencies`; add `generate-pwa-assets` npm script.
- `frontend/index.html` — update `<meta name="theme-color">` from `#4f6df5` to `#863bff` (per D-05); confirm `apple-mobile-web-app-capable` stays.
- `frontend/public/icons/` *(new directory)* — `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png` (per D-04).
- `frontend/public/favicon.svg` — kept as-is, source of truth for icon generation (per D-01).
- `frontend/public/favicon.ico`, `frontend/public/favicon-32.png` *(new)* — browser-tab fallback (per D-04).
- `frontend/public/icons.svg` — **deleted** (per D-09).
- `frontend/src/main.tsx` *or* a new `frontend/src/registerSW.ts` — service worker registration (vite-plugin-pwa generates the boilerplate; planner's call where to import it).
- `README.md` — minor PWA install paragraph (per D-14).
- `.gitignore` — verify the SW build output (`dev-dist/`, `sw.js` in dist) is appropriately gitignored (vite-plugin-pwa docs cover this).

### vite-plugin-pwa & assets-generator docs (researcher should fetch current versions)
- `https://vite-pwa-org.netlify.app/` — toolchain overview, Vite integration.
- `https://vite-pwa-org.netlify.app/guide/` — config options, registerType, Workbox config.
- `https://vite-pwa-org.netlify.app/assets-generator/` — `@vite-pwa/assets-generator` CLI, source SVG conventions, maskable padding behaviour.
- `https://developer.chrome.com/docs/workbox/modules/workbox-strategies/` — caching strategies referenced in D-11 (NetworkFirst, CacheFirst, StaleWhileRevalidate).
- `https://web.dev/articles/maskable-icon` — maskable icon safe-area spec (informs whether D-03 auto-pad will look right; researcher should verify against the VUT mark's negative space).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`frontend/public/favicon.svg`** — VUT brand mark in SVG form, used as the single icon source per D-01. Note: contains complex Gaussian blur filters and a clip-path mask; `@vite-pwa/assets-generator` rasterizes via headless browser so this should render correctly at small sizes, but researcher should verify on the 192×192 output as a sanity check.
- **VUT design system in `frontend/src/styles/global.css`** — sage-green palette (`--brand: #606b53`), Inter/Playfair/JetBrains Mono fonts loaded from Google Fonts. Already in place; Phase 3 doesn't touch the in-app palette (that's APP-04 / Phase 3.1).
- **`backend/main.py` SPA fallback** — `app.get("/{path:path}")` serves any file in `frontend/dist/` via `FileResponse`, with `index.html` as the SPA fallback. The manifest, service worker, and icon files all route through this without backend changes. **No backend work in this phase.**
- **Existing index.html PWA hints** — `<meta name="viewport" content="..., viewport-fit=cover">`, `<meta name="apple-mobile-web-app-capable" content="yes">` already present. Only the `theme-color` value needs updating (per D-05).

### Established Patterns
- **Vite-driven build** — all frontend tooling slots into the Vite plugin pipeline; `vite-plugin-pwa` follows this pattern naturally.
- **Conventional Commits** — recent log shows `feat(...)`, `fix(...)`, `chore(...)`, `docs(...)` prefixes. Phase 3 commits follow the same shape (suggested subjects in D-13).
- **No CI / no pre-commit hooks** — manual verification of clean git state after each commit (per Phase 1/2 precedent). Build with `npm run build`, smoke-test the install flow in Chromium, commit.
- **Atomic commit per feature** (Phase 1 D-01 carry-forward) — PWA infrastructure and icon work bundled in one feat commit makes sense; the `icons.svg` deletion can ride along or split per planner's preference (D-09 / D-13).

### Integration Points
- **`frontend/vite.config.ts`** — current config is minimal (React plugin + dev proxy). Adding `vite-plugin-pwa` to the `plugins` array is the primary integration point; rest of the config is untouched.
- **`frontend/src/main.tsx`** — current entry mounts `<App />`. Service worker registration (vite-plugin-pwa generates a `virtual:pwa-register` module) is added here as a single import — minimal change.
- **`frontend/dist/`** — Vite build output that the backend serves. After this phase, `dist/` includes `manifest.webmanifest`, `sw.js`, `workbox-*.js`, and the `icons/*.png` set. All flow through `backend/main.py`'s existing `FileResponse` fallback unchanged.

### What's NOT Touched (Phase 3 boundary)
- **All backend code** — `backend/**/*.py`, `requirements.txt`, `docker-compose.yml`. The PWA is an entirely frontend-static-files concern; the existing SPA fallback handles delivery.
- **In-app visual styling** (`global.css`, `bingo-card.css`, page components) — that's APP-04 / Phase 3.1 territory, blocked on sketch findings.
- **CORS, WebSocket auth** — known concerns from the audit, but out of scope for v1 and explicitly deferred to v2 (SEC-01, SEC-02 in REQUIREMENTS.md).

</code_context>

<specifics>
## Specific Ideas

- **"Drop to desktop, feels like an app"** is the steering vision — the success metric is Mum or Gordie clicking a desktop icon and getting straight into a TV Bingo standalone window, no browser chrome, no address bar.
- **The VUT brand on a family app is intentional, not accidental.** Pippa runs Very Useful Technology; the family bingo app sits inside that universe. The purple VUT mark on Mum's desktop is on-brand. (Sage palette inside the app is also fine; the disconnect between install-icon and in-app brand is an accepted tradeoff, not a bug.)
- **Path of least resistance carries forward from Phase 2.** Toolchain choice (`vite-plugin-pwa`), generator choice (`@vite-pwa/assets-generator`), maskable strategy (auto-pad), and update UX (auto-skipWaiting) all consistently pick the lowest-friction default. Hand-rolled SW, manual icon export, and "New version" prompts are all explicitly rejected for v1.
- **Phase 3.1 carve-out is the right cut.** APP-04 needs a creative input (sketch findings) that doesn't exist yet. Blocking the entire phase on a non-existent artifact is wrong; doing visual polish without the sketch is also wrong. Splitting it lets PWA mechanics ship now and the visual polish land cleanly when the design intent exists.

</specifics>

<deferred>
## Deferred Ideas

Captured here so they're not lost, but explicitly **out of scope for Phase 3**:

- **Phase 3.1 (Visual Polish)** — APP-04 deferred per D-12. Triggered by Pippa running `/gsd-sketch` + `/gsd-sketch-wrap-up`, then `/gsd-insert-phase 03.1-visual-polish`. ROADMAP Phase 3 success criterion #4 moves to that phase.
- **Apple touch icon (180×180)** — deferred per D-04. Add via Phase 3.1 or a backlog item if iOS install ergonomics turn out to matter for Mum/Gordie.
- **iOS splash screens** (`apple-touch-startup-image` per device) — deferred per D-04. Significant size bloat, low ROI for desktop-first install.
- **In-app "new version available — refresh?" prompt** — explicitly rejected in D-11 for v1. Revisit in v2 if analytics (Phase 4) show stale-version behaviour or if multi-tab use becomes common.
- **Hand-designed maskable variant** — explicitly rejected in D-03 for v1. Revisit only if the auto-pad output looks bad on Android adaptive-icon shapes during verification.
- **Dedicated bingo-themed icon design** (5×5 grid, "TVB" letterform, etc.) — out of scope. Per D-01 the VUT mark is the deliberate choice. A future milestone or v2 may revisit if/when public release (PUBLIC-01) is on the table — a public showcase might want a topic-specific identity.
- **Apple touch icon link tag in `index.html`** — only needed if the 180×180 icon ships. Deferred with D-04.
- **Service worker for offline gameplay** — explicitly out of scope per APP-02 ("no offline gameplay required"). The SW handles the SPA shell only; gameplay needs the backend WebSocket to function.
- **Background sync / offline queue for `/api/*`** — out of scope per D-11. Family-LAN context, not field-mobile use; transient connectivity is not a real failure mode.

</deferred>

---

*Phase: 03-pwa-visual-polish*
*Context gathered: 2026-05-05*
