# Coding Conventions

**Analysis Date:** 2026-05-04

## Naming Patterns

### Files

**Frontend (.tsx/.ts):**
- Pages: PascalCase, e.g., `Home.tsx`, `GameBoard.tsx`
- Hooks: camelCase prefixed with `use`, e.g., `useWebSocket.ts`
- Utilities/API: camelCase, e.g., `api.ts`
- Type files: camelCase, e.g., `game.ts`
- Styles: kebab-case, e.g., `bingo-card.css`, `global.css`

**Backend (.py):**
- Modules: snake_case, e.g., `game_service.py`, `card_builder.py`, `moment_generator.py`
- Packages: snake_case directories, e.g., `routers/`, `services/`

### Functions and Variables

**Frontend:**
- Functions (including React components): PascalCase for components, camelCase for utilities
  - `function App() { ... }` (component)
  - `export async function getGame() { ... }` (utility)
  - `const handleJoin = async () => { ... }` (event handler - camelCase)
  - `const navigate = useCallback(...)` (state setter - camelCase)
- React hooks: camelCase with `use` prefix, e.g., `const [game, setGame] = useState()`
- Event handlers: `handle{Action}`, e.g., `handleJoin`, `handleStart`, `handleSelectGame`
- Callbacks: descriptive camelCase, e.g., `onJoined`, `onMessage`, `onBack`
- Constants: UPPER_SNAKE_CASE, e.g., `STORAGE_KEY`, `FREE_POSITION`, `GRID_SIZE`, `BASE`

**Backend:**
- Functions: snake_case, e.g., `async def list_games()`, `async def build_card()`
- Classes: PascalCase, e.g., `class ConnectionManager`, `class Settings`
- Constants: UPPER_SNAKE_CASE, e.g., `SCHEMA`, `GRID_SIZE`, `FREE_POSITION`, `EASY_COUNT`
- Private functions: `_snake_case`, e.g., `def _bucket_moments()`, `def _pick_moments()`

### Types and Interfaces

**Frontend:**
- Interfaces: PascalCase, e.g., `interface Session`, `interface Props`, `interface Game`
- Type aliases: PascalCase, e.g., `type Page = "home" | "create" | "lobby" | "play"`
- Generic types from TypeScript: preserved as imported, e.g., `Record<string, unknown>`

**Backend:**
- Pydantic models: PascalCase, e.g., `class GameCreate(BaseModel)`, `class PlayerJoin(BaseModel)`
- Type hints: `list[dict]`, `dict | None`, modern Python 3.10+ union syntax

## Code Style

### Formatting

**Frontend:**
- Tool: Not explicitly configured, but code follows standard JavaScript conventions
- Indentation: 2 spaces
- Semicolons: Present in code
- String quotes: Double quotes for JSX, either for strings

**Backend:**
- Indentation: 4 spaces (Python standard)
- Line length: No explicit limit observed, but reasonable (~100 chars)
- String quotes: Single or double, consistent within files

### Linting

**Frontend:**
- Tool: ESLint (eslint@^9.39.4)
- Config: `frontend/eslint.config.js`
- Rules include:
  - `@eslint/js` - Recommended JS rules
  - `typescript-eslint` - Recommended TS rules
  - `react-hooks/recommended` - React hooks best practices
  - `react-refresh/vite` - Fast refresh plugin support
- Run: `npm run lint`
- Build also runs TypeScript check: `tsc -b && vite build`

**Backend:**
- No explicit linter configured (no .pylintrc, setup.cfg, or pyproject.toml)
- Code follows PEP 8 conventions implicitly

### TypeScript Configuration

- Target: ES2023
- Module: ESNext
- Module resolution: bundler
- Strict mode: Enabled (`noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`)
- JSX: react-jsx
- Config files: `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`

## Import Organization

### Frontend

**Order of imports (observed pattern):**
1. React/external libraries: `import { useState, useEffect } from "react"`
2. Internal functions/APIs: `import { getGame } from "../api"`
3. Internal components: `import Home from "./pages/Home"`
4. Type imports: `import type { Game, Player } from "../types/game"`
5. Style imports: `import "./styles/global.css"`

**Path aliases:**
- No path aliases configured (uses relative paths throughout)
- Relative paths like `"../api"`, `"../pages/Home"`, `"../types/game"`

### Backend

**Import order (observed pattern):**
1. Standard library: `import json`, `import uuid`, `from datetime import ...`
2. Third-party: `import aiosqlite`, `from fastapi import ...`, `from pydantic import ...`
3. Internal modules: `from backend.database import ...`, `from backend.services import ...`

## Error Handling

### Frontend

**Pattern: Try-catch with error state:**
```typescript
try {
  const player = await joinGame(gameId, joinName.trim());
  onJoined(player);
} catch (err) {
  setError(err instanceof Error ? err.message : "Failed to join game");
}
```

**Promise-based with catch:**
```typescript
getGame(gameId)
  .then(setGame)
  .catch(console.error)
```

**Silent error handling (malformed data):**
```typescript
try {
  const msg = JSON.parse(event.data) as WSMessage;
  onMessage(msg);
} catch {
  // ignore malformed messages
}
```

**User-facing errors:**
- Set error state on form submission: `setError("message")`
- Display in UI or show fallback messaging
- Validation errors bubbled from API responses: `.json().catch(() => ({ detail: res.statusText }))`

### Backend

**Pattern: HTTPException with status codes:**
```python
if not game:
    raise HTTPException(status_code=404, detail="Game not found")
if not any(p["id"] == player_id for p in game["players"]):
    raise HTTPException(status_code=404, detail="Player not found in this game")
```

**WebSocket errors (silent/ignored):**
```python
try:
    await ws.send_json(message)
except Exception:
    dead.append(pid)  # Mark connection as dead, remove later
```

**Message validation (silent rejection):**
```python
if not isinstance(msg, dict) or "type" not in msg:
    continue  # skip invalid messages
```

## Logging

### Frontend

**Framework:** `console` (browser console)

**Patterns:**
- `console.error(err)` - Used for error logging in exception handlers
- Limited logging overall; mostly silent failures with state-based feedback

### Backend

**Framework:** No explicit logging framework configured

**Patterns:**
- No structured logging observed
- Error handling via FastAPI exceptions (which log automatically)
- Silent rejection of malformed WebSocket messages

## Comments

### When to Comment

**Frontend:**
- JSDoc-style comments for public functions/components (not consistently used)
- Inline comments for complex logic or non-obvious decisions:
  - `/** Parse the current URL into page + gameId */` (function doc)
  - `// Handle browser back/forward` (section header)
  - `// Restore player from session if navigating to a game page` (condition explanation)
- Comments on conditional blocks explain WHY, not WHAT

**Backend:**
- Module-level comments for constants:
  - `# 5x5 grid, position 12 is the free centre square`
  - `# Distribution: 8 easy, 9 medium, 7 hard = 24 + 1 free = 25`
- Inline comments for non-obvious logic
- SQL schema stored as module-level constant with comments

### JSDoc/TSDoc

- Not consistently used
- When present, functions have simple doc comments:
  - `/** Parse the current URL into page + gameId */`
  - `/** Navigate to a page, updating URL and state */`
- No parameter or return type documentation observed in JSDoc format

## Function Design

### Size

**Frontend:**
- Average function: 5-30 lines
- Complex hooks: up to 60-80 lines (e.g., `useWebSocket`)
- Component functions: 50-200 lines (e.g., `GameBoard`)
- Keep functions focused on single responsibility

**Backend:**
- Service functions: 10-40 lines
- Database query functions: 15-50 lines
- WebSocket handlers: 10-50 lines per message type

### Parameters

**Frontend:**
- Props: grouped in interface, e.g., `interface Props { gameId: string; player: Player; ... }`
- Callbacks: named explicitly, e.g., `onJoined: (player: Player) => void`
- Use destructuring in function signatures: `({ gameId, player, onBack }: Props) => { ... }`

**Backend:**
- Path parameters: individual arguments, e.g., `async def get_game(game_id: str)`
- Request bodies: Pydantic models, e.g., `body: GameCreate`
- Function calls pass positional args followed by keyword args

### Return Values

**Frontend:**
- Explicit return types in TypeScript signatures
- Promise-based: `Promise<Game>`, `Promise<Card>`
- Void for state setters and handlers
- Union types for optional: `Session | null`

**Backend:**
- Async functions return typed: `async def list_games() -> list[dict]`
- HTTPException for errors (returns in route handlers)
- Nullable returns: `dict | None`
- Service functions return dictionaries or lists of dictionaries

## Module Design

### Exports

**Frontend:**
- Named exports for utilities: `export async function getGame()`
- Default export for page components: `export default function Lobby()`
- Type-only imports: `import type { Game, Player } from "..."`
- Explicit API barrel file: `frontend/src/api.ts` exports all API functions

**Backend:**
- Router files: `router = APIRouter(...)` with decorators `@router.get`, `@router.post`
- Service modules: functions with `async def`, no class-based service pattern
- Models defined in single file: `backend/models.py`
- Routers included in main.py: `app.include_router(games.router)`

### Barrel Files

**Frontend:**
- Not used (imports go directly to source files)

**Backend:**
- Not used (direct imports preferred)

## Async/Await

**Frontend:**
- Promises with `.then().catch()` patterns
- Async/await in event handlers
- useCallback hooks wrap async logic
- useEffect cleanup functions

**Backend:**
- All I/O functions are async: `async def`, `await db.execute()`, `await ws.send_json()`
- FastAPI route handlers are async
- Service functions are async

---

*Convention analysis: 2026-05-04*
