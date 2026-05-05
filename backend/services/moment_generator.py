import asyncio
import json
import logging
import re
import uuid

import httpx

from backend.config import settings
from backend.database import get_db

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
TRANSIENT_STATUS = {408, 429, 500, 502, 503, 504}
TRANSIENT_EXC = (httpx.TimeoutException, httpx.ConnectError, httpx.RemoteProtocolError)

SYSTEM_PROMPT = """You generate bingo moments for a TV show or YouTube channel viewing game.
Players watch together and mark off moments as they happen. Generate entertaining,
recognisable moments that would work well on a bingo card.

Each moment should be:
- A short phrase (under 10 words)
- Something observable while watching
- Specific enough to be recognisable, general enough to recur

Return a JSON object with a "moments" array. Each moment has:
- "text": short description of the moment
- "likelihood": integer 1-100 (100 = happens almost every episode, 1 = very rare)
- "category": one of "catchphrase", "visual", "plot", "character", "meta"

Generate a good spread: roughly 10 easy (70-100), 20 medium (35-69), and 15 hard (1-34).
Total: 45 moments."""

YOUTUBE_PROMPT = """You generate bingo moments for a YouTube channel viewing game.
Based on the video transcripts provided below, identify recurring themes, catchphrases,
visual patterns, running jokes, and typical content beats that happen across videos.

Generate moments that fans of this channel would recognise and find entertaining.

Each moment should be:
- A short phrase (under 10 words)
- Something observable while watching
- Specific to this creator's style and content

Return a JSON object with a "moments" array. Each moment has:
- "text": short description of the moment
- "likelihood": integer 1-100 (100 = happens almost every video, 1 = very rare)
- "category": one of "catchphrase", "visual", "plot", "character", "meta"

Generate a good spread: roughly 10 easy (70-100), 20 medium (35-69), and 15 hard (1-34).
Total: 45 moments.

TRANSCRIPTS:
{transcripts}"""

MOMENT_SCHEMA = {
    "type": "object",
    "properties": {
        "moments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "likelihood": {"type": "integer"},
                    "category": {
                        "type": "string",
                        "enum": ["catchphrase", "visual", "plot", "character", "meta"],
                    },
                },
                "required": ["text", "likelihood", "category"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["moments"],
    "additionalProperties": False,
}


def _parse_json(text: str) -> dict:
    """Extract JSON from a response that may include markdown code fences."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        return json.loads(text[start:end])
    raise ValueError(f"Could not parse JSON from response: {text[:200]}")


def _sanitize_input(text: str) -> str:
    """Strip control characters and limit length for AI prompt inputs."""
    # Remove control characters except newlines
    text = re.sub(r"[\x00-\x09\x0b-\x1f\x7f]", "", text)
    return text[:200].strip()


async def _call_openrouter(messages: list[dict], *, max_tokens: int = 4096) -> str:
    """POST to OpenRouter chat completions with retry-once on transient errors.

    Returns the assistant message content (string). Raises on non-transient errors
    or after retry exhaustion — caller's exception handler converts to HTTP 500.
    """
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://kainga-core.local",
        "X-Title": "TV Series Bingo",
    }
    payload = {
        "model": settings.ai_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }
    timeout = httpx.Timeout(60.0, connect=10.0)

    for attempt in (1, 2):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            if res.status_code in TRANSIENT_STATUS and attempt == 1:
                logger.warning(
                    "OpenRouter transient %s; retrying once (model=%s)",
                    res.status_code, settings.ai_model,
                )
                await asyncio.sleep(0.5)
                continue
            res.raise_for_status()
            return res.json()["choices"][0]["message"]["content"]
        except TRANSIENT_EXC as e:
            if attempt == 1:
                logger.warning(
                    "OpenRouter %s on attempt 1; retrying once",
                    type(e).__name__,
                )
                await asyncio.sleep(0.5)
                continue
            raise
    raise RuntimeError("OpenRouter retry exhausted")  # safety; loop returns or raises first


async def generate_moments_for_show(game_id: str, show_name: str) -> list[dict]:
    show_name = _sanitize_input(show_name)
    text = await _call_openrouter([
        {
            "role": "system",
            "content": SYSTEM_PROMPT + "\n\nRespond ONLY with the JSON object, no other text.",
        },
        {
            "role": "user",
            "content": f"Generate bingo moments for the TV show: {show_name}",
        },
    ])
    result = _parse_json(text)
    return await _store_moments(game_id, result["moments"])


async def generate_moments_from_transcripts(
    game_id: str, source_name: str, transcripts: str
) -> list[dict]:
    if len(transcripts) > 30000:
        transcripts = transcripts[:30000] + "\n\n[Transcripts truncated]"

    prompt = (
        YOUTUBE_PROMPT.format(transcripts=transcripts)
        + "\n\nRespond ONLY with the JSON object, no other text."
    )
    text = await _call_openrouter([{"role": "user", "content": prompt}])
    result = _parse_json(text)
    return await _store_moments(game_id, result["moments"])


async def _store_moments(game_id: str, moments: list[dict]) -> list[dict]:
    db = await get_db()
    try:
        stored = []
        for m in moments:
            moment_id = str(uuid.uuid4())
            await db.execute(
                "INSERT INTO moments (id, game_id, text, likelihood, category) VALUES (?, ?, ?, ?, ?)",
                (moment_id, game_id, m["text"], m["likelihood"], m.get("category")),
            )
            stored.append(
                {
                    "id": moment_id,
                    "text": m["text"],
                    "likelihood": m["likelihood"],
                    "category": m.get("category"),
                }
            )
        await db.commit()
        return stored
    finally:
        await db.close()


async def get_moments(game_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, text, likelihood, category FROM moments WHERE game_id = ?",
            (game_id,),
        )
        return [dict(row) for row in await cursor.fetchall()]
    finally:
        await db.close()
