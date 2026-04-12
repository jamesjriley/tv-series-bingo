import { useState, useEffect, useRef } from "react";
import { createGame, generateMoments } from "../api";
import type { Game } from "../types/game";

interface ShowResult {
  name: string;
  year: string;
  network: string;
}

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
  const [suggestions, setSuggestions] = useState<ShowResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search TVMaze as user types (TV shows only)
  useEffect(() => {
    if (sourceType !== "tv_show" || sourceName.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(sourceName.trim())}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const results: ShowResult[] = data.slice(0, 6).map(
          (item: { show: { name: string; premiered?: string; network?: { name: string } } }) => ({
            name: item.show.name,
            year: item.show.premiered?.slice(0, 4) || "",
            network: item.show.network?.name || "",
          })
        );
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        // Silently fail — autocomplete is non-critical
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [sourceName, sourceType]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

        <div style={{ position: "relative" }} ref={dropdownRef}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
            {sourceType === "tv_show" ? "Show Name" : "Channel / Creator Name"}
          </label>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => {
              setSourceName(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            maxLength={200}
            autoComplete="off"
            placeholder={
              sourceType === "tv_show"
                ? "e.g. Time Team, The Office, Bake Off"
                : "e.g. Tom Scott, Numberphile"
            }
          />
          {showDropdown && suggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "var(--surface)",
                border: "1px solid var(--sage-300)",
                borderRadius: "var(--radius)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                zIndex: 10,
                marginTop: 4,
                overflow: "hidden",
              }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSourceName(s.name);
                    setShowDropdown(false);
                    setSuggestions([]);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: i < suggestions.length - 1 ? "1px solid var(--sage-100)" : "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "0.9rem",
                    color: "var(--text-primary)",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--sage-100)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      fontFamily: "'JetBrains Mono', monospace",
                      whiteSpace: "nowrap",
                      marginLeft: 12,
                    }}
                  >
                    {[s.year, s.network].filter(Boolean).join(" · ")}
                  </span>
                </button>
              ))}
            </div>
          )}
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
