# Technology Stack

**Analysis Date:** 2026-05-04

## Languages

**Primary:**
- Python 3.11 - Backend API and services (`backend/`)
- TypeScript 6.0.2 - Frontend application (`frontend/`)
- JavaScript - Vite build tooling

**Secondary:**
- HTML5 - Frontend markup
- CSS3 - Frontend styling

## Runtime

**Environment:**
- Python 3.11-slim (Docker production image)
- Node.js 20-alpine (Docker build stage for frontend)
- Browser runtime (React 19.2.4 frontend)

**Package Manager:**
- pip (Python) - Manages backend dependencies
  - Lockfile: No lock file tracked; uses pinned versions in `backend/requirements.txt`
- npm (Node.js) - Manages frontend dependencies
  - Lockfile: `frontend/package-lock.json` present

## Frameworks

**Core:**
- FastAPI 0.115.0 - Backend REST API framework
- React 19.2.4 - Frontend UI library
- Vite 8.0.4 - Frontend build tool and dev server

**Testing:**
- Not detected

**Build/Dev:**
- TypeScript (tsc) - Frontend type checking and compilation
- ESLint 9.39.4 - Frontend linting
- Vite 8.0.4 - Frontend dev server and production bundler

## Key Dependencies

**Critical:**
- aiosqlite 0.20.0 - Async SQLite database access
- anthropic 0.94.0 - Anthropic Claude API client (for moment generation)
- uvicorn[standard] 0.30.0 - ASGI server for running FastAPI
- youtube-transcript-api 1.2.4 - Fetches YouTube video transcripts
- httpx >=0.27.0 - Async HTTP client for external API calls

**Infrastructure:**
- pydantic 2.9.0 - Data validation framework
- pydantic-settings 2.5.0 - Environment configuration management
- react-dom 19.2.4 - React DOM rendering library

## Configuration

**Environment:**
- Loaded via `.env` file (see backend/config.py)
- Settings managed with Pydantic BaseSettings (`backend/config.py`)
- Environment variables: ANTHROPIC_API_KEY, DATABASE_PATH, TELEGRAM_BOT_TOKEN, TELEGRAM_GROUP_ID, TELEGRAM_TOPIC_ID, BASE_URL

**Build:**
- Frontend: Vite config at `frontend/vite.config.ts` (React plugin, dev server on port 5173, proxy to backend)
- Backend: No explicit build config; runs directly via uvicorn
- Docker: Multi-stage build in `Dockerfile` — frontend build stage outputs to `/app/frontend/dist`

## Platform Requirements

**Development:**
- Python 3.11+
- Node.js 20+
- Virtual environment via `python3 -m venv venv`

**Production:**
- Docker (containerized via Dockerfile)
- Single container running Python 3.11-slim
- Uvicorn server on port 8000
- SQLite database accessible at mount path `/app/data/bingo.db`

## Database

**Type:** SQLite 3.x
**Location:** `bingo.db` (configurable via `DATABASE_PATH` env var)
- Database: Default location `bingo.db` in project root
- Async driver: aiosqlite 0.20.0
- WAL mode enabled: `PRAGMA journal_mode=WAL`
- Foreign keys enabled: `PRAGMA foreign_keys=ON`

**Schema** (auto-initialized in `backend/database.py`):
- `games` - Game records with status (lobby, active, finished)
- `moments` - Bingo card moments per game
- `players` - Players joined in each game
- `card_squares` - Individual card squares with marked state

## Entry Points

**Backend:**
- `backend/main.py` - FastAPI app initialization and route mounting

**Frontend:**
- `frontend/src/main.tsx` - React app entry point
- `frontend/index.html` - HTML root with root div and script tag

**Development:**
- `run.sh` - Bash script that starts both backend (uvicorn on 8000) and frontend (Vite dev server on 5173)

**Production:**
- `Dockerfile` - Multi-stage: builds frontend, copies to Python runtime, serves both via FastAPI

---

*Stack analysis: 2026-05-04*
