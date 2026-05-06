---
phase: 05-deploy
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - docker-compose.yml
  - README.md
autonomous: true
requirements: [DEPLOY-01]
tags: [deploy, docker-compose, caddy, lan-https, kainga-core, pwa]

must_haves:
  truths:
    - "docker-compose.yml binds the app port to 127.0.0.1 only (not 0.0.0.0), so Caddy is the sole LAN ingress path."
    - "docker-compose.yml has mem_limit: 512m set on the tv-bingo service per the kainga-core 2026-05-04 memory policy."
    - "README documents a fresh-clone deploy procedure for kainga-core that lands on https://tv-bingo.aiwhare.com with no per-device cert ceremony."
    - "README warns Pippa to disconnect Adam's VPN before running deploy commands (incident-006 hijack hazard)."
    - "README's old 'Deploying to kainga-core' section is replaced by the new LE/DNS-01 + Caddy procedure (no stale http://kainga-core.local:8088 reference)."
    - "All Phase 5 source changes are committed and pushed to the Forgejo remote so Plan 02 can git-clone them on kainga-core."
  artifacts:
    - path: "docker-compose.yml"
      provides: "Production-grade compose: loopback bind, mem_limit, env_file, explicit DATABASE_PATH"
      contains: '127.0.0.1:8088:8000'
    - path: "README.md"
      provides: "Replaced 'Deploying to kainga-core' section with LE/DNS-01 procedure"
      contains: "https://tv-bingo.aiwhare.com"
  key_links:
    - from: "docker-compose.yml"
      to: "Caddy on host"
      via: "127.0.0.1:8088 loopback bind"
      pattern: '"127.0.0.1:8088:8000"'
    - from: "README.md"
      to: "kainga-core deploy procedure"
      via: "git clone + .env + docker compose up + Caddyfile reload"
      pattern: "tv-bingo.aiwhare.com"
---

<objective>
Prepare the tv-bingo repo for kainga-core deploy: harden `docker-compose.yml` (loopback bind + memory limit + explicit env contract) and rewrite the README's deploy section to match the LE/DNS-01 + Caddy procedure traced by RESEARCH.md. End by pushing the changes to Forgejo so Plan 02 can `git clone` them on kainga-core.

Purpose: The current `docker-compose.yml` exposes the app on all interfaces (`8088:8000`) and the README documents an outdated deploy procedure pointing at `http://kainga-core.local:8088`. Both must change before Plan 02 runs, otherwise (a) the PWA's secure-context guarantee breaks because raw HTTP is reachable on the LAN, and (b) Pippa cannot follow the README to recreate the deploy.

Output: Hardened compose file, rewritten README deploy section, single atomic commit pushed to Forgejo.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/05-deploy/05-CONTEXT.md
@.planning/phases/05-deploy/05-RESEARCH.md
@docker-compose.yml
@README.md
@.env.example
@backend/config.py

<interfaces>
<!-- Current env-var contract — extracted from backend/config.py 2026-05-06. -->
<!-- These are the ONLY vars the app reads. Do not invent others. -->
<!-- Phase 1 dropped TELEGRAM_*, BASE_URL, ANTHROPIC_API_KEY. They MUST NOT reappear. -->

From backend/config.py:
```python
class Settings(BaseSettings):
    openrouter_api_key: str = ""
    ai_model: str = "openai/gpt-4o-mini"
    database_path: str = "bingo.db"
    host: str = "0.0.0.0"
    port: int = 8000
```

Production target (per RESEARCH.md Code Example 1):
- `OPENROUTER_API_KEY` from `.env` (env_file)
- `AI_MODEL` from `.env` (optional)
- `DATABASE_PATH=/app/data/bingo.db` (explicit in compose `environment:`)
- `HOST=0.0.0.0` inside container, `PORT=8000` inside container
- Host-side: bind to `127.0.0.1:8088`

Subdomain → IP → port chain (locked decision in CONTEXT.md):
`https://tv-bingo.aiwhare.com` → `192.168.20.9` (kainga-core, via UniFi DNS)
  → Caddy reverse_proxy → `127.0.0.1:8088` (loopback)
  → tv-bingo container :8000 (uvicorn)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Harden docker-compose.yml for production</name>
  <files>docker-compose.yml</files>
  <action>
Replace the entire contents of `docker-compose.yml` with the production-grade compose layout below. Diff vs current state: (1) bind ports to `127.0.0.1` instead of all interfaces — closes the raw HTTP exposure pitfall (RESEARCH.md Pitfall 3); (2) switch to `env_file: .env` so `OPENROUTER_API_KEY` does not need to be exported into Pippa's shell on kainga-core; (3) move `DATABASE_PATH` and `HOST`/`PORT` to explicit `environment:` so the production override is unambiguous; (4) add `mem_limit: 512m` per the 2026-05-04 kainga-core memory policy (D-05); (5) drop the redundant `networks: default` block — default network is implicit.

Write this exact content (no extra whitespace, no extra services, no comments removed below):

```yaml
services:
  tv-bingo:
    build: .
    container_name: tv-bingo
    restart: unless-stopped
    ports:
      # Loopback only — Caddy on the host is the sole LAN ingress.
      # Do NOT change to 0.0.0.0:8088 or 8088:8000 — that re-exposes raw HTTP
      # on the LAN and breaks the PWA secure-context guarantee.
      - "127.0.0.1:8088:8000"
    env_file:
      - .env
    environment:
      - DATABASE_PATH=/app/data/bingo.db
      - HOST=0.0.0.0
      - PORT=8000
    volumes:
      - bingo-data:/app/data
    mem_limit: 512m

volumes:
  bingo-data:
```

Do NOT add any of: `TELEGRAM_*`, `BASE_URL`, `ANTHROPIC_API_KEY`, healthchecks, networks block, or a second service. Per RESEARCH.md Pitfall 2 those env vars were dropped in Phase 1/2 and must not reappear. Per PROJECT.md "no health endpoints" out-of-scope, do not add a healthcheck. Per RESEARCH.md anti-pattern, do not add a second Caddy service to this compose — the host-level Caddy already exists.
  </action>
  <verify>
    <automated>grep -q '127.0.0.1:8088:8000' docker-compose.yml && grep -q 'mem_limit: 512m' docker-compose.yml && grep -q 'env_file:' docker-compose.yml && ! grep -qE '(TELEGRAM|ANTHROPIC|BASE_URL)' docker-compose.yml && python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml'))" && echo OK</automated>
  </verify>
  <done>docker-compose.yml binds to 127.0.0.1, has mem_limit: 512m, uses env_file, has no Telegram/Anthropic/BASE_URL references, and parses as valid YAML.</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite README's "Deploying to kainga-core" section</name>
  <files>README.md</files>
  <action>
Replace the existing `## Deploying to kainga-core` section in `README.md` (currently lines ~72-88, the section that mentions `http://kainga-core.local:8088` and `git pull` only) with the new section below. Use the Edit tool to replace from the heading `## Deploying to kainga-core` through the end of that section (i.e. up to but not including the next `##` heading, which is `## PWA install`).

Do NOT touch any other section of the README. Quick start, Environment variables, Switching the AI model, Verifying the model is being used, Privacy, Development setup, PWA install, and Project shape sections all stay exactly as they are. The new section must mention: (a) `https://tv-bingo.aiwhare.com` as the access URL, (b) the `/srv/containers/tv-bingo/` deploy path on kainga-core, (c) Forgejo as the primary clone source with GitHub fallback (D-06), (d) the VPN disconnect precondition (RESEARCH.md Pitfall 1 / incident-006), (e) the `127.0.0.1:8088` loopback note so future readers understand why direct LAN HTTP doesn't work, (f) the Caddyfile/UniFi DNS as kainga-core platform pieces (already there, just touched once on first deploy), and (g) the rebuild-after-code-change command `docker compose up -d --build`.

New section verbatim — paste exactly this between `## Deploying to kainga-core` and `## PWA install`:

```markdown
## Deploying to kainga-core

This app is family-only and runs on `kainga-core` (192.168.20.9 on the home LAN). Access is over LAN HTTPS at `https://tv-bingo.aiwhare.com`. There is no public IP and no public release planned.

The kainga-core platform already provides Caddy (with Let's Encrypt certs via Cloudflare DNS-01), UniFi local DNS, and UFW firewall rules — this section just documents how to plug tv-bingo into them.

### Pre-flight (do this once, on your laptop)

1. **Disconnect Adam's VPN** if connected. Both LANs share `192.168.20.0/24` and a host-route can hijack traffic to `192.168.20.9` (see incident-006 in the home lab notes). Verify with:
   ```bash
   ip route get 192.168.20.9 | grep -q tun0 && echo "VPN active — disconnect first" || echo "OK"
   ```
2. Confirm DNS resolves on the LAN:
   ```bash
   nslookup tv-bingo.aiwhare.com 192.168.20.1
   # expect:  Address: 192.168.20.9
   ```
   If this returns NXDOMAIN, add the policy in the UniFi controller (Settings → Profiles → DNS policies → `tv-bingo.aiwhare.com → 192.168.20.9`).

### First-time deploy (on kainga-core)

```bash
ssh opsadmin@192.168.20.9
sudo mkdir -p /srv/containers/tv-bingo
sudo chown opsadmin:opsadmin /srv/containers/tv-bingo
cd /srv/containers/tv-bingo

# Clone the source (Forgejo primary, GitHub fallback)
git clone ssh://git@git.aiwhare.com:2222/pippa/tv-series-bingo.git .
# fallback: git clone https://github.com/jamesjriley/tv-series-bingo.git .

# Create .env (NOT in git)
cat > .env <<'EOF'
OPENROUTER_API_KEY=sk-or-v1-...your-key-here
AI_MODEL=openai/gpt-4o-mini
EOF
chmod 600 .env

# Build and start
docker compose up -d --build

# Add the Caddy vhost (only if not already present in the Caddyfile)
sudo grep -q 'tv-bingo.aiwhare.com' /home/opsadmin/services/caddy/Caddyfile \
  || sudo tee -a /home/opsadmin/services/caddy/Caddyfile <<'EOF'

tv-bingo.aiwhare.com {
    reverse_proxy 127.0.0.1:8088
}
EOF
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# Smoke checks
curl -sI http://127.0.0.1:8088 | head -1                  # expect: HTTP/1.1 200 OK
curl -sI https://tv-bingo.aiwhare.com | head -1           # expect: HTTP/2 200
docker logs --tail 30 tv-bingo                            # no errors
```

The first request to `https://tv-bingo.aiwhare.com` after a fresh Caddy reload may take ~30 seconds while Caddy completes the DNS-01 ACME challenge with Cloudflare and issues the cert. Subsequent requests are instant.

### Updating after code changes

```bash
cd /srv/containers/tv-bingo
git pull
docker compose up -d --build      # the --build flag is required — frontend is built into the image
```

The PWA service worker is configured with `registerType: 'autoUpdate'`, so users get the new version on the next page load — no manual cache clear needed.

### Restart, logs, and recovery

```bash
docker compose restart tv-bingo                  # restart after .env changes
docker compose logs -f tv-bingo                  # tail logs
docker volume ls | grep bingo-data               # the SQLite DB lives here
```

**Do not** run `docker volume prune` or `docker volume rm caddy_data` — the latter wipes Let's Encrypt certs for every `*.aiwhare.com` service and forces a re-issue across all of them.

### Why does direct HTTP not work?

`docker-compose.yml` binds the app to `127.0.0.1:8088` on the host, not `0.0.0.0:8088`. That is deliberate: Caddy is the only LAN-reachable path, and Caddy enforces HTTPS. Without it, family devices could hit raw HTTP at `http://192.168.20.9:8088` — that breaks the PWA's secure-context guarantee on Android (Chrome refuses to register the service worker over plain HTTP from a non-localhost origin) and silently undoes the install prompt.

```

After replacing the section, verify the rest of the README is unchanged: `## Quick start`, `## Environment variables`, `## Switching the AI model`, `## Verifying the model is being used`, `## Privacy`, `## Development setup`, `## PWA install`, `## Project shape` should all still be present in that order.
  </action>
  <verify>
    <automated>grep -q 'https://tv-bingo.aiwhare.com' README.md && grep -q '/srv/containers/tv-bingo' README.md && grep -q 'Adam' README.md && grep -q 'Forgejo' README.md && grep -q '127.0.0.1:8088' README.md && ! grep -q 'kainga-core.local:8088' README.md && grep -q '## PWA install' README.md && grep -q '## Quick start' README.md && echo OK</automated>
  </verify>
  <done>README's "Deploying to kainga-core" section has been replaced; new section references tv-bingo.aiwhare.com, /srv/containers/tv-bingo, Adam VPN warning, Forgejo, 127.0.0.1 loopback explanation; old kainga-core.local URL is gone; other README sections unchanged.</done>
</task>

<task type="auto">
  <name>Task 3: Atomic commit + push to Forgejo</name>
  <files>(git only)</files>
  <action>
Stage **only** the two modified files (do not use `git add .` or `-A` per the project's "explicit staging only" decision in STATE.md). Then create a single atomic commit per the project convention "atomic commit per feature".

```bash
git status --porcelain     # confirm only docker-compose.yml and README.md are modified
git diff --stat docker-compose.yml README.md
git add docker-compose.yml README.md
git commit -m "$(cat <<'EOF'
feat(05): production compose hardening + kainga-core deploy README

- docker-compose.yml: bind to 127.0.0.1:8088 (loopback only — Caddy is
  the sole LAN ingress; closes raw-HTTP exposure pitfall), add
  mem_limit: 512m per kainga 2026-05-04 memory policy, switch to
  env_file: .env, add explicit DATABASE_PATH/HOST/PORT environment
  block.
- README.md: replace stale "kainga-core.local:8088" deploy section with
  the LE/DNS-01 + Caddy procedure (Forgejo clone primary, GitHub
  fallback, VPN disconnect precondition per incident-006, smoke
  checks, why-loopback explainer).

Closes nothing yet (the actual deploy + verification on kainga-core is
Plan 02).
EOF
)"
```

Then push to Forgejo (and GitHub if configured) so Plan 02 can clone the changes on kainga-core.

```bash
git remote -v                                   # confirm at least one of: forgejo / github / origin
git push origin claude/resume-ai-app-ClIA9
# If a 'forgejo' remote exists separately, also: git push forgejo claude/resume-ai-app-ClIA9
```

Do NOT switch branches, merge into another branch, or push --force. The branch is `claude/resume-ai-app-ClIA9` (per STATE.md last-activity log) and Plan 02 will clone that branch on kainga-core.
  </action>
  <verify>
    <automated>git log -1 --pretty=%s | grep -q '^feat(05): production compose hardening' && git status --porcelain | grep -qv . && git rev-parse @{u} >/dev/null 2>&1 && [ "$(git rev-list HEAD..@{u} --count)" = "0" ] && echo OK</automated>
  </verify>
  <done>Single commit titled "feat(05): production compose hardening + kainga-core deploy README" exists on the working branch, working tree is clean, and the branch is pushed to its upstream remote (HEAD == @{u}).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| family device → kainga LAN | trusted SSID, but devices may be compromised; treat as semi-trusted |
| kainga LAN → tv-bingo container | mediated by Caddy on host; loopback bind enforces this |
| tv-bingo container → OpenRouter | secrets in .env, never in git |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-01-01 | Information Disclosure | docker-compose port mapping | mitigate | Bind to 127.0.0.1 not 0.0.0.0 — Caddy is the only LAN-reachable path, and Caddy enforces HTTPS. Direct raw HTTP at `http://192.168.20.9:8088` becomes unreachable. (Task 1) |
| T-05-01-02 | Information Disclosure | secrets in compose | mitigate | Use `env_file: .env` so OPENROUTER_API_KEY is read from a chmod-600 file outside git, not exported into the operator's shell history. (Task 1) |
| T-05-01-03 | Tampering | repo content | accept | Repo is private; signed commits not in scope for v1; brief commit log + clean working tree audit suffices. (Task 3) |
| T-05-01-04 | Denial of Service | container memory | mitigate | mem_limit: 512m caps blast radius if app leaks; aligns with kainga 2026-05-04 policy. (Task 1) |
| T-05-01-05 | Spoofing | git remote during push | accept | Pushing to Forgejo/GitHub over SSH using existing keys; standard kainga-pippa workflow. No new attack surface. (Task 3) |
</threat_model>

<verification>

After all three tasks:

```bash
# Compose file sanity
grep -c '127.0.0.1:8088' docker-compose.yml          # expect: 1 (in ports:)
grep -c 'mem_limit: 512m' docker-compose.yml         # expect: 1
python3 -c "import yaml; print(list(yaml.safe_load(open('docker-compose.yml'))['services'].keys()))"  # expect: ['tv-bingo']

# README sanity — old URL gone, new procedure present
grep -c 'kainga-core.local' README.md                # expect: 0
grep -c 'tv-bingo.aiwhare.com' README.md             # expect: ≥3 (URL + Caddy block + Pre-flight DNS)
grep -c '127.0.0.1:8088' README.md                   # expect: ≥2 (smoke check + Caddy block)

# Git state — single commit, pushed
git log -1 --pretty='%h %s'                          # expect: feat(05): production compose hardening...
git status --porcelain                               # expect: empty
git rev-list HEAD..@{u} --count                      # expect: 0 (branch in sync with upstream)
```

</verification>

<success_criteria>

- `docker-compose.yml` binds to `127.0.0.1:8088:8000`, has `mem_limit: 512m`, uses `env_file: .env`, contains no Telegram/Anthropic/BASE_URL references, parses as valid YAML.
- `README.md`'s "Deploying to kainga-core" section is the new LE/DNS-01 + Caddy procedure; the stale `http://kainga-core.local:8088` reference is gone; all other README sections (Quick start, Environment variables, Switching the AI model, etc.) are unchanged in content and order.
- A single commit titled "feat(05): production compose hardening + kainga-core deploy README" lands on `claude/resume-ai-app-ClIA9` and is pushed upstream so Plan 02 can clone it on kainga-core.

</success_criteria>

<output>
After completion, create `.planning/phases/05-deploy/05-01-local-prep-SUMMARY.md` documenting: the diff vs the previous compose, key README section changes, the commit hash, and any deviations from the plan.
</output>
