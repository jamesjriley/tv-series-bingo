import aiosqlite
from backend.config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'lobby',
    created_at TEXT NOT NULL,
    winner_player_id TEXT
);

CREATE TABLE IF NOT EXISTS moments (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    text TEXT NOT NULL,
    likelihood INTEGER NOT NULL,
    category TEXT,
    FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    name TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE IF NOT EXISTS card_squares (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    moment_id TEXT,
    position INTEGER NOT NULL,
    is_free INTEGER NOT NULL DEFAULT 0,
    marked INTEGER NOT NULL DEFAULT 0,
    marked_at TEXT,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (moment_id) REFERENCES moments(id)
);
"""


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(settings.database_path)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    db = await get_db()
    try:
        await db.executescript(SCHEMA)
        await db.commit()
    finally:
        await db.close()
