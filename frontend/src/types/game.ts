export interface Game {
  id: string;
  source_type: "tv_show" | "youtube";
  source_name: string;
  status: "lobby" | "active" | "finished";
  created_at: string;
  player_count: number;
  players: Player[];
  winner: Player | null;
  winner_player_id?: string | null;
}

export interface Player {
  id: string;
  name: string;
  game_id?: string;
}

export interface Moment {
  id: string;
  text: string;
  likelihood: number;
  category: string | null;
}

export interface CardSquare {
  id: string;
  position: number;
  moment_id: string | null;
  moment_text: string | null;
  likelihood: number | null;
  category: string | null;
  is_free: boolean;
  marked: boolean;
}

export interface Card {
  player_id: string;
  game_id: string;
  squares: CardSquare[];
}

export interface PlayerProgress {
  id: string;
  name: string;
  marked_count: number;
}

export interface WSMessage {
  type: string;
  data: Record<string, unknown>;
}

export interface YouTubeChannel {
  channel_name: string;
  channel_url: string;
  channel_id?: string;
  subscriber_text?: string;
}

export interface Stats {
  total_games: number;
  active_games: number;
  finished_games: number;
  leaderboard: { name: string; wins: number }[];
  players: { name: string; games_played: number; total_marks: number }[];
  recent_finished: { id: string; source_name: string; source_type: string; created_at: string; winner_name: string | null }[];
}
