# Phase 3: PWA & Visual Polish - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 10 (7 MODIFY, 3 NEW/DELETE)
**Analogs found:** 7 / 10 (70% — this phase is configuration-and-asset first-time PWA wiring, not extending existing patterns)

---

## File Classification

| File | Type | Role | Data Flow | Match Quality | Notes |
|------|------|------|-----------|---------------|-------|
| `frontend/vite.config.ts` | MODIFY | build-config | static | exact (config extension) | Add VitePWA plugin to existing plugins array |
| `frontend/package.json` | MODIFY | build-config | static | exact (deps management) | Add `vite-plugin-pwa` + `@vite-pwa/assets-generator` to devDeps; add `generate-pwa-assets` script |
| `frontend/index.html` | MODIFY | SPA entry | static | exact (meta tag update) | Update `<meta name="theme-color">` from `#4f6df5` to `#863bff`; keep existing `apple-mobile-web-app-capable` |
| `frontend/src/main.tsx` | MODIFY | React entry | request-response | exact (SW registration) | Add `registerSW` import and call (vite-plugin-pwa virtual module) |
| `frontend/public/icons/` | NEW | asset directory | N/A | N/A (generated) | Created by `@vite-pwa/assets-generator` CLI; contains `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png` |
| `frontend/public/favicon.ico` | NEW | static asset | N/A | existing source (favicon.svg) | Generated from `favicon.svg` via assets-generator; browser-tab fallback |
| `frontend/public/favicon-32.png` | NEW | static asset | N/A | existing source (favicon.svg) | Generated from `favicon.svg` via assets-generator; modern browser tab |
| `frontend/public/icons.svg` | DELETE | unused asset | N/A | none (dead code) | Social-network icon sprite (~5KB); zero consumers (verified via grep) |
| `frontend/.gitignore` | MODIFY | version-control | N/A | best-practice | Add `frontend/dev-dist/` (vite-plugin-pwa dev output) |
| `README.md` | MODIFY | documentation | static | documentation extension | Add PWA install paragraph under deploy/usage section |

---

## Current State (Read-First Excerpts)

### `frontend/vite.config.ts` (MODIFY)

**Current state (lines 1–14):**
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

**Pattern to apply:** The `VitePWA` plugin is added to the `plugins` array alongside `react()`. The server config (proxy) remains unchanged — it already routes `/ws` correctly with `ws: true`. No changes to server settings needed.

---

### `frontend/package.json` (MODIFY)

**Current state (lines 1–30):**
```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
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
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.4.0",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.58.0",
    "vite": "^8.0.4"
  }
}
```

**Pattern to apply:**
- Add `"vite-plugin-pwa": "^1.3.0"` and `"@vite-pwa/assets-generator": "^1.0.2"` to `devDependencies` (after the existing Vite entry).
- Add `"generate-pwa-assets": "pwa-assets-generator --preset minimal-2023 public/favicon.svg"` script to `scripts` object (between `build` and `lint`).

---

### `frontend/index.html` (MODIFY)

**Current state (lines 1–14):**
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

**Pattern to apply:**
- Change line 6: `<meta name="theme-color" content="#4f6df5" />` to `<meta name="theme-color" content="#863bff" />`
- Keep all other meta tags and structure unchanged.

---

### `frontend/src/main.tsx` (MODIFY)

**Current state (lines 1–9):**
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

**Pattern to apply:**
- Add import: `import { registerSW } from 'virtual:pwa-register'` after the App import (line 3).
- Add registration call after the imports and before createRoot (2–4 lines):
```typescript
registerSW({
  onRegistrationSuccess: (r) => {
    console.log('PWA service worker registered:', r)
  },
  onRegistrationError: (e) => {
    console.error('PWA service worker registration error:', e)
  },
})
```

---

### `frontend/public/icons.svg` (DELETE)

**Current state:**
- File: `/home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/icons.svg`
- Size: ~5 KB (5031 bytes)
- Content: Social-network icon sprite (SVG with Bluesky, Discord, GitHub, X, etc.)
- Consumers: **Zero** — grep across TypeScript, JSX, HTML, CSS found no references

**Pattern to apply:** Delete this file as dead code cleanup (ride-along with the feat commit or as a separate chore commit per D-13).

---

### `frontend/.gitignore` (MODIFY)

**Current state (lines 1–13):**
```bash
__pycache__/
*.pyc
*.pyo
venv/
# secrets — never commit
.env
# SQLite DB + WAL/SHM — local data, never commit
bingo.db*
node_modules/
frontend/dist/
*.log
.DS_Store
.claude/
```

**Pattern to apply:**
- Add one line after `node_modules/`: `frontend/dev-dist/`
- This ensures vite-plugin-pwa's dev mode output (if `devOptions.enabled: true` is ever set) doesn't leak into the repo.

---

### `README.md` (MODIFY)

**Current location:** `/home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/README.md` (99 lines total)

**Current Deploy section (lines 72–87):**
```markdown
## Deploying to kainga-core

This app is family-only and runs on kainga-core via Docker. Access is via LAN or Tailscale — there is no public IP and no public release planned.

[docker-compose commands and description...]
```

**Pattern to apply:**
- Add a new subsection **"PWA install"** after the "Deploying to kainga-core" section (after line 89, before "## Project shape").
- Suggested text:
```markdown
## PWA install

On Chromium-based browsers (Chrome, Edge, Brave), an "Install app" icon appears in the address bar; click to install the app to your desktop or start menu. On Safari/iOS, use the Share button and select "Add to Home Screen." The app launches in a standalone window with no browser chrome — it's a native-feeling app experience.
```

---

## New Asset Files (Generated by `@vite-pwa/assets-generator`)

These three files are **generated**, not hand-authored. The planner runs the CLI to produce them:

```bash
cd frontend
npm run generate-pwa-assets
```

### `frontend/public/icons/pwa-192.png`
- **Source:** `frontend/public/favicon.svg` (rasterized at 192×192)
- **Purpose:** PWA install prompt icon; home-screen icon on Chromium
- **Maskable:** No (purpose: "any")
- **Generated by:** `@vite-pwa/assets-generator --preset minimal-2023`

### `frontend/public/icons/pwa-512.png`
- **Source:** `frontend/public/favicon.svg` (rasterized at 512×512)
- **Purpose:** Splash screen; app drawer on high-DPI devices
- **Maskable:** No (purpose: "any")
- **Generated by:** `@vite-pwa/assets-generator --preset minimal-2023`

### `frontend/public/icons/pwa-maskable-512.png`
- **Source:** `frontend/public/favicon.svg` (rasterized at 512×512 + 15% auto-pad safe-area inset)
- **Purpose:** Adaptive icon on Android devices (system applies circle/squircle mask); fallback on iOS
- **Maskable:** Yes (purpose: "maskable")
- **Generated by:** `@vite-pwa/assets-generator --preset minimal-2023`

### `frontend/public/favicon.ico`
- **Source:** `frontend/public/favicon.svg` (rasterized to multi-resolution ICO format)
- **Purpose:** Browser-tab fallback for older browsers
- **Generated by:** `@vite-pwa/assets-generator --preset minimal-2023`

### `frontend/public/favicon-32.png`
- **Source:** `frontend/public/favicon.svg` (rasterized at 32×32)
- **Purpose:** Modern browser tab icon (PNG variant)
- **Generated by:** `@vite-pwa/assets-generator --preset minimal-2023`

---

## Shared Patterns (vite-plugin-pwa Configuration)

**Apply to:** `frontend/vite.config.ts` in the VitePWA plugin config

### Manifest Configuration

From RESEARCH.md "Patterns to Apply" section, the vite.config.ts manifest object (lines 656–686):

```typescript
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
}
```

### Workbox Caching Configuration

From RESEARCH.md, the runtimeCaching section (lines 688–728):

```typescript
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
}
```

### devOptions Configuration

From RESEARCH.md line 731:

```typescript
devOptions: {
  enabled: false
}
```

---

## SVG Source Asset (favicon.svg)

**File:** `/home/pippa-sofine/Documents/Obsidian/01_Projects/tv-series-bingo/frontend/public/favicon.svg`

**Status:** Kept as-is (per D-01). This is the single source of truth for all PNG icon generation.

**Content characteristics:**
- Dimensions: 48×46 viewBox
- Fill color: `#863bff` (VUT purple — matches decision D-05)
- Complexity: Multiple Gaussian blur filters + clip-path mask (correctly rasterized by headless browser in assets-generator)
- Negative space: Adequate for maskable safe-area auto-padding (15% inset per D-03)

**No hand-editing needed.** The generator handles SVG-to-PNG conversion at all three sizes (192, 512, 512-maskable) and produces both "any" and "maskable" variants from this single source.

---

## Verification Acceptance Criteria (Post-Modification)

Use these checks to confirm the pattern application is correct:

1. **Vite build completes:**
   ```bash
   cd frontend && npm run build
   ```
   Expected: No errors, `frontend/dist/manifest.webmanifest` is present.

2. **Service worker registers in browser:**
   - Open http://localhost:8000 in Chromium
   - DevTools → Application → Service Workers
   - Expected: `sw.js` listed with status "activated and running"

3. **Manifest is valid JSON:**
   ```bash
   curl http://localhost:8000/manifest.webmanifest | jq .
   ```
   Expected: Valid JSON output, `theme_color: "#863bff"`, icons array with three entries.

4. **Icons are accessible:**
   ```bash
   curl -I http://localhost:8000/icons/pwa-192.png
   ```
   Expected: `Content-Type: image/png`, HTTP 200.

5. **Install prompt appears in Chromium:**
   - Open app in Chromium → address bar → install icon (right side)
   - Click → "Install TV Bingo" dialog appears
   - Click Install → desktop shortcut created

6. **iOS Safari Add-to-Home-Screen available:**
   - Open http://localhost:8000 on iOS Safari
   - Tap Share → "Add to Home Screen" option present

7. **main.tsx loads without errors:**
   - Console: `PWA service worker registered: [SW object]`
   - No red error messages about `virtual:pwa-register` not found

---

## No Code Pattern Matching Required

Unlike typical phases, Phase 3 is primarily **first-time PWA wiring** with **no existing codebase analogs** for:
- Service worker strategy patterns (new to this codebase)
- Manifest configuration (first PWA in this project)
- Icon asset generation (first use of assets-generator)

The closest analogs are the **existing Vite config structure** (for plugin placement) and **existing React entry** (for SW registration), both shown in the "Current State" section above. Configuration and dependency patterns come directly from official `vite-plugin-pwa` docs, not from prior phase code.

---

## PATTERN MAPPING COMPLETE

**Status:** Ready for planning.

**Key findings:**
- 7 of 10 files have clear read-first excerpts for planner reference
- 3 files are generated assets (PNG + ICO) with no code patterns to map
- 1 file is deleted (icons.svg) — dead code confirmed via grep
- Configuration patterns are fully documented in RESEARCH.md sections with exact line numbers
- Service worker registration follows the vite-plugin-pwa React hook pattern (standard, not project-specific)
- No backend changes required; FastAPI FileResponse already handles manifest + SW delivery

**Files ready for planner action:**
- `frontend/vite.config.ts` — add VitePWA plugin + workbox config
- `frontend/package.json` — add PWA deps + generate script
- `frontend/index.html` — update theme-color meta tag
- `frontend/src/main.tsx` — add SW registration import + call
- `frontend/.gitignore` — add dev-dist/ entry
- `README.md` — add PWA install section
- `frontend/public/icons.svg` — delete
- `frontend/public/icons/` directory + PNG/ICO files — generate via CLI

**Verification hooks provided:** 7 acceptance criteria for post-implementation manual checks.

