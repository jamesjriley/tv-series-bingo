import type { Game, Card, Player, Moment, PlayerProgress, Stats } from "./types/game";

const BASE = "/api";

async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export async function listGames(): Promise<Game[]> {
  return fetchJSON(`${BASE}/games`);
}

export async function getGame(gameId: string): Promise<Game> {
  return fetchJSON(`${BASE}/games/${gameId}`);
}

export async function createGame(
  sourceType: string,
  sourceName: string,
  videoUrls: string[] = []
): Promise<Game> {
  return fetchJSON(`${BASE}/games`, {
    method: "POST",
    body: JSON.stringify({
      source_type: sourceType,
      source_name: sourceName,
      video_urls: videoUrls,
    }),
  });
}

export async function joinGame(
  gameId: string,
  name: string
): Promise<Player> {
  return fetchJSON(`${BASE}/games/${gameId}/join`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function startGame(gameId: string): Promise<void> {
  await fetchJSON(`${BASE}/games/${gameId}/start`, { method: "POST" });
}

export async function generateMoments(
  gameId: string,
  sourceType: string,
  sourceName: string,
  videoUrls: string[] = []
): Promise<Moment[]> {
  return fetchJSON(`${BASE}/games/${gameId}/generate-moments`, {
    method: "POST",
    body: JSON.stringify({
      source_type: sourceType,
      source_name: sourceName,
      video_urls: videoUrls,
    }),
  });
}

export async function getMoments(gameId: string): Promise<Moment[]> {
  return fetchJSON(`${BASE}/games/${gameId}/moments`);
}

export async function createCard(
  gameId: string,
  playerId: string
): Promise<Card> {
  return fetchJSON(`${BASE}/games/${gameId}/players/${playerId}/card`, {
    method: "POST",
  });
}

export async function getCard(
  gameId: string,
  playerId: string
): Promise<Card> {
  return fetchJSON(`${BASE}/games/${gameId}/players/${playerId}/card`);
}

export async function getProgress(
  gameId: string
): Promise<PlayerProgress[]> {
  return fetchJSON(`${BASE}/games/${gameId}/progress`);
}

export async function getStats(): Promise<Stats> {
  return fetchJSON(`${BASE}/games/stats`);
}
