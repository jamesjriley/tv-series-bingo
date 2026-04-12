import { useEffect, useState } from "react";
import { listGames } from "../api";
import type { Game } from "../types/game";

interface Props {
  onCreateGame: () => void;
  onSelectGame: (game: Game) => void;
}

export default function Home({ onCreateGame, onSelectGame }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listGames()
      .then(setGames)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeGames = games.filter((g) => g.status !== "finished");
  const finishedGames = games.filter((g) => g.status === "finished");

  return (
    <div className="page">
      <div className="text-center mb-4">
        <h1>TV Bingo</h1>
        <p className="text-secondary">
          Pick a show. Get a card. Watch together.
        </p>
      </div>

      <button className="btn-primary btn-large" style={{ width: "100%" }} onClick={onCreateGame}>
        New Game
      </button>

      {loading && <div className="spinner" />}

      {activeGames.length > 0 && (
        <div className="mt-6">
          <h2>Games In Play</h2>
          <div className="gap-3">
            {activeGames.map((game) => (
              <GameCard key={game.id} game={game} onClick={() => onSelectGame(game)} />
            ))}
          </div>
        </div>
      )}

      {finishedGames.length > 0 && (
        <div className="mt-6">
          <h2>Finished</h2>
          <div className="gap-3">
            {finishedGames.map((game) => (
              <GameCard key={game.id} game={game} onClick={() => onSelectGame(game)} />
            ))}
          </div>
        </div>
      )}

      {!loading && games.length === 0 && (
        <p className="text-secondary text-center mt-6">
          No games yet. Create one to get started!
        </p>
      )}
    </div>
  );
}

function GameCard({ game, onClick }: { game: Game; onClick: () => void }) {
  const statusLabel =
    game.status === "lobby"
      ? "Waiting"
      : game.status === "active"
        ? "Playing"
        : "Finished";

  const statusColor =
    game.status === "lobby"
      ? "var(--accent)"
      : game.status === "active"
        ? "var(--success)"
        : "var(--text-secondary)";

  return (
    <button
      className="card"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "16px 20px",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
          {game.source_name}
        </div>
        <div className="text-secondary" style={{ fontSize: "0.85rem" }}>
          {game.source_type === "youtube" ? "YouTube" : "TV Show"} &middot;{" "}
          {game.player_count} player{game.player_count !== 1 ? "s" : ""}
          {game.winner && ` \u00b7 Won by ${game.winner.name}`}
        </div>
      </div>
      <span
        style={{
          color: statusColor,
          fontWeight: 600,
          fontSize: "0.85rem",
          whiteSpace: "nowrap",
        }}
      >
        {statusLabel}
      </span>
    </button>
  );
}
