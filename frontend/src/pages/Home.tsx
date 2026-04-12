import { useEffect, useState } from "react";
import { listGames, getStats } from "../api";
import type { Game, Stats } from "../types/game";

interface Props {
  onCreateGame: () => void;
  onSelectGame: (game: Game) => void;
}

export default function Home({ onCreateGame, onSelectGame }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllFinished, setShowAllFinished] = useState(false);

  const PAGE_SIZE = 5;

  useEffect(() => {
    let done = 0;
    const finish = () => { if (++done >= 2) setLoading(false); };

    listGames()
      .then((g) => { setGames(g); setError(false); })
      .catch(() => setError(true))
      .finally(finish);

    getStats()
      .then((s) => setStats(s))
      .catch(() => {}) // stats failure is non-critical
      .finally(finish);
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
        [[ New Game ]]
      </button>

      {loading && <div className="spinner" />}

      {error && (
        <div className="card text-center mt-6" style={{ padding: 20 }}>
          <p style={{ color: "var(--danger)", fontWeight: 600, margin: "0 0 8px" }}>
            Couldn't reach the server
          </p>
          <p className="text-secondary" style={{ fontSize: "0.85rem", margin: 0 }}>
            Make sure you're on the same network as the game host.
          </p>
        </div>
      )}

      {activeGames.length > 0 && (
        <div className="mt-6">
          <h2>Games In Play</h2>
          <div className="gap-3">
            {(showAllActive ? activeGames : activeGames.slice(0, PAGE_SIZE)).map((game) => (
              <GameCard key={game.id} game={game} onClick={() => onSelectGame(game)} />
            ))}
          </div>
          {activeGames.length > PAGE_SIZE && !showAllActive && (
            <button
              className="btn-secondary"
              style={{ width: "100%", marginTop: 8, fontSize: "0.85rem" }}
              onClick={() => setShowAllActive(true)}
            >
              Show all ({activeGames.length})
            </button>
          )}
        </div>
      )}

      {finishedGames.length > 0 && (
        <div className="mt-6">
          <h2>Finished</h2>
          <div className="gap-3">
            {(showAllFinished ? finishedGames : finishedGames.slice(0, PAGE_SIZE)).map((game) => (
              <GameCard key={game.id} game={game} onClick={() => onSelectGame(game)} />
            ))}
          </div>
          {finishedGames.length > PAGE_SIZE && !showAllFinished && (
            <button
              className="btn-secondary"
              style={{ width: "100%", marginTop: 8, fontSize: "0.85rem" }}
              onClick={() => setShowAllFinished(true)}
            >
              Show all ({finishedGames.length})
            </button>
          )}
        </div>
      )}

      {!loading && games.length === 0 && (
        <p className="text-secondary text-center mt-6">
          No games yet. Create one to get started!
        </p>
      )}

      {/* Household Dashboard */}
      {stats && (stats.total_games > 0) && (
        <div className="mt-6">
          <h2>[[ Dashboard ]]</h2>

          {/* Summary stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginTop: 12,
            }}
          >
            <StatCard label="Total" value={stats.total_games} />
            <StatCard label="Active" value={stats.active_games} color="var(--success)" />
            <StatCard label="Finished" value={stats.finished_games} color="var(--sage-600)" />
          </div>

          {/* Leaderboard */}
          {stats.leaderboard.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 8 }}>
                Wins
              </h3>
              <div
                style={{
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--sage-200)",
                  background: "var(--surface)",
                  overflow: "hidden",
                }}
              >
                {stats.leaderboard.map((entry, i) => (
                  <div
                    key={entry.name}
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: i < stats.leaderboard.length - 1 ? "1px solid var(--sage-100)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: i === 0 ? "var(--sage-700)" : "var(--sage-200)",
                          color: i === 0 ? "white" : "var(--sage-700)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ fontWeight: 600 }}>{entry.name}</span>
                    </div>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "var(--sage-700)",
                      }}
                    >
                      {entry.wins}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Player activity */}
          {stats.players.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 8 }}>
                Players
              </h3>
              <div
                style={{
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--sage-200)",
                  background: "var(--surface)",
                  overflow: "hidden",
                }}
              >
                {stats.players.map((p, i) => (
                  <div
                    key={p.name}
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: i < stats.players.length - 1 ? "1px solid var(--sage-100)" : "none",
                      fontSize: "0.9rem",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span className="text-secondary" style={{ fontSize: "0.8rem" }}>
                      {p.games_played} game{p.games_played !== 1 ? "s" : ""}
                      {p.total_marks > 0 && ` · ${p.total_marks} marks`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent finished games */}
          {stats.recent_finished.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 8 }}>
                Recent Results
              </h3>
              <div
                style={{
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--sage-200)",
                  background: "var(--surface)",
                  overflow: "hidden",
                }}
              >
                {stats.recent_finished.map((g, i) => (
                  <div
                    key={g.id}
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: i < stats.recent_finished.length - 1 ? "1px solid var(--sage-100)" : "none",
                      fontSize: "0.9rem",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{g.source_name}</span>
                      {g.winner_name && (
                        <span className="text-secondary" style={{ fontSize: "0.8rem" }}>
                          {" "}won by {g.winner_name}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "0.7rem",
                        color: "var(--sage-400)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Date(g.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
      ? "var(--sage-500)"
      : game.status === "active"
        ? "var(--success)"
        : "var(--sage-400)";

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

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div
      className="card text-center"
      style={{ padding: "12px 8px" }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "1.4rem",
          fontWeight: 700,
          color: color || "var(--sage-800)",
        }}
      >
        {value}
      </div>
      <div className="text-secondary" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}
