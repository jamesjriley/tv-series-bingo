---
phase: 03
slug: pwa-visual-polish
status: verified
threats_open: 0
threats_total: 8
threats_closed: 8
asvs_level: 1
created: 2026-05-06
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Phase 03 introduces a Vite-PWA service worker, web app manifest, and PWA icon set into a family-LAN, never-public TV-bingo app hosted on kainga-core. Threat surface centres on (1) SW interception of WebSocket multiplayer traffic, (2) cache poisoning of `/api/*` game-state endpoints, (3) information disclosure via the public manifest, and (4) supply-chain risk from new devDependencies. All three `mitigate` threats are honoured by shipped code; all five `accept` threats trace to documented project constraints (family-LAN, no public release, v2 deferrals).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → Service Worker | SW intercepts fetch events; mis-configured runtimeCaching could serve stale game state or attempt to intercept WS upgrades | HTTP request/response bodies, cached SPA shell, cached `/api/*` game state |
| Browser → manifest.webmanifest | Public-readable JSON loaded by the browser at install time; must not expose internal endpoints or secrets | Origin-relative paths, app metadata (name, theme colour), icon URLs |
| SW cache → API responses | NetworkFirst for `/api/*`, CacheFirst for Google Fonts; cache lifetime governs staleness window | Game-state JSON (cached as offline fallback only), font binaries |
| autoUpdate (skipWaiting) → active sessions | New SW takes control immediately on update; tab reload may interrupt a mid-game session | None — recovery via existing `game_id` URL |
| npm registry → frontend devDependencies | `vite-plugin-pwa` and `@vite-pwa/assets-generator` fetched at install/build; affects build-time tooling only | Build-time only; not served to clients |
| Static asset pipeline → public/ icons | `@vite-pwa/assets-generator` writes PNG/ICO files to `public/`; served by FastAPI as static assets | Brand mark only, no user data |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01-01 | Tampering | npm install (supply chain) | accept | `frontend/package-lock.json` pins transitive deps; only `vite-plugin-pwa@^1.3.0` and `@vite-pwa/assets-generator@^1.0.2` (vite-plugin-pwa org) added. Family-LAN scope, no public release | closed |
| T-03-01-02 | Information Disclosure | `manifest.webmanifest` | accept | Manifest is intentionally public; verified to contain only origin-relative paths, no LAN hostnames/IPs/secrets/tokens | closed |
| T-03-01-03 | Tampering | Generated icon files committed to git | accept | Deterministic regeneration from `frontend/public/favicon.svg` via pinned `@vite-pwa/assets-generator@1.0.2`. Supply-chain risk subsumed by T-03-01-01 | closed |
| T-03-02-01 | Elevation of Privilege | Service worker scope hijack of WebSocket multiplayer | mitigate | SW `scope: "/"` (`vite.config.ts:18`); `dist/sw.js` contains zero `/ws`/`ws:`/`wss:` matches in any registerRoute or runtimeCaching entry. WebSocket upgrade is non-fetch and not interceptable by Workbox per W3C spec. Dev-only proxy at `vite.config.ts:93` (`server.proxy`) is not shipped to clients | closed |
| T-03-02-02 | Denial of Service | Stale SW serving outdated SPA shell mid-game | accept | `registerType: 'autoUpdate'` + `skipWaiting: true` + `clientsClaim: true` per D-11 lock (`03-CONTEXT.md:57`). Family-LAN single-tab use, rare deploys; recovery via existing `game_id` URL | closed |
| T-03-02-03 | Tampering | Cache poisoning of `/api/*` via stale SW response | mitigate | `dist/sw.js` registers `({url:e})=>e.pathname.startsWith("/api")` with `NetworkFirst` and `networkTimeoutSeconds: 3` (source `vite.config.ts:69-80`). Network always attempted first; cache only as offline fallback. No CacheFirst/StaleWhileRevalidate on `/api` | closed |
| T-03-02-04 | Information Disclosure | manifest.webmanifest exposing internal endpoints | mitigate | `dist/manifest.webmanifest` contains only origin-relative paths (`start_url:"/"`, `scope:"/"`, `id:"/"`, `/icons/*.png`). Zero matches for `http://`, `https://`, IP/hostname patterns, or env-style values. Source `vite.config.ts:11-42` confirms manifest object is string literals only — no env interpolation | closed |
| T-03-02-05 | Information Disclosure | Google Fonts external fetch (pre-existing) | accept | Pre-existing concern carried forward. CacheFirst on `fonts.googleapis.com` and `fonts.gstatic.com` with 1-year `maxAgeSeconds: 31536000` (`vite.config.ts:48-67`) reduces ongoing egress. CONCERNS.md defers full removal to v2 per D-12 | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-01-01 | Family-LAN private app, no public release per CLAUDE.md "Hard constraints"; new devDeps are from the official vite-plugin-pwa org. Risk level: low. Re-evaluate if scope ever changes to public release | Pippa | 2026-05-06 |
| AR-03-02 | T-03-01-02 | Manifest is intentionally public-readable; no secrets/credentials/internal hostnames present. Phase verifier confirmed via grep on built artefact | Pippa | 2026-05-06 |
| AR-03-03 | T-03-01-03 | Deterministic regeneration from pinned tooling; binary integrity inherits from npm supply chain (T-03-01-01) | Pippa | 2026-05-06 |
| AR-03-04 | T-03-02-02 | autoUpdate + skipWaiting accepted for v1 per D-11 lock; family-LAN single-tab use, mid-game reload is rare and recoverable via `game_id` URL. Revisit in v2 if analytics show friction | Pippa | 2026-05-06 |
| AR-03-05 | T-03-02-05 | Pre-existing Google Fonts dependency carried forward from v0; CacheFirst minimises egress. Full removal deferred to v2 per CONCERNS.md and D-12 | Pippa | 2026-05-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-06 | 8 | 8 | 0 | gsd-security-auditor (Phase 03 initial audit) |

### 2026-05-06 — Initial audit (State B: from PLAN+SUMMARY artefacts)

- Auditor verified all three `mitigate` threats against shipped code in `frontend/vite.config.ts`, `frontend/dist/sw.js`, and `frontend/dist/manifest.webmanifest`
- All five `accept` dispositions documented above with project-constraint rationale
- No implementation gaps, no escalations, no unregistered threat flags in either SUMMARY.md
- WebSocket origin/auth gap (CONCERNS.md SEC-01) is **out of scope for Phase 03**: T-03-02-01 verifies only SW non-interception, not the underlying WS auth — that work belongs to a later phase

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-06
