from pydantic import BaseModel


class GameCreate(BaseModel):
    source_type: str  # "tv_show" or "youtube"
    source_name: str  # show name or channel/video info
    video_urls: list[str] = []  # for youtube, optional list of video URLs


class PlayerJoin(BaseModel):
    name: str


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
