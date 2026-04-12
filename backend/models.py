import re
from typing import Literal

from pydantic import BaseModel, field_validator


class GameCreate(BaseModel):
    source_type: Literal["tv_show", "youtube"]
    source_name: str
    video_urls: list[str] = []

    @field_validator("source_name")
    @classmethod
    def validate_source_name(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 200:
            raise ValueError("Source name must be 1-200 characters")
        return v

    @field_validator("video_urls")
    @classmethod
    def validate_video_urls(cls, v: list[str]) -> list[str]:
        if len(v) > 10:
            raise ValueError("Maximum 10 video URLs")
        validated = []
        for url in v:
            url = url.strip()
            if not url:
                continue
            if not re.match(r"^https?://(www\.)?(youtube\.com|youtu\.be)/", url):
                raise ValueError(f"Invalid YouTube URL: {url[:100]}")
            if len(url) > 500:
                raise ValueError("URL too long")
            validated.append(url)
        return validated


class PlayerJoin(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 30:
            raise ValueError("Name must be 1-30 characters")
        if not re.match(r"^[\w\s\-'.]+$", v):
            raise ValueError("Name contains invalid characters")
        return v


class GameSummary(BaseModel):
    id: str
    source_type: str
    source_name: str
    status: str
    created_at: str
    player_count: int
    players: list[dict]
    winner: dict | None = None


class MomentResponse(BaseModel):
    id: str
    text: str
    likelihood: int
    category: str | None


class CardSquare(BaseModel):
    id: str
    position: int
    moment_id: str | None
    moment_text: str | None
    likelihood: int | None
    category: str | None
    is_free: bool
    marked: bool


class CardResponse(BaseModel):
    player_id: str
    player_name: str
    game_id: str
    squares: list[CardSquare]


class PlayerResponse(BaseModel):
    id: str
    name: str
    game_id: str
    progress: int = 0  # number of marked squares


class WSMessage(BaseModel):
    type: str
    data: dict = {}
