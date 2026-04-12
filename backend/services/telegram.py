import httpx

from backend.config import settings

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"


async def notify_game_started(source_name: str, source_type: str, player_count: int, game_id: str = ""):
    if not settings.telegram_bot_token or not settings.telegram_group_id:
        return

    kind = "YouTube" if source_type == "youtube" else "TV Show"
    text = (
        f"📺 <b>[[ TV Bingo ]]</b>\n\n"
        f"A new game of <b>{source_name}</b> ({kind}) has started!\n"
        f"{player_count} player{'s' if player_count != 1 else ''} in the game."
    )

    payload = {
        "chat_id": settings.telegram_group_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if settings.telegram_topic_id:
        payload["message_thread_id"] = int(settings.telegram_topic_id)

    # Add a tappable button — inline keyboards work across all Telegram clients
    if settings.base_url and game_id:
        link = f"{settings.base_url.rstrip('/')}/game/{game_id}"
        payload["reply_markup"] = {
            "inline_keyboard": [[{"text": "Join the game", "url": link}]]
        }

    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                TELEGRAM_API.format(token=settings.telegram_bot_token),
                json=payload,
                timeout=10,
            )
    except Exception:
        pass  # Don't break game flow if notification fails


async def notify_bingo_winner(source_name: str, winner_name: str):
    if not settings.telegram_bot_token or not settings.telegram_group_id:
        return

    text = (
        f"🎉 <b>[[ BINGO! ]]</b>\n\n"
        f"<b>{winner_name}</b> won the <b>{source_name}</b> game!"
    )

    payload = {
        "chat_id": settings.telegram_group_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if settings.telegram_topic_id:
        payload["message_thread_id"] = int(settings.telegram_topic_id)

    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                TELEGRAM_API.format(token=settings.telegram_bot_token),
                json=payload,
                timeout=10,
            )
    except Exception:
        pass
