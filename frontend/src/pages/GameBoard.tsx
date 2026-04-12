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
  const [error, setError] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<{ player_name: string; moment_text: string; marked: boolean; time: string }[]>([]);

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
          if (!card.squares || card.squares.length === 0) {
            card = await createCard(gameId, player.id);
          }
        } catch {
          card = await createCard(gameId, player.id);
        }
        setSquares(card.squares);

        if (g.winner_player_id) {
          setWinner({ player_id: g.winner_player_id, winning_line: [] });
        }
      } catch (err) {
        console.error(err);
        setError("Couldn't load your bingo card. Try going back and rejoining the game.");
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
        const data = msg.data as {
          player_id: string;
          player_name: string;
          square_id: string;
          marked: boolean;
          moment_text: string;
        };
        // Update our own card if it's our square
        if (data.player_id === player.id) {
          setSquares((prev) =>
            prev.map((sq) =>
              sq.id === data.square_id ? { ...sq, marked: data.marked } : sq
            )
          );
        }
        // Add to activity log
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setActivityLog((prev) => [
          { player_name: data.player_name, moment_text: data.moment_text, marked: data.marked, time },
          ...prev.slice(0, 19),
        ]);
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

  if (error || squares.length === 0) {
    return (
      <div className="page text-center">
        <p style={{ color: "var(--danger)", fontWeight: 600, marginBottom: 16 }}>
          {error || "No card found. Try rejoining the game."}
        </p>
        <button className="btn-secondary" onClick={onBack}>
          &larr; Back to Home
        </button>
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
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "1.2rem" }}>
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
            background: isWinner ? "var(--success)" : "var(--sage-700)",
            color: "var(--sage-50)",
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

      {/* Activity feed */}
      {activityLog.length > 0 && (
        <div className="mt-6">
          <h2>[[ Activity ]]</h2>
          <div
            style={{
              maxHeight: 200,
              overflowY: "auto",
              borderRadius: "var(--radius)",
              border: "1px solid var(--sage-200)",
              background: "var(--surface)",
            }}
          >
            {activityLog.map((entry, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  borderBottom: i < activityLog.length - 1 ? "1px solid var(--sage-100)" : "none",
                  fontSize: "0.85rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div>
                  <strong style={{ color: "var(--sage-800)" }}>{entry.player_name}</strong>{" "}
                  <span style={{ color: entry.marked ? "var(--success)" : "var(--danger)" }}>
                    {entry.marked ? "marked" : "unmarked"}
                  </span>{" "}
                  <span style={{ color: "var(--sage-700)" }}>{entry.moment_text}</span>
                </div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "0.7rem",
                    color: "var(--sage-400)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                            : "var(--sage-600)",
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
