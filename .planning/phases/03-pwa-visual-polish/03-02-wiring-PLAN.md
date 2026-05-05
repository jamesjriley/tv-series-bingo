---
phase: 03-pwa-visual-polish
plan: "02"
type: execute
wave: 2
depends_on:
  - "03-01"
files_modified:
  - frontend/vite.config.ts
  - frontend/src/main.tsx
  - frontend/tsconfig.app.json
  - frontend/index.html
  - README.md
autonomous: true
requirements:
  - APP-01
  - APP-02
  - APP-03

must_haves:
  truths:
    - "npm run build completes without errors and frontend/dist/manifest.webmanifest exists"
    - "manifest.webmanifest contains theme_color #863bff and icons array referencing /icons/pwa-192.png, /icons/pwa-512.png, /icons/pwa-maskable-512.png"
    - "frontend/dist/sw.js exists and contains Workbox precache entries"
    - "runtimeCaching in the SW includes a NetworkFirst handler matching /api/ paths"
    - "runtimeCaching in the SW includes CacheFirst handlers matching fonts.gstatic.com"
    - "No /ws matcher exists anywhere in the SW runtimeCaching config"
    - "frontend/index.html theme-color meta tag is #863bff (not the old #4f6df5)"
    - "frontend/src/main.tsx imports registerSW from virtual:pwa-register and calls it before createRoot"
    - "README.md contains a PWA install paragraph with Chromium and Safari/iOS instructions"
  artifacts:
    - path: "frontend/vite.config.ts"
      provides: "VitePWA plugin config with manifest, workbox runtimeCaching, registerType: autoUpdate"
    - path: "frontend/dist/manifest.webmanifest"
      provides: "Generated PWA manifest served by backend SPA fallback"
      contains: "theme_color"
    - path: "frontend/dist/sw.js"
      provides: "Generated service worker with Workbox precache + runtimeCaching"
    - path: "frontend/src/main.tsx"
      provides: "SW registration call via virtual:pwa-register"
    - path: "frontend/index.html"
      provides: "Correct theme-color meta tag matching manifest"
  key_links:
    - from: "frontend/vite.config.ts (VitePWA manifest.icons)"
      to: "frontend/public/icons/pwa-*.png"
      via: "vite-plugin-pwa reads public/ directory to include files in precache manifest"
      pattern: "src: '/icons/pwa-192.png'"
    - from: "frontend/src/main.tsx"
      to: "virtual:pwa-register"
      via: "vite-plugin-pwa virtual module resolves at build time"
      pattern: "import { registerSW } from 'virtual:pwa-register'"
    - from: "frontend/dist/sw.js"
      to: "frontend/dist/manifest.webmanifest"
      via: "Workbox precache includes manifest file in SPA shell cache"
      pattern: "precacheAndRoute"
---

<objective>
Wire VitePWA into the Vite build pipeline, register the service worker in the React entry point, update the theme-color meta tag, add the TypeScript virtual-module type shim, and add a PWA install note to the README. Running `npm run build` after this plan produces a complete, installable PWA.

Purpose: Plan 01 provided the icon assets. This plan provides the build-time wiring that makes those icons discoverable (via the manifest), registers the service worker that precaches the SPA shell, and patches the two user-facing surfaces that communicate PWA identity (theme-color meta tag, README install instructions). After this plan, the app passes Chromium's installability criteria.

Split rationale: Per D-13 atomic commit guidance. Plan 01 is a `chore`-level commit (assets + deps). This plan produces the `feat(pwa)` commit that wires the actual PWA functionality. Keeping them separate means a reviewer can understand the icon/dep change without the SW/manifest config noise, and vice versa.

Output:
- `frontend/vite.config.ts` — VitePWA plugin added with full manifest + workbox config
- `frontend/src/main.tsx` — SW registration import and call added
- `frontend/tsconfig.app.json` — `"vite-plugin-pwa/client"` added to types array
- `frontend/index.html` — theme-color updated from `#4f6df5` to `#863bff`
- `README.md` — "PWA install" paragraph added
- `npm run build` produces `frontend/dist/manifest.webmanifest` and `frontend/dist/sw.js`
- Commit: `feat(pwa): manifest, icons, and service worker via vite-plugin-pwa`
</objective>

<execution_context>
@/home/pippa-sofine/.claude/get-shit-done/workflows/execute-plan.md
@/home/pippa-sofine/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-pwa-visual-polish/03-CONTEXT.md
@.planning/phases/03-pwa-visual-polish/03-RESEARCH.md
@.planning/phases/03-pwa-visual-polish/03-PATTERNS.md
@.planning/phases/03-pwa-visual-polish/03-01-SUMMARY.md

<interfaces>
<!-- Key excerpts the executor needs. No codebase exploration required. -->

From frontend/vite.config.ts (current — REPLACE entirely):
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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

From frontend/src/main.tsx (current — MODIFY to add SW registration):
```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

From frontend/tsconfig.app.json (current — MODIFY types array):
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "types": ["vite/client"],
    ...
  }
}
```

From frontend/index.html (current — MODIFY one line):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#4f6df5" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <title>TV Bingo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

README.md structure (current, for context): ~99 lines. Deploy section ends at approximately line 89. The "Project shape" section follows. The PWA install paragraph goes between them.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add VitePWA plugin to vite.config.ts with full manifest and workbox config</name>
  <files>frontend/vite.config.ts</files>
  <read_first>
    - frontend/vite.config.ts (current — shown in interfaces block above)
    - .planning/phases/03-pwa-visual-polish/03-RESEARCH.md §"Patterns to Apply — vite.config.ts Configuration" (complete code block, lines 643–744)
    - .planning/phases/03-pwa-visual-polish/03-PATTERNS.md §"Shared Patterns — Manifest Configuration" and §"Shared Patterns — Workbox Caching Configuration"
    - .planning/phases/03-pwa-visual-polish/03-CONTEXT.md §"D-05 (theme_color), D-06 (background_color), D-07 (manifest fields), D-10 (toolchain), D-11 (caching strategy)"
  </read_first>
  <action>
Replace `frontend/vite.config.ts` entirely with the following content. The server config (proxy) is preserved unchanged — only the imports and the VitePWA plugin block are new.

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

**Key decisions embedded in this config (per CONTEXT.md):**
- `registerType: 'autoUpdate'` → D-11: skipWaiting + clientsClaim; no in-app "refresh?" prompt for v1
- `theme_color: "#863bff"` → D-05: VUT purple (locked)
- `background_color: "#faf9f7"` → D-06: sage warm-50; seamless splash-to-app transition
- `display: "standalone"` → D-07: removes browser chrome
- `runtimeCaching` has no `/ws` pattern → D-11: WebSocket connections bypass SW at protocol level (not HTTP), so no explicit exclusion is needed or correct
- `NetworkFirst` for `/api` → D-11: game state must be fresh; stale cached API responses are worse than a failed load
- `CacheFirst` for Google Fonts → D-11: fonts are immutable, reduce external dependency burden
- `devOptions.enabled: false` → D-11: simpler local dev iteration; test SW via `npm run preview` (serving dist/)

**Important:** Do NOT add a runtimeCaching entry for `/ws`. WebSocket upgrade requests are not HTTP fetch events and cannot be intercepted by service workers (W3C spec constraint). Adding a `/ws` matcher would be inert but misleading; its absence is correct and intentional.
  </action>
  <verify>
    <automated>
grep "VitePWA" /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/vite.config.ts && \
grep '"#863bff"' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/vite.config.ts && \
grep 'NetworkFirst' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/vite.config.ts && \
grep 'CacheFirst' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/vite.config.ts && \
grep -v '/ws' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/vite.config.ts | grep -q 'runtimeCaching' && echo "PASS: no ws in runtimeCaching" || true && \
grep 'autoUpdate' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/vite.config.ts && \
grep 'fonts\.gstatic\.com' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/vite.config.ts
    </automated>
  </verify>
  <acceptance_criteria>
    - `frontend/vite.config.ts` contains `import { VitePWA } from "vite-plugin-pwa"`
    - `frontend/vite.config.ts` contains `registerType: 'autoUpdate'`
    - `frontend/vite.config.ts` contains `theme_color: "#863bff"`
    - `frontend/vite.config.ts` contains `background_color: "#faf9f7"`
    - `frontend/vite.config.ts` contains `handler: 'NetworkFirst'` (for /api)
    - `frontend/vite.config.ts` contains `handler: 'CacheFirst'` (for Google Fonts)
    - `frontend/vite.config.ts` contains `fonts.gstatic.com` in a runtimeCaching urlPattern
    - `frontend/vite.config.ts` does NOT contain any runtimeCaching urlPattern matching `/ws`
    - `frontend/vite.config.ts` still contains the `server.proxy` block with `/ws: { ws: true }` (server proxy unchanged)
    - `frontend/vite.config.ts` contains all three icon entries: `/icons/pwa-192.png` (192x192, any), `/icons/pwa-512.png` (512x512, any), `/icons/pwa-maskable-512.png` (512x512, maskable)
  </acceptance_criteria>
  <done>vite.config.ts contains complete VitePWA plugin config with manifest, workbox runtimeCaching (no /ws matcher), and autoUpdate registration.</done>
</task>

<task type="auto">
  <name>Task 2: Register SW in main.tsx, add TS type shim, update index.html theme-color, update README, build, and commit</name>
  <files>
    frontend/src/main.tsx
    frontend/tsconfig.app.json
    frontend/index.html
    README.md
  </files>
  <read_first>
    - frontend/src/main.tsx (current — shown in interfaces block above)
    - frontend/tsconfig.app.json (current — shown in interfaces block above)
    - frontend/index.html (current — shown in interfaces block above)
    - README.md (current — read the file; PWA install paragraph goes after the "Deploying to kainga-core" section)
    - .planning/phases/03-pwa-visual-polish/03-RESEARCH.md §"Service Worker Registration in React" (main.tsx pattern, Option 1 direct import)
    - .planning/phases/03-pwa-visual-polish/03-RESEARCH.md §"TypeScript Configuration" (tsconfig.app.json types addition)
    - .planning/phases/03-pwa-visual-polish/03-CONTEXT.md §"D-05 (theme-color), D-14 (README paragraph)"
    - .planning/phases/03-pwa-visual-polish/03-PATTERNS.md §"frontend/src/main.tsx (MODIFY)" and §"frontend/index.html (MODIFY)" and §"README.md (MODIFY)"
  </read_first>
  <action>
Make four targeted edits, then build and commit.

**Edit 1 — frontend/src/main.tsx: add SW registration.**

Replace the current content with:
```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App";

registerSW({
  onRegistrationSuccess: (r) => {
    console.log('PWA service worker registered:', r);
  },
  onRegistrationError: (e) => {
    console.error('PWA service worker registration error:', e);
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Use Option 1 (direct `registerSW` call before `createRoot`) per RESEARCH.md. This is sufficient for v1; the React hook variant (`useRegisterSW`) is only needed if adding an in-app "new version" UI prompt, which D-11 explicitly defers. The `registerSW` call is side-effecting and fire-and-forget — it registers the SW asynchronously without blocking the React render.

**Edit 2 — frontend/tsconfig.app.json: add vite-plugin-pwa client types.**

In `compilerOptions.types`, change:
```json
"types": ["vite/client"]
```
to:
```json
"types": ["vite/client", "vite-plugin-pwa/client"]
```

This ensures TypeScript recognizes `virtual:pwa-register` as a valid module import and does not produce a TS error (`Cannot find module 'virtual:pwa-register'`). Without this, `tsc -b` (which runs as part of `npm run build`) fails with a module-not-found error.

**Edit 3 — frontend/index.html: update theme-color.**

Change the single line:
```html
    <meta name="theme-color" content="#4f6df5" />
```
to:
```html
    <meta name="theme-color" content="#863bff" />
```

All other lines in index.html remain unchanged. The `apple-mobile-web-app-capable` meta tag already present stays as-is — it contributes to iOS Add-to-Home-Screen support.

**Edit 4 — README.md: add PWA install paragraph.**

Read the current README.md. Locate the end of the "Deploying to kainga-core" section (after the `docker-compose` commands and the final `docker-compose up -d --build` description line). Insert a new section immediately after that section and before "## Project shape":

```markdown
## PWA install

On Chromium-based browsers (Chrome, Edge, Brave), an "Install app" icon appears in the address bar once the app is loaded; click it to install TV Bingo to your desktop or start menu. On Safari/iOS, use the Share button and select "Add to Home Screen." The installed app launches in a standalone window with no browser chrome — it feels like a native app. No separate download or app store required.
```

**Build step — verify the wiring produces correct output:**

```bash
cd /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend && npm run build
```

Expected output: build completes without errors. Then verify the dist artifacts:

```bash
# Manifest exists and has correct theme_color
cat /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/manifest.webmanifest | python3 -m json.tool | grep theme_color

# SW exists
ls /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/sw.js

# SW contains precache entries (non-empty Workbox manifest)
grep -c 'precacheAndRoute\|__WB_MANIFEST' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/sw.js

# NetworkFirst present in SW
grep -c 'NetworkFirst' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/sw.js

# CacheFirst present in SW
grep -c 'CacheFirst' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/sw.js

# Confirm /ws is NOT a runtimeCaching route in SW
grep -c 'ws' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/sw.js || echo "no ws match in sw.js"
```

If build fails: check that `frontend/tsconfig.app.json` has `"vite-plugin-pwa/client"` in the types array — this is the most common tsc failure with virtual modules.

**Commit:**

Stage explicitly:
```bash
git -C /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo add \
  frontend/vite.config.ts \
  frontend/src/main.tsx \
  frontend/tsconfig.app.json \
  frontend/index.html \
  README.md
```

Commit:
```bash
git -C /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo commit -m "feat(pwa): manifest, icons, and service worker via vite-plugin-pwa"
```

Note: `frontend/dist/` is gitignored (confirmed in `.gitignore`). Do not add dist files to the commit.
  </action>
  <verify>
    <automated>
grep "registerSW" /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/src/main.tsx && \
grep 'virtual:pwa-register' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/src/main.tsx && \
grep 'vite-plugin-pwa/client' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/tsconfig.app.json && \
grep 'content="#863bff"' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/index.html && \
grep -v '#4f6df5' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/index.html | grep -q 'theme-color' && echo "PASS: old blue gone" && \
grep 'PWA install' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/README.md && \
test -f /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/manifest.webmanifest && echo "PASS: manifest.webmanifest exists" && \
grep '"theme_color"' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/manifest.webmanifest && \
grep '"#863bff"' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/manifest.webmanifest && \
test -f /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/sw.js && echo "PASS: sw.js exists" && \
grep -q 'NetworkFirst' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/sw.js && echo "PASS: NetworkFirst in sw.js" && \
grep -q 'CacheFirst\|cacheFirst' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/sw.js && echo "PASS: CacheFirst in sw.js" && \
git -C /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo log --oneline -1
    </automated>
  </verify>
  <acceptance_criteria>
    - `frontend/src/main.tsx` contains `import { registerSW } from 'virtual:pwa-register'`
    - `frontend/src/main.tsx` contains `registerSW({` call placed before `createRoot`
    - `frontend/tsconfig.app.json` contains `"vite-plugin-pwa/client"` in the `types` array
    - `frontend/index.html` contains `content="#863bff"` in the theme-color meta tag
    - `frontend/index.html` does NOT contain `#4f6df5` anywhere
    - `README.md` contains the text `PWA install` as a heading or within a paragraph
    - `README.md` contains instructions for both Chromium ("Install app" in address bar) and Safari/iOS ("Add to Home Screen")
    - `frontend/dist/manifest.webmanifest` exists after `npm run build`
    - `frontend/dist/manifest.webmanifest` contains `"theme_color": "#863bff"`
    - `frontend/dist/manifest.webmanifest` contains `"/icons/pwa-192.png"` in the icons array
    - `frontend/dist/manifest.webmanifest` contains `"/icons/pwa-512.png"` in the icons array
    - `frontend/dist/manifest.webmanifest` contains `"/icons/pwa-maskable-512.png"` in the icons array
    - `frontend/dist/sw.js` exists after `npm run build`
    - `frontend/dist/sw.js` contains `NetworkFirst` (for /api/ strategy)
    - `frontend/dist/sw.js` contains `CacheFirst` or `cacheFirst` (for Google Fonts strategy)
    - `frontend/dist/sw.js` does NOT contain a routing pattern matching `/ws`
    - `npm run build` exits with code 0 (no TypeScript or Vite errors)
    - `git log --oneline -1` shows `feat(pwa): manifest, icons, and service worker via vite-plugin-pwa`
    - `git status` shows clean working tree
  </acceptance_criteria>
  <done>SW registered in React entry, TypeScript types shim added, theme-color corrected, README updated with install instructions, build verified, and feat(pwa) commit landed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Service Worker | SW intercepts all fetch events; mis-configured runtimeCaching could serve stale game state or intercept WS |
| Browser → manifest.webmanifest | Public-readable file; must not expose internal endpoints or secrets |
| SW cache → API responses | NetworkFirst protects against stale game state; CacheFirst on Google Fonts is safe (immutable CDN assets) |
| autoUpdate (skipWaiting) → active sessions | Silent SW swap could interrupt a mid-game session |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-02-01 | Elevation of Privilege | Service worker scope hijack | mitigate | SW scope is `/` (root) — standard for SPAs. WebSocket upgrade requests (`ws://`) are not fetch events and cannot be intercepted by any SW. Verified: no `/ws` urlPattern exists in runtimeCaching config; Workbox only intercepts HTTP/HTTPS fetch events. Manual verification: DevTools → Network → WS tab shows direct socket without SW interception. |
| T-03-02-02 | Denial of Service | Stale SW serving outdated SPA shell mid-game | accept | `registerType: 'autoUpdate'` with `skipWaiting: true` and `clientsClaim: true` causes silent SW swap and tab reload. Per D-11, this is accepted for v1 (family-LAN, single-tab use, rare deploys). If a reload occurs mid-game, the player rejoins via their existing `game_id` URL. Revisit in v2 if analytics show this is a friction point. |
| T-03-02-03 | Tampering | Cache poisoning of /api/* via stale SW response | mitigate | runtimeCaching for `/api/*` uses `NetworkFirst` with `networkTimeoutSeconds: 3`. Network is always attempted first; cache is only used if network fails (offline fallback). For family-LAN context with reliable LAN connectivity, the cache fallback path is never exercised during normal play. No `CacheFirst` or `StaleWhileRevalidate` on API routes. |
| T-03-02-04 | Information Disclosure | manifest.webmanifest exposing internal endpoints | mitigate | Manifest contains only origin-relative paths (`start_url: "/"`, `scope: "/"`, icon paths `"/icons/*.png"`). No LAN hostnames, no internal IP addresses, no secrets, no env-var values. The backend SPA fallback serves it as a static file with auto-detected MIME type. Verified by reviewing the complete manifest object in vite.config.ts above. |
| T-03-02-05 | Information Disclosure | Google Fonts external fetch (pre-existing) | accept | Google Fonts CSS and font files are fetched on first load and cached via CacheFirst. This is a pre-existing concern (CONCERNS.md flags the external font dependency; deferred to v2). CacheFirst reduces ongoing egress after first load; no new threat introduced. No PII or app data is sent to Google — only standard CDN resource requests. |
</threat_model>

<verification>
After plan completes, run these automated checks:

```bash
# 1. Manifest exists with correct values
cat /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/manifest.webmanifest | python3 -m json.tool
# Expected: valid JSON, theme_color="#863bff", icons array with three entries

# 2. All three icon paths resolve in dist
ls /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/icons/

# 3. SW exists and has key handlers
grep -E 'NetworkFirst|CacheFirst' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/sw.js | head -5

# 4. No /ws in SW runtime config
grep '/ws' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/dist/sw.js || echo "PASS: no ws pattern in sw.js"

# 5. theme-color in index.html correct
grep 'theme-color' /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/index.html
# Expected: content="#863bff"

# 6. Git log clean
git -C /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo log --oneline -3
```

**UAT (manual, must be done in Chromium — cannot be automated):**

1. Start backend: `cd /home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo && ./run.sh` (or `cd frontend && npm run preview` to serve the built dist without the backend)
2. Open `http://localhost:8000` (or `http://localhost:4173` for preview) in Chromium
3. **APP-03 check:** Confirm "Install app" icon appears in the address bar within 30 seconds of loading
4. **APP-02 check:** Open DevTools → Application → Service Workers → confirm `sw.js` shows "activated and running"
5. **APP-01 check:** Open DevTools → Application → Manifest → confirm icons display and no red warning banners
6. **APP-02 offline check:** DevTools → Network → Offline → reload → SPA shell renders; confirm API calls fail (expected, not a bug)
7. **iOS (optional for v1):** Open on Safari iOS → Share → confirm "Add to Home Screen" is available

These UAT steps are gating for ROADMAP Phase 3 success criteria #1, #2, #3. Record results in the plan SUMMARY.
</verification>

<success_criteria>
**Automated (all must pass):**
- `npm run build` exits 0 — no TypeScript errors, no Vite plugin errors
- `frontend/dist/manifest.webmanifest` exists with `theme_color: "#863bff"` and three-icon array referencing `/icons/pwa-192.png`, `/icons/pwa-512.png`, `/icons/pwa-maskable-512.png`
- `frontend/dist/sw.js` exists, contains `NetworkFirst` for `/api/` routes, `CacheFirst` for Google Fonts, and no `/ws` runtimeCaching matcher
- `frontend/index.html` `<meta name="theme-color">` is `#863bff`
- `frontend/src/main.tsx` imports and calls `registerSW` from `virtual:pwa-register`
- `README.md` contains a PWA install paragraph with Chromium and Safari/iOS instructions
- Two commits on branch `claude/resume-ai-app-ClIA9`: `chore(pwa)` from Plan 01 and `feat(pwa)` from Plan 02
- `git status` clean after both commits

**Manual (UAT, before closing phase):**
- Chromium shows "Install app" prompt in address bar
- DevTools Application → Service Workers shows `sw.js` activated and running
- DevTools Application → Manifest shows no installability warnings
- Offline → reload: SPA shell renders, API calls fail gracefully (correct behaviour)
</success_criteria>

<output>
After completion, create `.planning/phases/03-pwa-visual-polish/03-02-SUMMARY.md` following the summary template. Include the UAT results (pass/fail per criterion) if manual testing was completed; otherwise note "UAT pending" for each browser criterion.
</output>
