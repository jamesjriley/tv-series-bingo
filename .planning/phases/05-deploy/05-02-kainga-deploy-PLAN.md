---
phase: 05-deploy
plan: 02
type: execute
wave: 2
depends_on: [05-01-local-prep]
files_modified:
  # Remote files on kainga-core (via SSH from kainga-pippa). No local repo files
  # are modified by this plan — Plan 01 already committed all repo-side changes.
  - "kainga-core:/srv/containers/tv-bingo/.env (new, chmod 600)"
  - "kainga-core:/home/opsadmin/services/caddy/Caddyfile (append tv-bingo block if missing)"
  - "kainga-core: docker volume bingo-data (created by first compose up)"
  - "kainga-core: docker container tv-bingo (created by first compose up)"
  - "kainga-core: caddy_data volume (LE cert added; existing volume, do not recreate)"
autonomous: false  # Task 4 is a checkpoint:human-verify — Pippa runs the Android UAT pass
requirements: [DEPLOY-01]
tags: [deploy, docker-compose, caddy, lets-encrypt, dns-01, kainga-core, pwa, android, uat]

user_setup:
  - service: cloudflare
    why: "DNS-01 ACME challenge for Let's Encrypt cert on tv-bingo.aiwhare.com"
    env_vars:
      - name: CF_API_TOKEN
        source: "Already provisioned on the running caddy-cloudflare:local container per project_008. No new token needed for this phase."
    dashboard_config:
      - task: "(verification only) confirm aiwhare.com zone is still active and CF_API_TOKEN scope still includes Zone:DNS:Edit"
        location: "https://dash.cloudflare.com → aiwhare.com zone → API tokens"
  - service: openrouter
    why: "Backend AI moment generation (existing app dependency, not new for this phase)"
    env_vars:
      - name: OPENROUTER_API_KEY
        source: "https://openrouter.ai/keys (Pippa's existing account)"
  - service: unifi
    why: "LAN DNS resolution for tv-bingo.aiwhare.com → 192.168.20.9"
    dashboard_config:
      - task: "Verify DNS policy entry exists; create if missing"
        location: "UniFi controller → Settings → Profiles → DNS policies"

must_haves:
  truths:
    - "tv-bingo container is running on kainga-core via docker-compose, restart-policy unless-stopped, with /srv/containers/tv-bingo/.env chmod 600 holding only OPENROUTER_API_KEY (and optionally AI_MODEL)."
    - "https://tv-bingo.aiwhare.com returns 200 with a publicly-trusted Let's Encrypt cert (issuer = Let's Encrypt) — verified by openssl s_client + curl from kainga-core."
    - "From kainga-core, http://127.0.0.1:8088 returns 200 (FastAPI direct), confirming the loopback bind and the app is up."
    - "From a non-localhost LAN host, raw HTTP at http://192.168.20.9:8088 is unreachable (port closed/filtered) — confirms the loopback bind hardening worked."
    - "WebSocket Upgrade through Caddy at wss://tv-bingo.aiwhare.com/ws/{game}/{player} negotiates 101 Switching Protocols — confirms Caddy v2 reverse_proxy auto-handles WS Upgrade through the new vhost."
    - "On an Android phone connected to the kainga LAN, https://tv-bingo.aiwhare.com loads, the Chrome 'Install app' prompt appears within ~30s, tapping it installs the app to the home screen with the VUT manifest icon (un-cropped in the maskable preview), the installed app launches in standalone mode, and offline-reload renders the SPA shell — closing Phase 3 UAT items 1, 2, 3, 4."
    - "Multiplayer regression spot-check: from two phones (or one phone + kainga-pippa Firefox), marking a square in one tab is reflected in the other within ~1s — confirms WebSocket sync survives the proxy."
  artifacts:
    - path: "kainga-core:/srv/containers/tv-bingo/.env"
      provides: "OPENROUTER_API_KEY (and optional AI_MODEL); chmod 600; not in git"
      contains: "OPENROUTER_API_KEY="
    - path: "kainga-core:/home/opsadmin/services/caddy/Caddyfile"
      provides: "tv-bingo.aiwhare.com vhost block: reverse_proxy 127.0.0.1:8088"
      contains: "tv-bingo.aiwhare.com"
    - path: "kainga-core: docker container tv-bingo"
      provides: "Running app, bound to 127.0.0.1:8088"
      contains: "Up"
    - path: ".planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md (UAT block)"
      provides: "Phase 3 UAT items 1-4 closed with notes from real Android device"
      contains: "Test 1"
  key_links:
    - from: "kainga-core: tv-bingo container"
      to: "kainga-core: bingo-data named volume"
      via: "/app/data bind mount"
      pattern: "bingo-data:/app/data"
    - from: "kainga-core: Caddy container (host network)"
      to: "kainga-core: tv-bingo container"
      via: "loopback 127.0.0.1:8088"
      pattern: "reverse_proxy 127.0.0.1:8088"
    - from: "Family device on LAN"
      to: "Caddy on kainga-core"
      via: "UniFi DNS → 192.168.20.9 → :443 (UFW allow 192.168.20.0/24)"
      pattern: "tv-bingo.aiwhare.com"
    - from: "Caddy"
      to: "Let's Encrypt"
      via: "DNS-01 challenge → Cloudflare API → cert stored in caddy_data volume"
      pattern: "acme_dns cloudflare"
---

<objective>
Deploy tv-bingo to kainga-core, verify the LE/DNS-01 cert pipeline issues a publicly-trusted cert for tv-bingo.aiwhare.com, run automated smoke checks, and close the 4 deferred Phase 3 PWA-install UAT items via a manual Android UAT checkpoint.

Purpose: This is the actual deploy. Plan 01 produced the artifacts; Plan 02 stands them up on kainga-core, plugs them into the existing platform (Caddy, UniFi DNS, Cloudflare zone, UFW), and proves the success criteria with real curl calls and a real Android device. Without the Android UAT pass, Phase 3 stays in "partial UAT" status forever.

Output: Running container on kainga-core; valid LE cert; closed UAT items; deploy SUMMARY documenting what verified and any deviations.
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
@.planning/phases/03-pwa-visual-polish/03-UAT.md
@.planning/phases/05-deploy/05-01-local-prep-SUMMARY.md

<!-- The deploy commands run on kainga-core via SSH. The executor needs to have
     SSH access to opsadmin@192.168.20.9 (per kainga-pippa workstation docs).
     If SSH fails with auth/key errors, that is an authentication gate — create
     a checkpoint:human-action and pause for Pippa to resolve, then resume. -->

<interfaces>
<!-- Locked from CONTEXT.md and RESEARCH.md — do not redebate. -->

Subdomain → IP → port (LOCKED):
  https://tv-bingo.aiwhare.com → 192.168.20.9 → Caddy reverse_proxy → 127.0.0.1:8088 → uvicorn :8000

Cert strategy (LOCKED — overrides CONTEXT.md `tls internal` per Pippa 2026-05-06):
  Let's Encrypt via DNS-01 (Cloudflare). Auto-issued by the existing
  caddy-cloudflare:local container on kainga-core. No per-vhost `tls`
  directive — the global `acme_dns cloudflare {env.CF_API_TOKEN}` block
  in /home/opsadmin/services/caddy/Caddyfile applies.

Caddyfile block to add (LOCKED — verbatim, no extras):
```
tv-bingo.aiwhare.com {
    reverse_proxy 127.0.0.1:8088
}
```
WebSocket Upgrade is handled automatically by Caddy v2's reverse_proxy.
Do NOT add `header_up Upgrade {http.request.header.Upgrade}` or any
explicit Upgrade headers — they are unnecessary and risk breaking the
default behaviour.

.env contract (LOCKED — only these two vars; everything else is hardcoded
in docker-compose.yml's environment block from Plan 01):
```
OPENROUTER_API_KEY=sk-or-v1-...
AI_MODEL=openai/gpt-4o-mini    # optional
```
NEVER include: TELEGRAM_BOT_TOKEN, TELEGRAM_GROUP_ID, TELEGRAM_TOPIC_ID,
ANTHROPIC_API_KEY, BASE_URL — all dropped in Phase 1/2.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Pre-flight + clone + .env on kainga-core</name>
  <files>(remote) kainga-core:/srv/containers/tv-bingo/{., .env}</files>
  <action>
**This task runs entirely over SSH from kainga-pippa (or wherever the executor is) to kainga-core.** All commands below execute against `opsadmin@192.168.20.9`. If SSH fails with `Permission denied (publickey)` or any auth error, raise an authentication checkpoint to Pippa: print the failing command, the error message, and pause for resolution before retrying.

**Pre-flight (run on kainga-pippa first — refuse to proceed if VPN is hijacking the route):**

```bash
ip route get 192.168.20.9 | grep -q tun0 && { echo "FAIL: Adam VPN active — disconnect first (incident-006)"; exit 1; }
ssh -o BatchMode=yes opsadmin@192.168.20.9 hostname
# expect:  kainga-core
```

If the hostname returns anything other than `kainga-core`, abort — the SSH session is going to the wrong host (incident-006 hijack). Disconnect VPN, retry.

**Verify UniFi DNS policy is live (RESEARCH.md Open Question 3):**

```bash
nslookup tv-bingo.aiwhare.com 192.168.20.1 | tee /tmp/dns-check.txt
# expect:  Address: 192.168.20.9
```

If `nslookup` returns NXDOMAIN or a non-`192.168.20.9` address, raise a `checkpoint:human-action` to Pippa: "UniFi DNS policy `tv-bingo.aiwhare.com → 192.168.20.9` is not resolving on the LAN. Add it via the UniFi controller (Settings → Profiles → DNS policies) and re-run." Wait for resume signal "DNS added" before continuing. The locked decisions explicitly say the existing entry stays and we just verify it's live.

**Now SSH in and create the deploy directory + clone:**

```bash
ssh opsadmin@192.168.20.9 << 'REMOTE'
set -euo pipefail

# Create deploy root if missing (idempotent)
if [ ! -d /srv/containers/tv-bingo ]; then
  sudo mkdir -p /srv/containers/tv-bingo
  sudo chown opsadmin:opsadmin /srv/containers/tv-bingo
fi
cd /srv/containers/tv-bingo

# Clone (or pull, if already cloned). Forgejo primary per D-06.
if [ ! -d .git ]; then
  git clone ssh://git@git.aiwhare.com:2222/pippa/tv-series-bingo.git .
else
  git fetch origin
fi

# Track the same branch Plan 01 pushed
git checkout claude/resume-ai-app-ClIA9
git pull --ff-only origin claude/resume-ai-app-ClIA9

# Confirm the Plan 01 commit landed
git log -1 --pretty='%h %s' | grep -q 'production compose hardening' \
  || { echo "FAIL: Plan 01 commit not in cloned tree — push from Plan 01 first"; exit 1; }

# Confirm the hardened compose is present
grep -q '127.0.0.1:8088:8000' docker-compose.yml \
  || { echo "FAIL: docker-compose.yml is not the hardened Plan 01 version"; exit 1; }
grep -q 'mem_limit: 512m' docker-compose.yml \
  || { echo "FAIL: mem_limit missing from docker-compose.yml"; exit 1; }
REMOTE
```

If the Forgejo clone fails (e.g. `git.aiwhare.com:2222` unreachable), fall back to GitHub:
```bash
ssh opsadmin@192.168.20.9 'cd /srv/containers/tv-bingo && git clone https://github.com/jamesjriley/tv-series-bingo.git .'
```
Note the fallback in the SUMMARY.

**Create the .env file on kainga-core (chmod 600).** The OPENROUTER_API_KEY is a secret — do NOT echo it into shell history or paste it as a literal in this plan. Two paths:

- **Preferred — Pippa already has the key in her password manager:** raise a `checkpoint:human-action` saying "Paste OPENROUTER_API_KEY into kainga-core:/srv/containers/tv-bingo/.env (chmod 600). Use a heredoc or `nano` over SSH so the key never lands in shell history." Wait for resume signal "env created" then verify:
  ```bash
  ssh opsadmin@192.168.20.9 '
    [ -f /srv/containers/tv-bingo/.env ] && \
    [ "$(stat -c %a /srv/containers/tv-bingo/.env)" = "600" ] && \
    grep -q "^OPENROUTER_API_KEY=sk-or-v1-" /srv/containers/tv-bingo/.env && \
    ! grep -qE "^(TELEGRAM|ANTHROPIC|BASE_URL)" /srv/containers/tv-bingo/.env && \
    echo OK
  '
  ```
- **Alternative — agent-driven if Pippa explicitly pastes the key into the resume signal:** never store the key in any plan/summary file; immediately overwrite the local clipboard/scratch buffer after writing it to the remote .env.

Default behaviour: take the checkpoint path. The verification snippet above must return `OK` before proceeding.
  </action>
  <verify>
    <automated>ssh -o BatchMode=yes opsadmin@192.168.20.9 'cd /srv/containers/tv-bingo && [ -f docker-compose.yml ] && [ -f Dockerfile ] && [ -f .env ] && [ "$(stat -c %a .env)" = "600" ] && grep -q "^OPENROUTER_API_KEY=sk-or-v1-" .env && grep -q "127.0.0.1:8088:8000" docker-compose.yml && git log -1 --pretty=%s | grep -q "production compose hardening" && echo OK'</automated>
  </verify>
  <done>kainga-core has /srv/containers/tv-bingo with the cloned repo on the correct branch (Plan 01 commit visible), and .env exists with chmod 600 and the OPENROUTER_API_KEY set, and no Telegram/Anthropic/BASE_URL vars present.</done>
</task>

<task type="auto">
  <name>Task 2: Bring up the container + add Caddy vhost + reload</name>
  <files>(remote) kainga-core: docker container tv-bingo, /home/opsadmin/services/caddy/Caddyfile</files>
  <action>
**Build and start the container.** First-build pulls the Node 20 + Python 3.11 base images and builds the frontend; expect 2-4 minutes on first run.

```bash
ssh opsadmin@192.168.20.9 << 'REMOTE'
set -euo pipefail
cd /srv/containers/tv-bingo
docker compose up -d --build
sleep 5
docker ps --filter name=tv-bingo --format '{{.Names}} {{.Status}}'
# expect:  tv-bingo Up <N> seconds
docker logs --tail 30 tv-bingo
# look for: "Uvicorn running on http://0.0.0.0:8000" and no ERROR/Traceback lines
REMOTE
```

If `docker compose up -d --build` fails:
- **OPENROUTER_API_KEY missing or wrong format** → app starts, then crashes on first AI call (not on boot). Boot-time errors here mean compose syntax or Docker daemon issues. Re-read RESEARCH.md Pitfall 2 if env-var related.
- **Image build error** → likely `npm ci` lock-version drift or pip lock-version drift; surface to a debug checkpoint, do not "fix" by editing requirements.txt or package-lock.json (those are repo files; out of scope here).
- **Port already bound** → `docker ps -a | grep 8088` will show another container; abort and surface.

**Verify the loopback bind (the security fix from T-05-01-01):**

```bash
ssh opsadmin@192.168.20.9 '
  curl -fsI http://127.0.0.1:8088 | head -1
  # expect:  HTTP/1.1 200 OK
  ss -tlnp | grep ":8088"
  # expect:  exactly one line with 127.0.0.1:8088 (NOT 0.0.0.0:8088 or *:8088)
'
```

From kainga-pippa (NOT kainga-core), confirm raw HTTP at the LAN IP is unreachable:

```bash
nc -zv -w 2 192.168.20.9 8088 2>&1 | tee /tmp/portcheck.txt
# expect:  failure (Connection refused / timeout). NOT "succeeded" / "open"
```

If `nc` reports the port is open from kainga-pippa, the loopback bind is broken — the docker-compose ports stanza is wrong. Stop and surface for debug.

**Add the Caddyfile vhost block (idempotent — only append if missing):**

```bash
ssh opsadmin@192.168.20.9 << 'REMOTE'
set -euo pipefail

CADDYFILE=/home/opsadmin/services/caddy/Caddyfile

# Verify existing global acme_dns cloudflare directive exists (RESEARCH.md
# anti-pattern: don't add per-vhost tls internal — relies on global LE).
sudo grep -qE 'acme_dns +cloudflare' "$CADDYFILE" \
  || { echo "FAIL: global acme_dns cloudflare block missing — see project_008 setup"; exit 1; }

# Append vhost if missing
if sudo grep -q 'tv-bingo\.aiwhare\.com' "$CADDYFILE"; then
  echo "tv-bingo block already present in Caddyfile — leaving as-is"
  # Sanity-check the existing block does NOT have a stale tls internal directive
  sudo awk '/^tv-bingo\.aiwhare\.com \{/,/^\}/' "$CADDYFILE" | tee /tmp/existing-block.txt
  if grep -q 'tls internal' /tmp/existing-block.txt; then
    echo "WARN: existing tv-bingo block has stale 'tls internal' directive — must be removed"
    exit 2
  fi
else
  sudo tee -a "$CADDYFILE" > /dev/null <<'EOF'

tv-bingo.aiwhare.com {
    reverse_proxy 127.0.0.1:8088
}
EOF
  echo "tv-bingo block appended to Caddyfile"
fi

# Reload Caddy (zero-downtime — does NOT restart all 10+ vhosts)
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
echo "Caddy reloaded"
REMOTE
```

If the existing block has a `tls internal` directive (the WARN/exit 2 path above), surface to Pippa via a `checkpoint:human-action`: "Existing tv-bingo block in Caddyfile has stale `tls internal` — must remove that line so the global `acme_dns cloudflare` applies. Edit `/home/opsadmin/services/caddy/Caddyfile`, delete the `tls internal` line inside the tv-bingo block, save, then resume." Wait for "edited" then re-run the reload.

**Wait for ACME issuance and verify the LE cert:**

```bash
ssh opsadmin@192.168.20.9 '
  # Give Caddy ~30s to complete the DNS-01 challenge on first request
  for i in 1 2 3 4 5 6; do
    if curl -fsI https://tv-bingo.aiwhare.com 2>/dev/null | head -1 | grep -q "200"; then
      echo "Cert issued and vhost is up after $((i*5)) seconds"
      break
    fi
    sleep 5
  done

  # Confirm the cert issuer is Let'\''s Encrypt (NOT Caddy Local Authority)
  echo | openssl s_client -connect tv-bingo.aiwhare.com:443 -servername tv-bingo.aiwhare.com 2>/dev/null \
    | grep "issuer=" \
    | tee /tmp/cert-issuer.txt
  grep -qi "Let'\''s Encrypt" /tmp/cert-issuer.txt \
    || { echo "FAIL: cert issuer is not Let'\''s Encrypt — check caddy logs for ACME errors"; docker logs --tail 100 caddy | grep -iE "acme|cloudflare|tv-bingo"; exit 1; }
'
```

If `curl https://tv-bingo.aiwhare.com` 502s after 30 seconds, check `docker logs --tail 100 caddy | grep -iE 'acme|cloudflare|tv-bingo'` for clues. The most likely failures are (a) `CF_API_TOKEN` revoked (RESEARCH.md A1 — surface for token rotation) or (b) Cloudflare zone issue (A2 — outside scope). Surface either as a debug checkpoint with the relevant log lines.
  </action>
  <verify>
    <automated>ssh -o BatchMode=yes opsadmin@192.168.20.9 'docker ps --filter name=tv-bingo --filter status=running --format "{{.Names}}" | grep -q "^tv-bingo$" && curl -fsI http://127.0.0.1:8088 | head -1 | grep -q "200" && curl -fsI https://tv-bingo.aiwhare.com | head -1 | grep -qE "(200|HTTP/2 200)" && echo | openssl s_client -connect tv-bingo.aiwhare.com:443 -servername tv-bingo.aiwhare.com 2>/dev/null | grep "issuer=" | grep -qi "Let.s Encrypt" && ss -tlnp | grep -q "127.0.0.1:8088" && ! ss -tlnp | grep -E ":8088" | grep -q "0.0.0.0\|\*:" && echo OK'</automated>
  </verify>
  <done>tv-bingo container is running on kainga-core; loopback bind verified (only 127.0.0.1:8088 is bound, not 0.0.0.0); HTTPS fetch of https://tv-bingo.aiwhare.com returns 200 with a Let's Encrypt issuer; Caddyfile has the vhost block with no `tls internal` line.</done>
</task>

<task type="auto">
  <name>Task 3: Smoke checks (HTTPS, WebSocket, manifest, restart-persistence)</name>
  <files>(remote, read-only verifications on kainga-core)</files>
  <action>
Run the full smoke-check suite from RESEARCH.md "Validation Architecture":

```bash
ssh opsadmin@192.168.20.9 << 'REMOTE'
set -euo pipefail

echo "=== Check 1: FastAPI direct ==="
curl -fsI http://127.0.0.1:8088 | head -1 | grep -q '200' && echo PASS || { echo FAIL; exit 1; }

echo "=== Check 2: HTTPS via Caddy with LE cert ==="
curl -fsI https://tv-bingo.aiwhare.com | head -1 | grep -qE '(200|HTTP/2 200)' && echo PASS || { echo FAIL; exit 1; }

echo "=== Check 3: PWA manifest is reachable and valid ==="
MANIFEST=$(curl -fs https://tv-bingo.aiwhare.com/manifest.webmanifest)
echo "$MANIFEST" | python3 -c "import json, sys; m = json.load(sys.stdin); assert m['start_url'] == '/', f'start_url={m[\"start_url\"]}'; assert any(i.get('purpose') == 'maskable' for i in m['icons']), 'no maskable icon'; print(f'PASS — name={m[\"name\"]} icons={len(m[\"icons\"])}')"

echo "=== Check 4: Service worker file is reachable ==="
curl -fsI https://tv-bingo.aiwhare.com/sw.js | head -1 | grep -q '200' && echo PASS || { echo FAIL; exit 1; }

echo "=== Check 5: WebSocket upgrade through Caddy ==="
RESPONSE=$(curl -i -s \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  --max-time 5 \
  https://tv-bingo.aiwhare.com/ws/smoke-test/smoke-player 2>&1 | head -1)
echo "$RESPONSE" | grep -q '101' && echo "PASS — got 101 Switching Protocols" || { echo "FAIL: $RESPONSE"; exit 1; }

echo "=== Check 6: Container survives restart with persisted DB ==="
# First, confirm DB exists in the volume
docker exec tv-bingo ls -la /app/data/bingo.db || { echo "FAIL: bingo.db not in /app/data"; exit 1; }
docker compose -f /srv/containers/tv-bingo/docker-compose.yml restart
sleep 8
curl -fsI http://127.0.0.1:8088 | head -1 | grep -q '200' && echo "PASS — container back up after restart" || { echo FAIL; exit 1; }
docker exec tv-bingo ls -la /app/data/bingo.db && echo "PASS — DB persisted" || { echo FAIL; exit 1; }

echo "=== ALL SMOKE CHECKS PASSED ==="
REMOTE
```

If any check fails, do NOT proceed to the human UAT checkpoint. Surface the failing check, the relevant `docker logs --tail 50 tv-bingo` and `docker logs --tail 50 caddy` output, and stop for debug.

Note for the 101 Switching Protocols check: the connection will be torn down immediately by the app because the smoke-test handshake doesn't supply a real game_id/player_id. That is expected — we only care that Caddy passed the Upgrade through, which is what the 101 response proves.
  </action>
  <verify>
    <automated>ssh -o BatchMode=yes opsadmin@192.168.20.9 'curl -fsI http://127.0.0.1:8088 | head -1 | grep -q 200 && curl -fsI https://tv-bingo.aiwhare.com | head -1 | grep -qE "(200|HTTP/2 200)" && curl -fsI https://tv-bingo.aiwhare.com/sw.js | head -1 | grep -q 200 && curl -fs https://tv-bingo.aiwhare.com/manifest.webmanifest | python3 -c "import json,sys; m=json.load(sys.stdin); assert m[\"start_url\"]==\"/\"; assert any(i.get(\"purpose\")==\"maskable\" for i in m[\"icons\"]); print(\"OK\")"'</automated>
  </verify>
  <done>All 6 smoke checks pass: FastAPI direct, HTTPS via Caddy with LE cert, manifest valid + maskable icon present, sw.js reachable, WebSocket Upgrade returns 101, container survives restart with DB persisted.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Android UAT — close Phase 3 deferred items 1-4 + multiplayer regression</name>
  <what-built>
The deploy is live. tv-bingo is running on kainga-core, https://tv-bingo.aiwhare.com returns 200 with a real Let's Encrypt cert, and all 6 automated smoke checks pass (Tasks 1-3). What automation cannot verify is the user-facing PWA install ceremony on a real Android device. That's the four UAT items deferred from Phase 3 (`.planning/phases/03-pwa-visual-polish/03-UAT.md` Tests 1-4) plus a multiplayer regression spot-check.
  </what-built>
  <how-to-verify>

**Pre-conditions:**
- Both phones (any two of: Pippa's phone, Mum's tablet, Gordie's phone) are connected to the kainga LAN's trusted SSID
- Adam's VPN is disconnected on both phones (incident-006)
- The phones run Chrome (or Samsung Internet — same Chromium engine, same install behavior)

**Test 1 — Install app prompt (closes Phase 3 UAT 1):**
1. On phone A, open Chrome and visit `https://tv-bingo.aiwhare.com`
2. Confirm the page loads without a cert warning. The address bar shows the lock icon (no "Not secure" warning, no "Your connection is not private")
3. Wait up to 30 seconds. Chrome should show an "Install app" / "Add to Home Screen" prompt — either as a banner at the bottom or in the address bar overflow menu (⋮ → "Install app")
4. Tap "Install" / "Add"
   - **PASS:** Install prompt appeared within ~30s and tapping it added the app to the home screen
   - **FAIL:** No prompt after 60s — open DevTools-equivalent (chrome://inspect from a desktop, or Eruda) to check Service Workers / manifest. Likely cause: SW didn't register, or manifest is missing `start_url` / icons (Tasks 1-3 should have caught this; if it surfaces here, escalate).

**Test 2 — Service worker activated (closes Phase 3 UAT 2):**
1. On phone A in Chrome, visit `chrome://inspect` from a USB-tethered laptop (or use the in-page DevTools-equivalent)
2. Inspect the tv-bingo tab → Application → Service Workers
3. Confirm `sw.js` is listed with status "activated and is running"
   - **PASS:** sw.js shows activated and running
   - **FAIL:** SW failed to register — check the Console for errors. Most likely cause is the secure-context guarantee (which Tasks 1-3 already verified is intact, so this should not fire). If it does, escalate.

**Test 3 — Maskable icon preview, VUT mark not cropped (closes Phase 3 UAT 3):**
1. From the same DevTools session, Application → Manifest → Icons
2. Find the `maskable` icon entry, click to preview
3. The preview applies a circle/squircle mask over the icon. Visually inspect: are the VUT chevrons clipped at the edges?
   - **PASS:** Mark is fully visible inside the mask; no chevron clipped
   - **FAIL (cropped):** Note in resume signal "maskable icon cropped — VUT chevron at <position> clipped". This is **not a deploy blocker** per RESEARCH.md Pitfall 9 — it becomes a Phase 3.1 backlog item for a hand-designed maskable variant. Mark this test as a soft fail in the resume signal but do NOT block the phase.

**Test 4 — Offline reload renders SPA shell (closes Phase 3 UAT 4):**
1. On phone A with the installed app open, switch the phone to airplane mode
2. Pull-to-refresh (or close and re-open the app from the home screen)
3. The app shell should render — header, nav, layout. API calls fail gracefully with an error state but the page does NOT show a Chrome offline-dinosaur "no internet" page
   - **PASS:** SPA shell renders; API calls show graceful error states
   - **FAIL:** Chrome offline page appears or app crashes. Likely cause: Workbox precache didn't include the SPA shell — escalate.
4. Switch airplane mode off, reload — app reconnects normally

**Test 5 — Multiplayer regression (NOT a deferred item; this is the highest-stakes regression check from Phase 3 UAT Test 5):**
1. On phone A, create a new game from a TV show (any name — e.g. "Test Show")
2. After moments are generated, copy the share link from the lobby
3. Open the share link on phone B; join with a different player name
4. Phone A: tap "Start game"
5. Phone B: tap any square to mark it
6. Phone A: confirm the same square is marked within ~1s (broadcast worked)
7. Phone B: tap the marked square again to unmark
8. Phone A: confirm the unmark propagated within ~1s
   - **PASS:** Both directions of the WebSocket sync work in real-time
   - **FAIL:** Marks don't propagate, or app shows "Reconnecting…" indefinitely. The 101 Switching Protocols smoke check from Task 3 should have prevented this; if it fires here, the Caddy reverse_proxy is dropping WS frames despite passing Upgrade. Escalate with `docker logs caddy --tail 50` and DevTools → Network → WS frame dump.

**Test 6 — Cert from Mum's tablet specifically (informal — only if Pippa can run it now):**
- If Mum's tablet is reachable, repeat Test 1 once on Mum's tablet specifically. The whole point of the LE/DNS-01 override (D-01) was that Android Chrome 7+ would trust this cert without a per-device install step. Confirming on Mum's actual device closes the loop on incident-004.
   - **PASS:** Site loads on Mum's tablet without a cert warning, install prompt appears
   - **N/A:** Tablet not handy — Pippa can run this opportunistically later; not a blocker
  </how-to-verify>
  <resume-signal>
Type one of:
- `approved` — all 5 tests passed (or Test 6 N/A)
- `approved with maskable cropped` — Tests 1, 2, 4, 5 passed; Test 3 (maskable preview) showed cropping. Deploy ships; record a Phase 3.1 backlog item.
- `failed: <test number(s)> — <description>` — one or more critical tests failed. Do not proceed to the SUMMARY; return to debug and re-run the failing test after fix.
  </resume-signal>
</task>

<task type="auto">
  <name>Task 5: Write deploy SUMMARY with closed UAT items</name>
  <files>.planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md</files>
  <action>
Create `.planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md` with the standard summary template (see `@$HOME/.claude/get-shit-done/templates/summary.md`) plus a dedicated UAT closure block.

The SUMMARY must include:

**1. Deploy state captured:**
- Container image SHA / build date
- LE cert: issuer, valid-from / valid-to dates (from `openssl s_client … | openssl x509 -noout -dates`)
- Disk usage of the bingo-data volume after first boot (`docker exec tv-bingo du -sh /app/data`)
- Full output of the smoke-check suite (Task 3) so Phase 6 / future phases can reference what passed

**2. Phase 3 UAT closure block — verbatim:**

```markdown
## Phase 3 UAT — Deferred Items Closed

This deploy closes the four PWA-install ceremony items deferred from Phase 3 (`.planning/phases/03-pwa-visual-polish/03-UAT.md`):

### Test 1 — Install app prompt (closed)
result: <pass|pass-with-notes>
notes: <Pippa's notes from Task 4 resume signal>

### Test 2 — Service worker activated (closed)
result: <pass|pass-with-notes>
notes: <Pippa's notes>

### Test 3 — Maskable icon preview, VUT mark not cropped (closed-or-deferred-to-3.1)
result: <pass|cropped>
notes: <if cropped, this becomes a Phase 3.1 backlog item — see RESEARCH.md Pitfall 9>

### Test 4 — Offline reload renders SPA shell (closed)
result: <pass|pass-with-notes>
notes: <Pippa's notes>

### Test 5 — Multiplayer regression (passed — not deferred from Phase 3 but re-verified on real devices)
result: pass
notes: <two-phone test summary>
```

Reflect the actual resume-signal content from Task 4. If Pippa replied "approved with maskable cropped", Test 3 reads `result: cropped` with a note that Phase 3.1 should hand-design the maskable variant (RESEARCH.md Pitfall 9).

**3. Deviations from plan** (any — e.g. fell back to GitHub instead of Forgejo for clone; existing Caddyfile block had `tls internal` and was removed; UniFi DNS was already correct; cert took longer than expected to issue; etc.)

**4. Files modified on kainga-core** (paths, sizes, ownership) — for the eventual milestone retrospective.

Commit and push:

```bash
git add .planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md
git commit -m "docs(05): capture kainga-core deploy + close Phase 3 UAT items 1-4"
git push origin claude/resume-ai-app-ClIA9
```
  </action>
  <verify>
    <automated>test -f .planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md && grep -q 'Phase 3 UAT — Deferred Items Closed' .planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md && grep -q 'Test 1' .planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md && grep -q 'Test 4' .planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md && git log -1 --pretty=%s | grep -q 'kainga-core deploy' && echo OK</automated>
  </verify>
  <done>SUMMARY.md exists in the phase directory, contains the Phase 3 UAT closure block with results from Pippa's Task 4 resume signal, lists deploy state and any deviations, and is committed + pushed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| family device → kainga LAN | trusted SSID; LAN devices treated as semi-trusted |
| kainga LAN → Caddy (host:443) | UFW allow 192.168.20.0/24 → 80, 443 |
| Caddy (host) → tv-bingo container (loopback) | 127.0.0.1:8088 only — Caddy is sole ingress |
| tv-bingo container → OpenRouter | TLS to https://openrouter.ai, secret in .env (chmod 600) |
| Caddy → Cloudflare DNS API | TLS, scoped CF_API_TOKEN (Zone:DNS:Edit on aiwhare.com only) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-02-01 | Information Disclosure | OPENROUTER_API_KEY in .env | mitigate | chmod 600 on /srv/containers/tv-bingo/.env; never echoed in shell history (Pippa pastes via heredoc/nano in Task 1 checkpoint); not in git (Phase 1 .gitignore covers it) |
| T-05-02-02 | Spoofing | Adam VPN /32 route hijacks 192.168.20.9 | mitigate | Pre-flight VPN check in Task 1 (`ip route get 192.168.20.9 \| grep -q tun0` aborts) + hostname sanity check post-SSH; documented in README and SUMMARY |
| T-05-02-03 | Information Disclosure | Raw HTTP exposure on LAN | mitigate | docker-compose.yml binds to 127.0.0.1 (Plan 01 Task 1); Task 2 verifies `nc -zv 192.168.20.9 8088` from kainga-pippa is closed |
| T-05-02-04 | Tampering | Stale `tls internal` in Caddyfile silently overrides global LE | mitigate | Task 2 grep-checks for `tls internal` inside the tv-bingo block and surfaces a checkpoint if present |
| T-05-02-05 | Denial of Service | LE rate-limit hit on cert reissue churn | accept | One vhost added per phase; cert persists in caddy_data across container restarts; volume-prune is documented as forbidden |
| T-05-02-06 | Denial of Service | Caddy reload restarts active WS connections | accept | The frontend's useWebSocket hook auto-reconnects every 2s on disconnect (per ARCHITECTURE.md); Caddy reload is a one-time event during deploy, not ongoing |
| T-05-02-07 | Spoofing | UniFi DNS policy missing or stale | mitigate | Task 1 explicit nslookup check; surfaces a human-action checkpoint to Pippa if missing |
| T-05-02-08 | Repudiation | Deploy actions on kainga-core have no audit trail | accept | docker logs + bash history on opsadmin@kainga-core suffice for family-scale operations; out of scope per PROJECT.md |
| T-05-02-09 | Elevation of Privilege | Container runs as root by default | accept | Out of scope for v1 per RESEARCH.md security domain — current Dockerfile inherits python:3.11-slim's default user; v2 concern |
</threat_model>

<verification>

End-of-phase aggregate check (run from kainga-pippa):

```bash
# 1. Repo state
git log -2 --pretty='%h %s'
# expect line 1: docs(05): capture kainga-core deploy + close Phase 3 UAT items 1-4
# expect line 2: feat(05): production compose hardening + kainga-core deploy README

# 2. Remote state
ssh opsadmin@192.168.20.9 'docker ps --filter name=tv-bingo --format "{{.Names}} {{.Status}}"'
# expect: tv-bingo Up <duration>

# 3. Cert state
echo | openssl s_client -connect tv-bingo.aiwhare.com:443 -servername tv-bingo.aiwhare.com 2>/dev/null \
  | openssl x509 -noout -issuer -dates
# expect issuer: Let's Encrypt; dates within the next 90 days

# 4. SUMMARY state
test -f .planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md \
  && grep -q 'Test 1' .planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md \
  && grep -q 'Test 4' .planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md
```

</verification>

<success_criteria>

- `docker compose up -d --build` on kainga-core boots tv-bingo cleanly from a fresh checkout (Task 2).
- `https://tv-bingo.aiwhare.com` returns 200 with a Let's Encrypt cert; raw HTTP at `http://192.168.20.9:8088` from another LAN host is unreachable (Task 2 + Task 3).
- WebSocket Upgrade returns 101 Switching Protocols through Caddy (Task 3 smoke check).
- Phase 3 UAT items 1-4 are closed in `05-02-kainga-deploy-SUMMARY.md` with results captured from Task 4's resume signal — at minimum: install prompt appeared, SW activated, offline shell rendered, multiplayer worked. Test 3 (maskable icon) may close as "cropped → Phase 3.1 backlog" without blocking the phase.
- README's deploy procedure (Plan 01 Task 2) was sufficient to recreate the deploy from a fresh clone — confirmed by Task 1 following it verbatim. Any deviations are noted in the SUMMARY.

</success_criteria>

<output>
After completion, the deploy SUMMARY at `.planning/phases/05-deploy/05-02-kainga-deploy-SUMMARY.md` is the canonical record. Plan 03 reads it to update the home-lab `tv_bingo.md` doc with the actual deployed state.
</output>
