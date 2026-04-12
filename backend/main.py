from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.database import init_db
from backend.routers import games, moments, cards, websocket, youtube


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="TV Series Bingo", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(games.router)
app.include_router(moments.router)
app.include_router(cards.router)
app.include_router(websocket.router)
app.include_router(youtube.router)

# Serve frontend static files in production with SPA fallback
dist_path = Path(__file__).parent.parent / "frontend" / "dist"
if dist_path.exists():
    assets_path = dist_path / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

    @app.get("/{path:path}")
    async def spa_fallback(path: str):
        # Serve static file if it exists (favicon, manifest, etc.)
        file = dist_path / path
        if file.is_file() and ".." not in path:
            return FileResponse(str(file))
        # SPA fallback: serve index.html for all frontend routes
        return FileResponse(str(dist_path / "index.html"))
