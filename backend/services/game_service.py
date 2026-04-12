import uuid
from datetime import datetime, timezone

from backend.database import get_db


async def create_game(source_type: str, source_name: str) -> dict:
    game_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO games (id, source_type, source_name, status, created_at) VALUES (?, ?, ?, ?, ?)",
            (game_id, source_type, source_name, "lobby", now),
        )
        await db.commit()
    finally:
        await db.close()

    return {"id": game_id, "source_type": source_type, "source_name": source_name, "status": "lobby", "created_at": now}


async def list_games() -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("""
            SELECT g.id, g.source_type, g.source_name, g.status, g.created_at, g.winner_player_id,
                   COUNT(p.id) as player_count
            FROM games g
            LEFT JOIN players p ON p.game_id = g.id
            GROUP BY g.id
            ORDER BY
                CASE g.status WHEN 'active' THEN 0 WHEN 'lobby' THEN 1 ELSE 2 END,
                g.created_at DESC
        """)
        rows = await cursor.fetchall()

        games = []
        for row in rows:
            game = dict(row)
            # Get players for this game
            pcursor = await db.execute(
                "SELECT id, name FROM players WHERE game_id = ?", (game["id"],)
            )
            players = [dict(p) for p in await pcursor.fetchall()]

            # Get winner info if exists
            winner = None
            if game["winner_player_id"]:
                wcursor = await db.execute(
                    "SELECT id, name FROM players WHERE id = ?", (game["winner_player_id"],)
                )
                w = await wcursor.fetchone()
                if w:
                    winner = dict(w)

            games.append({
                "id": game["id"],
                "source_type": game["source_type"],
                "source_name": game["source_name"],
                "status": game["status"],
                "created_at": game["created_at"],
                "player_count": game["player_count"],
                "players": players,
                "winner": winner,
            })
        return games
    finally:
        await db.close()


async def get_game(game_id: str) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM games WHERE id = ?", (game_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        game = dict(row)

        pcursor = await db.execute(
            "SELECT id, name FROM players WHERE game_id = ?", (game_id,)
        )
        players = [dict(p) for p in await pcursor.fetchall()]

        winner = None
        if game["winner_player_id"]:
            wcursor = await db.execute(
                "SELECT id, name FROM players WHERE id = ?", (game["winner_player_id"],)
            )
            w = await wcursor.fetchone()
            if w:
                winner = dict(w)

        game["players"] = players
        game["player_count"] = len(players)
        game["winner"] = winner
        return game
    finally:
        await db.close()


async def join_game(game_id: str, player_name: str) -> dict | None:
    db = await get_db()
    try:
        # Check game exists
        cursor = await db.execute("SELECT * FROM games WHERE id = ?", (game_id,))
        game = await cursor.fetchone()
        if not game:
            return None

        player_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO players (id, game_id, name, joined_at) VALUES (?, ?, ?, ?)",
            (player_id, game_id, player_name, now),
        )
        await db.commit()
        return {"id": player_id, "name": player_name, "game_id": game_id}
    finally:
        await db.close()


async def start_game(game_id: str) -> bool:
    db = await get_db()
    try:
        await db.execute(
            "UPDATE games SET status = 'active' WHERE id = ? AND status = 'lobby'",
            (game_id,),
        )
        await db.commit()
        return True
    finally:
        await db.close()


async def set_winner(game_id: str, player_id: str):
    db = await get_db()
    try:
        await db.execute(
            "UPDATE games SET status = 'finished', winner_player_id = ? WHERE id = ?",
            (player_id, game_id),
        )
        await db.commit()
    finally:
        await db.close()


async def delete_game(game_id: str):
    """Delete a game and all its related data (moments, players, cards)."""
    db = await get_db()
    try:
        # Delete in dependency order
        await db.execute(
            "DELETE FROM card_squares WHERE player_id IN (SELECT id FROM players WHERE game_id = ?)",
            (game_id,),
        )
        await db.execute("DELETE FROM moments WHERE game_id = ?", (game_id,))
        await db.execute("DELETE FROM players WHERE game_id = ?", (game_id,))
        await db.execute("DELETE FROM games WHERE id = ?", (game_id,))
        await db.commit()
    finally:
        await db.close()
