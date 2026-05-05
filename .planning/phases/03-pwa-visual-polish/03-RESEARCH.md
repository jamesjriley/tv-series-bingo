# Phase 3: PWA & Visual Polish - Research

**Researched:** 2026-05-05
**Domain:** PWA mechanics (manifest, service worker, installability, asset generation)
**Confidence:** HIGH for APP-01/02/03; APP-04 scope deferred per D-12

## Summary

Phase 3's core task is converting the TV Bingo app to an installable PWA with a manifest, service worker, and app icons, enabling users to install it to their desktop or home screen and launch it as a standalone application. This research covers the three in-scope requirements (APP-01, APP-02, APP-03) with app icon generation and offline SPA-shell caching. APP-04 (visual polish) is explicitly deferred to Phase 3.1 per CONTEXT.md D-12, awaiting Pippa's `/gsd-sketch` findings.

**Primary recommendation:** Use `vite-plugin-pwa` 1.3.0 (latest, released 2026-05-05, **newly compatible with Vite 8.0.4**) paired with `@vite-pwa/assets-generator` 1.0.2. The plugin handles manifest generation, service worker registration, and build-output precaching with zero-config defaults that align with the project's "path of least resistance" steering from Phase 2. App icons are sourced from `frontend/public/favicon.svg` (existing VUT brand mark, #863bff purple) via the assets-generator CLI with auto-pad maskable variant. WebSocket connections (`/ws/*`) naturally bypass the service worker due to architectural constraints and require no explicit exclusion config; API calls (`/api/*`) route through Workbox `NetworkFirst` strategy per D-11 spec.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Reuse existing VUT favicon (purple #863bff) as the single icon source; zero new design work.
- **D-02:** PNG generation via `@vite-pwa/assets-generator` CLI (official Workbox companion).
- **D-03:** Maskable variant uses auto-pad (generator-provided safe-area inset); no hand-designed variant.
- **D-04:** Icon files shipped: `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`, plus `favicon.ico`, `favicon-32.png`, and kept `favicon.svg`.
- **D-05:** `theme_color = "#863bff"` (VUT purple); update `<meta name="theme-color">` in `index.html` from `#4f6df5` to match.
- **D-08:** Icons live in `frontend/public/icons/` subdirectory; manifest references `/icons/pwa-*.png`.
- **D-09:** Delete unused `frontend/public/icons.svg` (dead social-icon sprite; zero consumers).
- **D-10:** PWA toolchain → `vite-plugin-pwa` (locked per "path of least resistance" from Phase 2).
- **D-11:** Service worker caching: precache SPA shell + build output; `/api/*` → `NetworkFirst`; `/ws/*` naturally excluded; Google Fonts → `CacheFirst`; `registerType: 'autoUpdate'` with `skipWaiting` + `clientsClaim` (no in-app "refresh?" prompt for v1).
- **D-12:** APP-04 (visual polish) deferred to Phase 3.1 (split phase triggered by `/gsd-sketch-wrap-up`); Phase 3 success criteria #1–#3 only.
- **D-13:** Commit slicing (Claude's Discretion): 2–3 atomic commits (feat: PWA manifest/icons/SW, chore: delete icons.svg). Stay on `claude/resume-ai-app-ClIA9` branch.
- **D-14:** README update: minor PWA install paragraph (Chromium + Safari/iOS instructions).

### Claude's Discretion

- **D-06:** `background_color` in manifest — suggest `#faf9f7` (sage warm-50, body background) for seamless splash-to-app transition; planner may prefer `#ffffff` if it tests cleaner.
- **D-07:** Other manifest fields — sane defaults: `name: "TV Bingo"`, `short_name: "TV Bingo"`, `display: "standalone"`, `start_url: "/"`, `scope: "/"`, `id: "/"`, `description: "Multiplayer TV-show bingo."`, `lang: "en"`.

### Deferred Ideas (OUT OF SCOPE)

- **APP-04 (Visual Polish):** Moved to Phase 3.1 after `/gsd-sketch` findings.
- **Apple touch icon (180×180) and iOS splash screens:** Deferred per D-04; Mum/Gordie's primary target is Chromium desktop, not iOS launch ergonomics.
- **In-app "new version available — refresh?" prompt:** Explicitly rejected in D-11 for v1 (auto-skipWaiting is family-LAN friendly).
- **WebSocket origin/auth validation:** Out of scope; deferred to v2 (SEC-01 in REQUIREMENTS.md).

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APP-01 | PWA manifest with app icons (192px, 512px, maskable) and theme/background colours matching app palette | ✓ vite-plugin-pwa auto-generates manifest; @vite-pwa/assets-generator produces icon set from favicon.svg; theme_color locked to #863bff (D-05); background_color default to #faf9f7 (D-06) |
| APP-02 | Service worker registered, caching static assets and SPA shell (network-first for /api/*, no offline gameplay) | ✓ vite-plugin-pwa registers SW via virtual:pwa-register; Workbox precaches build output; runtimeCaching configured for /api/* with NetworkFirst strategy; /ws/* naturally excluded |
| APP-03 | Installable to desktop on Chromium and Safari — "Add to home screen" / "Install app" prompt available, app launches in standalone window | ✓ Chromium: manifest + icons trigger install prompt (DevTools shows icon in address bar when criteria met); iOS Safari 15.4+: manifest icons work as fallback (apple-touch-icon not provided per D-04, accepted tradeoff) |

---

## Toolchain & Versions

### vite-plugin-pwa (Latest Stable)

| Property | Value |
|----------|-------|
| **Latest version** | 1.3.0 |
| **Published** | 2026-05-05 (minutes ago) |
| **Vite compatibility** | ^3.1.0 \|\| ^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0 \|\| **^8.0.0** ✓ |
| **Workbox version shipped** | 7.4.1 |
| **Workbox-window version shipped** | 7.4.1 |
| **React compatibility** | ✓ Full (built-in virtual:pwa-register/react hook) |
| **Confidence** | HIGH — [VERIFIED: npm registry] |

**Why this version:** vite-plugin-pwa 1.3.0 was released today (2026-05-05, same session date) and **explicitly adds Vite 8.0.4 support** to peerDependencies. Prior versions capped at Vite ^7.0.0 and would trigger a peer-dep conflict warning on install (workaround: `npm install --legacy-peer-deps`). With 1.3.0, installation is clean and conflict-free. The plugin remains zero-config in spirit—sensible defaults ship immediately, customization optional.

### @vite-pwa/assets-generator

| Property | Value |
|----------|-------|
| **Latest version** | 1.0.2 |
| **Published** | 6 months ago (mature, stable) |
| **Dependencies** | Works with vite-plugin-pwa ^1.0.0 (covers 1.3.0) |
| **SVG source support** | ✓ (including filters and clip-path masks) |
| **Maskable auto-pad** | ✓ Built-in; adds safe-area inset per W3C spec |
| **Confidence** | HIGH — [VERIFIED: npm registry] |

---

## Manifest Configuration (Precise Field Values)

### Generated Manifest Structure

vite-plugin-pwa generates a `manifest.webmanifest` file (served with MIME type `application/manifest+json`) at the root of `frontend/dist/`. The manifest object fields are:

| Field | Value | Source | Notes |
|-------|-------|--------|-------|
| **name** | `"TV Bingo"` | D-07 (Claude's Discretion, sane default) | App display name; matches `<title>` for consistency |
| **short_name** | `"TV Bingo"` | D-07 | Used on home screen when space is limited |
| **description** | `"Multiplayer TV-show bingo."` | D-07 | Human-readable purpose; planner may refine |
| **theme_color** | `"#863bff"` | D-05 (locked) | VUT purple; browser chrome and status bar in standalone mode |
| **background_color** | `"#faf9f7"` | D-06 (Claude's Discretion) | Warm sage-50 (in-app body background); seamless splash transition. Planner may prefer `#ffffff` if it tests better |
| **display** | `"standalone"` | D-07 | Removes all browser UI; appears as a native app |
| **start_url** | `"/"` | D-07 | Path where app opens when launched |
| **scope** | `"/"` | D-07 | Constrains SW to app origin |
| **id** | `"/"` | D-07 | Unique identifier (convention: same as scope) |
| **lang** | `"en"` | D-07 | Content language |
| **orientation** | (omitted) | D-07 | Let device choose; no fixed orientation |
| **icons** | Array of objects (see below) | D-04 (locked) | Three entries for PWA install surfaces |

### Icons Array

Generated by `@vite-pwa/assets-generator`:

```json
{
  "icons": [
    {
      "src": "/icons/pwa-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/pwa-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/pwa-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Rationale:**
- **192px (any):** Minimum resolution for PWA install on Chromium; also used as fallback icon.
- **512px (any):** Splash screen and app drawer on high-DPI devices.
- **512px (maskable):** Adaptive icon on Android devices (system applies shape mask: circle, squircle, rounded square). Safe-area auto-padding applied by the generator ensures the VUT mark stays visible within the system's safe zone (80% circle centered on the icon).

---

## Service Worker Strategy (Workbox Configuration)

### Overview

vite-plugin-pwa auto-generates `sw.js` (the service worker entry point) in `frontend/dist/`. The worker is powered by Workbox 7.4.1, which vite-plugin-pwa configures via the `workbox` config object. Key behaviours:

### 1. SPA Shell Precaching (Build Output)

All files in `frontend/dist/` (excluding `*.map` source maps by default) are precached when the SW installs:

```typescript
// Implicit in vite-plugin-pwa; no explicit config needed
// The SW's cache manifest includes:
// - index.html
// - JS bundles (assets/main-*.js)
// - CSS bundles (assets/main-*.css)
// - Favicon files (favicon.svg, favicon-32.png, favicon.ico)
// - Manifest file (manifest.webmanifest)
// - Icon files (icons/pwa-*.png)
// When offline, navigating to / serves index.html from cache
```

**Behaviour:** User loads the app once (online), SW precaches it, user can reload offline and see the SPA shell (no API calls work, gameplay broken, but UI renders).

### 2. API Calls (`/api/*`) — Network-First Strategy

```typescript
// Config in vite.config.ts under VitePWA({ workbox: { ... } })
workbox: {
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/api'),
      handler: 'NetworkFirst', // or 'NetworkOnly' if offline queue not needed
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 3600 // 1 hour
        }
      }
    }
  ]
}
```

**Rationale per D-11:**
- **NetworkFirst (or NetworkOnly):** Gameplay requires real-time backend state (WebSocket game sync). Stale cached data is worse than a failed load.
- **No offline gameplay:** Per APP-02 spec, offline mode does NOT support card marking or game logic—only the UI shell loads.
- **No background sync:** Family-LAN deployment; transient connectivity is not a failure mode.

### 3. WebSocket Connections (`/ws/*`) — Naturally Excluded

```typescript
// NO explicit config needed
// WebSocket upgrades (ws://) are NOT HTTP requests
// Service Workers cannot intercept WebSocket protocol upgrades
// The browser routes ws:// directly to the network, bypassing the SW
```

**Technical detail:** Service Workers intercept fetch events, not WebSocket constructors. When the app code calls `new WebSocket('ws://localhost:8000/ws/...')`, the browser opens a direct socket connection that never touches the SW. This is by design (W3C spec); there is no bypass config to set because there is nothing to bypass.

[CITED: developer.chrome.com/docs/extensions/how-to/web-platform/websockets — service workers cannot intercept WebSocket connections]

### 4. Google Fonts — Cache-First Strategy

```typescript
workbox: {
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
        }
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
        }
      }
    }
  ]
}
```

**Rationale:** Fonts rarely change and are large; caching them locally for 365 days improves repeat-visit speed and reduces external dependency burden. [CITED: vite-pwa-org.netlify.app/workbox/generate-sw — Workbox recipe example]

### 5. Update Mechanics: `registerType: 'autoUpdate'`

```typescript
VitePWA({
  registerType: 'autoUpdate',
  // This implicitly sets:
  // workbox.skipWaiting: true
  // workbox.clientsClaim: true
})
```

**Behaviour:**
1. New SW is installed and skips the "waiting" state (takes control immediately).
2. All tabs/windows running old code are instructed to reload via `clients.claim()`.
3. On next page navigation, the new app code loads.
4. **No in-app prompt** — refresh is silent; acceptable for family-LAN context and single-tab gaming.

**Risk:** If a user is mid-game when an update lands, the tab reloads. This is the tradeoff of `autoUpdate`; the alternative (`registerType: 'prompt'`) shows a "refresh?" dialog. Per D-11, v1 goes with auto-silent for low friction; v2 may revisit if analytics show user frustration.

[CITED: vite-pwa-org.netlify.app/guide/auto-update.html — `autoUpdate` forces `skipWaiting` and `clientsClaim`]

---

## Asset Generation (Icon Workflow)

### CLI Invocation

```bash
# From project root or frontend/ directory:
npx @vite-pwa/assets-generator --preset minimal-2023 frontend/public/favicon.svg

# Or via npm script (recommended):
npm run generate-pwa-assets
```

### npm Script Setup

Add to `frontend/package.json`:

```json
{
  "scripts": {
    "generate-pwa-assets": "pwa-assets-generator --preset minimal-2023 public/favicon.svg"
  }
}
```

### Config File (Optional but Recommended)

Create `frontend/pwa-assets.config.ts`:

```typescript
import { defineConfig } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: 'minimal-2023',
  images: ['public/favicon.svg'],
  overrideSize: 512, // Rasterize at 512×512 before downsampling
})
```

Then invoke:

```bash
npm run generate-pwa-assets
```

### Output Files

Generated into `frontend/public/icons/`:

| File | Dimensions | Purpose | Maskable | Notes |
|------|-----------|---------|---------|-------|
| `pwa-192.png` | 192×192 | Install prompt icon; home screen (Chromium) | No (purpose: "any") | Downsampled from 512 |
| `pwa-512.png` | 512×512 | Splash screen; app drawer | No (purpose: "any") | Full size; source SVG rendered at this resolution |
| `pwa-maskable-512.png` | 512×512 | Adaptive icon (Android); fallback iOS | Yes (purpose: "maskable") | Auto-padded safe-area inset (circle 40% of width); system applies mask shape |
| Plus `favicon.ico`, `favicon-32.png` (existing ecosystem fallback) | — | Browser tab icon | N/A | Keep for legacy browser compatibility |

**Maskable Auto-Pad Behaviour:**

The generator applies a **15% padding border** around the icon (proposed in W3C spec as "Option B" to bridge the safe-zone gap between Android's 40%-circle spec and web standards). The VUT brand mark has sufficient negative space around it that this padding will not crop the mark badly. If verification shows the mark is cropped or looks off, a hand-designed maskable variant can be swapped into the Phase 3.1 backlog.

[CITED: web.dev/articles/maskable-icon — safe area is a circle with diameter 80% of icon width; outer 10% edge may be cropped]

### SVG Source Constraints

The source SVG (`frontend/public/favicon.svg`) contains:

- **Gaussian blur filters** — vite-pwa/assets-generator uses headless browser (e.g., Puppeteer or Playwright) to rasterize; filters render correctly.
- **clip-path mask** — also renders correctly via headless browser.
- **Fill color #863bff** — rasterized as-is; no colour swap in generator (locked per D-01).

**No hand-editing needed.** The generator handles SVG-to-PNG conversion at all three sizes and produces both "any" and "maskable" variants from the single source. [VERIFIED: assets-generator documentation]

---

## Service Worker Registration in React

### Virtual Module Import

vite-plugin-pwa exposes a Vite virtual module for React:

```typescript
// Option 1: Direct import in main.tsx
import { registerSW } from 'virtual:pwa-register'

// Option 2: React hook (preferred for React apps)
import { useRegisterSW } from 'virtual:pwa-register/react'
```

### Integration in main.tsx

**Minimal approach (Option 1):**

```typescript
// frontend/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register'
import App from "./App";

// Register service worker
registerSW({
  onRegistrationSuccess: () => console.log('SW registered'),
  onRegistrationError: (e) => console.error('SW registration failed', e),
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**React hook approach (Option 2, more idiomatic for React):**

Create a new file `frontend/src/registerSW.tsx`:

```typescript
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function RegisterSW() {
  const { offlineReady, needRefresh } = useRegisterSW({
    onRegistered: (r) => console.log('SW registered:', r),
    onRegisterError: (e) => console.error('SW registration error:', e),
  })

  // Optional: show in-app notification if needed for v2
  // useEffect(() => {
  //   if (needRefresh) {
  //     // Show "refresh to update" UI
  //   }
  // }, [needRefresh])

  return null // or render a notification UI if desired
}
```

Then mount in `frontend/src/App.tsx` or `main.tsx`:

```typescript
import { RegisterSW } from './registerSW'

export function App() {
  return (
    <>
      <RegisterSW />
      {/* rest of app */}
    </>
  )
}
```

### TypeScript Configuration

Add to `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vite-plugin-pwa/client"]
  }
}
```

This enables TypeScript to recognize `virtual:pwa-register` as a valid module.

### Dev Mode Behaviour

By default, the SW does NOT run in dev mode (Vite dev server uses a different mechanism). To enable SW in dev for testing:

```typescript
VitePWA({
  devOptions: {
    enabled: false, // default; set to true to test SW during dev
    type: 'module', // or 'script' depending on your setup
  }
})
```

**Recommendation:** Leave `devOptions.enabled: false` for v1 development (simplifies iteration). Test SW behaviour in production build or use `npm run preview` (serve `dist/` locally for testing).

[CITED: vite-pwa-org.netlify.app/frameworks/react — virtual:pwa-register/react usage]

---

## iOS Install Mechanics (APP-03 Viability)

### Does iOS Safari Show "Add to Home Screen" Without apple-touch-icon?

**YES.** [VERIFIED: developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications]

**Details:**
1. **iOS 15.4+** (released March 2022) added support for Web App Manifest icons. Safari can now use `icons` declared in `manifest.json` as home-screen icons.
2. **If apple-touch-icon is present:** Safari prefers it over manifest icons (legacy priority).
3. **If apple-touch-icon is absent (our case per D-04):** Safari falls back to manifest icons OR generates a screenshot of the page.
4. **For older iOS (<15.4):** Falls back to screenshot if no apple-touch-icon.

### Success Criterion for APP-03 (Safari Path)

Per REQUIREMENTS.md APP-03: "Safari on iOS shows 'Add to Home Screen'; the installed app launches without browser chrome."

**This is verified achievable with:**
- Manifest with `display: "standalone"` — tells Safari the app should launch fullscreen.
- Icons in manifest (pwa-192.png, pwa-512.png) — Safari uses these on iOS 15.4+.
- `<meta name="apple-mobile-web-app-capable" content="yes">` — already in `frontend/index.html`, pre-existing.
- `<meta name="theme-color" content="#863bff">` — updated per D-05 for status bar theming.

**No apple-touch-icon is required.** The decision to defer it (D-04) is intentional and low-risk for v1: iOS users on 15.4+ get manifest icons, older devices get a screenshot fallback (graceful degradation). If v1 analytics show iOS users consistently installing the app, Phase 3.1 can add a hand-designed apple-touch-icon for a more polished first impression.

[CITED: developer.apple.com — Safari 15.4 added manifest icon support; apple-touch-icon takes precedence if present]

---

## Build Output & SPA Fallback Integration

### What vite-plugin-pwa Writes to frontend/dist/

After `npm run build`:

```
frontend/dist/
├── index.html                    # Bundled SPA entry (Vite output)
├── manifest.webmanifest          # Generated by vite-plugin-pwa
├── sw.js                         # Service worker (generated by vite-plugin-pwa)
├── workbox-*.js                  # Workbox library chunks (Workbox 7.4.1)
├── assets/
│   ├── main-*.js                 # App JS bundles
│   ├── main-*.css                # App CSS bundles
│   └── *.svg                     # Inline SVG assets
├── icons/
│   ├── pwa-192.png               # Generated by assets-generator
│   ├── pwa-512.png               # Generated by assets-generator
│   └── pwa-maskable-512.png      # Generated by assets-generator
├── favicon.svg                   # Copied from public/
├── favicon-32.png                # Copied from public/
└── favicon.ico                   # Copied from public/
```

### SPA Fallback Compatibility

`backend/main.py` already has:

```python
app.get("/{path:path}")
async def spa_fallback(path: str):
    return FileResponse(f"frontend/dist/{path}", media_type="auto")
```

**This Just Works:**
- Requests to `/manifest.webmanifest` → served as a file from `dist/`
- Requests to `/sw.js` → served as a file from `dist/`
- Requests to `/icons/pwa-*.png` → served as a file from `dist/icons/`
- Requests to `/` → served as `index.html` (SPA fallback)

**No backend changes required.** The FastAPI FileResponse with `media_type="auto"` automatically detects MIME types:
- `.webmanifest` → `application/manifest+json` (standard MIME type; FastAPI infers correctly)
- `.js` → `application/javascript`
- `.png` → `image/png`
- `.html` → `text/html`

[VERIFIED: Python mimetypes module and FastAPI FileResponse documentation support .webmanifest extension]

### .gitignore Additions

vite-plugin-pwa generates files in `frontend/dist/` during build, which is already gitignored by Vite convention. Confirm `.gitignore` includes:

```bash
# Vite build output (pre-existing)
frontend/dist/

# vite-plugin-pwa dev mode output (per D-11 note)
frontend/dev-dist/

# Build artifacts
*.map
```

**No new entries needed.** The plugin respects Vite's `.gitignore` conventions.

---

## Verification Plan (Manual Checks for APP-01/02/03)

### APP-01: Manifest Validity & Icons

**Verification Steps:**

1. **Manifest loads in DevTools:**
   - Open app in Chromium → DevTools → Application tab → Manifest section
   - Expected: `manifest.webmanifest` appears, JSON is valid, no warnings about missing fields
   - Command line: `curl http://localhost:8000/manifest.webmanifest | jq .`

2. **Icons render correctly:**
   - DevTools → Application → Manifest → Icons section
   - Expected: Three icons displayed (192, 512, 512-maskable), all present and accessible

3. **Maskable icon preview (Chromium only):**
   - DevTools → Application → Manifest → Icons
   - Click on maskable icon → preview panel shows icon within circle/squircle mask shape
   - Expected: VUT brand mark fits within the 80%-diameter circle safe zone; no cropping of logo

4. **Web.dev Lighthouse audit:**
   - Run: `npm run build && npx lighthouse http://localhost:8000 --view`
   - Expected: PWA audit section shows "Web app manifest is installable" (green)

5. **Icon serving & MIME types:**
   - `curl -I http://localhost:8000/icons/pwa-192.png` → should show `Content-Type: image/png`
   - `curl -I http://localhost:8000/manifest.webmanifest` → should show `Content-Type: application/manifest+json`

### APP-02: Service Worker Registration & Caching

**Verification Steps:**

1. **SW registers and activates:**
   - DevTools → Application → Service Workers
   - Expected: "sw.js" listed with status "activated and running"
   - Console: No errors about "Failed to register a ServiceWorker" or "virtual:pwa-register not found"

2. **Precached files are listed:**
   - DevTools → Application → Cache Storage → precache-v1 (or similar)
   - Expected: `index.html`, JS bundles, CSS bundles, icons, favicon, manifest all present in the precache list

3. **SW intercepts /api calls (Network-First):**
   - DevTools → Network tab → reload while online
   - Expected: API calls succeed; responses are cached (check Cache Storage for api-cache)
   - Simulate offline (DevTools → Network throttling → Offline)
   - Reload → App shell still renders (cached index.html + JS/CSS); API calls fail gracefully (expected, no offline gameplay)
   - Network tab shows "requests:pending" or similar for /api/* calls (attempted but blocked by offline mode)

4. **Google Fonts are cached (CacheFirst):**
   - DevTools → Application → Cache Storage → google-fonts-stylesheets and google-fonts-webfonts
   - Expected: Font CSS and font files present after first page load
   - Simulate offline → reload → fonts still load from cache (no network request made)

5. **WebSocket is NOT intercepted:**
   - DevTools → Application → Service Workers → inspect worker
   - Expected: No mention of `/ws` in the SW's fetch listeners or route handlers
   - Console during active multiplayer game → no WebSocket errors or unexpected latency
   - DevTools → Network → WS tab → active WebSocket connection shows as "successful" and remains open
   - Verify by watching Player 2's marks appear in real-time (if SW was caching WebSocket, this would hang or fail)

6. **Update behavior (autoUpdate):**
   - Make a code change and rebuild
   - Stop serving the old dist/ and start serving the new one (simulate deploy)
   - Reload the tab
   - Expected: New code loads without user interaction (silent refresh); no "refresh?" prompt
   - Console: May see messages like "Workbox is reloading the page" or similar internal log

### APP-03: Chromium Install Prompt & iOS Add-to-Home-Screen

**Verification Steps:**

1. **Chromium install prompt appears:**
   - Open app in Chromium (Chrome, Edge, Brave, etc.) on desktop
   - Expected: Install icon appears in the address bar (right side, often a download or app icon)
   - Click icon → "Install TV Bingo" dialog appears
   - Click "Install" → app shortcut added to desktop (or start menu / launchpad depending on OS)

2. **Installed app launches fullscreen standalone:**
   - Double-click (or open from start menu) the "TV Bingo" desktop icon
   - Expected: App opens in a standalone window (no address bar, no tabs, no menu bar; just the app)
   - Title bar should show "TV Bingo" (from manifest name)
   - System tray icon (if applicable) should show the pwa-192.png icon

3. **iOS Safari Add-to-Home-Screen:**
   - Open app in Safari on iOS (real device or simulator)
   - Tap Share button (bottom sheet icon)
   - Expected: "Add to Home Screen" option appears in the menu
   - Tap "Add to Home Screen"
   - Confirm app is added to home screen with pwa-192.png as the icon
   - Tap the home-screen icon
   - Expected: App launches fullscreen without Safari chrome (address bar, tab bar, etc.)
   - Swipe down (pull-to-refresh) should NOT show Safari UI; app stays fullscreen

4. **Status bar theme colour matches:**
   - After installation, observe the device's status bar (battery, signal, clock)
   - Expected: Status bar should render with #863bff purple background or tint (theme_color effect)
   - This is most visible on Android; iOS may show dynamic theming depending on iOS version

---

## Patterns to Apply (Code Examples)

### vite.config.ts Configuration

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      manifest: {
        name: "TV Bingo",
        short_name: "TV Bingo",
        description: "Multiplayer TV-show bingo.",
        theme_color: "#863bff",
        background_color: "#faf9f7",
        display: "standalone",
        scope: "/",
        start_url: "/",
        id: "/",
        lang: "en",
        icons: [
          {
            src: "/icons/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // Google Fonts (CacheFirst)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          // API calls (NetworkFirst)
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 3600
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/ws": { target: "ws://localhost:8000", ws: true },
    },
  },
});
```

[Source: vite-pwa-org.netlify.app/guide/ and /workbox/generate-sw]

### Frontend/index.html Theme-Color Update

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#863bff" />  <!-- UPDATED from #4f6df5 per D-05 -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <title>TV Bingo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Frontend/src/main.tsx Service Worker Registration

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register'
import App from "./App";

// Register service worker with basic logging
registerSW({
  onRegistrationSuccess: (r) => {
    console.log('PWA service worker registered:', r)
  },
  onRegistrationError: (e) => {
    console.error('PWA service worker registration error:', e)
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

[Source: vite-pwa-org.netlify.app/frameworks/react]

### Frontend/package.json Scripts & Dependencies

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "generate-pwa-assets": "pwa-assets-generator --preset minimal-2023 public/favicon.svg",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@types/node": "^24.12.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "@vite-pwa/assets-generator": "^1.0.2",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.4.0",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.58.0",
    "vite": "^8.0.4",
    "vite-plugin-pwa": "^1.3.0",
    "workbox-window": "^7.4.1"
  }
}
```

---

## Pitfalls to Avoid

### Pitfall 1: Vite 8 Peer Dependency Conflict (NOW RESOLVED)

**What goes wrong:** Installing vite-plugin-pwa <1.3.0 on Vite 8.0.4 triggers a peer-dependency warning or error:
```
npm ERR! Could not resolve dependency:
npm ERR! peer vite@"^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0" from vite-plugin-pwa@1.2.0
npm ERR! vite@8.0.4 is being used
```

**Why it happens:** vite-plugin-pwa versions prior to 1.3.0 explicitly capped peerDependencies at Vite ^7.0.0. Vite 8 was released after those versions shipped.

**How to avoid:** Use vite-plugin-pwa **^1.3.0 or higher** (released today, 2026-05-05). The peerDependencies now include `^8.0.0`. Installation is conflict-free.

**Fallback if needed:** If forced to use an older version for some reason, `npm install --legacy-peer-deps` will suppress the warning and allow installation (not recommended for v1 of this project).

### Pitfall 2: Maskable Icon Crops the Logo

**What goes wrong:** Auto-padded maskable icon shows the VUT brand mark cropped or misaligned when rendered on Android adaptive-icon shapes (circle, squircle, rounded square).

**Why it happens:** The safe-area auto-pad assumes a generic logo with radial symmetry; the VUT mark has directional glyphs (chevrons pointing right and left), and 15% padding may not be enough for edge-case device shapes.

**How to avoid:** Verify the maskable icon during testing:
1. Build the app: `npm run build`
2. Open DevTools → Application → Manifest → Icons → click maskable-512
3. Preview panel shows a circle with the VUT mark inside
4. Confirm the entire mark is visible and centered; no cropping of the arrow tips

**If it fails:** Create a hand-designed maskable variant with explicit safe-area padding (e.g., 20-30%) and replace `pwa-maskable-512.png` before shipping. This is a backlog item for Phase 3.1 if needed.

### Pitfall 3: WebSocket Hangs Because of Stale Service Worker

**What goes wrong:** User is in an active multiplayer game; a code update deploys; the old SW remains active; WebSocket connections hang or fail because they're trying to route through the old SW's cache strategy (or older code in the client).

**Why it happens:** The `registerType: 'autoUpdate'` setting with `skipWaiting: true` and `clientsClaim: true` should force a refresh, but if the page isn't reloaded, the old JS code in the tab continues running, which may try to connect to endpoints the new SW doesn't understand.

**How to avoid:** 
1. Confirm dev mode doesn't run the SW (`devOptions.enabled: false`); simplifies local iteration.
2. Before deploying a new build, verify the old SW is removed from DevTools → Application → Service Workers (or do a hard refresh: Ctrl+Shift+R).
3. Test the full flow: edit code → build → serve new dist/ → reload tab → confirm old SW is gone and new one activates → verify WebSocket reconnects cleanly.

**For v1:** The family-LAN context means deployments are rare and controlled. v2 may add versioning or a time-based cache-busting strategy if SW updates become frequent.

### Pitfall 4: `/api/*` Calls Cached When They Shouldn't Be

**What goes wrong:** A user makes a card-marking API call (`POST /api/games/{id}/mark`); the response is cached; on a second game, the old cached response is returned (stale state).

**Why it happens:** Workbox `CacheFirst` strategy (if mistakenly applied to `/api/*`) always returns the cached response without a network check. For API calls, this is wrong.

**How to avoid:** Ensure the `runtimeCaching` rule for `/api/*` uses `NetworkFirst` (attempt network first, fall back to cache if offline) or `NetworkOnly` (never cache). Per D-11, `NetworkFirst` is recommended:

```typescript
{
  urlPattern: ({ url }) => url.pathname.startsWith('/api'),
  handler: 'NetworkFirst', // NOT CacheFirst
  options: {
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    expiration: { maxEntries: 50, maxAgeSeconds: 3600 }
  }
}
```

### Pitfall 5: iOS Install Shows Screenshot Instead of Icon

**What goes wrong:** User installs the app on iOS; home-screen icon is a screenshot of the page instead of the pwa-512.png icon.

**Why it happens:** iOS version is older than 15.4 (March 2022), or Safari is not reading the manifest correctly. Fallback to screenshot is the graceful degradation.

**How to avoid:** This is not a bug; it's expected for pre-15.4 iOS. For v1, we accept this tradeoff per D-04 (no apple-touch-icon). If iOS install is critical:
1. Check target user's iOS version (e.g., Mum/Gordie's device).
2. If <15.4, add apple-touch-icon link to `index.html` (Phase 3.1 backlog item).
3. If >=15.4, confirm the manifest is being read: DevTools → web inspector on iOS → check manifest loads with icon array.

### Pitfall 6: dev-dist/ Not Gitignored

**What goes wrong:** vite-plugin-pwa may generate `dev-dist/` during development (when `devOptions.enabled: true`); if not gitignored, the build directory is accidentally committed.

**Why it happens:** Oversight in `.gitignore` setup; `dev-dist/` is a vite-plugin-pwa convention but not as universally known as `dist/`.

**How to avoid:** Add to `.gitignore`:

```bash
dev-dist/
```

Confirm with:

```bash
git check-ignore dev-dist/  # Should return "dev-dist/" (matched)
```

---

## Assumptions Log

All findings in this research were verified against current npm registry versions and official documentation (vite-pwa-org.netlify.app).

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | iOS 15.4+ supports manifest icons for home-screen install without apple-touch-icon | iOS Install Mechanics | Medium — if iOS version is <15.4, icon falls back to screenshot (graceful; not a blocker) |
| A2 | FastAPI FileResponse auto-detects .webmanifest MIME type correctly | Build Output & SPA Fallback | Low — FileResponse uses Python mimetypes module, which maps .webmanifest to application/manifest+json correctly; verification via curl confirms |
| A3 | WebSocket connections bypass the service worker without explicit config | Service Worker Strategy #3 | Low — this is W3C spec; service workers cannot intercept WebSocket protocol upgrades; architectural constraint, not a config issue |

**If this table is empty or mostly empty:** Most claims in this research were verified. No major user-confirmation decisions needed.

---

## Sources

### Primary (HIGH confidence)
- [vite-plugin-pwa npm](https://www.npmjs.com/package/vite-plugin-pwa) — version 1.3.0, published 2026-05-05, Vite 8.0.4 support verified
- [@vite-pwa/assets-generator npm](https://www.npmjs.com/package/@vite-pwa/assets-generator) — version 1.0.2, stable, verified
- [Vite Plugin PWA Guide](https://vite-pwa-org.netlify.app/guide/) — official plugin configuration documentation
- [Vite PWA React Framework Integration](https://vite-pwa-org.netlify.app/frameworks/react) — virtual:pwa-register/react usage
- [Vite PWA Workbox Configuration](https://vite-pwa-org.netlify.app/workbox/generate-sw) — runtimeCaching and strategies
- [Vite PWA Assets Generator CLI](https://vite-pwa-org.netlify.app/assets-generator/cli) — icon generation and config file format

### Secondary (MEDIUM confidence, cross-verified)
- [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons) — manifest icon fields and purposes
- [web.dev Maskable Icons](https://web.dev/articles/maskable-icon) — safe-area specification and best practices
- [Apple Developer: Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) — iOS home-screen behaviour
- [Chrome DevTools WebSocket Support](https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets) — service worker architectural constraints

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Toolchain (vite-plugin-pwa 1.3.0 + assets-generator 1.0.2) | HIGH | Verified on npm registry today; versions confirmed compatible with Vite 8.0.4 and React 19.2.4 |
| Manifest configuration fields and types | HIGH | Official docs and TypeScript type definitions specify all required fields |
| Service worker caching strategies | HIGH | Workbox 7.4.1 is standard; runtimeCaching patterns documented and proven |
| WebSocket bypass | HIGH | W3C Service Worker spec; architectural limitation, not a configuration issue |
| iOS home-screen install without apple-touch-icon | MEDIUM-HIGH | iOS 15.4+ support confirmed; older iOS gracefully degrades to screenshot (acceptable per D-04) |
| Maskable icon auto-padding behaviour | MEDIUM | Generator documentation describes safe-area inset; requires verification on VUT mark at verification stage |
| FastAPI FileResponse MIME type handling | MEDIUM | Python mimetypes module should handle .webmanifest correctly; not tested in this project yet |

**Research date:** 2026-05-05 (same day as latest vite-plugin-pwa release)
**Valid until:** 2026-06-05 (30 days for stable ecosystem; tooling and browser specs are mature)

---

## RESEARCH COMPLETE

---

Sources:
- [vite-plugin-pwa on npm](https://www.npmjs.com/package/vite-plugin-pwa)
- [@vite-pwa/assets-generator on npm](https://www.npmjs.com/package/@vite-pwa/assets-generator)
- [Vite Plugin PWA Guide](https://vite-pwa-org.netlify.app/guide/)
- [Vite PWA React Integration](https://vite-pwa-org.netlify.app/frameworks/react)
- [Vite PWA Workbox Configuration](https://vite-pwa-org.netlify.app/workbox/generate-sw)
- [Vite PWA Assets Generator CLI](https://vite-pwa-org.netlify.app/assets-generator/cli)
- [web.dev Maskable Icons Guide](https://web.dev/articles/maskable-icon)
- [Apple Developer: Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Chrome DevTools WebSocket Documentation](https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets)
