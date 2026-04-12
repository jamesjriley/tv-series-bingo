from fastapi import APIRouter, HTTPException

from backend.models import GameCreate, PlayerJoin
from backend.services import game_service, telegram

router = APIRouter(prefix="/api/games", tags=["games"])


@router.get("")
async def list_games():
    return await game_service.list_games()


@router.get("/stats")
async def get_stats():
    return await game_service.get_stats()


@router.post("")
async def create_game(body: GameCreate):
    game = await game_service.create_game(body.source_type, body.source_name)
    return game


@router.get("/{game_id}")
async def get_game(game_id: str):
    game = await game_service.get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game


@router.post("/{game_id}/join")
async def join_game(game_id: str, body: PlayerJoin):
    player = await game_service.join_game(game_id, body.name)
    if not player:
        raise HTTPException(status_code=404, detail="Game not found")
    return player


@router.post("/{game_id}/start")
async def start_game(game_id: str):
    await game_service.start_game(game_id)
    game = await game_service.get_game(game_id)
    if game:
        await telegram.notify_game_started(
            game["source_name"], game["source_type"], game["player_count"]
        )
    return {"ok": True}
