---
phase: 05-deploy
plan: 03
type: execute
wave: 3
depends_on: [05-02-kainga-deploy]
files_modified:
  - "~/Documents/Obsidian/01_Projects/HomeLab/documentation/tv_bingo.md"
autonomous: true
requirements: [DEPLOY-01]
tags: [docs, homelab, obsidian, kainga-core, post-deploy]

must_haves:
  truths:
    - "The home-lab tv_bingo.md doc reflects the actual deployed state as of Phase 5: no Telegram/Anthropic/BASE_URL references; OPENROUTER_API_KEY + AI_MODEL only; Caddyfile block matches the live config; Forgejo listed as primary source per D-06."
    - "The doc's Last Updated timestamp is bumped to 2026-05-06 (deploy date)."
    - "Wikilinks to other home-lab docs (Network Architecture, Forgejo) are preserved or added so Obsidian's graph stays connected."
    - "The change is persisted via obv (per Pippa's global Obsidian instructions) so wikilinks update across the vault."
  artifacts:
    - path: "~/Documents/Obsidian/01_Projects/HomeLab/documentation/tv_bingo.md"
      provides: "Accurate post-Phase-5 service doc for tv-bingo on kainga-core"
      contains: "OPENROUTER_API_KEY"
  key_links:
    - from: "tv_bingo.md (HomeLab doc)"
      to: ".planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md"
      via: "deploy state captured by SUMMARY informs the doc rewrite"
      pattern: "Last Updated: 2026-05-06"
---

<objective>
Update `~/Documents/Obsidian/01_Projects/HomeLab/documentation/tv_bingo.md` so it reflects the post-Phase-1, post-Phase-2, post-Phase-5 reality of the tv-bingo service. The current doc is dated 2026-04-13 and references Telegram, Anthropic, and `BASE_URL` — all dropped in Phase 1/2. Without this fix, future home-lab work (or a debugger six months from now) reads stale information and either re-adds dead env vars or wastes time chasing nothing.

Purpose: The home-lab docs are Pippa's operational reference for kainga-core. RESEARCH.md (Pitfall 2) flagged the staleness as a real planning hazard. D-02 says the old version need not be preserved — git history covers recovery. This plan does the cheap one-shot edit while the deploy details are fresh from Plan 02's SUMMARY.

Output: Rewritten `tv_bingo.md` reflecting current env contract, Caddyfile block, source remote (Forgejo primary), and removed Telegram/notifications section. Persisted via the obv CLI so any wikilinks pointing at it stay live.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/05-deploy/05-CONTEXT.md
@.planning/phases/05-deploy/05-RESEARCH.md
@.planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md

<!-- Pippa's global instructions (~/.claude/CLAUDE.md) require obv CLI for vault
     file operations to keep wikilinks updated. The path used by obv is RELATIVE
     to the vault root, NOT an absolute filesystem path. Vault root is
     ~/Documents/Obsidian. -->

<interfaces>
<!-- The new env-var contract — extracted from backend/config.py and locked
     by Phase 1/2 amendments. Doc must match this exactly. -->

Current env contract (the ONLY vars the app reads):
- OPENROUTER_API_KEY  (required)
- AI_MODEL             (optional, default "openai/gpt-4o-mini")
- DATABASE_PATH        (optional, default "/app/data/bingo.db" in production)
- HOST, PORT           (overridden by docker-compose environment block)

Dropped (must NOT appear in the doc):
- TELEGRAM_BOT_TOKEN, TELEGRAM_GROUP_ID, TELEGRAM_TOPIC_ID  (Phase 1 D-14)
- ANTHROPIC_API_KEY                                         (Phase 2 D-01)
- BASE_URL                                                  (Phase 1 — only telegram.py used it)

Current Caddyfile block (verbatim, Plan 02 verified live):
```
tv-bingo.aiwhare.com {
    reverse_proxy 127.0.0.1:8088
}
```

Cert strategy (LOCKED — D-01 override):
Let's Encrypt via DNS-01 (Cloudflare); auto-issued by host-level Caddy via the
global `acme_dns cloudflare {env.CF_API_TOKEN}` directive. NOT `tls internal`.

docker-compose port binding (Plan 01):
`127.0.0.1:8088:8000` (loopback only — Caddy is sole LAN ingress).

Source remotes (D-06):
- Primary: ssh://git@git.aiwhare.com:2222/pippa/tv-series-bingo.git  (Forgejo)
- Fallback: https://github.com/jamesjriley/tv-series-bingo.git
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Confirm obv, capture backlinks, write the replacement doc</name>
  <files>~/Documents/Obsidian/01_Projects/HomeLab/documentation/tv_bingo.md</files>
  <action>
**Step 1 — Confirm obv CLI is available.** Run:

```bash
~/.local/bin/obv --version 2>&1 || which obv 2>&1 || echo "obv NOT AVAILABLE"
```

If obv is unavailable, raise a `checkpoint:human-action`: "obv CLI not on PATH and Obsidian REST API may be unreachable. Per global instructions, vault files require obv to keep wikilinks in sync. Either start Obsidian with the Local REST API plugin, or approve a direct filesystem write (wikilinks pointing at this file will not auto-update)." Wait for resume signal. **Default behaviour if obv works: use it.**

**Step 2 — Capture inbound wikilinks before editing** (so we know what other docs reference this one and might need a content cross-check later):

```bash
~/.local/bin/obv refs '01_Projects/HomeLab/documentation/tv_bingo.md' 2>&1 | tee /tmp/tv-bingo-backlinks.txt
```

The output is recorded in the SUMMARY (Task 2). Cross-check edits to backlinking docs are **out of scope** for this plan — they would be flagged for a future hygiene pass, not auto-edited here.

**Step 3 — Read the current doc** (so the executor doesn't paraphrase from memory):

```bash
~/.local/bin/obv cat '01_Projects/HomeLab/documentation/tv_bingo.md'
```

**Step 4 — Persist the replacement** using `obv write`. The new content must:

- Set Last Updated to `2026-05-06`
- Drop the entire Telegram-related rows from the env-vars table and the "Notifications" stack row
- Drop all `TELEGRAM_*`, `BASE_URL`, `ANTHROPIC_API_KEY` references
- Replace Anthropic SDK references with OpenRouter (httpx, no SDK) per Phase 2
- Update React version to 19 (was 18) per current `frontend/package.json`
- Confirm the Caddyfile block as currently deployed
- Note the cert strategy as Let's Encrypt via Cloudflare DNS-01 (handled by host-level Caddy, NOT `tls internal`)
- Note the loopback bind (`127.0.0.1:8088:8000`) and explain why
- List Forgejo as primary source per D-06
- Keep the existing wikilinks at the bottom (Network Architecture Baseline, Forgejo); add `[[Kainga Home Lab]]`; reference the project SUMMARY in plain text (it lives outside the vault root, so a wikilink would be dead)

Persist via:

```bash
~/.local/bin/obv write '01_Projects/HomeLab/documentation/tv_bingo.md' << 'EOF_DOC'
# TV Bingo

**Last Updated:** 2026-05-06 (post-Phase-5 deploy on kainga-core)

## Purpose

Multiplayer bingo web app for TV shows and YouTube content. Players create a game from a TV show name or YouTube channel/video; the backend uses OpenRouter to generate 24 "moments" (catchphrases, visuals, plot beats) likely to occur during the show; players join via shareable link and each receive a unique randomised 5×5 card. Squares are marked live during a watch session; WebSocket broadcasts marks to all players in real time. First to a line wins.

Family-only — used by Pippa, Mum, and Gordie. Not public, no SaaS plans.

## Deployment

| Field | Value |
|-------|-------|
| **Host** | `kainga-core` (`192.168.20.9`) |
| **Container name** | `tv-bingo` |
| **Image** | Custom multi-stage build (Node 20 → Python 3.11-slim) |
| **Compose path** | `/srv/containers/tv-bingo/docker-compose.yml` |
| **Data path** | Docker named volume `bingo-data`, mounted at `/app/data` |
| **Source (primary)** | `ssh://git@git.aiwhare.com:2222/pippa/tv-series-bingo.git` (Forgejo) |
| **Source (fallback)** | `https://github.com/jamesjriley/tv-series-bingo.git` |

## Ports

| Port | Bind | Purpose |
|------|------|---------|
| `8088/tcp` | `127.0.0.1` only (loopback) | Web UI + API + WebSocket — proxied via host-level Caddy |

The loopback bind (`"127.0.0.1:8088:8000"` in `docker-compose.yml`) is deliberate: Caddy on the host is the sole LAN-reachable path, and Caddy enforces HTTPS. Without the loopback restriction, family devices could hit raw HTTP at `http://192.168.20.9:8088` — that breaks the PWA's secure-context guarantee on Android Chrome (the install prompt and SW registration both require HTTPS) and silently undoes the install behaviour.

## Access

- **Web (LAN, primary):** `https://tv-bingo.aiwhare.com`
- **Direct (host only):** `http://127.0.0.1:8088` — used for smoke checks from kainga-core itself; not reachable from other LAN hosts.

## Reverse Proxy

Caddy block in `/home/opsadmin/services/caddy/Caddyfile`:

```caddyfile
tv-bingo.aiwhare.com {
    reverse_proxy 127.0.0.1:8088
}
```

No per-vhost `tls` directive — the global `acme_dns cloudflare {env.CF_API_TOKEN}` block applies (project_008 pipeline). WebSocket Upgrade for `/ws/*` is handled automatically by Caddy v2's `reverse_proxy`; no extra directive needed.

## DNS

UniFi DNS policy: `tv-bingo.aiwhare.com → 192.168.20.9` on the trusted SSID. The same name is also a public DNS record on the Cloudflare-hosted `aiwhare.com` zone — but only for ACME DNS-01 challenge; UniFi local DNS overrides public DNS for trusted-SSID clients, so the LAN never resolves the name to a public IP.

## TLS / Cert Strategy

**Let's Encrypt via DNS-01 (Cloudflare API).** Issued automatically by the host-level `caddy-cloudflare:local` container; auto-renewal handled by Caddy. Stored in the `caddy_data` named volume (do not delete).

This was a deliberate override of the original CONTEXT.md preference for `tls internal` (Caddy local CA) — Android Chrome 7+ ignores user-installed CAs, which would have made the cert untrusted on Mum's tablet (see incident-004). The DNS-01 pipeline gives publicly-trusted certs without exposing the server publicly.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.11), uvicorn |
| Frontend | React 19, TypeScript, Vite |
| PWA | vite-plugin-pwa (Workbox precache, NetworkFirst for `/api/*`) |
| Database | SQLite via aiosqlite (WAL mode), at `/app/data/bingo.db` |
| AI | OpenRouter (HTTP via `httpx`, model-routed) — no SDK dependency |
| Transcripts | youtube-transcript-api (with name-based fallback when no transcripts) |
| Real-time | WebSocket (FastAPI native) |

## Environment Variables

Set in `/srv/containers/tv-bingo/.env` (chmod 600, NOT in git):

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `OPENROUTER_API_KEY` | yes | — | OpenRouter API key for AI moment generation |
| `AI_MODEL` | no | `openai/gpt-4o-mini` | Any OpenRouter model name (e.g. `anthropic/claude-haiku-4.5`, `meta-llama/llama-3.3-70b-instruct:free`) |
| `DATABASE_PATH` | no | `/app/data/bingo.db` | Set explicitly in `docker-compose.yml`'s `environment:` block |

The previous Telegram-bot integration (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_GROUP_ID`, `TELEGRAM_TOPIC_ID`) was removed in Phase 1 (May 2026) — silent-fails per the codebase concerns audit, no value when players are in the same room. The previous direct-Anthropic integration (`ANTHROPIC_API_KEY`) was replaced in Phase 2 with OpenRouter (single provider, model-routed via `AI_MODEL`). The previous `BASE_URL` env var was used only by the Telegram code path and is gone with it.

## Database

SQLite, async via aiosqlite, WAL mode, foreign keys enabled. Stored at `/app/data/bingo.db` inside Docker volume `bingo-data`. No external DB dependency. Schema auto-initialises on backend boot.

## Security Posture

- LAN-only. No WAN exposure. UFW rule `192.168.20.0/24 → 80, 443` (host-level) is the only ingress.
- App container binds to `127.0.0.1:8088` on the host — Caddy is the sole proxy path.
- No authentication system — game_id + player_id are trust-based tokens (deliberate per family-LAN context). WebSocket origin/auth validation is deferred to v2 (SEC-01/02).
- `OPENROUTER_API_KEY` is the only external credential; stored in `.env` (chmod 600), not committed to git. Phase 1 hardened `.gitignore` to keep it out going forward.
- Container memory capped at 512 MB (`mem_limit: 512m`) per the kainga-core 2026-05-04 memory-limits policy.

## Deployment Commands

**First-time deploy** (assumes Docker, host Caddy, UniFi DNS, and `CF_API_TOKEN` are already set up — they are, per the home-lab platform):

```bash
ssh opsadmin@192.168.20.9
sudo mkdir -p /srv/containers/tv-bingo
sudo chown opsadmin:opsadmin /srv/containers/tv-bingo
cd /srv/containers/tv-bingo
git clone ssh://git@git.aiwhare.com:2222/pippa/tv-series-bingo.git .
cat > .env <<'ENV'
OPENROUTER_API_KEY=sk-or-v1-...
AI_MODEL=openai/gpt-4o-mini
ENV
chmod 600 .env
docker compose up -d --build

# Add Caddyfile vhost (one-time, only if not already present)
sudo grep -q 'tv-bingo.aiwhare.com' /home/opsadmin/services/caddy/Caddyfile \
  || sudo tee -a /home/opsadmin/services/caddy/Caddyfile <<'CADDY'

tv-bingo.aiwhare.com {
    reverse_proxy 127.0.0.1:8088
}
CADDY
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

**Update from source:**

```bash
cd /srv/containers/tv-bingo
git pull
docker compose up -d --build      # --build is required: frontend is built into the image
```

**Restart / logs:**

```bash
docker compose restart tv-bingo
docker compose logs -f tv-bingo
```

**Pre-flight gotcha (incident-006):** disconnect Adam's VPN before SSH-ing or the `192.168.20.9` traffic is hijacked through `tun0` to a different host of the same IP. Verify with `ip route get 192.168.20.9 | grep -q tun0 && echo "VPN active — disconnect first"`.

## Backup

Data volume `bingo-data` contains the SQLite database. Low criticality — game state is ephemeral and can be regenerated by replaying. Not included in scheduled backup rotation.

## Related

- [[network_architecture_services_baseline_documentation_updated|Network Architecture Baseline]] — canonical home-lab service matrix
- [[forgejo|Forgejo]] — primary source mirror for tv-bingo
- [[Kainga Home Lab|Kainga Home Lab]] — host metadata
- Project repo `.planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md` — captured deploy state and Phase 3 PWA UAT closure
EOF_DOC
```

Then verify the write landed:

```bash
~/.local/bin/obv cat '01_Projects/HomeLab/documentation/tv_bingo.md' | head -10
```

If `obv write` fails (Obsidian not running, REST API unreachable), fall back to a direct filesystem write to `~/Documents/Obsidian/01_Projects/HomeLab/documentation/tv_bingo.md` and warn in the SUMMARY that any wikilinks renaming/moving this file will need manual fix-up. Do NOT silently use the fallback — note it explicitly.
  </action>
  <verify>
    <automated>~/.local/bin/obv cat '01_Projects/HomeLab/documentation/tv_bingo.md' > /tmp/tvb-doc.md 2>/dev/null || cat ~/Documents/Obsidian/01_Projects/HomeLab/documentation/tv_bingo.md > /tmp/tvb-doc.md; grep -q 'Last Updated:.*2026-05-06' /tmp/tvb-doc.md && grep -q 'OPENROUTER_API_KEY' /tmp/tvb-doc.md && grep -q 'Forgejo' /tmp/tvb-doc.md && grep -q "Let.s Encrypt" /tmp/tvb-doc.md && grep -q '127.0.0.1:8088' /tmp/tvb-doc.md && ! grep -qE '(TELEGRAM|ANTHROPIC_API_KEY|BASE_URL)' /tmp/tvb-doc.md && echo OK</automated>
  </verify>
  <done>tv_bingo.md in the HomeLab Obsidian folder is rewritten: Last Updated bumped to 2026-05-06, OPENROUTER_API_KEY documented, Forgejo listed as primary source, Let's Encrypt cert strategy documented, 127.0.0.1 loopback explained, no Telegram/Anthropic/BASE_URL references remain.</done>
</task>

<task type="auto">
  <name>Task 2: Plan SUMMARY + commit</name>
  <files>.planning/phases/05-deploy/05-03-homelab-doc-SUMMARY.md</files>
  <action>
Create `.planning/phases/05-deploy/05-03-homelab-doc-SUMMARY.md` covering:

1. **Diff vs the prior version** — bullet list of removed/added/changed sections (Telegram & Notifications gone, env-var table rewritten to OpenRouter contract, cert strategy section new, ports section now explains loopback bind, etc.). Reference Plan 02's SUMMARY for the deploy state that informed the rewrite.
2. **Backlinks captured** — the `obv refs` output from Task 1. Note any docs that link to `tv_bingo.md` and might themselves contain stale info (out of scope for this plan; flag under "Follow-up backlog").
3. **Tooling note** — whether `obv write` succeeded or the direct-filesystem fallback was used (and why).
4. **Verification** — the smoke grep results from Task 1's verify (Last Updated bumped, OPENROUTER_API_KEY present, Telegram/Anthropic/BASE_URL absent, Forgejo present, Let's Encrypt + loopback explanations present).

Then commit the SUMMARY into the tv-bingo repo:

```bash
git add .planning/phases/05-deploy/05-03-homelab-doc-SUMMARY.md
git commit -m "docs(05): update home-lab tv_bingo.md to post-Phase-5 state"
git push origin claude/resume-ai-app-ClIA9
```

**Note on the HomeLab vault file itself:** the Obsidian vault is a separate filesystem tree (likely Syncthing-replicated per Pippa's home-lab setup) and is NOT part of the tv-bingo git repo. The `obv write` already persisted the doc to disk where Pippa's Obsidian instance picks it up. We only commit the SUMMARY into the tv-bingo repo — the vault file persists itself.
  </action>
  <verify>
    <automated>test -f .planning/phases/05-deploy/05-03-homelab-doc-SUMMARY.md && grep -q 'tv_bingo.md' .planning/phases/05-deploy/05-03-homelab-doc-SUMMARY.md && grep -q -i 'telegram' .planning/phases/05-deploy/05-03-homelab-doc-SUMMARY.md && git log -1 --pretty=%s | grep -q 'home-lab tv_bingo' && git status --porcelain | grep -qv . && echo OK</automated>
  </verify>
  <done>SUMMARY.md exists at the expected path, references the rewrite (mentions tv_bingo.md and Telegram for the diff), is committed with subject `docs(05): update home-lab tv_bingo.md to post-Phase-5 state`, and the working tree is clean.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| obv CLI → Obsidian Local REST API | localhost-only, requires plugin enabled |
| Vault files → Pippa's Syncthing peers | sync-out happens on file write; not new for this plan |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-03-01 | Information Disclosure | tv_bingo.md content | accept | Doc lives in Pippa's private vault; previous version already documented similar info; no new secrets introduced. |
| T-05-03-02 | Tampering | wikilink integrity across vault | mitigate | Use obv (which scans the vault and updates wikilinks on rename/move); fallback to direct filesystem write only if obv unavailable, with explicit warning in SUMMARY. |
| T-05-03-03 | Denial of Service | obv unavailable → blocks plan | accept | Fallback to direct fs write with explicit note. The doc is the operational target; tooling matters less than the doc being correct. |
</threat_model>

<verification>

```bash
# Doc state
~/.local/bin/obv cat '01_Projects/HomeLab/documentation/tv_bingo.md' | head -1
# expect: # TV Bingo

~/.local/bin/obv cat '01_Projects/HomeLab/documentation/tv_bingo.md' | grep 'Last Updated'
# expect: **Last Updated:** 2026-05-06 (post-Phase-5 deploy on kainga-core)

# Repo state
git log -3 --pretty='%h %s'
# expect line 1: docs(05): update home-lab tv_bingo.md to post-Phase-5 state
# expect line 2: docs(05): capture kainga-core deploy + close Phase 3 UAT items 1-4
# expect line 3: feat(05): production compose hardening + kainga-core deploy README
git status --porcelain                               # expect: empty
```

</verification>

<success_criteria>

- `~/Documents/Obsidian/01_Projects/HomeLab/documentation/tv_bingo.md` is rewritten to reflect the actual Phase 5 deployed state: OPENROUTER_API_KEY env contract, Forgejo primary source, Let's Encrypt cert strategy, 127.0.0.1 loopback bind, no Telegram/Anthropic/BASE_URL references.
- The SUMMARY captures the diff, backlinks, and tooling notes.
- A single commit (`docs(05): update home-lab tv_bingo.md to post-Phase-5 state`) lands on the working branch and is pushed.
- Phase 5 is now complete: container running, cert valid, deferred Phase 3 UAT items closed, README guides recreate-from-clone, home-lab service doc is current.

</success_criteria>

<output>
After completion, `.planning/phases/05-deploy/` contains three SUMMARYs (one per plan). Phase 5 is shippable.
</output>
