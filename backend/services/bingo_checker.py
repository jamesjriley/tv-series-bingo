from backend.database import get_db

WINNING_LINES = [
    # Rows
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24],
    # Columns
    [0, 5, 10, 15, 20],
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
    # Diagonals
    [0, 6, 12, 18, 24],
    [4, 8, 12, 16, 20],
]


async def check_bingo(player_id: str) -> list[int] | None:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT position FROM card_squares WHERE player_id = ? AND marked = 1",
            (player_id,),
        )
        marked = {row["position"] for row in await cursor.fetchall()}

        for line in WINNING_LINES:
            if all(pos in marked for pos in line):
                return line

        return None
    finally:
        await db.close()


async def get_player_progress(game_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT p.id, p.name,
                      COUNT(CASE WHEN cs.marked = 1 AND cs.is_free = 0 THEN 1 END) as marked_count
               FROM players p
               LEFT JOIN card_squares cs ON cs.player_id = p.id
               WHERE p.game_id = ?
               GROUP BY p.id""",
            (game_id,),
        )
        return [dict(row) for row in await cursor.fetchall()]
    finally:
        await db.close()
