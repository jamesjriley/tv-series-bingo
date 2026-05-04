# Testing Patterns

**Analysis Date:** 2026-05-04

## Test Framework

**Status:** No tests currently implemented in the project.

### Frontend

**Runner:** Not configured
- No Jest, Vitest, or other test runner configured in package.json
- Dev dependencies include testing-related types (none for runners)
- package.json scripts: `dev`, `build`, `lint`, `preview` — no test script

**Assertion Library:** Not configured

**Run Commands:**
```bash
# No test commands available
# Only available:
npm run dev              # Start dev server
npm run build            # Build for production (with tsc check)
npm run lint             # Run ESLint
npm run preview          # Preview built version
```

### Backend

**Runner:** Not configured
- No pytest, unittest, or other Python test framework installed
- requirements.txt contains: fastapi, uvicorn, aiosqlite, pydantic-settings, anthropic, youtube-transcript-api, requests, python-telegram-bot
- No test runner dependency

**Run Commands:**
```bash
# No test commands available
```

## Test File Organization

**Not applicable** — no test files exist in the project.

**Observation:** No test directories (e.g., `tests/`, `__tests__/`, `spec/`) are present in either `frontend/` or `backend/` directories.

## Manual Testing Notes

**Current approach:** Manual testing only

### Frontend Testing Strategy (Implied)

The application appears to be tested manually via:
- Browser-based play (navigate to different pages, join games, mark cards)
- WebSocket connection testing (joining a game activates WebSocket)
- Session persistence (localStorage saves player session and name)
- Error state handling (API failures trigger error messages)

**Key user flows:**
1. Home → Create Game → Add Moments → Join → Play
2. Join existing lobby via game ID
3. Mark card squares in real-time with WebSocket broadcasts

### Backend Testing Strategy (Implied)

The API is likely tested via:
- Direct HTTP requests (curl, Postman, or client)
- WebSocket connections testing message flow
- Database state verification (sqlite3 CLI or Python)

**Key endpoints:**
- `GET /api/games` — List active games
- `POST /api/games` — Create new game
- `POST /api/games/{game_id}/join` — Join game
- `POST /api/games/{game_id}/start` — Start game
- WebSocket `/ws/{game_id}/{player_id}` — Real-time game updates

## Critical Untested Areas

**Frontend:**
- `frontend/src/App.tsx` — Complex navigation and session restoration logic
  - URL parsing and browser history handling
  - Session validation and player restoration
  - Game state transitions
- `frontend/src/hooks/useWebSocket.ts` — WebSocket reconnection and message queuing
  - Connection failures and recovery
  - Message buffering during disconnects
- `frontend/src/pages/GameBoard.tsx` — Card state and real-time updates
  - Square toggling and marking synchronization
  - Activity log updates
  - Progress tracking across players

**Backend:**
- `backend/services/card_builder.py` — Card generation logic
  - Moment distribution across difficulty buckets
  - Balanced card construction
  - Edge cases (insufficient moments)
- `backend/services/game_service.py` — Game lifecycle management
  - Game creation, player joining, status transitions
  - Player removal and game completion
- `backend/routers/websocket.py` — WebSocket message handling
  - Connection/disconnection handling
  - Message broadcasting
  - State consistency across clients
- `backend/services/bingo_checker.py` — Win detection logic
  - Row, column, diagonal win detection
  - Progress calculation accuracy

## Recommendations for Test Implementation

### Frontend (If testing is added)

**Would use:** Vitest or Jest with React Testing Library

**Test structure:**
```
frontend/src/
├── __tests__/
│   ├── App.test.tsx
│   ├── pages/
│   │   ├── GameBoard.test.tsx
│   │   ├── Lobby.test.tsx
│   │   └── CreateGame.test.tsx
│   ├── hooks/
│   │   └── useWebSocket.test.ts
│   └── api/
│       └── api.test.ts
```

**What to test:**
- Navigation logic (URL parsing, page transitions)
- Session management (loading, saving, restoring)
- Form validation (name input, URL input)
- Error handling and error state display
- WebSocket connection lifecycle
- Async API calls with mocking

### Backend (If testing is added)

**Would use:** pytest with AsyncIO support

**Test structure:**
```
backend/
├── tests/
│   ├── conftest.py          # Shared fixtures
│   ├── test_game_service.py
│   ├── test_card_builder.py
│   ├── test_bingo_checker.py
│   ├── test_models.py       # Pydantic validation
│   └── test_routers/
│       ├── test_games.py
│       ├── test_cards.py
│       ├── test_websocket.py
│       └── test_moments.py
```

**What to test:**
- Pydantic model validation (GameCreate, PlayerJoin)
- Game creation and retrieval
- Player joining and removal
- Card generation algorithm (distribution, randomness)
- Bingo win detection (rows, columns, diagonals, all squares)
- Database transaction handling
- Error responses (404, 400, etc.)
- WebSocket message handling and broadcasting

## Test Coverage Gaps

**Risk: HIGH** — Zero test coverage for core business logic:

**Card generation (`backend/services/card_builder.py`):**
- No verification that moment difficulty distribution is correct (8 easy, 9 medium, 7 hard)
- Free center square placement not verified
- Random shuffling unpredictable; no seeding test
- Edge case: insufficient moments for card generation untested

**Win detection (`backend/services/bingo_checker.py`):**
- Win condition algorithms likely untested
- Horizontal, vertical, diagonal win scenarios not verified
- False positives/negatives possible

**WebSocket stability:**
- Connection failures and reconnects untested
- Message queue behavior during disconnects untested
- Broadcast reliability under load untested

**Session and player state:**
- Player removal mid-game behavior untested
- Session restoration edge cases untested
- Concurrent player actions untested

---

*Testing analysis: 2026-05-04*
