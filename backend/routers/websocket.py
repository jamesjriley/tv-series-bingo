import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services import card_builder, bingo_checker, game_service

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # game_id -> {player_id -> websocket}
        self.active: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, game_id: str, player_id: str, ws: WebSocket):
        await ws.accept()
        if game_id not in self.active:
            self.active[game_id] = {}
        self.active[game_id][player_id] = ws

    def disconnect(self, game_id: str, player_id: str):
        if game_id in self.active:
            self.active[game_id].pop(player_id, None)
            if not self.active[game_id]:
                del self.active[game_id]

    async def broadcast(self, game_id: str, message: dict):
        if game_id not in self.active:
            return
        dead = []
        for pid, ws in self.active[game_id].items():
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(pid)
        for pid in dead:
            self.active[game_id].pop(pid, None)


manager = ConnectionManager()


@router.websocket("/ws/{game_id}/{player_id}")
async def websocket_endpoint(ws: WebSocket, game_id: str, player_id: str):
    await manager.connect(game_id, player_id, ws)

    # Send current progress to the newly connected player
    progress = await bingo_checker.get_player_progress(game_id)
    await ws.send_json({"type": "game_state", "data": {"progress": progress}})

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)

            if msg["type"] == "mark_square":
                square_id = msg.get("square_id") or msg.get("data", {}).get("square_id")
                if not square_id:
                    continue
                result = await card_builder.toggle_square(square_id)
                if not result:
                    continue

                # Broadcast the mark to everyone
                await manager.broadcast(game_id, {
                    "type": "square_toggled",
                    "data": {
                        "player_id": result["player_id"],
                        "square_id": result["id"],
                        "marked": result["marked"],
                    },
                })

                # Check for bingo
                winning_line = await bingo_checker.check_bingo(result["player_id"])
                if winning_line:
                    await game_service.set_winner(game_id, result["player_id"])
                    await manager.broadcast(game_id, {
                        "type": "bingo",
                        "data": {
                            "winner_player_id": result["player_id"],
                            "winning_line": winning_line,
                        },
                    })

                # Send updated progress
                progress = await bingo_checker.get_player_progress(game_id)
                await manager.broadcast(game_id, {
                    "type": "progress_update",
                    "data": {"progress": progress},
                })

            elif msg["type"] == "ping":
                await ws.send_json({"type": "pong", "data": {}})

    except WebSocketDisconnect:
        manager.disconnect(game_id, player_id)
