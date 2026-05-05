# TV Series Bingo

> Family-only bingo for TV shows and YouTube content. Hosted on kainga-core. Not public.

A multiplayer bingo web app for TV shows and YouTube content: pick a show or channel, AI generates 24 "moments" likely to happen (catchphrases, visuals, plot beats), players watch together, mark squares as moments occur, first to a line wins.

## Quick start

1. Get an OpenRouter API key at https://openrouter.ai/keys
2. `cp .env.example .env` and set `OPENROUTER_API_KEY=sk-or-v1-<your-key>`
3. `./run.sh` — boots backend (uvicorn on :8000) and frontend (Vite on :5173)
4. Open http://localhost:5173 (or the LAN IP shown by `run.sh`)

## Environment variables

| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `OPENROUTER_API_KEY` | yes | — | OpenRouter API key — get one at https://openrouter.ai/keys |
| `AI_MODEL` | no | `openai/gpt-4o-mini` | Any OpenRouter model name (see "Switching the AI model" below) |
| `DATABASE_PATH` | no | `bingo.db` | SQLite file path (overridden in Docker to `/app/data/bingo.db`) |
| `HOST` | no | `0.0.0.0` | Backend bind address |
| `PORT` | no | `8000` | Backend port |

## Switching the AI model

The `AI_MODEL` env var accepts any OpenRouter model name. OpenRouter encodes the upstream provider as a prefix (`openai/`, `anthropic/`, `meta-llama/`, `google/`, etc.), so swapping the model also swaps the provider — no code change required.

| Model | Cost | Notes |
|-------|------|-------|
| `openai/gpt-4o-mini` (default) | ~$0.15 / M input tokens | Cheap, reliable, native JSON output |
| `anthropic/claude-haiku-4.5` | ~$1 / M input tokens | Closest to the original Claude behaviour this app shipped with |
| `meta-llama/llama-3.3-70b-instruct:free` | $0 | Free tier — rate-limited at peak; experimental, not recommended as the primary default |
| `google/gemini-2.5-flash` | varies | Google models reachable through the same key |

To switch: set `AI_MODEL=...` in `.env`, restart the backend (`Ctrl-C` and re-run `./run.sh`, or `docker-compose restart` for the deployed container).

The default works out-of-the-box once `OPENROUTER_API_KEY` is set — `AI_MODEL` is purely an override.

> **Free models warning:** OpenRouter's `:free` model variants apply per-minute and per-day rate caps that bite during peak hours. The app retries once on transient errors but won't survive sustained 429 rate-limiting. Use the free tier as a $0/month experiment, not as a primary production path.

## Verifying the model is being used

After starting the backend, create a game from a TV show in the UI. On a successful call no log line is written (quiet path). On a transient retry, the backend logs the configured model:

```
WARNING:backend.services.moment_generator:OpenRouter transient 502; retrying once (model=openai/gpt-4o-mini)
```

To verify externally, sign in to https://openrouter.ai/activity — the most recent call's model column matches `$AI_MODEL`.

The backend never logs the API key, the prompt body, or the response content — only the model name, status code, and exception class on retry warnings.

## Privacy

AI moment generation sends the show name (or YouTube transcript text) to OpenRouter, which forwards it to the configured upstream provider (OpenAI, Anthropic, Meta, etc., depending on `AI_MODEL`). No game state, player names, scores, session IDs, or chat is sent. OpenRouter applies a default ~30-day prompt logging policy on the routed request.

This is the one external data egress in v1; the family-LAN deployment otherwise keeps all user data on kainga-core (game state, players, moments, events, leaderboards). The AI prompts are low-sensitivity (TV-show names and YouTube transcript text — both already public). Revisit the logging posture if the project ever exposes externally beyond family.

## Development setup

Requirements: Python 3.11+ and Node.js 20+.

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r backend/requirements.txt
cd frontend && npm install && cd ..
./run.sh
```

`./run.sh` handles venv creation and frontend dep install on first run, then starts both backend (uvicorn :8000) and frontend (Vite :5173) in the foreground. Press `Ctrl-C` to stop both.

## Deploying to kainga-core

This app is family-only and runs on kainga-core via Docker. Access is via LAN or Tailscale — there is no public IP and no public release planned.

```bash
# On kainga-core:
git pull
cp .env.example .env  # then edit and set OPENROUTER_API_KEY
docker-compose build
docker-compose up -d
```

Reachable at `http://kainga-core.local:8088` (LAN/Tailscale).

The Dockerfile is multi-stage — Node 20 builds the frontend, Python 3.11-slim serves both the FastAPI API (port 8000) and the static SPA. `docker-compose.yml` maps host port `8088` to container port `8000` and persists the SQLite database in a named volume (`bingo-data:/app/data`).

To check container logs: `docker-compose logs -f tv-bingo`. To restart after an env change: `docker-compose restart tv-bingo`. To rebuild after a code change: `docker-compose up -d --build`.

## Project shape

- **Backend:** FastAPI + SQLite (aiosqlite, WAL mode) — `backend/`
- **Frontend:** React 19 + Vite + TypeScript — `frontend/`
- **AI:** OpenRouter (HTTP via `httpx`) — `backend/services/moment_generator.py`
- **Multiplayer:** WebSocket via FastAPI — `backend/routers/websocket.py`
- **Deploy:** Docker multi-stage, single-container — `Dockerfile` + `docker-compose.yml`

For the v1 polish-and-ship plan, see `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, and `.planning/ROADMAP.md`.
