import json
import re
import xml.etree.ElementTree as ET

import httpx
from youtube_transcript_api import YouTubeTranscriptApi

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
    "Accept-Language": "en-US,en;q=0.9",
}


def extract_video_id(url: str) -> str | None:
    patterns = [
        r"(?:v=|\/v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})",
        r"^([a-zA-Z0-9_-]{11})$",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def fetch_transcripts(video_urls: list[str]) -> str:
    all_text = []
    ytt = YouTubeTranscriptApi()

    for url in video_urls:
        video_id = extract_video_id(url)
        if not video_id:
            continue

        try:
            transcript = ytt.fetch(video_id)
            text = " ".join(snippet.text for snippet in transcript)
            all_text.append(f"--- Video {video_id} ---\n{text}")
        except Exception:
            # Skip videos without available transcripts
            continue

    return "\n\n".join(all_text)


# --- YouTube channel lookup (no API key needed) ---


async def lookup_by_video_url(url: str) -> dict:
    """Resolve a video URL to its channel + recent videos via oEmbed."""
    async with httpx.AsyncClient(headers=_HEADERS, timeout=15, follow_redirects=True) as client:
        res = await client.get(
            "https://www.youtube.com/oembed",
            params={"url": url, "format": "json"},
        )
        if res.status_code != 200:
            return {"channel_name": "", "channel_url": "", "videos": []}

        data = res.json()
        channel_name = data.get("author_name", "")
        channel_url = data.get("author_url", "")

        # Resolve channel URL to get recent videos
        videos = []
        if channel_url:
            channel_id = await _resolve_channel_id(client, channel_url)
            if channel_id:
                videos = await _fetch_rss_videos(client, channel_id)

        return {
            "channel_name": channel_name,
            "channel_url": channel_url,
            "videos": videos,
        }


async def lookup_by_channel_url(url: str) -> dict:
    """Resolve a channel URL to channel info + recent videos."""
    async with httpx.AsyncClient(headers=_HEADERS, timeout=15, follow_redirects=True) as client:
        channel_id = await _resolve_channel_id(client, url)
        channel_name = await _resolve_channel_name(client, url)

        videos = []
        if channel_id:
            videos = await _fetch_rss_videos(client, channel_id)

        return {
            "channel_name": channel_name,
            "channel_url": url,
            "videos": videos,
        }


async def search_channels(query: str) -> list[dict]:
    """Search YouTube for channels by name using ytInitialData scraping."""
    # sp=EgIQAg%3D%3D is the protobuf filter for "Channels" only
    search_url = "https://www.youtube.com/results"
    params = {"search_query": query, "sp": "EgIQAg%3D%3D"}

    async with httpx.AsyncClient(headers=_HEADERS, timeout=15, follow_redirects=True) as client:
        res = await client.get(search_url, params=params)
        if res.status_code != 200:
            return []

        # Extract ytInitialData JSON from the page
        match = re.search(r"var ytInitialData\s*=\s*({.*?});</script>", res.text)
        if not match:
            # Fallback pattern
            match = re.search(r'ytInitialData\s*=\s*\'({.*?})\'', res.text)
        if not match:
            return []

        try:
            yt_data = json.loads(match.group(1))
        except json.JSONDecodeError:
            return []

        return _extract_channel_results(yt_data)


async def _resolve_channel_id(client: httpx.AsyncClient, url: str) -> str | None:
    """Fetch a channel page and extract the channel ID."""
    try:
        res = await client.get(url)
        if res.status_code != 200:
            return None
        text = res.text
        # Try multiple patterns — YouTube varies how it embeds the ID
        for pattern in [
            r'<meta\s+itemprop="channelId"\s+content="(UC[^"]+)"',
            r'"channelId"\s*:\s*"(UC[^"]+)"',
            r'"externalId"\s*:\s*"(UC[^"]+)"',
            r'channel_id=(UC[^"&]+)',
        ]:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return None
    except Exception:
        return None


async def _resolve_channel_name(client: httpx.AsyncClient, url: str) -> str:
    """Fetch a channel page and extract the channel name."""
    try:
        res = await client.get(url)
        if res.status_code != 200:
            return ""
        match = re.search(r'<meta\s+itemprop="name"\s+content="([^"]+)"', res.text)
        if match:
            return match.group(1)
        match = re.search(r'"name"\s*:\s*"([^"]+)"', res.text)
        return match.group(1) if match else ""
    except Exception:
        return ""


async def _fetch_rss_videos(client: httpx.AsyncClient, channel_id: str) -> list[dict]:
    """Fetch recent videos from a channel's RSS feed."""
    try:
        res = await client.get(
            f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
        )
        if res.status_code != 200:
            return []

        # Parse Atom XML — namespace is required
        ns = {"atom": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
        root = ET.fromstring(res.text)
        videos = []
        for entry in root.findall("atom:entry", ns)[:10]:
            video_id_el = entry.find("yt:videoId", ns)
            title_el = entry.find("atom:title", ns)
            if video_id_el is not None and video_id_el.text:
                vid = video_id_el.text
                videos.append({
                    "id": vid,
                    "title": title_el.text if title_el is not None else "",
                    "url": f"https://www.youtube.com/watch?v={vid}",
                })
        return videos
    except Exception:
        return []


def _extract_channel_results(yt_data: dict) -> list[dict]:
    """Walk ytInitialData JSON to extract channel search results."""
    results = []
    try:
        contents = (
            yt_data.get("contents", {})
            .get("twoColumnSearchResultsRenderer", {})
            .get("primaryContents", {})
            .get("sectionListRenderer", {})
            .get("contents", [])
        )

        for section in contents:
            items = (
                section.get("itemSectionRenderer", {})
                .get("contents", [])
            )
            for item in items:
                renderer = item.get("channelRenderer")
                if not renderer:
                    continue

                channel_id = renderer.get("channelId", "")
                title = renderer.get("title", {}).get("simpleText", "")
                subs = renderer.get("subscriberCountText", {}).get("simpleText", "")

                # Get channel URL
                nav = (
                    renderer.get("navigationEndpoint", {})
                    .get("commandMetadata", {})
                    .get("webCommandMetadata", {})
                    .get("url", "")
                )
                channel_url = f"https://www.youtube.com{nav}" if nav else ""

                if title:
                    results.append({
                        "channel_name": title,
                        "channel_url": channel_url,
                        "channel_id": channel_id,
                        "subscriber_text": subs,
                    })

                if len(results) >= 6:
                    break
            if len(results) >= 6:
                break
    except Exception:
        pass

    return results
