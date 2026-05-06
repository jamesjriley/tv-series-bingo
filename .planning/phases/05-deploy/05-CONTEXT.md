# Phase 5: Deploy — Context

**Gathered:** 2026-05-06
**Status:** Ready for planning
**Source:** Conversation with Pippa, 2026-05-06 (manual capture in lieu of formal /gsd-discuss-phase pass)

<domain>
## Phase Boundary

Deploy v1 of TV Bingo to kainga-core for family LAN use. ONLY DEPLOY-01 is in scope. TEST-01/02 moved to Phase 6 (decided 2026-05-06 after Phase 3 UAT surfaced four PWA-install ceremony tests deferred to a real HTTPS deployment — Pippa elected to deploy ahead of writing tests so the family can actually start using the installed app and so the deferred verification can close).

Phase delivers: a deploy story Pippa can run from the project README, producing a kainga-core service that Mum, Gordie, and Pippa can install as a PWA from their Android phones over the home LAN.

</domain>

<decisions>
## Implementation Decisions

### Hosting target
- **Host:** kainga-core (existing home lab machine)
- **Network:** LAN only — no Tailscale provisioning in this phase
- **No public IP, no public release** (per PROJECT.md hard constraints)

### Networking / TLS
- **Reverse proxy:** Caddy (existing configuration in home lab docs — reuse the existing pattern, do not invent a new one)
- **HTTPS required** — PWA install on Android Chrome requires secure context; without HTTPS the four deferred Phase 3 UAT items cannot close
- **Cert strategy:** preferred = Caddy's automatic local CA (`tls internal`) since it auto-issues certs and the only client-side step is trusting one root CA on each Android phone. Fallback = mkcert. **Excluded:** public CAs requiring DNS-01 (LAN-only constraint precludes a public DNS name)

### Container / deploy mechanism
- **Compose:** docker-compose
- **Stack:** FastAPI backend (already containerised) + frontend (built static assets) + Caddy
- **Reuse existing assets:** project root already has a `Dockerfile` and `docker-compose.yml` (referenced by the run.sh dev path) — adapt rather than rewrite

### Documentation
- **README** must document: deploy steps from a fresh clone, LAN access (URL pattern), required env vars, restart procedure, and the one-time Android root-CA install step (if Caddy local CA is used)

### Constraints baked into Phase 5 success criteria (ROADMAP.md)
1. `docker-compose up` boots cleanly from a fresh checkout
2. App reachable on LAN over HTTPS
3. Android phone install prompt appears + app installs with correct manifest icon (closes deferred Phase 3 UAT 1, 2, 3, 4)
4. README documents deploy + cert install + restart

### Claude's discretion (decided during planning research)
- Specific docker-compose service layout and network topology
- Caddyfile content (trusting the existing home lab Caddy patterns first)
- SQLite persistence — bind mount vs named volume (current dev uses a project-relative `bingo.db`)
- Env-var handling at the container layer (`.env` file vs env_file directive vs explicit `environment:`)
- Health check / restart policy (`restart: unless-stopped` likely)
- Logging strategy (stdout to docker, no file rotation needed for family scale)
- Whether the existing `frontend/` build runs at image-build time (multi-stage Dockerfile) or via a sidecar

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — Hard constraints (LAN-only, family-only, never public)
- `.planning/REQUIREMENTS.md` — DEPLOY-01 acceptance criteria
- `.planning/ROADMAP.md` — Phase 5 success criteria (4 items) and explicit constraints from Pippa
- `.planning/codebase/ARCHITECTURE.md` — Current app architecture
- `.planning/codebase/STACK.md` — Tech stack baseline
- `.planning/codebase/CONCERNS.md` — Pre-existing audit
- `.planning/phases/03-pwa-visual-polish/03-UAT.md` — Four deferred PWA-install tests this phase must close (Tests 1, 2, 3, 4)

### Home lab (kainga-core) reference — first-stop for deployment specifics
- `~/Documents/Obsidian/01_Projects/HomeLab/documentation/Kainga Home Lab.md` — Main home lab doc (network topology, services, conventions, IP allocations)
- `~/Documents/Obsidian/01_Projects/HomeLab/incidents/incident-006-vpn-route-hijacks-kainga-core.md` — Recent VPN/networking incident — read for routing gotchas that may affect LAN reachability
- Other `~/Documents/Obsidian/01_Projects/HomeLab/project_*` directories — examine for the existing Caddy reverse-proxy pattern used by other services on kainga-core
- `~/Documents/Obsidian/06_C-Suite/` — CIO (Suki) brief on TV Bingo + infrastructure direction. **If unanswered questions remain after the home lab docs, surface them via /csuite to ask Suki rather than guessing.**

### Existing project assets
- `Dockerfile` (project root) — current container build
- `docker-compose.yml` (project root) — current compose config
- `frontend/vite.config.ts` — PWA + build output paths
- `run.sh` — current dev runner (informs what env-vars / startup ordering production needs to preserve)
- `backend/config.py` — env-var contract (`OPENROUTER_API_KEY`, `AI_MODEL`, `DATABASE_PATH`, `HOST`, `PORT`)

</canonical_refs>

<specifics>
## Specific Ideas

- This phase **closes** 4 deferred Phase 3 PWA-install UAT items. The deploy must be verifiable on Android Chrome (install prompt appears, app launches standalone, manifest icon renders).
- Family is all-Android — Chrome and Samsung Internet are the install targets. iOS is out of scope (no iOS users, per D-04).
- Real users are Pippa, Mum, Gordie. The deploy story must be **simple enough Pippa can recreate it from the README** — this constrains complexity (no kubernetes, no helm, no ansible).
- Once deployed, multiplayer (the highest-stakes function — Phase 3 UAT Test 5) must continue to work over LAN HTTPS. The Caddy reverse proxy must correctly handle the WebSocket upgrade for `/ws` traffic.

</specifics>

<deferred>
## Deferred Ideas

- **Tailscale access** — out of scope for v1 (LAN only). Existing CLAUDE.md note about LAN/Tailscale stands as a v2 option.
- **Public IP / public hostname** — explicitly out of scope (PROJECT.md hard constraint).
- **TEST-01/02 (pytest coverage)** — moved to Phase 6.
- **Phase 3.1 visual polish** — independent track waiting on /gsd-sketch.
- **CI/CD beyond docker-compose up** — not needed for family-only deploy. No GitHub Actions, no remote build pipeline.
- **Backups / DR** — out of scope (SQLite file is small; if needed, snapshot via existing kainga-core backup pattern documented in home lab docs).

</deferred>

---

*Phase: 05-deploy*
*Context gathered: 2026-05-06 via conversation with Pippa (manual capture)*
