from fastapi import APIRouter, HTTPException

from backend.services import card_builder, bingo_checker

router = APIRouter(prefix="/api/games", tags=["cards"])


@router.post("/{game_id}/players/{player_id}/card")
async def create_card(game_id: str, player_id: str):
    squares = await card_builder.build_card(player_id, game_id)
    if not squares:
        raise HTTPException(status_code=400, detail="Not enough moments generated yet")
    return {"player_id": player_id, "game_id": game_id, "squares": squares}


@router.get("/{game_id}/players/{player_id}/card")
async def get_card(game_id: str, player_id: str):
    squares = await card_builder.get_card(player_id)
    if not squares:
        raise HTTPException(status_code=404, detail="Card not found")
    return {"player_id": player_id, "game_id": game_id, "squares": squares}


@router.get("/{game_id}/progress")
async def get_progress(game_id: str):
    return await bingo_checker.get_player_progress(game_id)
