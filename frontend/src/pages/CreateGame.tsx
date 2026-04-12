import { useState, useEffect, useRef } from "react";
import { createGame, generateMoments, youtubeLookup } from "../api";
import type { Game } from "../types/game";
import type { YouTubeChannel } from "../types/game";

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

  // TV show autocomplete
  const [showSuggestions, setShowSuggestions] = useState<ShowResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // YouTube channel autocomplete
  const [ytSuggestions, setYtSuggestions] = useState<YouTubeChannel[]>([]);
  const [ytDropdown, setYtDropdown] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedChannel, setResolvedChannel] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(false);

  const isYouTubeUrl = (s: string) =>
    /youtu\.?be/.test(s) && /https?:\/\//.test(s);

  // Autocomplete: TV shows via TVMaze, YouTube channels via backend
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current = false;
      return;
    }

    const query = sourceName.trim();
    if (query.length < 2) {
      setShowSuggestions([]);
      setYtSuggestions([]);
      return;
    }

    // Don't search if a URL was pasted
    if (isYouTubeUrl(query)) {
      setShowSuggestions([]);
      setYtSuggestions([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (sourceType === "tv_show") {
        try {
          const res = await fetch(
            `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`
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
          setShowSuggestions(results);
          setShowDropdown(results.length > 0);
        } catch {
          // non-critical
        }
      } else {
        try {
          const data = await youtubeLookup(query);
          if (data.results) {
            setYtSuggestions(data.results);
            setYtDropdown(data.results.length > 0);
          }
        } catch {
          // non-critical
        }
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [sourceName, sourceType]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setYtDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectYtChannel = async (channel: YouTubeChannel) => {
    selectedRef.current = true;
    setSourceName(channel.channel_name);
    setYtDropdown(false);
    setYtSuggestions([]);
    setResolvedChannel(channel.channel_name);

    // Resolve channel to get recent video URLs
    if (channel.channel_url) {
      setResolving(true);
      try {
        const data = await youtubeLookup(channel.channel_url);
        if (data.videos && data.videos.length > 0) {
          setVideoUrls(data.videos.slice(0, 5).map((v) => v.url).join("\n"));
        }
      } catch {
        // User can still enter URLs manually
      } finally {
        setResolving(false);
      }
    }
  };

  // Handle paste of YouTube URL in the name field
  const handleNameChange = (value: string) => {
    setSourceName(value);
    setResolvedChannel(null);

    if (sourceType === "youtube" && isYouTubeUrl(value.trim())) {
      // Auto-resolve pasted URL
      selectedRef.current = true;
      setYtDropdown(false);
      setResolving(true);
      youtubeLookup(value.trim())
        .then((data) => {
          if (data.channel_name) {
            setSourceName(data.channel_name);
            setResolvedChannel(data.channel_name);
          }
          if (data.videos && data.videos.length > 0) {
            setVideoUrls(data.videos.slice(0, 5).map((v) => v.url).join("\n"));
          }
        })
        .catch(() => {})
        .finally(() => setResolving(false));
    } else {
      setShowDropdown(true);
      setYtDropdown(true);
    }
  };

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
      await generateMoments(game.id, sourceType, sourceName.trim(), urls);
      onCreated(game);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const hasSuggestions = sourceType === "tv_show"
    ? showDropdown && showSuggestions.length > 0
    : ytDropdown && ytSuggestions.length > 0;

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
              onClick={() => {
                setSourceType("tv_show");
                setSourceName("");
                setVideoUrls("");
                setResolvedChannel(null);
              }}
            >
              TV Show
            </button>
            <button
              type="button"
              className={sourceType === "youtube" ? "btn-primary" : "btn-secondary"}
              onClick={() => {
                setSourceType("youtube");
                setSourceName("");
                setVideoUrls("");
                setResolvedChannel(null);
              }}
            >
              YouTube
            </button>
          </div>
        </div>

        <div style={{ position: "relative" }} ref={dropdownRef}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
            {sourceType === "tv_show" ? "Show Name" : "Channel Name or URL"}
          </label>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => hasSuggestions && (sourceType === "tv_show" ? setShowDropdown(true) : setYtDropdown(true))}
            maxLength={500}
            autoComplete="off"
            placeholder={
              sourceType === "tv_show"
                ? "e.g. Time Team, The Office, Bake Off"
                : "e.g. Tom Scott, or paste a YouTube URL"
            }
          />

          {resolving && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              <span className="text-secondary" style={{ fontSize: "0.8rem" }}>
                Looking up channel...
              </span>
            </div>
          )}

          {resolvedChannel && !resolving && (
            <div
              style={{
                marginTop: 6,
                fontSize: "0.8rem",
                color: "var(--success)",
                fontWeight: 600,
              }}
            >
              Found: {resolvedChannel}
            </div>
          )}

          {/* TV Show dropdown */}
          {sourceType === "tv_show" && showDropdown && showSuggestions.length > 0 && (
            <DropdownList>
              {showSuggestions.map((s, i) => (
                <DropdownItem
                  key={i}
                  isLast={i === showSuggestions.length - 1}
                  onClick={() => {
                    selectedRef.current = true;
                    setSourceName(s.name);
                    setShowDropdown(false);
                    setShowSuggestions([]);
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", marginLeft: 12 }}>
                    {[s.year, s.network].filter(Boolean).join(" · ")}
                  </span>
                </DropdownItem>
              ))}
            </DropdownList>
          )}

          {/* YouTube channel dropdown */}
          {sourceType === "youtube" && ytDropdown && ytSuggestions.length > 0 && (
            <DropdownList>
              {ytSuggestions.map((ch, i) => (
                <DropdownItem
                  key={i}
                  isLast={i === ytSuggestions.length - 1}
                  onClick={() => selectYtChannel(ch)}
                >
                  <span style={{ fontWeight: 600 }}>{ch.channel_name}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", marginLeft: 12 }}>
                    {ch.subscriber_text || ""}
                  </span>
                </DropdownItem>
              ))}
            </DropdownList>
          )}
        </div>

        {sourceType === "youtube" && (
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
              Videos for transcript analysis
            </label>
            <textarea
              rows={4}
              value={videoUrls}
              onChange={(e) => setVideoUrls(e.target.value)}
              placeholder={resolvedChannel
                ? "Recent videos loaded automatically. Edit if needed."
                : "Paste video URLs, or search for a channel above to auto-fill."}
            />
            <p className="text-secondary" style={{ fontSize: "0.8rem", marginTop: 4 }}>
              {videoUrls.split("\n").filter((u) => u.trim()).length > 0
                ? `${videoUrls.split("\n").filter((u) => u.trim()).length} video(s) selected`
                : "3-5 videos recommended for best results."}
            </p>
          </div>
        )}

        {error && (
          <p style={{ color: "var(--danger)", fontWeight: 600 }}>{error}</p>
        )}

        <button
          type="submit"
          className="btn-primary btn-large"
          disabled={loading || resolving || !sourceName.trim()}
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

// --- Shared dropdown components ---

function DropdownList({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

function DropdownItem({
  children,
  isLast,
  onClick,
}: {
  children: React.ReactNode;
  isLast: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        padding: "10px 14px",
        border: "none",
        borderBottom: isLast ? "none" : "1px solid var(--sage-100)",
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
      {children}
    </button>
  );
}
