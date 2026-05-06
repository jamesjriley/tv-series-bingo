# Phase 5: Deploy — Research

**Researched:** 2026-05-06
**Domain:** Containerised LAN deploy (FastAPI + static SPA + Caddy reverse proxy + LE certs via DNS-01) onto a documented Ubuntu home-lab host (`kainga-core`)
**Confidence:** HIGH (the kainga-core platform is exhaustively documented and TV Bingo already has a service slot — `tv-bingo.aiwhare.com → 127.0.0.1:8088` — wired in the home-lab Caddyfile and UniFi DNS)

## Summary

Phase 5 is **not a greenfield deploy.** The home-lab docs show TV Bingo already has a reserved deploy slot on kainga-core: a UniFi DNS entry (`tv-bingo.aiwhare.com → 192.168.20.9`), a Caddyfile route (`tv-bingo.aiwhare.com → 127.0.0.1:8088`), and a documented compose path (`/srv/containers/tv-bingo/`). The host runs a `caddy-cloudflare:local` image (Caddy v2.11.2 + caddy-dns/cloudflare plugin) on `--network host` that already issues publicly-trusted Let's Encrypt certs via DNS-01 challenge for all `*.aiwhare.com` services. Pippa's brand-new build just plugs into this existing pipeline.

The CONTEXT.md preference for `tls internal` (Caddy local CA) is **the wrong choice for this user base** and should be overridden during planning. Incident 004 (resolved 2026-03-19, see `~/Documents/Obsidian/01_Projects/HomeLab/incidents/incident-004-https-cert-not-trusted-on-chrome.md`) documents the exact failure mode: Android Chrome 7+ ignores user-installed CAs, which means Mum's tablet (and Gordie's phone) cannot trust a `tls internal` cert no matter how careful the install ceremony is. The home lab solved this once already by switching to LE/DNS-01 for the whole `*.aiwhare.com` zone. Reusing that pipeline gives Mum and Gordie a friction-free install — they open `https://tv-bingo.aiwhare.com`, Chrome shows the "Install app" prompt, done. No custom cert trust step on any phone, ever.

**Primary recommendation:** Add `tv-bingo.aiwhare.com { reverse_proxy 127.0.0.1:8088 }` to the existing Caddyfile (already present per `documentation/tv_bingo.md` — verify on the host); deploy `tv-bingo` container at `/srv/containers/tv-bingo/` binding `127.0.0.1:8088:8000`; let Caddy auto-issue the LE cert via the existing DNS-01 pipeline. The README documents the deploy as four commands: `git clone`, populate `.env`, `docker compose up -d --build`, open the URL.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Hosting target**
- Host: kainga-core (existing home lab machine)
- Network: LAN only — no Tailscale provisioning in this phase
- No public IP, no public release

**Networking / TLS**
- Reverse proxy: Caddy (existing configuration in home lab docs — reuse the existing pattern, do not invent a new one)
- HTTPS required — PWA install on Android Chrome requires secure context; without HTTPS the four deferred Phase 3 UAT items cannot close
- Cert strategy preference (per CONTEXT.md): preferred = Caddy's `tls internal`, fallback = mkcert; excluded = public CAs requiring DNS-01 for a public DNS name

> ⚠️ **Research challenges this preference.** See "Cert Strategy" section. The existing kainga-core Caddy already runs LE/DNS-01 against the `aiwhare.com` Cloudflare zone and `tv-bingo.aiwhare.com` is already a routed vhost. The "no public CA" exclusion was framed against "public DNS name" but `aiwhare.com` is a real domain Pippa already controls and uses for *all* her LAN services — there's nothing public about how it's used (UniFi DNS resolves it to a LAN IP). Reusing the existing LE pipeline is strictly better than `tls internal` because Android 7+ Chrome cannot trust user-installed CAs. Surfaced to Pippa/Suki below.

**Container / deploy mechanism**
- Compose: docker-compose
- Stack: FastAPI backend (already containerised) + frontend (built static assets) + Caddy
- Reuse existing assets: project root already has Dockerfile and docker-compose.yml — adapt rather than rewrite

**Documentation**
- README must document: deploy steps from a fresh clone, LAN access (URL pattern), required env vars, restart procedure, and the one-time Android root-CA install step (only if `tls internal` is used)

**Constraints baked into Phase 5 success criteria (ROADMAP.md)**
1. `docker-compose up` boots cleanly from a fresh checkout
2. App reachable on LAN over HTTPS
3. Android phone install prompt appears + app installs with correct manifest icon (closes Phase 3 UAT 1, 2, 3, 4)
4. README documents deploy + cert install + restart

### Claude's Discretion (decided during planning research)
- Specific docker-compose service layout and network topology
- Caddyfile content (trusting the existing home lab Caddy patterns first)
- SQLite persistence — bind mount vs named volume (current dev uses a project-relative `bingo.db`)
- Env-var handling at the container layer (`.env` file vs env_file directive vs explicit `environment:`)
- Health check / restart policy (`restart: unless-stopped` likely)
- Logging strategy (stdout to docker, no file rotation needed for family scale)
- Whether the existing `frontend/` build runs at image-build time (multi-stage Dockerfile) or via a sidecar

### Deferred Ideas (OUT OF SCOPE)
- Tailscale access — out of scope for v1
- Public IP / public hostname — out of scope (PROJECT.md hard constraint)
- TEST-01/02 (pytest coverage) — moved to Phase 6
- Phase 3.1 visual polish — independent track waiting on `/gsd-sketch`
- CI/CD beyond docker-compose up — not needed for family-only deploy
- Backups / DR — out of scope (low criticality per existing tv_bingo.md, "game state is ephemeral")
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | Deploy v1 to kainga-core — single-container deployment, accessible to family on LAN/Tailscale; documented in README; existing deploy approach (Dockerfile + docker-compose) reused | Existing project Dockerfile is multi-stage (Node frontend build + Python runtime). `docker-compose.yml` exists with `tv-bingo` service exposing `8088:8000` and a named volume `bingo-data` mapped to `/app/data`. The home-lab pattern (`/srv/containers/<service>/docker-compose.yml`, Caddy reverse proxy on host network, LE/DNS-01 certs) is established for 9+ services and applies cleanly. |

The phase also implicitly closes 4 deferred Phase 3 UAT items (PWA install ceremony, SW activation, maskable icon preview, offline reload) — these become testable on Android Chrome only once the app is on `https://tv-bingo.aiwhare.com`.
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TLS termination + LE cert mgmt | Reverse proxy (Caddy on host network) | — | Existing kainga-core pattern; Caddy auto-renews via DNS-01; nothing else needs TLS code |
| WebSocket Upgrade for `/ws` | Reverse proxy → app container | — | Caddy v2 `reverse_proxy` handles WS Upgrade automatically (verified — caddyserver.com docs) |
| Static asset serving (SPA) | App container (FastAPI mounts `frontend/dist`) | — | Already in `backend/main.py`; no need to extract to a separate web server |
| API + WebSocket app | App container (uvicorn:8000) | — | Bound to `127.0.0.1:8088` on host so only Caddy can reach it |
| SQLite persistence | App container (named volume `bingo-data`) | — | Already configured in current `docker-compose.yml`; matches the pattern used by Forgejo, n8n, Pret-a-Manger |
| LAN DNS resolution | UniFi controller DNS policy | — | Already exists for `tv-bingo.aiwhare.com → 192.168.20.9` (per `network_architecture_services_baseline_documentation_updated.md`) |
| Public DNS for ACME challenge | Cloudflare DNS API | — | Already wired via `CF_API_TOKEN` env on the existing Caddy container; no per-service config |
| Host firewall (UFW) | Host (Ubuntu) | — | Existing rule `192.168.20.0/24 -> 80, 443` covers Caddy ingress; no new rule needed for tv-bingo because port 8088 is bound to loopback |

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Docker Engine | (current on kainga-core, json-file log driver, max-size 10m, max-file 3) | Container runtime | Standard kainga-core deploy mechanism for all 17 services |
| docker-compose v2 (`docker compose ...`) | bundled with Docker | Service orchestration | Existing `/srv/containers/*/docker-compose.yml` pattern across n8n, Forgejo, Pret-a-Manger, observability, syncthing, etc. |
| Caddy 2.11.2 + `caddy-dns/cloudflare` | already deployed as `caddy-cloudflare:local` (image built 2026-03-19) | LAN-HTTPS reverse proxy with auto-LE certs via DNS-01 | Already issuing publicly-trusted certs for 10+ vhosts; auto-renewal proven |
| python:3.11-slim | image label in current Dockerfile | Backend runtime | Already used; matches PROJECT.md stack lock |
| node:20-alpine | image label in current Dockerfile | Frontend build stage | Already used; multi-stage build outputs to `/app/frontend/dist` |
| FastAPI + uvicorn | as in `backend/requirements.txt` | App server | Existing |
| Volume `bingo-data` | named docker volume | SQLite persistence | Already declared in current `docker-compose.yml`; mapped to `/app/data` |

### Supporting (already on kainga-core, no new install)
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| UniFi local DNS | Resolves `*.aiwhare.com` → `192.168.20.9` | Already configured for `tv-bingo.aiwhare.com` |
| Caddyfile at `/home/opsadmin/services/caddy/Caddyfile` | Single bind-mounted Caddy config | Per `network_architecture_*.md` Reverse Proxy Baseline; tv-bingo block already documented |
| `caddy_data` named volume | LE cert persistence across container restarts | Already in use; "Do not delete or recreate this volume" per project_008 |
| UFW rule `192.168.20.0/24 -> 80, 443` | LAN → Caddy ingress | Already in place |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LE/DNS-01 (recommended) | `tls internal` (Caddy local CA) | Saves nothing; **breaks PWA install for Android Chrome users (the entire user base)**. Documented failure mode in incident-004. |
| LE/DNS-01 | mkcert | Same Android Chrome 7+ user-CA-distrust problem; additionally requires per-device root install ceremony (Mum needs to do this, Gordie needs to do this). The whole point of using the existing kainga pipeline is **zero per-device steps**. |
| Multi-stage Docker build (current) | Pre-build frontend + bind-mount static dir | Existing multi-stage build is fine; rebuild on `docker compose up --build` is fast (Node deps cached in layer); no value in extracting. |
| Dedicated Caddy container in this project's compose | Reuse the host-level Caddy | The host Caddy already exists with the cert plumbing wired; running a *second* Caddy in this project's compose would mean re-issuing certs separately, duplicate ports 80/443 contention, and parallel ACME challenges. **Don't do this.** This is the most likely architectural mistake during planning. |
| Bind mount for SQLite | Named docker volume (current) | Named volume is the established pattern (Forgejo, n8n, observability). Bind mount would tie the data to a host path; volumes are managed by Docker and fit the existing backup/inspection idiom. |

**Installation:** No new tooling needed on kainga-core — the platform components (Docker, Caddy, UniFi DNS, UFW, Cloudflare API token) are already in place. The only new artifact is the `tv-bingo` service files at `/srv/containers/tv-bingo/`, transferred via rsync or git pull.

**Version verification:**
- Caddy image: `caddy-cloudflare:local`, built 2026-03-19, Caddy v2.11.2 + caddy-dns/cloudflare v0.2.3 [VERIFIED: project_008/01_project_plan.md actions log]
- Docker Engine version: not pinned in docs, but implicit (json-file driver supported back to ~Docker 1.13). Skip pinning.
- Cloudflare API token already provisioned and stored in the operator's password manager [CITED: project_008]
- The `aiwhare.com` zone is on Cloudflare DNS [CITED: incident-004 root cause; project_008 §3 architecture]

## Architecture Patterns

### System Architecture Diagram

```
                     ┌────────────────────────────────────────────────┐
                     │ Family device on kainga LAN                    │
                     │ (Mum's tablet / Gordie's phone / Pippa laptop) │
                     │   Android Chrome / Samsung Internet            │
                     └───────────────┬────────────────────────────────┘
                                     │
                                     │  https://tv-bingo.aiwhare.com
                                     │  (or wss:// for /ws/{game}/{player})
                                     ▼
        ┌───────────────────────────────────────────────────────────┐
        │ UniFi controller — local DNS policy                       │
        │ tv-bingo.aiwhare.com  →  192.168.20.9                     │
        └────────────────────────┬──────────────────────────────────┘
                                 │
                                 │  TCP 443 (LAN, UFW allow 192.168.20.0/24)
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ kainga-core (192.168.20.9, Ubuntu 24.04, host network)                   │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │ Docker container: caddy (caddy-cloudflare:local, --network host) │   │
│   │   - Caddyfile: /home/opsadmin/services/caddy/Caddyfile           │   │
│   │   - global { acme_dns cloudflare {env.CF_API_TOKEN} }            │   │
│   │   - tv-bingo.aiwhare.com { reverse_proxy 127.0.0.1:8088 }        │   │
│   │   - Volumes: caddy_data (LE certs), caddy_config                 │   │
│   │   - WS Upgrade handled automatically by reverse_proxy            │   │
│   └────────────────────────┬─────────────────────────────────────────┘   │
│                            │                                             │
│                            │  127.0.0.1:8088  (loopback only)            │
│                            ▼                                             │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │ Docker container: tv-bingo (this project)                        │   │
│   │   - Built from project Dockerfile (Node 20 → Python 3.11-slim)   │   │
│   │   - uvicorn :8000 inside, mapped to 127.0.0.1:8088 on host       │   │
│   │   - FastAPI serves /api, /ws/*, and frontend/dist SPA fallback   │   │
│   │   - Named volume bingo-data → /app/data (SQLite + WAL)           │   │
│   │   - .env from /srv/containers/tv-bingo/.env (OPENROUTER_API_KEY) │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │  ACME (out-of-band, Caddy-managed)                               │   │
│   │  Caddy → Cloudflare DNS API → TXT _acme-challenge.tv-bingo...    │   │
│   │  Let's Encrypt validates → issues cert → stored in caddy_data    │   │
│   └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (production layout on kainga-core)

```
/srv/containers/tv-bingo/         # production deploy root (owned by opsadmin)
├── docker-compose.yml            # adapted from project root
├── .env                          # OPENROUTER_API_KEY, AI_MODEL (chmod 600)
├── Dockerfile                    # if rsync/git deploy (Pret-a-Manger pattern)
├── backend/                      # source (only if rsync deploy; else built into image from clone)
└── frontend/                     # source

# Persistent data (managed by docker)
docker volume: bingo-data         # SQLite db lives here, mapped to /app/data inside container

# Caddy config (host-level, shared by all aiwhare.com services)
/home/opsadmin/services/caddy/Caddyfile   # add tv-bingo block (already documented as present)
/home/opsadmin/services/caddy/Dockerfile  # caddy:builder with cloudflare plugin (existing)
docker volume: caddy_data         # LE cert storage — DO NOT TOUCH
docker volume: caddy_config       # Caddy runtime state — DO NOT TOUCH
```

### Pattern 1: Service compose at `/srv/containers/<name>/`
**What:** Each kainga-core service has its own compose file at `/srv/containers/<name>/docker-compose.yml` (or `/opt/kainga/<name>/` for n8n, which predates the convention). Service binds to `127.0.0.1:<unique-port>` so it can only be reached via Caddy. Caddy's vhost in `/home/opsadmin/services/caddy/Caddyfile` does `reverse_proxy 127.0.0.1:<port>`.
**When to use:** Any new LAN-only HTTPS service. This is the established pattern.
**Example (verbatim from `documentation/tv_bingo.md` — **already documented as present on kainga-core**):**
```caddyfile
# In /home/opsadmin/services/caddy/Caddyfile
tv-bingo.aiwhare.com {
    reverse_proxy 127.0.0.1:8088
}
```
*(Note: the existing per-service docs sometimes show `tls internal` inside the block — e.g. `pret_a_manger.md`. Those blocks were superseded by the **global** `acme_dns cloudflare {env.CF_API_TOKEN}` directive added in project_008 Phase E. Per Caddy semantics, setting `acme_dns` globally applies to every vhost, so per-vhost `tls internal` overrides should be **removed if present**. The `network_architecture_*.md` baseline doc — the canonical reference, last updated 2026-04-14 — shows the routes without `tls internal` blocks, confirming this.)*

### Pattern 2: Bind app to loopback, not LAN
**What:** Map host port to `127.0.0.1` rather than `0.0.0.0`. The current `docker-compose.yml` uses `"8088:8000"` (which binds to all interfaces by default). Change to `"127.0.0.1:8088:8000"` so the app is **only** reachable via Caddy.
**When to use:** Always for services proxied via Caddy. Avoids accidental HTTP-only access via the fallback `http://192.168.20.9:8088` path that bypasses HTTPS and the proxy.
**Example:**
```yaml
ports:
  - "127.0.0.1:8088:8000"
```

### Pattern 3: Reuse existing multi-stage Dockerfile
**What:** The current `Dockerfile` does Node-build-then-Python-runtime. Frontend `dist/` is built into the image and served by FastAPI's static-mount + SPA-fallback in `backend/main.py`.
**When to use:** This is correct for v1 family scale. Don't split into a separate web server.
**Caveat:** When the PWA service worker is generated by `vite-plugin-pwa` (`generateSW` strategy, per `frontend/vite.config.ts`), the `dist/sw.js` and `dist/manifest.webmanifest` end up in the image. FastAPI's existing static-fallback in `backend/main.py` (lines 41-48) already serves arbitrary files from `dist/` if they exist, so `sw.js`, `manifest.webmanifest`, and `/icons/*.png` will Just Work — no FastAPI changes needed. **[VERIFIED: read backend/main.py in this session.]**

### Anti-Patterns to Avoid
- **Running a second Caddy container in this project's compose.** The host already has `caddy-cloudflare:local` listening on 80/443 with the LE pipeline wired. A second Caddy would conflict on those ports and be unable to issue certs without its own CF_API_TOKEN. **Reuse the host Caddy.**
- **Adding a per-vhost `tls internal` directive.** This will be silently *overridden* by the global `acme_dns cloudflare` block — but if Caddy's parsing changes, it could break LE issuance. Just don't put `tls internal` anywhere.
- **Binding the app to `0.0.0.0:8088` on the host.** That exposes raw HTTP on the LAN, bypasses HTTPS, breaks the secure-context requirement for PWA, and creates an unencrypted second path that defeats the purpose of Caddy.
- **Putting `bingo.db` in a bind mount on the project source tree.** The current dev path (`bingo.db` next to `backend/`) shouldn't survive into production. Use the named volume `bingo-data` (already declared) and `DATABASE_PATH=/app/data/bingo.db`.
- **Forgetting the WebSocket path in the proxy.** This is a non-issue for Caddy v2's `reverse_proxy` — it auto-handles Upgrade — but it's a classic gotcha when using nginx or Apache. **No special directive needed.** [VERIFIED: caddyserver.com/docs/caddyfile/directives/reverse_proxy — "performing the HTTP upgrade request then transitioning the connection to a bidirectional tunnel"]
- **Pinning to `192.168.20.9` while Adam's VPN is connected on Pippa's laptop.** See incident-006 — the `/32` host route hijacks all traffic to that IP. If Pippa runs `docker compose up` while VPN-connected, the deploy probably succeeds (the SSH/rsync session goes through tun0 to Adam's host of the same IP). **Disconnect VPN before deploy.** [Pitfall section below.]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TLS cert issuance/renewal | A custom cert script, certbot cron, or `openssl req` | The already-running Caddy with `acme_dns cloudflare` | Caddy auto-renews; no operator action; this is solved |
| WebSocket Upgrade in proxy | Custom nginx/Apache config with explicit Upgrade headers | `reverse_proxy 127.0.0.1:8088` (Caddy v2) | Caddy handles it transparently |
| Local DNS for `tv-bingo.aiwhare.com` | `/etc/hosts` entries on each device | Existing UniFi DNS policy (already configured) | One config point; works for all devices on trusted SSID |
| Per-device cert trust | mkcert + manual root-cert install per phone | LE/DNS-01 certs (already in use by 10+ services on this host) | Publicly-trusted; zero per-device ceremony; works on Android 7+ Chrome where user CAs are ignored |
| Backup of bingo.db | A custom rsync script | **Skip entirely for v1.** Per `documentation/tv_bingo.md`: "Low criticality — game state is ephemeral" | Out of scope per CONTEXT.md deferred section |
| Health endpoints | Adding `/health` to FastAPI | **Skip for v1.** Per PROJECT.md out-of-scope: "disproportionate to ~tens-of-family-users scale" | Aligns with v1 ethos |
| Log rotation | Custom logrotate config | Existing Docker daemon `json-file` driver, `max-size 10m`, `max-file 3` (already configured per `kainga_backup_logging_strategy.md`) | Already solved at the host level |

**Key insight:** The kainga-core platform has already solved every infrastructure problem this phase touches. The work is to plug TV Bingo into the existing pattern, not to build new infrastructure.

## Runtime State Inventory

> Phase 5 is greenfield-on-this-host (no existing tv-bingo container running) but it overlaps with several pre-existing kainga-core platform artifacts. Documenting them so the planner doesn't accidentally re-create them.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | None — no existing `tv-bingo` data on kainga-core (the service has been documented but not deployed; per `documentation/tv_bingo.md` which is the *intended* spec, not current state). | None — first deploy creates the `bingo-data` named volume from scratch. |
| **Live service config** | (1) UniFi DNS policy `tv-bingo.aiwhare.com → 192.168.20.9` is *documented* in `network_architecture_*.md`. **Verify it actually exists in the UniFi controller before relying on it.** (2) Caddyfile at `/home/opsadmin/services/caddy/Caddyfile` may or may not yet contain the `tv-bingo.aiwhare.com` block — `tv_bingo.md` documents it as present but `tv_bingo.md` is from the *pre-cleanup* state (it still references Telegram and `BASE_URL`, removed in Phase 1). **Pippa or Suki to confirm.** | (1) Verify UniFi DNS entry; add if missing. (2) Verify/add Caddyfile block; reload Caddy with `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`. |
| **OS-registered state** | None. UFW rule `192.168.20.0/24 -> 80, 443` already covers Caddy ingress; no new UFW rule needed because `127.0.0.1:8088` is loopback-only. | None. |
| **Secrets and env vars** | (1) `OPENROUTER_API_KEY` — required, must be added to `/srv/containers/tv-bingo/.env` (not committed). (2) `CF_API_TOKEN` — already on Caddy container, **untouched by this phase**. (3) Old `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_GROUP_ID`, `BASE_URL` mentioned in `documentation/tv_bingo.md` — **all dropped in Phase 1**, must NOT appear in the new `.env`. | Create `/srv/containers/tv-bingo/.env` with `OPENROUTER_API_KEY` and (optional) `AI_MODEL` only. `chmod 600`. Update `documentation/tv_bingo.md` post-deploy to reflect post-Phase-1, post-Phase-2 reality (Pippa-owned doc edit, not a Phase 5 task). |
| **Build artifacts / installed packages** | None on kainga-core (no prior tv-bingo container or image). | None — first build creates them. |

**The canonical question — what runtime state already exists for `tv-bingo` on kainga-core?**
> Documentation describes an intended deployment but no actual running container exists yet. The platform pieces (Caddy, UniFi DNS, Cloudflare zone) exist; the service-specific pieces (Caddyfile block, container, named volume, `.env`) need to be created or verified during deploy. **Treat this as first-time deploy with platform reuse, not migration.**

## Cert Strategy: deeper analysis

**Trade-off matrix:**

| Strategy | Works on Android Chrome 7+? | Per-device setup? | Effort to deploy | Stays LAN-only? |
|----------|-----------------------------|-------------------|------------------|-----------------|
| LE via DNS-01 / Cloudflare (existing kainga pipeline) | ✅ Yes — publicly-trusted CA in Android system store | ❌ No — works out of the box | ✅ Tiny — add one Caddyfile block, reload | ✅ Yes — DNS-01 doesn't require any inbound port; UniFi DNS overrides public DNS for *.aiwhare.com → LAN IP |
| `tls internal` (Caddy local CA) | ⚠️ Partial — works on Firefox but **not** Chrome on Android 7+ | ❌ Requires per-device CA install — and even then Chrome ignores user-installed CAs on Android 7+ | Medium — generate root CA, distribute, walk Mum through install on tablet | ✅ Yes |
| mkcert | ⚠️ Same as `tls internal` | ❌ Same problem | Higher — need mkcert on operator machine + per-device install | ✅ Yes |
| HTTP only (no HTTPS) | ❌ **Does not satisfy success criterion 2.** PWA install prompt requires secure context. | n/a | n/a | ✅ Yes |

**Why CONTEXT.md preferred `tls internal`:** the framing was "we want LAN-only, public CAs require a public DNS name, therefore avoid public CAs." This conflates two things. The `aiwhare.com` zone *is* public DNS (registered, on Cloudflare), but the **routing** is LAN-only (UniFi local DNS overrides public DNS for the trusted SSID, resolving names to `192.168.20.9`). Public DNS is used only for ACME DNS-01 challenge — Let's Encrypt asks Cloudflare "is this TXT record on `_acme-challenge.tv-bingo.aiwhare.com`?", Cloudflare answers yes, cert is issued. **The server is never publicly reachable; no inbound ports, no port forwards, no exposure.** Mr. Robot would be proud.

**Confirmation that this is exactly what kainga-core already does:**
- `network_architecture_*.md` line 199: "TLS: Let's Encrypt via DNS-01 challenge (Cloudflare API). Publicly-trusted certs on all vhosts. Auto-renewal handled by Caddy. Resolved Incident 004."
- `incident-004` resolution log: "All 9 Let's Encrypt certs issued successfully" + "Chrome on Android tablet verified warning-free"
- `project_008/01_project_plan.md` action 6: "API token generated, stored securely" — token exists, plumbed.

**Recommendation:** Override CONTEXT.md cert preference. Reuse the existing LE/DNS-01 pipeline. **No client-side cert trust step is needed in the README.** Update CONTEXT.md or note the override in Phase 5 PLAN as a research-driven decision change. Surface to Pippa/Suki via Open Questions below if Pippa wants the final call.

## Common Pitfalls

### Pitfall 1: Adam VPN active during deploy from kainga-pippa
**What goes wrong:** Pippa runs `rsync …@192.168.20.9:…` or `docker compose up` from her laptop while Adam's VPN is connected. The `/32` host route from incident-005 routes traffic to Adam's host of the same IP, not kainga-core. Symptoms: SSH connects but to the wrong machine; Docker says "image not found" or rsync says "permission denied".
**Why it happens:** Two LANs share `192.168.20.0/24`; incident-005 added a `/32` host route to reach Adam's SMB; that route hijacks all traffic to `192.168.20.9` per incident-006.
**How to avoid:** Add a precondition to the deploy command sequence: `ip route get 192.168.20.9 | grep -q tun0 && { echo "VPN active — disconnect first"; exit 1; }` or just `~/bin/adam-disconnect.sh` before deploy.
**Warning signs:** SSH banner shows wrong hostname; `ssh opsadmin@192.168.20.9 hostname` returns something other than `kainga-core`.

### Pitfall 2: Stale `documentation/tv_bingo.md` confuses the deploy
**What goes wrong:** The home lab doc references `ANTHROPIC_API_KEY`, `TELEGRAM_*`, and `BASE_URL` env vars from before Phase 1/2. A planner could read it and add those vars back into `.env`. The current contract (per `backend/config.py` and `.env.example`) is `OPENROUTER_API_KEY` + optional `AI_MODEL` + `DATABASE_PATH` + `HOST` + `PORT`. **Nothing else.**
**Why it happens:** The home lab doc is dated 2026-04-13 (before Phase 1's Telegram excision). It hasn't been updated.
**How to avoid:** Treat `backend/config.py` and `.env.example` (in this repo, current as of 2026-05-06) as the **only** source of truth for env vars. Cross-check with home lab `tv_bingo.md` and refuse to add any var not present in `backend/config.py`.
**Warning signs:** A PLAN step that says "set TELEGRAM_BOT_TOKEN" or "set BASE_URL=https://tv-bingo.aiwhare.com" — both are dead. Note that `BASE_URL` was used by Telegram code only and is no longer needed.

### Pitfall 3: Binding to `0.0.0.0` accidentally re-exposes HTTP
**What goes wrong:** Current `docker-compose.yml` has `"8088:8000"` which binds to all interfaces by default. After deploy, `http://192.168.20.9:8088` is a *second* path to the app on the LAN, bypassing Caddy's HTTPS. PWA install prompt may fail intermittently or session state gets confused if a user oscillates between the two URLs.
**Why it happens:** Default Docker port mapping behaviour; easy to miss.
**How to avoid:** Change to `"127.0.0.1:8088:8000"` in production compose. The fallback direct URL becomes `http://localhost:8088` (only from the host) instead of `http://192.168.20.9:8088`.
**Warning signs:** `nmap -p 8088 192.168.20.9` from another LAN host returns "open" instead of "filtered/closed".

### Pitfall 4: WebSocket cipher / proxy buffering breaks long-lived connections
**What goes wrong:** The user opens a game, plays for 20 minutes, mid-game the WebSocket silently disconnects. Mum and Gordie see "trying to reconnect" toast.
**Why it (might) happen:** Some reverse proxies buffer responses and add long timeouts that close idle WebSocket connections. The app sends ping/pong (per ARCHITECTURE.md) but the proxy might still cut.
**How to avoid:** Caddy v2 has no idle-timeout default that would close active WS connections — the explicit feature is "WebSocket connections are forcibly closed when the config is reloaded" with `stream_close_delay` to soften that. The frontend's `useWebSocket` hook already auto-reconnects every 2s on disconnect (per ARCHITECTURE.md). **Verify by manual test** during phase verification (the Phase 3 UAT Test 5 pattern: two tabs, mark a square in one, see it in the other, leave for 5 minutes, mark another, confirm still synced).
**Warning signs:** Browser DevTools Network → WS tab shows the connection dropping at a regular cadence (60s, 120s) without an obvious cause.

### Pitfall 5: Docker `frontend/dist` not rebuilt after frontend code change
**What goes wrong:** Pippa changes a frontend file, runs `docker compose up -d` (no `--build` flag), the running container still has the old frontend bundle. PWA service worker may not pick up the update either (because old `sw.js` is precached).
**Why it happens:** Multi-stage Dockerfile builds frontend at image-build time only.
**How to avoid:** Always use `docker compose up -d --build` for re-deploys (the existing `tv_bingo.md` deploy command already does this). README must specify `--build`. Also note that vite-plugin-pwa is configured with `registerType: 'autoUpdate'` and `skipWaiting: true, clientsClaim: true` (per `frontend/vite.config.ts`), so service worker updates take effect on next page load — no user action needed.
**Warning signs:** "I changed X and it's not showing up." → ask "did you `--build`?"

### Pitfall 6: Caddy global config needs reload to pick up new vhost
**What goes wrong:** New Caddyfile block added but `tv-bingo.aiwhare.com` returns "no site matched" or "default response" until Caddy is told to reload.
**Why it happens:** Caddy reads Caddyfile at startup and on explicit reload; bind-mount changes don't auto-reload.
**How to avoid:** After editing Caddyfile, run `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`. Or restart the container (`docker restart caddy`) — slower (restarts all 10+ vhosts briefly) but simpler. Wait ~30s for ACME issuance for the new vhost on first reload.
**Warning signs:** `curl -I https://tv-bingo.aiwhare.com` returns 502 or "no such site"; `docker logs caddy --tail 50 | grep -i tv-bingo` shows no ACME activity.

### Pitfall 7: Caddy `caddy_data` volume deletion wipes all LE certs
**What goes wrong:** A clean-up script does `docker volume prune` and removes `caddy_data`. Caddy comes back up, all 10+ vhosts re-issue certs simultaneously — fine for one or two, but Let's Encrypt has rate limits (50 certs per registered domain per week) and this could plausibly hit them on a domain that's already had churn.
**Why it happens:** Volume names are not obviously linked to "this contains all my TLS certificates"; pruning is tempting after a series of failed deploys.
**How to avoid:** Don't `docker volume prune` on kainga-core, ever. Use targeted `docker volume rm <volume_name>` and never include `caddy_data`. project_008/01_project_plan.md says explicitly "Do not delete or recreate this volume."
**Warning signs:** Caddy logs flooded with ACME challenge activity post-deploy when nothing about certs should have changed.

### Pitfall 8: PWA `start_url` mismatch after deploy
**What goes wrong:** Manifest says `start_url: "/"` (per current `vite.config.ts`). User installs PWA when on `https://tv-bingo.aiwhare.com/game/abc`. After install, the app icon points back to `/` (home page) which works fine, but if the manifest had said `start_url: "/some-path/"`, the installed app would 404 on launch.
**Why it happens:** Manifest fields are baked into the SW + manifest.webmanifest at build time.
**How to avoid:** Verify manifest after Caddy is wired by visiting `https://tv-bingo.aiwhare.com/manifest.webmanifest` in a browser; confirm `start_url` and `scope` are `"/"`. Already correct per current `vite.config.ts`. **No action needed unless the build output diverges.**

### Pitfall 9: Maskable icon cropping (carryover from Phase 3 RESEARCH Pitfall 2)
**What goes wrong:** Maskable icon's safe zone is too tight; the VUT brand mark gets clipped when Android renders the icon in a circle/squircle.
**Why it happens:** Auto-generated maskable icons may not have enough padding; the VUT chevrons are directional and prone to corner cropping.
**How to avoid:** Test in Android Chrome → install → check home-screen icon visually. If cropped, this becomes a Phase 3.1 backlog item (hand-designed maskable variant). **This is not a deploy blocker** — install will still succeed; the icon just looks bad.
**Warning signs:** Phase 3 RESEARCH already flagged this; verify after install in success criterion 3 testing.

### Pitfall 10: Frontend env baked at build time conflicts with deploy URL
**What goes wrong:** Some frontend code might read `VITE_API_URL` or similar baked at build time. If the build assumes `localhost:8000` but the deploy serves at `tv-bingo.aiwhare.com`, API calls fail.
**Why it (won't) happen here:** `frontend/src/api.ts` line 3 uses `const BASE = "/api"` (relative) and `useWebSocket.ts` uses `${window.location.host}` (relative). Both resolve to whatever domain is serving the page. **No deploy-time env baking needed.** [VERIFIED: grepped frontend code in session]
**How to avoid:** N/A — already correct.

## Code Examples

### Example 1: Production `docker-compose.yml` (proposed)

```yaml
# /srv/containers/tv-bingo/docker-compose.yml
services:
  tv-bingo:
    build: .
    container_name: tv-bingo
    restart: unless-stopped
    ports:
      - "127.0.0.1:8088:8000"   # loopback only — Caddy is the LAN gateway
    volumes:
      - bingo-data:/app/data
    env_file:
      - .env                    # OPENROUTER_API_KEY (required), AI_MODEL (optional)
    environment:
      - DATABASE_PATH=/app/data/bingo.db
      - HOST=0.0.0.0            # inside container; uvicorn listens on 0.0.0.0:8000
      - PORT=8000
    mem_limit: 512m              # consistent with kainga-core memory-limits policy (2026-05-04)

volumes:
  bingo-data:
```

Diff from current root-level compose: (1) bind to `127.0.0.1:` host, (2) use `env_file` for `OPENROUTER_API_KEY` to keep `.env` out of compose, (3) keep `DATABASE_PATH` env explicit, (4) add `mem_limit` (the host has a documented memory-limits convention; tv-bingo was on the "still unbounded" list — this phase fixes it).

### Example 2: Caddyfile addition (proposed)

```caddyfile
# Append to /home/opsadmin/services/caddy/Caddyfile
# (the global `acme_dns cloudflare {env.CF_API_TOKEN}` block already exists)

tv-bingo.aiwhare.com {
    reverse_proxy 127.0.0.1:8088
}
```

That's it. No `tls internal`, no per-route `tls` block — the global ACME directive handles cert issuance. WebSocket Upgrade is automatic. [Source: `network_architecture_services_baseline_documentation_updated.md` lines 196-211; Caddy v2 docs verified above.]

### Example 3: One-shot deploy from a fresh clone on kainga-core (proposed README block)

```bash
# Run on kainga-core as opsadmin
ssh opsadmin@192.168.20.9
sudo mkdir -p /srv/containers/tv-bingo
sudo chown opsadmin:opsadmin /srv/containers/tv-bingo
cd /srv/containers/tv-bingo

# Get the source (Forgejo or GitHub mirror)
git clone ssh://git@git.aiwhare.com:2222/pippa/tv-series-bingo.git .
# or:  git clone https://github.com/jamesjriley/tv-series-bingo.git .

# Create .env (NOT in git)
cat > .env <<EOF
OPENROUTER_API_KEY=sk-or-v1-...your-key-here
AI_MODEL=openai/gpt-4o-mini
EOF
chmod 600 .env

# Build and start
docker compose up -d --build

# Add Caddy vhost (one-time, only if not already present)
sudo nano /home/opsadmin/services/caddy/Caddyfile   # add the tv-bingo block
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# Validate
curl -I http://127.0.0.1:8088                     # 200 from app directly
curl -I https://tv-bingo.aiwhare.com              # 200 with LE cert
docker logs --tail 30 tv-bingo                    # no errors
```

For updates after the first deploy:
```bash
cd /srv/containers/tv-bingo
git pull
docker compose up -d --build
```

### Example 4: Validating deploy with curl from kainga-core

```bash
# From kainga-core itself
curl -sI http://127.0.0.1:8088 | head -1          # expect: HTTP/1.1 200 OK (FastAPI direct)
curl -sI https://tv-bingo.aiwhare.com | head -1   # expect: HTTP/2 200 (via Caddy + LE cert)
curl -s https://tv-bingo.aiwhare.com/manifest.webmanifest | jq .name  # expect: "TV Bingo"

# WebSocket smoke test (basic — doesn't actually negotiate WS, just checks the proxy passes Upgrade)
curl -i \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  https://tv-bingo.aiwhare.com/ws/test/test
# expect: 101 Switching Protocols (proxy upgraded), then connection closed by app on auth failure or message timeout
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tls internal` per service vhost (per `pret_a_manger.md`, `tv_bingo.md`) | Global `acme_dns cloudflare` block + per-vhost LE cert (per `network_architecture_*.md` + `project_008`) | 2026-03-19 (project_008) | Per-service docs are stale where they show `tls internal`. Trust the network_architecture baseline. Android Chrome works without per-device root install. |
| Telegram bot integration | Removed | 2026-05-04 (Phase 1) | Old tv-bingo doc references Telegram env vars; **dropped**, must not appear in Phase 5 deploy artifacts |
| Anthropic API direct | OpenRouter via httpx (model-routed) | 2026-05-05 (Phase 2) | Old tv-bingo doc references `ANTHROPIC_API_KEY`; **dropped**, replaced by `OPENROUTER_API_KEY` + `AI_MODEL` |
| Unbounded container memory | `mem_limit:` + `mem_reservation:` in compose (per network_architecture_*.md 2026-05-04 update) | 2026-05-04 | Add `mem_limit: 512m` to tv-bingo compose to align (it's on the "still unbounded" list) |

**Deprecated/outdated:**
- `documentation/tv_bingo.md`: pre-cleanup, references Telegram + Anthropic + `BASE_URL`. Should be updated post-deploy to reflect post-Phase-1, post-Phase-2 state. Not a Phase 5 task per se but worth flagging in PLAN.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `CF_API_TOKEN` env var on the running Caddy container has not been rotated/revoked since project_008 (2026-03-19) | Cert Strategy | If revoked, ACME issuance for `tv-bingo.aiwhare.com` will fail with a clear log message ("cloudflare: failed to authenticate"). Easily diagnosable. Recovery: regenerate token via Cloudflare dashboard, `docker stop caddy && docker rm caddy && docker run … -e CF_API_TOKEN=<new>`. |
| A2 | The `aiwhare.com` Cloudflare zone is still active and Pippa still controls it | Cert Strategy | Same blast radius as A1 — affects all 10+ services on this domain, not just tv-bingo. Outside this phase's blast radius. |
| A3 | UniFi DNS policy `tv-bingo.aiwhare.com → 192.168.20.9` exists or can be added by Pippa | Architecture | If missing, `tv-bingo.aiwhare.com` won't resolve on LAN. Pippa adds via UniFi controller (Settings → Profiles → DNS policies) — known procedure per `network_architecture_*.md`. |
| A4 | The Caddyfile `tv-bingo.aiwhare.com` block is or can be added | Architecture | Pippa edits `/home/opsadmin/services/caddy/Caddyfile` and reloads. Documented procedure. |
| A5 | The kainga-core memory-limits policy from 2026-05-04 still applies and tv-bingo should set `mem_limit: 512m` | Code Examples | If policy was relaxed, no-op. If tightened, may need lower limit. Family scale is small; 512m is generous. |
| A6 | Android Chrome on Mum's tablet will accept Let's Encrypt certs without any manual trust step | Cert Strategy | Verified by incident-004 resolution log + Chromium root store FAQ. Risk near zero; if it fails, fall back to manual debug (likely device clock skew or stale cached cert). |
| A7 | Pippa can SSH to kainga-core as `opsadmin` from her laptop using existing keys | Deploy procedure | Standard kainga-pippa workflow per multiple home-lab docs. If keys are unavailable, deploy procedure adds an SSH key bootstrap step. |

**If this table is empty:** Not empty — A1, A3, A4 are the assumptions most likely to need user confirmation before execution. Surfaced via Open Questions below.

## Environment Availability

> Phase 5 depends on a documented platform. The audit confirms the platform is in place; Phase 5 doesn't install new tooling on kainga-core.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Engine on kainga-core | Container runtime | ✅ (per `Kainga Home Lab.md`, `kainga_backup_logging_strategy.md`) | not pinned | n/a |
| Docker Compose v2 (`docker compose`) | Service orchestration | ✅ (used by Forgejo, observability, n8n via newer compose path, syncthing) | not pinned | n/a |
| Caddy with cloudflare DNS plugin | TLS termination + LE certs | ✅ image `caddy-cloudflare:local` running on host network | Caddy v2.11.2 + caddy-dns/cloudflare v0.2.3 (built 2026-03-19) | If image is missing, rebuild per `project_008` Phase C (xcaddy build with `caddy-dns/cloudflare`) |
| Cloudflare API token (`CF_API_TOKEN` env on Caddy container) | DNS-01 ACME challenge | ✅ (provisioned per `project_008` Phase B) | scoped to `aiwhare.com` Zone:DNS:Edit | If missing/revoked, regenerate at Cloudflare dashboard, re-inject |
| UniFi controller (DNS policies) | LAN DNS resolution for `*.aiwhare.com` | ✅ (per network_architecture_*.md) | n/a | Add `/etc/hosts` entry per device — defeats the family-friendly UX, avoid |
| UFW LAN ingress rule (`80, 443` from `192.168.20.0/24`) | Family devices reach Caddy | ✅ (per network_architecture_*.md) | n/a | n/a |
| `aiwhare.com` Cloudflare zone | DNS-01 ACME validation | ✅ (Pippa-owned) | n/a | If transferred/lapsed, all `*.aiwhare.com` services break — outside this phase's blast radius |
| Forgejo `git.aiwhare.com:2222` (or GitHub `jamesjriley/tv-series-bingo`) | Source pull on first deploy | ✅ Forgejo running per network_architecture; GitHub remote also valid | n/a | If Forgejo is down, use the GitHub mirror; if both down, rsync from kainga-pippa (Pret-a-Manger pattern) |
| OpenRouter API key | Backend AI calls | ❓ Pippa has one (per Phase 2) but it's not in the kainga-core `.env` yet | n/a | Pippa creates `.env` during deploy; standard step |
| `opsadmin` SSH access from kainga-pippa to kainga-core | Pippa runs deploy commands | ✅ (per multiple home-lab docs incl. Pret-a-Manger deploy.sh) | ed25519 key | Use console access on kainga-core directly |
| Android Chrome on family devices | PWA install verification | ✅ (Mum's tablet, Gordie's phone, Pippa's phone) | varies | Fall back to Samsung Internet (similar Chromium engine, same install behavior); Firefox on Android is a debugging-only fallback (doesn't show "Install app" prompt natively) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** OpenRouter API key on kainga-core — Pippa adds during deploy; this is part of the documented procedure, not a blocker.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no automated test framework for deploy validation — by design, per CONTEXT.md scope and PROJECT.md "no health endpoints" out-of-scope) |
| Config file | n/a |
| Quick run command | Per-step `curl -I` checks (see Code Example 4) |
| Full suite command | n/a — Phase 5 verification is a mix of `curl` checks and a manual UAT pass against `https://tv-bingo.aiwhare.com` from an Android device |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | Container builds and starts cleanly | smoke | `docker compose up -d --build && docker ps --filter name=tv-bingo --filter status=running` | ✅ |
| DEPLOY-01 | App reachable on loopback | smoke | `curl -fsI http://127.0.0.1:8088 \| grep -q '200'` | ✅ |
| DEPLOY-01 | App reachable via Caddy with LE cert | smoke | `curl -fsI https://tv-bingo.aiwhare.com \| grep -q '200'` + `openssl s_client -connect tv-bingo.aiwhare.com:443 -servername tv-bingo.aiwhare.com </dev/null 2>/dev/null \| grep 'issuer=' \| grep -q "Let's Encrypt"` | ✅ |
| DEPLOY-01 | WebSocket upgrade passes proxy | smoke | `curl -i -H "Upgrade: websocket" -H "Connection: Upgrade" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" https://tv-bingo.aiwhare.com/ws/x/y \| head -1 \| grep -q '101'` | ✅ |
| DEPLOY-01 | Container survives restart with persisted DB | smoke | `docker compose restart && sleep 5 && curl -fsI http://127.0.0.1:8088 \| grep -q '200'` + verify a game record persists across restart | ✅ |
| DEPLOY-01 → Phase 3 UAT 1 (install prompt) | Android Chrome shows "Install app" within ~30s of loading | manual-only | n/a (Chrome heuristic, not curl-testable) | n/a — manual-only |
| DEPLOY-01 → Phase 3 UAT 2 (SW activated) | DevTools → Application → Service Workers shows `sw.js` "activated and running" | manual-only | n/a (DevTools observation) | n/a — manual-only |
| DEPLOY-01 → Phase 3 UAT 3 (maskable icon) | DevTools → Manifest → maskable preview shows VUT mark un-cropped in circle/squircle | manual-only | n/a (visual judgement) | n/a — manual-only |
| DEPLOY-01 → Phase 3 UAT 4 (offline reload) | After load + DevTools "Offline", reload → SPA shell renders, API calls fail gracefully | manual-only | n/a (DevTools simulation) | n/a — manual-only |
| DEPLOY-01 (regression) | Multiplayer WebSocket sync still works (Phase 3 UAT Test 5 pattern) | manual-only | n/a (two-tab observation) | n/a — manual-only |

### Sampling Rate
- **Per task commit:** Run smoke `curl` checks (5 commands above) — < 10 seconds total.
- **Per phase merge:** Smoke checks + manual Android Chrome UAT pass.
- **Phase gate:** All 5 smoke checks pass + 4 deferred Phase 3 UAT items closed (1, 2, 3, 4) + multiplayer regression spot-check.

### Wave 0 Gaps
- [ ] No automated tests exist for deploy validation (intentional — per CONTEXT.md scope, this phase is an operational deploy, not a pytest-coverage phase). Phase 6 covers `bingo_checker` and `card_builder` pytest coverage; deploy/integration tests are explicitly out of scope.
- [ ] No CI is needed (per ROADMAP.md Phase 5 "no GitHub Actions, no remote build pipeline" deferred items).

*If no gaps in scope: "Smoke checks via `curl` are sufficient; deferred Phase 3 UAT items become testable on Android Chrome only after deploy. Manual UAT replaces automated coverage for those four ceremony tests by design."*

## Security Domain

> `security_enforcement` not explicitly set in `.planning/config.json`; treated as enabled per default. Phase 5 introduces no new code paths, only deploy infrastructure — most ASVS categories are upstream concerns.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (v1 is trust-based on LAN; SEC-01/02 deferred to v2 per REQUIREMENTS.md) | n/a |
| V3 Session Management | no | n/a |
| V4 Access Control | partial | LAN-only via UFW + UniFi DNS scope; loopback bind on app port |
| V5 Input Validation | no (no new input paths — Caddy passes through; validation logic is in Phase 1/2 code, unchanged here) | n/a |
| V6 Cryptography | yes | Let's Encrypt cert via Caddy; auto-renewal; never hand-rolled |
| V8 Data Protection | partial | `.env` chmod 600; secrets not in git (Phase 1 already handled .gitignore for `.env`/`bingo.db`) |
| V14 Configuration | yes | Bind to `127.0.0.1` not `0.0.0.0`; `mem_limit:` to align with kainga policy; documented Caddyfile |

### Known Threat Patterns for {kainga-core LAN deploy}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secrets leaked into git | Information Disclosure | `.env` in `.gitignore` (already done in Phase 1); `chmod 600 /srv/containers/tv-bingo/.env`; example file `.env.example` checked in |
| Adam VPN route hijack during deploy | Tampering / Denial of Service | Document precondition: disconnect VPN before deploy; check `ip route get 192.168.20.9` |
| Caddy data volume accidentally pruned | Denial of Service | "Do not delete or recreate `caddy_data` volume" warning in README + planning docs |
| Public-bind exposure (raw HTTP at :8088 on LAN) | Information Disclosure / Spoofing | Bind to `127.0.0.1` not `0.0.0.0` |
| Container running as root | Elevation of Privilege | Out of scope for v1 (current Dockerfile runs as default user); v2 concern |
| LE rate-limit hit on cert reissue churn | Denial of Service | One vhost added per domain per phase; cert persists in `caddy_data` across normal restarts |

## Open Questions for /csuite Suki

1. **Cert strategy override.** CONTEXT.md decided "preferred = Caddy `tls internal`, fallback = mkcert; excluded = public CAs." Research finds this preference is incompatible with Mum's Android Chrome tablet (incident-004) and the home lab already runs LE/DNS-01 against a Cloudflare-hosted `aiwhare.com` zone — every other `*.aiwhare.com` service on kainga-core uses publicly-trusted LE certs without exposing the server to the public internet.
   - **What we know:** LE/DNS-01 works on this host today for 10+ services; incident-004 resolution proves it works on Mum's Android tablet without any device-side trust step.
   - **What's unclear:** Was Pippa's "no public CA" exclusion a misframing (about avoiding public exposure, not about avoiding the existing DNS-01 pipeline), or a deliberate design call (e.g. wanting to keep the `aiwhare.com` zone reserved for "real" services and not pollute it with hobby projects)?
   - **Recommendation:** Override and use the existing pipeline. If Pippa wants to keep tv-bingo separate from `aiwhare.com`, the only viable alternative for Android Chrome is **buy a separate cheap domain** (e.g. `tvbingo.kainga.nz`) and point its Cloudflare zone at the same DNS-01 token — same pattern, isolated namespace. **mkcert / `tls internal` are not viable for the actual user base.**

2. **Stale `documentation/tv_bingo.md`.** The home lab service doc references Telegram, Anthropic, and `BASE_URL` — all dropped in Phase 1/2. Should Pippa update the doc as part of this phase, or post-deploy, or never (it's a home lab doc, not a tv-bingo repo doc)?
   - **Recommendation:** Add a small task to the Phase 5 PLAN: after deploy succeeds, edit `documentation/tv_bingo.md` to reflect post-Phase-1/2 reality. Cheap, prevents future confusion.

3. **UniFi DNS verification.** `network_architecture_*.md` lists `tv-bingo.aiwhare.com → 192.168.20.9` as an active UniFi DNS policy. The doc is dated 2026-04-14. Has Pippa actually added this entry, or is it a documented intent that's never been provisioned?
   - **What we know:** It's listed in the canonical baseline doc as an active route.
   - **What's unclear:** Whether the entry exists in the live UniFi controller right now.
   - **Recommendation:** Phase 5 PLAN should include a verification step (`nslookup tv-bingo.aiwhare.com 192.168.20.1` from kainga-pippa, expect `192.168.20.9`) before relying on it. Add the entry if missing — known UniFi controller workflow.

4. **Caddyfile block — present or planned?** Same situation as #3 for the Caddyfile. The home lab service doc shows the block as present, but the home lab service doc is stale on other points.
   - **Recommendation:** Phase 5 PLAN should include `ssh opsadmin@kainga-core 'grep -A1 tv-bingo.aiwhare.com /home/opsadmin/services/caddy/Caddyfile'` as a verification step. Add the block if missing.

5. **Docker memory limit.** The 2026-05-04 kainga-core memory-limits policy (per `network_architecture_*.md` lines 96-107) added limits to most non-observability containers; tv-bingo is on the "still unbounded (low memory consumers, deferred)" list. Should Phase 5 add `mem_limit: 512m` to bring it in line, or defer to a separate hygiene pass?
   - **Recommendation:** Add it now (it's two lines of YAML). The "deferred" list was a pragmatic punt because tv-bingo wasn't deployed yet — the deployment is the natural moment to set the limit. 512m is generous for a small FastAPI + SQLite app.

6. **Forgejo vs GitHub source.** The home lab tv-bingo doc shows both Forgejo (`ssh://git@git.aiwhare.com:2222/pippa/tv-series-bingo.git`) and GitHub (`git@github.com:jamesjriley/tv-series-bingo.git`) as remotes. Which should the README's deploy commands prefer?
   - **Recommendation:** README documents Forgejo first (LAN-internal, ssh from kainga-core works directly), GitHub as fallback. This matches the pret-a-manger pattern where deploy uses `ssh://git@git.aiwhare.com:2222/...`.

## Sources

### Primary (HIGH confidence) — internal home-lab docs
- `~/Documents/Obsidian/01_Projects/HomeLab/documentation/network_architecture_services_baseline_documentation_updated.md` (canonical baseline, last updated 2026-04-14 then 2026-04-27 then 2026-05-04 per the front matter and inline notes — the **authoritative** source for the home-lab service matrix, Caddy config, UFW rules, and TLS/LE pipeline)
- `~/Documents/Obsidian/01_Projects/HomeLab/documentation/Kainga Home Lab.md` (host metadata, container inventory, Caddy mode, mDNS architecture)
- `~/Documents/Obsidian/01_Projects/HomeLab/project_008_letsencrypt_dns01_caddy/01_project_plan.md` (the project that built the existing LE/DNS-01 pipeline; closed 2026-03-19 with all certs issued)
- `~/Documents/Obsidian/01_Projects/HomeLab/incidents/incident-004-https-cert-not-trusted-on-chrome.md` (Android Chrome user-CA-distrust failure mode + resolution)
- `~/Documents/Obsidian/01_Projects/HomeLab/incidents/incident-005-adam-vpn-subnet-overlap.md` and `incident-006-vpn-route-hijacks-kainga-core.md` (deploy-procedure precondition: VPN must be disconnected)
- `~/Documents/Obsidian/01_Projects/HomeLab/documentation/pret_a_manger.md` and `~/Documents/Obsidian/01_Projects/HomeLab/project_009_pret_a_manger/Development & Deployment.md` (closest analog deploy pattern — FastAPI on kainga-core via Caddy + Syncthing for content)
- `~/Documents/Obsidian/01_Projects/HomeLab/documentation/kainga_backup_logging_strategy.md` (Docker log driver config, backup conventions — informs the "skip backups for v1" decision)

### Primary (HIGH confidence) — this repo
- `Dockerfile`, `docker-compose.yml`, `frontend/vite.config.ts`, `backend/main.py`, `backend/config.py`, `backend/routers/websocket.py`, `frontend/src/api.ts`, `frontend/src/hooks/useWebSocket.ts`, `.env.example` (all read in this session 2026-05-06)
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/codebase/{ARCHITECTURE,STACK,CONCERNS}.md`, `.planning/phases/03-pwa-visual-polish/03-UAT.md`, `.planning/phases/05-deploy/05-CONTEXT.md` (all read 2026-05-06)

### Secondary (HIGH confidence) — official docs
- Caddy v2 reverse_proxy directive: <https://caddyserver.com/docs/caddyfile/directives/reverse_proxy> — confirms automatic WebSocket Upgrade handling [WebFetch verified 2026-05-06]
- Caddy automatic-HTTPS: <https://caddyserver.com/docs/automatic-https> — confirms `tls internal` semantics and trust-store behaviour [WebFetch verified 2026-05-06]
- web.dev PWA install criteria: <https://web.dev/articles/install-criteria> — confirms HTTPS requirement + manifest fields [WebFetch verified 2026-05-06]

### Tertiary (MEDIUM confidence) — community/secondary
- httptoolkit blog "Android 11 tightens restrictions on CA certificates" (Android 7+ user-CA distrust by default — confirms the incident-004 root cause is an Android-OS-wide design decision, not a Chrome quirk)
- Frigate PWA discussion (community evidence that self-signed certs on internal networks block Android Chrome PWA install)

### Out of scope / deferred
- `documentation/tv_bingo.md` (stale per Pitfall 2; treated as **intent**, not state)
- `documentation/forgejo.md`, `documentation/home_assistant.md`, etc. — read for pattern-matching but not cited individually

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every component is already documented and running on kainga-core
- Architecture: HIGH — exact pattern already serves 10+ services on this host, including a documented (if unverified) tv-bingo slot
- Cert strategy: HIGH — incident-004 is the smoking gun on `tls internal` failure; LE/DNS-01 is the proven workaround already in production for 10+ vhosts
- Pitfalls: HIGH for #1, #2, #5, #6, #7 (each grounded in this repo or home-lab docs); MEDIUM for #4 (WebSocket idle timeout — depends on Caddy default behaviour, recommend manual long-running test as part of UAT)
- Validation: HIGH — smoke checks via curl are unambiguous; manual UAT for ceremony tests is the explicit Phase 3 UAT pattern

**Open Questions confidence:** All 6 are about Pippa-side decisions or live-host state verification — research can't answer them directly, but each has a clear recommendation and a low-cost verification step.

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (~30 days for a stable home-lab platform; reduce if kainga-core platform changes — e.g. Caddy image rebuild, Cloudflare zone change, UniFi config change)
