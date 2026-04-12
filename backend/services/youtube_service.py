import re

from youtube_transcript_api import YouTubeTranscriptApi


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

    for url in video_urls:
        video_id = extract_video_id(url)
        if not video_id:
            continue

        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            text = " ".join(entry["text"] for entry in transcript)
            all_text.append(f"--- Video {video_id} ---\n{text}")
        except Exception:
            # Skip videos without available transcripts
            continue

    return "\n\n".join(all_text)
