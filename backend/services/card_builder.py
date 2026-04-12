import random
import uuid

from backend.database import get_db


# 5x5 grid, position 12 is the free centre square
GRID_SIZE = 25
FREE_POSITION = 12

# Distribution: 8 easy, 9 medium, 7 hard = 24 + 1 free = 25
EASY_COUNT = 8
MEDIUM_COUNT = 9
HARD_COUNT = 7


def _bucket_moments(moments: list[dict]) -> tuple[list, list, list]:
    easy = [m for m in moments if m["likelihood"] >= 70]
    medium = [m for m in moments if 35 <= m["likelihood"] < 70]
    hard = [m for m in moments if m["likelihood"] < 35]
    return easy, medium, hard


def _pick_moments(moments: list[dict]) -> list[dict]:
    easy, medium, hard = _bucket_moments(moments)

    # If not enough in a bucket, fill from others
    selected = []
    random.shuffle(easy)
    random.shuffle(medium)
    random.shuffle(hard)

    selected.extend(easy[:EASY_COUNT])
    selected.extend(medium[:MEDIUM_COUNT])
    selected.extend(hard[:HARD_COUNT])

    # If we don't have enough from strict buckets, fill from remaining
    used_ids = {m["id"] for m in selected}
    remaining = [m for m in moments if m["id"] not in used_ids]
    random.shuffle(remaining)

    while len(selected) < 24 and remaining:
        selected.append(remaining.pop())

    random.shuffle(selected)
    return selected[:24]


async def build_card(player_id: str, game_id: str) -> list[dict]:
    db = await get_db()
    try:
        # Check if card already exists
        cursor = await db.execute(
            "SELECT COUNT(*) as cnt FROM card_squares WHERE player_id = ?",
            (player_id,),
        )
        row = await cursor.fetchone()
        if row["cnt"] > 0:
            return await get_card(player_id)

        # Fetch moments for this game
        cursor = await db.execute(
            "SELECT id, text, likelihood, category FROM moments WHERE game_id = ?",
            (game_id,),
        )
        moments = [dict(r) for r in await cursor.fetchall()]

        if len(moments) < 24:
            return []

        selected = _pick_moments(moments)

        squares = []
        moment_idx = 0
        for pos in range(GRID_SIZE):
            sq_id = str(uuid.uuid4())
            if pos == FREE_POSITION:
                await db.execute(
                    "INSERT INTO card_squares (id, player_id, moment_id, position, is_free, marked) VALUES (?, ?, NULL, ?, 1, 1)",
                    (sq_id, player_id, pos),
                )
                squares.append({
                    "id": sq_id,
                    "position": pos,
                    "moment_id": None,
                    "moment_text": "FREE",
                    "likelihood": None,
                    "category": None,
                    "is_free": True,
                    "marked": True,
                })
            else:
                m = selected[moment_idx]
                moment_idx += 1
                await db.execute(
                    "INSERT INTO card_squares (id, player_id, moment_id, position, is_free, marked) VALUES (?, ?, ?, ?, 0, 0)",
                    (sq_id, player_id, m["id"], pos),
                )
                squares.append({
                    "id": sq_id,
                    "position": pos,
                    "moment_id": m["id"],
                    "moment_text": m["text"],
                    "likelihood": m["likelihood"],
                    "category": m["category"],
                    "is_free": False,
                    "marked": False,
                })

        await db.commit()
        return squares
    finally:
        await db.close()


async def get_card(player_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT cs.id, cs.position, cs.moment_id, cs.is_free, cs.marked,
                      m.text as moment_text, m.likelihood, m.category
               FROM card_squares cs
               LEFT JOIN moments m ON m.id = cs.moment_id
               WHERE cs.player_id = ?
               ORDER BY cs.position""",
            (player_id,),
        )
        rows = await cursor.fetchall()
        return [
            {
                "id": row["id"],
                "position": row["position"],
                "moment_id": row["moment_id"],
                "moment_text": row["moment_text"] if row["moment_text"] else "FREE",
                "likelihood": row["likelihood"],
                "category": row["category"],
                "is_free": bool(row["is_free"]),
                "marked": bool(row["marked"]),
            }
            for row in rows
        ]
    finally:
        await db.close()


async def toggle_square(square_id: str) -> dict | None:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM card_squares WHERE id = ?", (square_id,)
        )
        sq = await cursor.fetchone()
        if not sq or sq["is_free"]:
            return None

        new_marked = 0 if sq["marked"] else 1
        await db.execute(
            "UPDATE card_squares SET marked = ? WHERE id = ?",
            (new_marked, square_id),
        )
        await db.commit()
        return {"id": square_id, "marked": bool(new_marked), "player_id": sq["player_id"]}
    finally:
        await db.close()
