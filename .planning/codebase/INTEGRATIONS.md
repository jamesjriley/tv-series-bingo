# External Integrations

**Analysis Date:** 2026-05-04

## APIs & External Services

**Anthropic Claude API:**
- Service: Claude LLM for AI-powered moment generation
  - SDK/Client: `anthropic` 0.94.0 Python package
  - Auth: `ANTHROPIC_API_KEY` environment variable (required for moment generation)
  - Usage: `backend/services/moment_generator.py` uses `claude-sonnet-4-20250514` model via JSON schema
  - Methods: Generates bingo moments for TV shows and YouTube channels based on show name or video transcripts

**YouTube Integration:**
- Service: YouTube data extraction (no API key required — uses public methods)
  - Transcript fetching: `youtube-transcript-api` 1.2.4
  - Channel lookup: RSS feeds and oEmbed metadata scraping
  - HTTP client: `httpx` >=0.27.0
  - Implementation location: `backend/services/youtube_service.py`
  - Features:
    - Extract video ID from URLs (`youtu.be`, `youtube.com/watch`)
    - Fetch video transcripts (captions)
    - Lookup channel by video or channel URL
    - Search YouTube channels by name (via ytInitialData scraping)
    - Fetch recent videos from channel RSS feeds

**Telegram Bot Integration:**
- Service: Telegram bot notifications for game events
  - API: Telegram Bot API via HTTPS
  - Auth: `TELEGRAM_BOT_TOKEN` environment variable
  - Group/Topic IDs: `TELEGRAM_GROUP_ID`, `TELEGRAM_TOPIC_ID` environment variables
  - HTTP client: `httpx` >=0.27.0
  - Implementation: `backend/services/telegram.py`
  - Endpoints:
    - `https://api.telegram.org/bot{token}/sendMessage` - Send messages with inline buttons
  - Event notifications:
    - Game started notification with player count and join button
    - Bingo winner announcement
    - Graceful failure: notifications are best-effort (exceptions caught, do not block game flow)

## Data Storage

**Databases:**
- SQLite 3.x local file database (`bingo.db`)
  - Connection: `aiosqlite` 0.20.0 (async)
  - Configuration: Via `DATABASE_PATH` env var (default: `bingo.db`)
  - Features: WAL mode, foreign key enforcement
  - Tables: games, moments, players, card_squares

**File Storage:**
- Local filesystem only — no cloud storage integration
- Frontend compiled assets served from `frontend/dist` via FastAPI

**Caching:**
- Anthropic API: Prompt caching enabled in `backend/services/moment_generator.py` (ephemeral cache on system prompt)
- No explicit Redis or memcached layer

## Authentication & Identity

**Auth Provider:**
- Custom (stateless) — no external auth provider
  - Players identified by unique `id` (UUID) generated on join
  - No login/signup flow
  - No session management

**Telegram Integration:**
- Bot token authentication via `TELEGRAM_BOT_TOKEN`
- Does not require user login to Telegram

## Monitoring & Observability

**Error Tracking:**
- Not detected — no Sentry, Rollbar, or similar

**Logs:**
- Python logging module used in `backend/services/youtube_service.py` (logger warnings for transcript failures)
- Console output only (no persistent logging)
- Telegram/YouTube failures logged but do not block operations

## CI/CD & Deployment

**Hosting:**
- Docker containerization via `Dockerfile`
- Container publishes port 8000
- Deployment target: Any Docker host (self-hosted or cloud)
- Base URL configurable via `BASE_URL` env var (used for game links in Telegram)

**CI Pipeline:**
- Not detected

## Environment Configuration

**Required env vars:**
- `ANTHROPIC_API_KEY` - Claude API key (required for moment generation)
- `DATABASE_PATH` - SQLite database file path (default: `bingo.db`)
- `TELEGRAM_BOT_TOKEN` - Telegram bot authentication token (optional; notifications disabled if empty)
- `TELEGRAM_GROUP_ID` - Telegram group/channel ID for notifications (optional)
- `TELEGRAM_TOPIC_ID` - Telegram topic ID within group (optional)
- `BASE_URL` - Public URL of the application for game links in Telegram (optional; default: `https://tv-bingo.aiwhare.com`)

**Example .env.example:**
```
ANTHROPIC_API_KEY=sk-ant-...your-key-here
```

**Secrets location:**
- `.env` file in project root (not committed to git)
- Docker compose: env vars passed via `environment` section in `docker-compose.yml`

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Telegram notifications sent to bot API (push notifications, not webhooks)
- No other outgoing webhooks

## CORS Configuration

**Current:**
- CORS middleware allows all origins: `allow_origins=["*"]`
- All methods and headers permitted
- Location: `backend/main.py` (FastAPI middleware)

## Frontend API Communication

**Base URL:**
- Development: Proxied via Vite to `http://localhost:8000` (see `frontend/vite.config.ts`)
- Production: Served from same FastAPI app instance

**WebSocket:**
- WebSocket endpoint for real-time game updates proxied in Vite dev config
- Target: `ws://localhost:8000/ws`

---

*Integration audit: 2026-05-04*
