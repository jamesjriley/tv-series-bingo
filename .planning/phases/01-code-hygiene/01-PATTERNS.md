# Phase 1: Code Hygiene - Pattern Map

**Mapped:** 2026-05-04
**Files analyzed:** 14 (3 commits + Telegram excision + repo hygiene)
**Analogs found:** N/A — phase is brownfield surgery on existing files; the file-being-touched IS its own analog

---

## Important pre-flight finding (must inform planner)

**`.env` and `bingo.db*` are NOT actually tracked in git.** Verified by `git ls-files | grep -iE "bingo\.db|^\.env$"` (only `.env.example` returns) and `git log --all --full-history -- .env bingo.db ...` (no output — no history at all).

`git check-ignore -v` confirms all four files are currently being **correctly ignored** by `.gitignore`. The CONCERNS.md claim "`.env` is committed at the project root" appears to be a **stale audit artifact** — likely the repo was cleaned up at some point, or the audit was theoretical.

**Implication for D-10:** `git rm --cached .env bingo.db bingo.db-wal bingo.db-shm` will fail with `fatal: pathspec '...' did not match any files` because these files are not in the index. The planner must specify a **defensive idempotent pattern**:

```bash
git rm --cached --ignore-unmatch .env bingo.db bingo.db-wal bingo.db-shm
```

The `--ignore-unmatch` flag turns the missing-from-index case into a no-op rather than an error, so the commit remains an honest "tighten ignore + delete accidental frontend dupe" even if there's nothing to actually untrack. The `.gitignore` tighten and `frontend/bingo.db` deletion still have real work to do.

---

## File Classification

| File | Status | Role | Touch Type | Self/Analog |
|------|--------|------|------------|-------------|
| `frontend/src/pages/Help.tsx` | Untracked (new) | React page component (modal) | Commit as-is | Self — already written; mirrors `Home.tsx` props-handler shape |
| `frontend/src/App.tsx` | Modified (uncommitted) | Root router component | Commit as-is | Self — diff already in working tree |
| `frontend/src/styles/global.css` | Modified (uncommitted) | Global stylesheet | Commit as-is | Self — diff already in working tree |
| `backend/services/youtube_service.py` | Modified (uncommitted) | Service (transcript fetch + scraping) | Commit as-is | Self — diff already in working tree |
| `backend/routers/moments.py` | Modified (uncommitted) | FastAPI router | Commit as-is | Self — diff already in working tree |
| `backend/services/telegram.py` | Tracked | Service (notifications) | Delete entirely | N/A |
| `backend/routers/games.py` | Tracked | FastAPI router | Surgical edit (line 4, 46-48) | Self |
| `backend/routers/websocket.py` | Tracked | FastAPI WebSocket router | Surgical edit (line 5, 94-102) | Self |
| `backend/config.py` | Tracked | Pydantic Settings | Delete lines 9-12 | Self |
| `docker-compose.yml` | Tracked | Container orchestration | Delete lines 13-15 + adjust line 16 | Self |
| `CLAUDE.md` | Tracked | Project orientation | Tense fix (line 40) | Self |
| `.gitignore` | Tracked | Git config | Replace specific filenames with wildcard | Self |
| `.env` | Untracked, gitignored | Env file (working tree only) | Strip TELEGRAM_* + BASE_URL keys | Self |
| `frontend/bingo.db` | Untracked, gitignored | Accidental empty file | Delete from working tree | N/A |

---

## Commit Structure (D-14)

Per CONTEXT.md D-14, **five commits** in this order on existing branch `claude/resume-ai-app-ClIA9` (D-15):

1. `feat(help): in-app Help modal with how-to-play guidance` — POLISH-01a
2. `feat(youtube): graceful transcript fallback + logging` — POLISH-01b
3. `fix(moments): proper logging in moment generation router` — POLISH-01c
4. `chore(telegram): remove bot integration end-to-end` — POLISH-02
5. `chore(repo): untrack .env and bingo.db*, tighten .gitignore` — POLISH-03

---

## Conventional Commits Style (verified in repo)

Verbatim from `git log --oneline -20`:

```
14ce92f docs(state): record phase 1 context session
ed49e4b docs(01): capture phase context
b55a263 docs: rewrite CLAUDE.md as proper orientation file (replaces truncated SDK output)
f56bc35 fix: regenerate CLAUDE.md with proper section content
0a4ffff docs: add CLAUDE.md with GSD workflow guidance
c11e4ac docs: create roadmap (5 phases)
ebfbdfd docs: define v1 requirements
da72bf1 chore: add project config
a65262d docs: initialize project
8bf923f docs: map existing codebase
```

**Style observations the planner should encode:**
- Lowercase type prefix
- Optional scope in parens (e.g. `docs(state):`, `docs(01):`)
- Lowercase summary, no trailing period
- `docs:`, `feat:`, `fix:`, `chore:` are all in active use (matches D-14 plan)
- Older pre-GSD commits use sentence-case summaries without prefixes (e.g. `Fix production build error...`) — those predate the convention; **do not mimic**

---

## Commit 1: `feat(help): in-app Help modal with how-to-play guidance`

### Files in this commit

| File | Action |
|------|--------|
| `frontend/src/pages/Help.tsx` | New file (`git add`) |
| `frontend/src/App.tsx` | Stage existing modifications |
| `frontend/src/styles/global.css` | Stage existing modifications |

### `frontend/src/pages/Help.tsx` (NEW — already written, commit as-is)

168-line React functional component, default-exported, written in inline-style + CSS-variable token approach. Uses helper components `Section` and `Chip` defined in same file.

**Top-level shape (lines 1-6):**

```tsx
interface Props {
  onClose: () => void;
}

export default function Help({ onClose }: Props) {
  return (
```

**Modal backdrop pattern (lines 7-21) — uses inline styles, not CSS class:**

```tsx
<div
  style={{
    position: "fixed",
    inset: 0,
    background: "rgba(28, 31, 24, 0.5)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  }}
  onClick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
>
```

**Sage-themed sage tokens used (consistent with `global.css` `--sage-*` palette):**
`var(--surface)`, `var(--radius)`, `var(--sage-100)`, `var(--sage-200)`, `var(--sage-700)`, `var(--sage-800)`, `var(--easy)`, `var(--medium)`, `var(--hard)`.

**Structural reference point — `Home.tsx` lines 1-10 (page component shape that Help.tsx mirrors):**

```tsx
import { useEffect, useState } from "react";
import { listGames, getStats } from "../api";
import type { Game, Stats } from "../types/game";

interface Props {
  onCreateGame: () => void;
  onSelectGame: (game: Game) => void;
}

export default function Home({ onCreateGame, onSelectGame }: Props) {
```

Help.tsx omits hooks/api imports (it's a pure presentational modal) but matches the `interface Props` + `export default function` shape — **no rewrite needed, planner should not propose any structural change.**

### `frontend/src/App.tsx` (MODIFIED — already in working tree)

**Verbatim diff hunks (from `git diff frontend/src/App.tsx`):**

Hunk 1 — import (line 6 in new file):
```diff
@@ -3,6 +3,7 @@ import Home from "./pages/Home";
 import CreateGame from "./pages/CreateGame";
 import Lobby from "./pages/Lobby";
 import GameBoard from "./pages/GameBoard";
+import Help from "./pages/Help";
 import { getGame } from "./api";
```

Hunk 2 — state (line 76 in new file):
```diff
@@ -72,6 +73,7 @@ export default function App() {
   const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
   const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
   const [restoring, setRestoring] = useState(true);
+  const [showHelp, setShowHelp] = useState(false);
```

Hunk 3 — render refactor (lines 218-276 in new file): switch from direct `return` per case to building `content` then wrapping in fragment with `helpButton` + conditional `<Help />`. Planner should reference `frontend/src/App.tsx` lines 218-276 verbatim — already correct.

### `frontend/src/styles/global.css` (MODIFIED — already in working tree)

**Verbatim diff hunk (from `git diff frontend/src/styles/global.css`):** lines 277-306 in new file add `.help-btn` and `.help-btn:hover` rules. 30-line addition, no other changes. Planner should reference `frontend/src/styles/global.css` lines 277-306 verbatim — already correct.

### Acceptance criteria the planner can grep-verify

- `git log -1 --format=%s | grep -E "^feat\(help\):"` matches
- `git show HEAD --stat | grep -E "frontend/src/pages/Help\.tsx"` shows new file
- `git show HEAD --stat | grep -E "frontend/src/App\.tsx"` shows modification
- `git show HEAD --stat | grep -E "frontend/src/styles/global\.css"` shows modification
- `git show HEAD --stat | wc -l` shows exactly 3 file entries (plus header lines)

---

## Commit 2: `feat(youtube): graceful transcript fallback + logging`

### Files in this commit

| File | Action |
|------|--------|
| `backend/services/youtube_service.py` | Stage existing modifications |

### `backend/services/youtube_service.py` (MODIFIED — already in working tree)

**Verbatim diff (from `git diff backend/services/youtube_service.py`):**

```diff
@@ -1,10 +1,13 @@
 import json
+import logging
 import re
 import xml.etree.ElementTree as ET
 
 import httpx
 from youtube_transcript_api import YouTubeTranscriptApi
 
+logger = logging.getLogger(__name__)
+
 _HEADERS = {
@@ -36,8 +39,8 @@ def fetch_transcripts(video_urls: list[str]) -> str:
             transcript = ytt.fetch(video_id)
             text = " ".join(snippet.text for snippet in transcript)
             all_text.append(f"--- Video {video_id} ---\n{text}")
-        except Exception:
-            # Skip videos without available transcripts
+        except Exception as e:
+            logger.warning("Transcript unavailable for %s: %s", video_id, type(e).__name__)
             continue
```

This is the **canonical local logger pattern** for the project, established here. Lines 2 and 9 in new file:

```python
import logging
...
logger = logging.getLogger(__name__)
```

This pattern is what `moments.py` (Commit 3) mirrors.

### Acceptance criteria the planner can grep-verify

- `git log -1 --format=%s | grep -E "^feat\(youtube\):"` matches
- `git show HEAD --stat | grep -E "backend/services/youtube_service\.py"` is the only file
- `grep -n "logger = logging.getLogger(__name__)" backend/services/youtube_service.py` returns line 9
- `grep -n "logger.warning(\"Transcript unavailable" backend/services/youtube_service.py` returns line 43

---

## Commit 3: `fix(moments): proper logging in moment generation router`

### Files in this commit

| File | Action |
|------|--------|
| `backend/routers/moments.py` | Stage existing modifications |

### `backend/routers/moments.py` (MODIFIED — already in working tree)

**Verbatim diff (from `git diff backend/routers/moments.py`):**

```diff
@@ -1,8 +1,11 @@
+import logging
+
 from fastapi import APIRouter, HTTPException
 
 from backend.services import moment_generator, youtube_service, game_service
 from backend.models import GameCreate
 
+logger = logging.getLogger(__name__)
 router = APIRouter(prefix="/api/games", tags=["moments"])
@@ -17,16 +20,21 @@ async def generate_moments(game_id: str, body: GameCreate):
         if body.source_type == "youtube" and body.video_urls:
             transcripts = youtube_service.fetch_transcripts(body.video_urls)
             if not transcripts:
-                await game_service.delete_game(game_id)
-                raise HTTPException(status_code=400, detail="Could not fetch any transcripts from the provided URLs")
-            moments = await moment_generator.generate_moments_from_transcripts(
-                game_id, body.source_name, transcripts
-            )
+                logger.warning("No transcripts available for %s, falling back to name-based generation", body.source_name)
+            if transcripts:
+                moments = await moment_generator.generate_moments_from_transcripts(
+                    game_id, body.source_name, transcripts
+                )
+            else:
+                moments = await moment_generator.generate_moments_for_show(
+                    game_id, body.source_name
+                )
         else:
             moments = await moment_generator.generate_moments_for_show(game_id, body.source_name)
     except HTTPException:
         raise
     except Exception as e:
+        logger.exception("Failed to generate moments for game %s (%s)", game_id, body.source_name)
         # Clean up the orphaned game if AI generation fails
         await game_service.delete_game(game_id)
         raise HTTPException(status_code=500, detail=f"Failed to generate moments: {str(e)[:200]}")
```

**Pattern mirrors `youtube_service.py`** (Commit 2):
- `import logging` as first import (line 1)
- `logger = logging.getLogger(__name__)` co-located with `router = APIRouter(...)` (line 8)
- `logger.warning(...)` for fallback events with `%s`-style lazy formatting
- `logger.exception(...)` inside the catch-all to capture traceback automatically

Note: this is **`fix(moments):`** (D-14) not `feat:` because the previous behavior (delete game + 400) was buggy (premature failure), and the diff also restructures the no-transcript case to fall through to name-based generation — that's a behavior fix, not a new feature.

### Acceptance criteria the planner can grep-verify

- `git log -1 --format=%s | grep -E "^fix\(moments\):"` matches
- `git show HEAD --stat | grep -E "backend/routers/moments\.py"` is the only file
- `grep -n "logger = logging.getLogger(__name__)" backend/routers/moments.py` returns line 8

---

## Commit 4: `chore(telegram): remove bot integration end-to-end`

This is the surgical excision commit. Six files touched in one atomic diff. Order within the commit doesn't matter to git (D-discretion clause), but recommended ergonomic order: delete service file last so the import errors in routers/config disappear in same commit they're caused by.

### Files in this commit

| File | Action | Lines targeted |
|------|--------|----------------|
| `backend/services/telegram.py` | Delete entirely | All 71 lines |
| `backend/routers/games.py` | Edit | Line 4 (import edit), lines 45-48 (call site removal) |
| `backend/routers/websocket.py` | Edit | Line 5 (import edit), lines 94-102 (notify block removal) |
| `backend/config.py` | Edit | Lines 9-12 (4 fields including `base_url`) |
| `docker-compose.yml` | Edit | Lines 13-16 (3 TELEGRAM_* env, plus trim BASE_URL on 16) |
| `.env` | Edit (working tree only) | Lines `TELEGRAM_BOT_TOKEN`, `TELEGRAM_GROUP_ID`, `TELEGRAM_TOPIC_ID`, `BASE_URL` |
| `CLAUDE.md` | Edit | Line 40 — tense fix |

### `backend/services/telegram.py` — DELETE ENTIRELY

71-line file. Two async functions: `notify_game_started` (lines 8-42), `notify_bingo_winner` (lines 45-70). Both use `httpx.AsyncClient` to POST to Telegram Bot API. Both swallow exceptions silently (`except Exception: pass`) — this is one of the silent-failure issues CONCERNS.md flagged that we're fixing by removing the whole feature.

**`base_url` confirmation (lines 28-32 of `telegram.py`):** `base_url` is consumed only here:

```python
if settings.base_url and game_id:
    link = f"{settings.base_url.rstrip('/')}/game/{game_id}"
    payload["reply_markup"] = {
        "inline_keyboard": [[{"text": "Join the game", "url": link}]]
    }
```

Confirms D-05 — `base_url` deletion is correct because the only consumer is this file.

**Action:** `git rm backend/services/telegram.py`

### `backend/routers/games.py` — SURGICAL EDIT

**Verbatim current contents (`backend/routers/games.py` lines 1-6):**

```python
from fastapi import APIRouter, HTTPException

from backend.models import GameCreate, PlayerJoin
from backend.services import game_service, telegram

router = APIRouter(prefix="/api/games", tags=["games"])
```

**Edit at line 4:** Change `from backend.services import game_service, telegram` → `from backend.services import game_service` (drop the `, telegram`).

**Verbatim current contents (`backend/routers/games.py` lines 41-49):**

```python
@router.post("/{game_id}/start")
async def start_game(game_id: str):
    await game_service.start_game(game_id)
    game = await game_service.get_game(game_id)
    if game:
        await telegram.notify_game_started(
            game["source_name"], game["source_type"], game["player_count"], game_id
        )
    return {"ok": True}
```

**Edit at lines 44-48:** Remove the entire `game = await game_service.get_game(game_id) ... if game: await telegram.notify_game_started(...)` block. The `start_game` handler becomes:

```python
@router.post("/{game_id}/start")
async def start_game(game_id: str):
    await game_service.start_game(game_id)
    return {"ok": True}
```

Note CONTEXT.md D-04 says "line 46 `notify_game_started` call" — slightly imprecise; the actual call spans lines 46-48 and the load-bearing `game = await game_service.get_game(game_id)` on line 44 is now dead (only used to feed Telegram). The cleanest excision is to drop lines 44-48 inclusive.

### `backend/routers/websocket.py` — SURGICAL EDIT

**Verbatim current contents (`backend/routers/websocket.py` lines 1-7):**

```python
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services import card_builder, bingo_checker, game_service, telegram

router = APIRouter()
```

**Edit at line 5:** Change `from backend.services import card_builder, bingo_checker, game_service, telegram` → `from backend.services import card_builder, bingo_checker, game_service` (drop the `, telegram`).

**Verbatim current contents (`backend/routers/websocket.py` lines 83-110):**

```python
                # Check for bingo
                winning_line = await bingo_checker.check_bingo(result["player_id"])
                if winning_line:
                    await game_service.set_winner(game_id, result["player_id"])
                    await manager.broadcast(game_id, {
                        "type": "bingo",
                        "data": {
                            "winner_player_id": result["player_id"],
                            "winning_line": winning_line,
                        },
                    })
                    # Telegram notification
                    game = await game_service.get_game(game_id)
                    progress = await bingo_checker.get_player_progress(game_id)
                    winner_name = next(
                        (p["name"] for p in progress if p["id"] == result["player_id"]),
                        "Someone",
                    )
                    if game:
                        await telegram.notify_bingo_winner(game["source_name"], winner_name)

                # Send updated progress
                progress = await bingo_checker.get_player_progress(game_id)
                await manager.broadcast(game_id, {
                    "type": "progress_update",
                    "data": {"progress": progress},
                })
```

**Edit at lines 94-102:** Remove the 9-line block from `# Telegram notification` through `await telegram.notify_bingo_winner(...)` inclusive. CONTEXT.md D-04 says "lines 94–102" — confirmed accurate.

After excision the bingo handler becomes (the `if winning_line:` branch ends at the closing `})` on what was line 93, then directly `# Send updated progress` on what was line 104):

```python
                # Check for bingo
                winning_line = await bingo_checker.check_bingo(result["player_id"])
                if winning_line:
                    await game_service.set_winner(game_id, result["player_id"])
                    await manager.broadcast(game_id, {
                        "type": "bingo",
                        "data": {
                            "winner_player_id": result["player_id"],
                            "winning_line": winning_line,
                        },
                    })

                # Send updated progress
                progress = await bingo_checker.get_player_progress(game_id)
```

### `backend/config.py` — SURGICAL EDIT

**Verbatim current contents (full file, 18 lines):**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    database_path: str = "bingo.db"
    host: str = "0.0.0.0"
    port: int = 8000
    telegram_bot_token: str = ""
    telegram_group_id: str = ""
    telegram_topic_id: str = ""
    base_url: str = ""  # e.g. http://tv-bingo.local:8088 — used for game links in Telegram

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
```

**Edit at lines 9-12:** Delete all four lines:

```python
    telegram_bot_token: str = ""
    telegram_group_id: str = ""
    telegram_topic_id: str = ""
    base_url: str = ""  # e.g. http://tv-bingo.local:8088 — used for game links in Telegram
```

Resulting file (14 lines):

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    database_path: str = "bingo.db"
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
```

The blank line between `port: int = 8000` and `model_config = ...` should be preserved (matches existing convention of separating fields from class config).

### `docker-compose.yml` — SURGICAL EDIT

**Verbatim current contents (full file, 22 lines):**

```yaml
services:
  tv-bingo:
    build: .
    container_name: tv-bingo
    restart: unless-stopped
    ports:
      - "8088:8000"
    volumes:
      - bingo-data:/app/data
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATABASE_PATH=/app/data/bingo.db
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_GROUP_ID=${TELEGRAM_GROUP_ID}
      - TELEGRAM_TOPIC_ID=${TELEGRAM_TOPIC_ID}
      - BASE_URL=${BASE_URL:-https://tv-bingo.aiwhare.com}
    networks:
      - default

volumes:
  bingo-data:
```

**CONTEXT.md D-06 says "lines 13–15" but `BASE_URL` lives on line 16.** Since D-05 deletes `base_url` from `config.py`, the matching `BASE_URL=${BASE_URL:-https://tv-bingo.aiwhare.com}` env entry on line 16 must also go (it's now feeding nothing). The planner should expand the deletion target to **lines 13-16 (4 lines, not 3)** to keep config and compose in lockstep.

**Edit at lines 13-16:** Delete all four `TELEGRAM_*` and `BASE_URL` env passthrough lines.

Resulting `environment:` block:
```yaml
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATABASE_PATH=/app/data/bingo.db
    networks:
```

### `.env` (working tree only — file is gitignored)

**Verbatim key list (values redacted via `cut -d= -f1 .env`):**

```
ANTHROPIC_API_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_GROUP_ID
TELEGRAM_TOPIC_ID
[blank line]
BASE_URL
```

**Edit:** Strip `TELEGRAM_BOT_TOKEN`, `TELEGRAM_GROUP_ID`, `TELEGRAM_TOPIC_ID`, and `BASE_URL` lines. Keep `ANTHROPIC_API_KEY=...` (the only line that matches `.env.example`).

**This change does not appear in the git commit** because `.env` is gitignored. It's a working-tree change only. The planner should call this out explicitly so the executor doesn't try to `git add .env` and get confused.

### `CLAUDE.md` — TENSE FIX

**Verbatim current contents (line 40):**

```
- Telegram bot is being **removed** in Phase 1 (not kept) — silent-fails per audit, no value for in-room family use.
```

**Edit:** Change "is being **removed**" → "has been **removed**":

```
- Telegram bot has been **removed** in Phase 1 (not kept) — silent-fails per audit, no value for in-room family use.
```

D-08 is explicit: ride along in this commit, not a separate `docs:` commit.

### Acceptance criteria the planner can grep-verify

- `git log -1 --format=%s | grep -E "^chore\(telegram\):"` matches
- `git show HEAD --stat` lists exactly 6 files: `backend/services/telegram.py` (deleted), `backend/routers/games.py`, `backend/routers/websocket.py`, `backend/config.py`, `docker-compose.yml`, `CLAUDE.md`
- `! grep -rn "telegram" backend/` returns nothing (case-insensitive: `! grep -rin "telegram" backend/`)
- `! grep -n "TELEGRAM" docker-compose.yml` returns nothing
- `! grep -n "BASE_URL" docker-compose.yml` returns nothing
- `! grep -n "base_url" backend/config.py` returns nothing
- `! grep -n "telegram" backend/config.py` returns nothing
- `grep "Telegram bot has been" CLAUDE.md` returns line 40
- `! ls backend/services/telegram.py 2>/dev/null` (file is gone)
- Smoke test: `python -c "from backend.config import settings; from backend.routers import games, websocket"` succeeds (no `NameError: telegram`)

---

## Commit 5: `chore(repo): untrack .env and bingo.db*, tighten .gitignore`

### Files in this commit

| File | Action |
|------|--------|
| `.gitignore` | Edit — replace 3 specific filenames with 1 wildcard, add comments |
| `frontend/bingo.db` | Delete from working tree (file is gitignored anyway, so no `git rm`) |

### Pre-flight verification (do this first)

```bash
# Confirm current git state — these are EXPECTED to return empty / no-match
git ls-files | grep -iE "bingo\.db|^\.env$"   # expect: only .env.example, no .env / bingo.db
git log --all --full-history -- .env bingo.db bingo.db-wal bingo.db-shm frontend/bingo.db
# expect: no output (no commits ever touched these paths)
```

If those return clean (as they did 2026-05-04), the `git rm --cached` step has nothing to actually do. **Run it anyway with `--ignore-unmatch`** so the commit's intent is preserved and self-documenting:

```bash
git rm --cached --ignore-unmatch .env bingo.db bingo.db-wal bingo.db-shm
```

### `.gitignore` — EDIT

**Verbatim current contents (full file, 14 lines):**

```
__pycache__/
*.pyc
*.pyo
venv/
.env
bingo.db
bingo.db-wal
bingo.db-shm
node_modules/
frontend/dist/
*.log
.DS_Store
.claude/
```

**Edit:** Replace lines 6-8 (three specific filenames) with a single wildcard. Per D-12 also add brief inline comments (D-12 phrasing: "add brief inline comments"). Result:

```
__pycache__/
*.pyc
*.pyo
venv/
.env                  # secrets — never commit
bingo.db*             # SQLite DB + WAL/SHM — local data, never commit
node_modules/
frontend/dist/
*.log
.DS_Store
.claude/
```

This is a 13-line file (down from 14): `bingo.db`, `bingo.db-wal`, `bingo.db-shm` collapse to one `bingo.db*` line. Comments added inline on `.env` and `bingo.db*` lines per D-12.

### `frontend/bingo.db` — DELETE WORKING TREE FILE

```bash
rm frontend/bingo.db   # file is empty (0 bytes, verified 2026-05-04) and gitignored — not in any commit
```

Plain `rm`, **not** `git rm` — file is not tracked. Per D-11 this is "file removal, not just untrack."

### Acceptance criteria the planner can grep-verify

- `git log -1 --format=%s | grep -E "^chore\(repo\):"` matches
- `git show HEAD --stat | grep -E "\.gitignore"` shows the only file change in commit
- `! ls frontend/bingo.db 2>/dev/null` (file is gone)
- `ls bingo.db` still exists (preserve real DB per D-10)
- `grep -c "^bingo\.db" .gitignore` returns 1 (just `bingo.db*`, not three separate lines)
- `grep "^bingo.db\*" .gitignore` matches
- `git status --porcelain` is empty after commit (working tree clean)

### Important note on D-13 / `.env.example`

D-13 says "leave the existing single `ANTHROPIC_API_KEY=...` line; optionally add a one-line comment header." Verbatim current contents (1 line):

```
ANTHROPIC_API_KEY=sk-ant-...your-key-here
```

The comment header is **optional** per D-13. Planner should treat as discretionary — adding a comment like `# Local environment — copy to .env and fill in real values` is fine but not required. **Do not** include this in commit 5 if it adds churn; keep that commit focused on the gitignore/repo-state change.

---

## Shared / Cross-Cutting Patterns

### Logging pattern (mandatory for moments.py + youtube_service.py)

**Source:** `backend/services/youtube_service.py` lines 2, 9 — established in commit 2, mirrored in commit 3.

```python
import logging
...
logger = logging.getLogger(__name__)
```

**Then use:**
- `logger.warning("message %s", value)` — lazy %-formatting, NOT f-strings (matches existing style; cheaper when log level filters out the message)
- `logger.exception("message")` — inside `except` blocks; auto-captures traceback

**Apply to:** Only the two files in commits 2 and 3. Do not introduce logging elsewhere in this phase (out of scope — logging hardening is a v2 concern per CONCERNS.md "Missing Critical Features → No logging infrastructure").

### Conventional Commits header (mandatory for all 5 commits)

**Pattern:** `<type>(<scope>): <lowercase summary>`
- Types in use: `feat`, `fix`, `chore`, `docs`
- Scope is project area (`help`, `youtube`, `moments`, `telegram`, `repo`, `state`, `01`)
- Summary is short (≤72 chars), no trailing period, lowercase first letter
- Body is optional; if used, separate from header with blank line

**Apply to:** All 5 phase commits. Verified style from `git log --oneline -20`.

### Surgical-excision discipline (Telegram commit only)

When removing a feature end-to-end, the commit should leave **zero references** in the searchable surface. Grep checks (case-insensitive):
- `! grep -rin "telegram" backend/` after commit
- `! grep -rin "TELEGRAM\|base_url\|BASE_URL" docker-compose.yml backend/`
- Module imports remain valid (`python -c "from backend.routers import games, websocket"`)

This is the single highest-leverage acceptance criterion for commit 4 — if any reference survives, the excision is incomplete and the commit should be amended (`git commit --amend` is fine here since the commit hasn't been pushed yet, but per D-15 push only after the whole phase verifies).

---

## No Analog Found

None. Phase 1 is brownfield code-hygiene surgery, not net-new feature work. Every file in scope is being committed-as-is, edited in-place, or deleted. Help.tsx is the only "new" file but it is already authored and uncommitted — the planner's job for Help.tsx is `git add` + commit, not "design a Help component".

---

## Metadata

**Analog search scope:**
- `backend/services/` — all 6 service files inspected (telegram.py, youtube_service.py, game_service.py, moment_generator.py, card_builder.py, bingo_checker.py)
- `backend/routers/` — all 5 router files inspected (games.py, websocket.py, moments.py, cards.py, youtube.py)
- `frontend/src/pages/` — Home.tsx referenced as structural shape baseline for Help.tsx
- Root config files: `.gitignore`, `.env`, `.env.example`, `docker-compose.yml`, `Dockerfile`, `CLAUDE.md`

**Files scanned:** ~16 source files + 6 config files

**Pattern extraction date:** 2026-05-04

**Skills directories checked:** `.claude/skills/` and `.agents/skills/` — neither exists in this project.

**Critical pre-flight finding:** `.env` and `bingo.db*` are not tracked in git (CONCERNS.md was stale on this point). Planner must use `git rm --cached --ignore-unmatch` to keep commit 5 idempotent regardless of git state.
