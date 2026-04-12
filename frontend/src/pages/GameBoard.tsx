import { useState, useEffect, useCallback } from "react";
import { createCard, getCard, getGame } from "../api";
import { useWebSocket } from "../hooks/useWebSocket";
import type { Game, Player, CardSquare, WSMessage, PlayerProgress } from "../types/game";
import "../styles/bingo-card.css";

interface Props {
  gameId: string;
  player: Player;
  onBack: () => void;
}

export default function GameBoard({ gameId, player, onBack }: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const [squares, setSquares] = useState<CardSquare[]>([]);
  const [progress, setProgress] = useState<PlayerProgress[]>([]);
  const [winner, setWinner] = useState<{ player_id: string; winning_line: number[] } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load game info and card
  useEffect(() => {
    const load = async () => {
      try {
        const g = await getGame(gameId);
        setGame(g);

        // Try to get existing card, or create one
        let card;
        try {
          card = await getCard(gameId, player.id);
        } catch {
          card = await createCard(gameId, player.id);
        }
        setSquares(card.squares);

        if (g.winner_player_id) {
          setWinner({ player_id: g.winner_player_id, winning_line: [] });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [gameId, player.id]);

  // Handle WebSocket messages
  const handleWS = useCallback(
    (msg: WSMessage) => {
      if (msg.type === "square_toggled") {
        const data = msg.data as { player_id: string; square_id: string; marked: boolean };
        // Update our own card if it's our square
        if (data.player_id === player.id) {
          setSquares((prev) =>
            prev.map((sq) =>
              sq.id === data.square_id ? { ...sq, marked: data.marked } : sq
            )
          );
        }
      } else if (msg.type === "progress_update") {
        const data = msg.data as { progress: PlayerProgress[] };
        setProgress(data.progress);
      } else if (msg.type === "game_state") {
        const data = msg.data as { progress: PlayerProgress[] };
        setProgress(data.progress);
      } else if (msg.type === "bingo") {
        const data = msg.data as { winner_player_id: string; winning_line: number[] };
        setWinner(data);
      }
    },
    [player.id]
  );

  const { send, connected } = useWebSocket(gameId, player.id, handleWS);

  const handleSquareClick = (sq: CardSquare) => {
    if (sq.is_free || winner) return;

    // Optimistic update
    setSquares((prev) =>
      prev.map((s) =>
        s.id === sq.id ? { ...s, marked: !s.marked } : s
      )
    );

    send({ type: "mark_square", data: { square_id: sq.id } });
  };

  const winnerName = winner
    ? progress.find((p) => p.id === winner.player_id)?.name ||
      game?.players.find((p) => p.id === winner.player_id)?.name ||
      "Someone"
    : null;

  const isWinner = winner?.player_id === player.id;

  if (loading) {
    return (
      <div className="page text-center">
        <div className="spinner" />
        <p className="text-secondary">Loading your card...</p>
      </div>
    );
  }

  const getDifficultyClass = (sq: CardSquare) => {
    if (sq.is_free) return "free";
    if (sq.marked) return "marked";
    if (!sq.likelihood) return "medium";
    if (sq.likelihood >= 70) return "easy";
    if (sq.likelihood >= 35) return "medium";
    return "hard";
  };

  return (
    <div className="page">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <button className="btn-secondary" onClick={onBack} style={{ padding: "8px 14px", fontSize: "0.85rem" }}>
          &larr; Back
        </button>
        <div className="text-center" style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
            {game?.source_name}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: connected ? "var(--success)" : "var(--danger)",
              fontWeight: 600,
            }}
          >
            {connected ? "Connected" : "Reconnecting..."}
          </div>
        </div>
        <div style={{ width: 70 }} />
      </div>

      {/* Winner banner */}
      {winner && (
        <div
          className="card text-center mb-4"
          style={{
            background: isWinner ? "var(--success)" : "var(--accent)",
            color: "white",
            padding: "16px",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", margin: 0 }}>
            {isWinner ? "You got BINGO!" : `${winnerName} got BINGO!`}
          </h2>
        </div>
      )}

      {/* Bingo header */}
      <div className="bingo-header">
        {"BINGO".split("").map((letter, i) => (
          <span key={i}>{letter}</span>
        ))}
      </div>

      {/* Bingo grid */}
      <div className="bingo-grid">
        {squares.map((sq) => (
          <div
            key={sq.id}
            className={`bingo-square ${getDifficultyClass(sq)} ${
              sq.marked ? "marked" : ""
            } ${
              winner?.winning_line?.includes(sq.position) ? "winning" : ""
            }`}
            onClick={() => handleSquareClick(sq)}
          >
            {sq.moment_text || "FREE"}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          marginTop: 12,
          fontSize: "0.75rem",
          color: "var(--text-secondary)",
        }}
      >
        <span>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "var(--easy)", marginRight: 4, verticalAlign: "middle" }} />
          Easy
        </span>
        <span>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "var(--medium)", marginRight: 4, verticalAlign: "middle" }} />
          Medium
        </span>
        <span>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "var(--hard)", marginRight: 4, verticalAlign: "middle" }} />
          Hard
        </span>
      </div>

      {/* Player progress */}
      {progress.length > 0 && (
        <div className="mt-6">
          <h2>Scoreboard</h2>
          <div className="progress-list">
            {progress
              .sort((a, b) => b.marked_count - a.marked_count)
              .map((p) => (
                <div key={p.id} className="progress-item">
                  <span className="progress-name">
                    {p.name}
                    {p.id === player.id ? " (you)" : ""}
                  </span>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${(p.marked_count / 24) * 100}%`,
                        background:
                          winner?.player_id === p.id
                            ? "var(--success)"
                            : "var(--primary)",
                      }}
                    />
                  </div>
                  <span className="progress-count">{p.marked_count}/24</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
