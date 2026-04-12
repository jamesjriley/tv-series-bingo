import json
import re
import uuid

import anthropic

from backend.config import settings
from backend.database import get_db

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


async def generate_moments_for_show(game_id: str, show_name: str) -> list[dict]:
    show_name = _sanitize_input(show_name)
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT + "\n\nRespond ONLY with the JSON object, no other text.",
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": f"Generate bingo moments for the TV show: {show_name}",
            }
        ],
    )

    result = _parse_json(response.content[0].text)
    return await _store_moments(game_id, result["moments"])


async def generate_moments_from_transcripts(
    game_id: str, source_name: str, transcripts: str
) -> list[dict]:
    # Truncate transcripts to ~30k chars to stay within context
    if len(transcripts) > 30000:
        transcripts = transcripts[:30000] + "\n\n[Transcripts truncated]"

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    prompt = YOUTUBE_PROMPT.format(transcripts=transcripts) + "\n\nRespond ONLY with the JSON object, no other text."

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
    )

    result = _parse_json(response.content[0].text)
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
