from fastapi import APIRouter, HTTPException

from backend.services import moment_generator, youtube_service, game_service
from backend.models import GameCreate

router = APIRouter(prefix="/api/games", tags=["moments"])


@router.post("/{game_id}/generate-moments")
async def generate_moments(game_id: str, body: GameCreate):
    # Check if moments already exist
    existing = await moment_generator.get_moments(game_id)
    if existing:
        return existing

    try:
        if body.source_type == "youtube" and body.video_urls:
            transcripts = youtube_service.fetch_transcripts(body.video_urls)
            if not transcripts:
                await game_service.delete_game(game_id)
                raise HTTPException(status_code=400, detail="Could not fetch any transcripts from the provided URLs")
            moments = await moment_generator.generate_moments_from_transcripts(
                game_id, body.source_name, transcripts
            )
        else:
            moments = await moment_generator.generate_moments_for_show(game_id, body.source_name)
    except HTTPException:
        raise
    except Exception as e:
        # Clean up the orphaned game if AI generation fails
        await game_service.delete_game(game_id)
        raise HTTPException(status_code=500, detail=f"Failed to generate moments: {str(e)[:200]}")

    return moments


@router.get("/{game_id}/moments")
async def get_moments(game_id: str):
    return await moment_generator.get_moments(game_id)
