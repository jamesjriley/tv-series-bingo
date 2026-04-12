import { useState } from "react";
import { createGame, generateMoments } from "../api";
import type { Game } from "../types/game";

interface Props {
  onCreated: (game: Game) => void;
  onBack: () => void;
}

export default function CreateGame({ onCreated, onBack }: Props) {
  const [sourceType, setSourceType] = useState<"tv_show" | "youtube">("tv_show");
  const [sourceName, setSourceName] = useState("");
  const [videoUrls, setVideoUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const urls = videoUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);

      const game = await createGame(sourceType, sourceName.trim(), urls);

      // Generate moments with AI
      await generateMoments(game.id, sourceType, sourceName.trim(), urls);

      onCreated(game);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: 16 }}>
        &larr; Back
      </button>

      <h1>New Game</h1>
      <p className="text-secondary mb-4">
        Pick what you're watching and AI will generate the bingo moments.
      </p>

      <form onSubmit={handleSubmit} className="gap-3">
        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
            What are you watching?
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              className={sourceType === "tv_show" ? "btn-primary" : "btn-secondary"}
              onClick={() => setSourceType("tv_show")}
            >
              TV Show
            </button>
            <button
              type="button"
              className={sourceType === "youtube" ? "btn-primary" : "btn-secondary"}
              onClick={() => setSourceType("youtube")}
            >
              YouTube
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
            {sourceType === "tv_show" ? "Show Name" : "Channel / Creator Name"}
          </label>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            maxLength={200}
            placeholder={
              sourceType === "tv_show"
                ? "e.g. Time Team, The Office, Bake Off"
                : "e.g. Tom Scott, Numberphile"
            }
          />
        </div>

        {sourceType === "youtube" && (
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
              Video URLs (one per line, for transcript analysis)
            </label>
            <textarea
              rows={4}
              value={videoUrls}
              onChange={(e) => setVideoUrls(e.target.value)}
              placeholder={"https://youtube.com/watch?v=...\nhttps://youtube.com/watch?v=..."}
            />
            <p className="text-secondary" style={{ fontSize: "0.8rem", marginTop: 4 }}>
              Paste 3-5 video links for best results. We'll pull the transcripts.
            </p>
          </div>
        )}

        {error && (
          <p style={{ color: "var(--danger)", fontWeight: 600 }}>{error}</p>
        )}

        <button
          type="submit"
          className="btn-primary btn-large"
          disabled={loading || !sourceName.trim()}
          style={{ width: "100%", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Generating moments..." : "Create Game"}
        </button>

        {loading && (
          <div className="text-center">
            <div className="spinner" />
            <p className="text-secondary">
              AI is generating bingo moments. This takes a few seconds...
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
