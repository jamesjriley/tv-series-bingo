# Architecture

**Analysis Date:** 2026-05-04

## Pattern Overview

**Overall:** Full-stack monorepo with separated backend (FastAPI) and frontend (React + Vite), deployed as an integrated SPA with backend API.

**Key Characteristics:**
- Client/server split: REST API + WebSocket for real-time game state
- SPA with URL-based routing and localStorage persistence
- Async Python backend with SQLite database
- WebSocket for game event broadcasting (square marks, bingo detection, progress updates)
- Moments generated via Claude Anthropic API for AI-powered content

## Layers

**API Layer (Backend Routes):**
- Purpose: REST endpoints + WebSocket gateway for client operations
- Location: `backend/routers/`
- Contains: games.py, moments.py, cards.py, websocket.py, youtube.py
- Depends on: services, database, models
- Used by: Frontend via fetch/WebSocket

**Business Logic Layer (Backend Services):**
- Purpose: Core game mechanics, moment generation, card building, bingo checking
- Location: `backend/services/`
- Contains: game_service.py, moment_generator.py, card_builder.py, bingo_checker.py, youtube_service.py, telegram.py
- Depends on: database, external APIs (Claude, YouTube, Telegram)
- Used by: routers

**Data Access Layer (Database):**
- Purpose: SQLite async operations via aiosqlite
- Location: `backend/database.py`
- Contains: Schema definition (games, moments, players, card_squares), connection management
- Depends on: aiosqlite, config
- Used by: services and routers

**Data Models:**
- Purpose: Pydantic validation for request/response contracts
- Location: `backend/models.py`
- Contains: GameCreate, PlayerJoin, GameSummary, CardSquare, CardResponse, etc.
- Depends on: pydantic
- Used by: routers for validation

**Frontend Page Layer:**
- Purpose: User-facing UI components for each game state
- Location: `frontend/src/pages/`
- Contains: Home.tsx, CreateGame.tsx, Lobby.tsx, GameBoard.tsx, Help.tsx
- Depends on: api.ts, hooks, types
- Used by: App.tsx routing logic

**Frontend API Client:**
- Purpose: Centralized fetch wrapper and backend API calls
- Location: `frontend/src/api.ts`
- Contains: REST calls (listGames, getGame, createGame, joinGame, startGame, etc.), YouTube lookup
- Depends on: fetch, types
- Used by: pages and App

**Frontend Hooks:**
- Purpose: Reusable stateful logic
- Location: `frontend/src/hooks/useWebSocket.ts`
- Contains: WebSocket connection manager with auto-reconnect, message queueing
- Depends on: types
- Used by: GameBoard and other pages

**Frontend Types:**
- Purpose: TypeScript interfaces matching backend models
- Location: `frontend/src/types/game.ts`
- Contains: Game, Player, Moment, Card, CardSquare, PlayerProgress, WSMessage, Stats
- Depends on: none (pure types)
- Used by: all pages and hooks

## Data Flow

**Game Creation → Start → Play Lifecycle:**

1. **Home page** → User selects "Create Game" → Calls `createGame(sourceType, sourceName)` → Backend creates game record, returns game ID
2. **CreateGame page** → Generates moments via Claude API → Stores moments in database → Redirects to Lobby
3. **Lobby page** → Player enters name → Calls `joinGame(gameId, name)` → Player added to database → Waits for other players
4. **Start Game** → Organizer calls `startGame(gameId)` → Backend updates game status to "active"
5. **GameBoard** → Creates card for player via `createCard(gameId, playerId)` → Calls `useWebSocket` to connect WebSocket
6. **During Play** → Player marks square → WebSocket message "mark_square" → Backend toggles square, broadcasts to all players → Checks for bingo
7. **Win** → Bingo detected → WebSocket broadcasts "bingo" message → Frontend shows winner
8. **Progress Updates** → Any mark triggers "progress_update" broadcast → All players see updated counts

**WebSocket Message Types:**
- `mark_square`: Player marks a square (frontend → backend)
- `square_toggled`: Square state changed (backend → all players)
- `progress_update`: Mark counts updated (backend → all players)
- `game_state`: Current game state on connect (backend → connecting player)
- `bingo`: Winner detected (backend → all players)
- `ping/pong`: Keep-alive (bidirectional)

**State Management:**

**Frontend (App.tsx):**
- `page`: Current view (home/create/lobby/play) derived from URL
- `selectedGameId`: Current game being viewed
- `currentPlayer`: Authenticated player for that game
- `showHelp`: Modal state
- Persists session to localStorage under "tv-bingo-session"
- Persists player name under "tv-bingo-name"
- URL as source of truth (parseURL, buildURL pattern)

**Backend:**
- All state in SQLite
- WebSocket ConnectionManager tracks active connections per game/player
- No in-memory session state beyond connection tracking

**Frontend-Backend Contract:**
- Frontend sends JSON payloads with snake_case keys (source_type, video_urls, player_id)
- Backend responds with JSON matching Pydantic models
- WebSocket messages use camelCase keys in data payload (square_id, marked, moment_text)

## Key Abstractions

**Game:**
- Purpose: Represents a playable bingo game instance
- Examples: `backend/services/game_service.py` (create_game, get_game, join_game, start_game)
- Pattern: Service functions returning dict | None, database operations encapsulated

**Moment:**
- Purpose: Observable event in TV show/YouTube content that goes on bingo card
- Examples: Generated by Claude API in `backend/services/moment_generator.py`, stored in moments table
- Pattern: Text + likelihood (1-100) + category (catchphrase/visual/plot/character/meta)

**Card/CardSquare:**
- Purpose: 5x5 grid (25 squares) with 24 moments + 1 free centre
- Examples: Built in `backend/services/card_builder.py`, each square tracked in card_squares table
- Pattern: Moments bucketed by likelihood (easy 70-100, medium 35-69, hard <35), randomly distributed

**ConnectionManager:**
- Purpose: Tracks active WebSocket connections per game/player
- Examples: `backend/routers/websocket.py::ConnectionManager`
- Pattern: Dict[game_id -> Dict[player_id -> WebSocket]], broadcast to all connections in game

**useWebSocket Hook:**
- Purpose: Manages WebSocket lifecycle with auto-reconnect and message queueing
- Examples: `frontend/src/hooks/useWebSocket.ts`
- Pattern: Ref-based connection, callback-based message handler, queues messages during disconnect

## Entry Points

**Backend Server:**
- Location: `backend/main.py`
- Triggers: `uvicorn backend.main:app --host 0.0.0.0 --port 8000` (from run.sh)
- Responsibilities:
  - FastAPI app setup with CORS middleware
  - Database initialization via lifespan context manager
  - Router mounting (games, moments, cards, websocket, youtube)
  - Frontend SPA fallback serving (all non-API routes → index.html)

**Frontend Dev Server:**
- Location: `frontend/src/main.tsx` → `frontend/vite.config.ts`
- Triggers: `cd frontend && npx vite --host 0.0.0.0` (from run.sh)
- Responsibilities:
  - Mounts React app at DOM root
  - Vite hot module replacement during development
  - Proxies /api and /ws to backend server

**Frontend App:**
- Location: `frontend/src/App.tsx`
- Triggers: On page load or manual navigation
- Responsibilities:
  - URL parsing (parseURL) to determine current page + gameId
  - Session restoration from localStorage
  - Page routing logic (home → create → lobby → play)
  - Help modal management

## Error Handling

**Strategy:** Async/await with try-catch, HTTP status codes for REST, exception suppression for non-critical WebSocket failures.

**Patterns:**

**Backend:**
- Database operations wrapped in try/finally to ensure connection cleanup
- HTTPException(404) for missing games/players
- Oversized WebSocket messages silently rejected (> 4096 bytes)
- Malformed JSON in WebSocket silently ignored
- Dead WebSocket connections removed from ConnectionManager on broadcast failure

**Frontend:**
- API fetch errors caught, user-facing error messages set to state
- Card load falls back to createCard if getCard fails
- WebSocket reconnection attempts every 2 seconds on disconnect
- Malformed WebSocket messages logged but ignored
- Navigation to non-existent game redirects home

## Cross-Cutting Concerns

**Logging:**
- Backend: No structured logging; uses print/console for startup messages
- Frontend: console.error on critical failures; no logger integrated

**Validation:**
- Backend: Pydantic field validators on all input models (GameCreate, PlayerJoin)
  - source_name: 1-200 chars
  - video_urls: YouTube URL format, max 10 URLs, max 500 chars each
  - name: 1-30 chars, alphanumeric + spaces, hyphens, apostrophes
- Frontend: Client-side validation in forms before API calls

**Authentication:**
- No auth system; game_id + player_id are trust-based tokens
- Player identified by UUID stored in localStorage per game
- Lobby enforces uniqueness: same name in same game returns existing player_id

**Rate Limiting:**
- None implemented; WebSocket messages over 4096 bytes silently dropped

**Notifications:**
- Telegram bot integration for game events:
  - Game started (via `telegram.notify_game_started`)
  - Bingo winner (via `telegram.notify_bingo_winner`)

---

*Architecture analysis: 2026-05-04*
