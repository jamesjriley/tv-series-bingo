# Phase 3: PWA & Visual Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 03-pwa-visual-polish
**Areas discussed:** App icons (only — user explicitly skipped the other three offered areas)

---

## Gray Area Selection

The user was offered four candidate gray areas for Phase 3:

| Area | Description | Selected |
|------|-------------|----------|
| PWA toolchain | vite-plugin-pwa vs hand-rolled | |
| Service worker caching | What's cached, update UX, /api/* policy | |
| App icons | Source design + generator + maskable + sizes | ✓ |
| APP-04 sequencing | Split phase, block, or parallel-sketch | |

**User's choice:** App icons only.
**Notes:** Three unselected areas were captured as Claude's Discretion in CONTEXT.md (D-10, D-11, D-12) with explicit defaults so the planner does not need to re-ask: `vite-plugin-pwa` toolchain, Workbox-default caching with auto-update SW, and Phase 3.1 split for APP-04.

---

## App icons — Round 1: design + generator + maskable + sizes

### Q1: What should the app icon depict?

| Option | Description | Selected |
|--------|-------------|----------|
| Bingo grid motif | 5×5 grid in sage palette — "this is a bingo app" | |
| Letterform / 'TVB' | Type-driven, sage background, matches typography | |
| Reuse VUT favicon | Auto-generate from existing VUT purple logo, zero design effort | ✓ |
| Defer to sketch findings | Wait for /gsd-sketch — couples APP-01 to APP-04 | |

**User's choice:** Reuse VUT favicon.
**Notes:** The VUT brand on a family app is the intentional choice — Pippa runs VUT, the family bingo app lives inside that universe. Tradeoff (icon purple ≠ in-app sage) acknowledged in D-01.

### Q2: How should the PNGs be generated from the source SVG?

| Option | Description | Selected |
|--------|-------------|----------|
| @vite-pwa/assets-generator | Official Workbox/vite-plugin-pwa companion, npm script | ✓ |
| pwa-asset-generator | Standalone puppeteer-based, more platform outputs | |
| Hand-export from SVG editor | Most control, most fragile | |
| You decide | Claude's discretion based on toolchain | |

**User's choice:** `@vite-pwa/assets-generator`.
**Notes:** Pairs with the implicitly-locked `vite-plugin-pwa` toolchain (D-10). Adds an `npm run generate-pwa-assets` workflow (or equivalent) — D-02.

### Q3: Maskable icon — separate design or auto-pad?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-pad via generator | Single source SVG, generator adds safe-area padding | ✓ |
| Hand-design maskable variant | Two SVGs, fills circle/squircle properly | |
| You decide | Claude picks based on look at safe-area scale | |

**User's choice:** Auto-pad via generator.
**Notes:** Acceptable for family-LAN scope; the VUT mark has enough negative space for auto-pad to work. Hand-designed maskable explicitly deferred (D-03 + Deferred Ideas).

### Q4: Which icon files should ship in this phase?

| Option | Description | Selected |
|--------|-------------|----------|
| Spec minimum (192/512/maskable) | Just APP-01's explicit requirements | ✓ |
| Apple touch icon (180×180) | iOS Add-to-Home-Screen tile | |
| Browser favicon (16/32 + svg) | Browser-tab fallback | ✓ |
| Splash screens (iOS) | Per-device apple-touch-startup-image | |

**User's choice:** Spec minimum + Browser favicon.
**Notes:** Apple touch icon and iOS splash screens deferred — the install target for Mum and Gordie is desktop Chromium, not iOS. Captured in D-04 + Deferred Ideas. Safari falls back to manifest icons without an Apple touch icon, so APP-03 is still met.

---

## App icons — Round 2: theme color + path + cleanup

### Q5: Manifest theme_color (icon purple #863bff vs in-app sage #606b53 vs current-but-mismatched #4f6df5 blue)?

| Option | Description | Selected |
|--------|-------------|----------|
| VUT purple (#863bff) | Match the icon, status bar/window chrome purple | ✓ |
| Sage brand (#606b53) | Match in-app palette, fixes index.html mismatch the other way | |
| Sage on chrome, purple on splash | Compromise: theme_color=sage, background_color=purple-tinted | |
| You decide | Claude picks based on standalone-mode look | |

**User's choice:** VUT purple (#863bff).
**Notes:** Internally consistent with the icon choice (D-01) — install surface is purple, in-app UI is sage, the mismatch is a deliberate brand-bridge. Forces a ride-along edit to `index.html`'s `<meta name="theme-color">` (currently `#4f6df5`) to keep meta and manifest aligned. Captured in D-05.

### Q6: Where should the generated icon files live?

| Option | Description | Selected |
|--------|-------------|----------|
| frontend/public/icons/ | Subdirectory keeps public root tidy | ✓ |
| frontend/public/ (flat) | All icons alongside favicon.svg | |

**User's choice:** `frontend/public/icons/`.
**Notes:** Manifest references `/icons/pwa-192.png` etc. `favicon.svg`, `favicon.ico`, `favicon-32.png` stay at the root. Captured in D-08.

### Q7: Should icons.svg (the unused social-icon sprite) be deleted in this phase?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, delete it | Grep shows zero consumers — VUT-template leftover | ✓ |
| Leave it alone | Defer cleanup to avoid scope creep | |

**User's choice:** Yes, delete it.
**Notes:** ~5KB dead static, atomic with the icon work. Captured in D-09.

---

## App icons — Round 3: wrap

### Q8: Anything else to discuss, or ready for context?

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Lock decisions + the three Claude's-Discretion defaults | ✓ |
| Discuss PWA toolchain | Open up vite-plugin-pwa vs hand-rolled | |
| Discuss SW caching | Open up cache strategy / update UX / API timeout | |
| Discuss APP-04 sequencing | Open up split-phase vs block vs parallel-sketch | |

**User's choice:** I'm ready for context.
**Notes:** The three offered defaults (vite-plugin-pwa, Workbox defaults, Phase 3.1 split) were stated explicitly before this prompt so the user could override; they accepted all three by selecting "ready for context". Defaults locked as D-10, D-11, D-12.

---

## Claude's Discretion

Areas where the user did not request discussion and where defaults stand:

- **D-10:** PWA toolchain → `vite-plugin-pwa`
- **D-11:** SW caching → Workbox defaults (precache shell, NetworkFirst /api, CacheFirst Google Fonts, autoUpdate)
- **D-12:** APP-04 sequencing → split into Phase 3.1 inserted after sketch findings exist
- **D-06:** `background_color` value (suggest warm-50 `#faf9f7`, planner can pick `#ffffff`)
- **D-07:** Other manifest fields (`name`, `short_name`, `display`, `start_url`, etc.) — sane defaults
- **D-13:** Commit slicing — 2-3 atomic commits per Phase 1/2 precedent
- **D-14:** README PWA-install paragraph — minor edit, planner's call on exact wording

## Deferred Ideas

See CONTEXT.md `<deferred>` section. Notable: Phase 3.1 (visual polish), Apple touch icon, iOS splash screens, hand-designed maskable variant, in-app update prompt, dedicated bingo-themed icon, offline gameplay, background sync.
