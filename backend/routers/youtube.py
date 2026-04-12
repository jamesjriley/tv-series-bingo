from fastapi import APIRouter, HTTPException, Query

from backend.services import youtube_service

router = APIRouter(prefix="/api/youtube", tags=["youtube"])


@router.get("/lookup")
async def lookup(q: str = Query(..., min_length=1, max_length=500)):
    """Resolve a YouTube URL or search for channels by name."""
    q = q.strip()

    try:
        # Video URL → resolve channel + recent videos
        if "youtu.be/" in q or "youtube.com/watch" in q:
            return await youtube_service.lookup_by_video_url(q)

        # Channel URL → resolve channel + recent videos
        if "youtube.com/@" in q or "youtube.com/channel/" in q or "youtube.com/c/" in q:
            return await youtube_service.lookup_by_channel_url(q)

        # Plain text → search for channels
        results = await youtube_service.search_channels(q)
        return {"results": results}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="YouTube lookup failed")
