import { useState, useEffect } from "react";
import { getGame, joinGame, startGame } from "../api";
import type { Game, Player } from "../types/game";

interface Props {
  gameId: string;
  currentPlayer: Player | null;
  savedName: string;
  onJoined: (player: Player) => void;
  onStart: () => void;
  onBack: () => void;
}

export default function Lobby({
  gameId,
  currentPlayer,
  savedName,
  onJoined,
  onStart,
  onBack,
}: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const [name, setName] = useState(savedName);
  const [editing, setEditing] = useState(!savedName);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = () => getGame(gameId).then(setGame).catch(console.error);
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  const doJoin = async (joinName: string) => {
    if (!joinName.trim()) return;
    setJoining(true);
    setError("");
    try {
      const player = await joinGame(gameId, joinName.trim());
      onJoined(player);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join game");
    } finally {
      setJoining(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    doJoin(name);
  };

  const handleStart = async () => {
    await startGame(gameId);
    onStart();
  };

  if (!game) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: 16 }}>
        &larr; Back
      </button>

      <div className="card text-center">
        <span className="bracket-label">
          {game.source_type === "youtube" ? "YouTube" : "TV Show"}
        </span>
        <h1 style={{ fontSize: "1.5rem", marginTop: 6 }}>{game.source_name}</h1>
        <span
          style={{
            display: "inline-block",
            background:
              game.status === "active" ? "var(--success)" : "var(--sage-500)",
            color: "var(--sage-50)",
            borderRadius: 20,
            padding: "4px 14px",
            fontSize: "0.8rem",
            fontWeight: 600,
            marginTop: 8,
          }}
        >
          {game.status === "lobby" ? "Waiting for players" : "In Progress"}
        </span>
      </div>

      {!currentPlayer && (
        <div className="mt-4 gap-3">
          {error && (
            <p style={{ color: "var(--danger)", fontWeight: 600, fontSize: "0.85rem", margin: 0 }}>
              {error}
            </p>
          )}

          {savedName && !editing ? (
            <>
              <button
                className="btn-primary btn-large"
                disabled={joining}
                style={{ width: "100%" }}
                onClick={() => doJoin(savedName)}
              >
                {joining ? "Joining..." : `Join as ${savedName}`}
              </button>
              <button
                className="btn-secondary"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => setEditing(true)}
              >
                Use a different name
              </button>
            </>
          ) : (
            <form onSubmit={handleJoin} className="gap-3">
              <label style={{ fontWeight: 600 }}>Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={30}
                autoFocus
              />
              <button
                type="submit"
                className="btn-primary btn-large"
                disabled={joining || !name.trim()}
                style={{ width: "100%" }}
              >
                {joining ? "Joining..." : "Join Game"}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="mt-4">
        <h2>Players ({game.players.length})</h2>
        {game.players.length === 0 && (
          <p className="text-secondary">No one has joined yet.</p>
        )}
        <div className="gap-3 mt-4">
          {game.players.map((p) => (
            <div
              key={p.id}
              className="card"
              style={{
                padding: "12px 16px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--sage-600)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              {p.name}
              {currentPlayer?.id === p.id && (
                <span className="text-secondary" style={{ fontSize: "0.8rem", fontWeight: 400 }}>
                  (you)
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {currentPlayer && game.status === "lobby" && (
        <button
          className="btn-primary btn-large mt-6"
          style={{ width: "100%" }}
          onClick={handleStart}
        >
          Start Game
        </button>
      )}

      {currentPlayer && (game.status === "active" || game.status === "finished") && (
        <button
          className="btn-primary btn-large mt-6"
          style={{ width: "100%" }}
          onClick={onStart}
        >
          Go to Board
        </button>
      )}
    </div>
  );
}
