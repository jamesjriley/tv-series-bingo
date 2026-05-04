import { useState, useEffect, useCallback } from "react";
import Home from "./pages/Home";
import CreateGame from "./pages/CreateGame";
import Lobby from "./pages/Lobby";
import GameBoard from "./pages/GameBoard";
import Help from "./pages/Help";
import { getGame } from "./api";
import type { Game, Player } from "./types/game";
import "./styles/global.css";

type Page = "home" | "create" | "lobby" | "play";

const STORAGE_KEY = "tv-bingo-session";
const NAME_KEY = "tv-bingo-name";

interface Session {
  gameId: string;
  player: Player;
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function loadSavedName(): string {
  return localStorage.getItem(NAME_KEY) || "";
}

function saveName(name: string) {
  if (name.trim()) {
    localStorage.setItem(NAME_KEY, name.trim());
  }
}

/** Parse the current URL into page + gameId */
function parseURL(): { page: Page; gameId: string | null } {
  const path = window.location.pathname;

  const playMatch = path.match(/^\/game\/([^/]+)\/play$/);
  if (playMatch) return { page: "play", gameId: playMatch[1] };

  const gameMatch = path.match(/^\/game\/([^/]+)$/);
  if (gameMatch) return { page: "lobby", gameId: gameMatch[1] };

  if (path === "/new") return { page: "create", gameId: null };

  return { page: "home", gameId: null };
}

/** Build a URL path for a given page + gameId */
function buildURL(page: Page, gameId: string | null): string {
  if (page === "create") return "/new";
  if (page === "lobby" && gameId) return `/game/${gameId}`;
  if (page === "play" && gameId) return `/game/${gameId}/play`;
  return "/";
}

export default function App() {
  const [page, setPageState] = useState<Page>("home");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  /** Navigate to a page, updating URL and state */
  const navigate = useCallback((p: Page, gameId?: string | null) => {
    const gid = gameId ?? selectedGameId;
    setPageState(p);
    if (p === "home" || p === "create") {
      setSelectedGameId(null);
    } else if (gameId !== undefined) {
      setSelectedGameId(gameId);
    }
    const url = buildURL(p, gid ?? null);
    if (window.location.pathname !== url) {
      window.history.pushState({ page: p, gameId: gid }, "", url);
    }
  }, [selectedGameId]);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => {
      const { page: urlPage, gameId } = parseURL();
      setPageState(urlPage);
      setSelectedGameId(gameId);

      // Restore player from session if navigating to a game page
      if ((urlPage === "lobby" || urlPage === "play") && gameId) {
        const session = loadSession();
        if (session?.gameId === gameId) {
          setCurrentPlayer(session.player);
        } else {
          setCurrentPlayer(null);
        }
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // On mount: parse URL first, then validate session
  useEffect(() => {
    const { page: urlPage, gameId: urlGameId } = parseURL();
    const session = loadSession();

    // If URL points to a specific game, try to restore into it
    if (urlGameId && (urlPage === "lobby" || urlPage === "play")) {
      getGame(urlGameId)
        .then((game) => {
          setSelectedGameId(urlGameId);

          // Check if we have a session for this game
          if (session?.gameId === urlGameId) {
            const stillIn = game.players.some((p) => p.id === session.player.id);
            if (stillIn) {
              setCurrentPlayer(session.player);
              setPageState(urlPage);
            } else {
              // Player removed — go to lobby to rejoin
              saveSession(null);
              setCurrentPlayer(null);
              setPageState("lobby");
            }
          } else {
            // No session for this game — show lobby to join
            setCurrentPlayer(null);
            setPageState("lobby");
          }
        })
        .catch(() => {
          // Game doesn't exist — go home
          setPageState("home");
          window.history.replaceState(null, "", "/");
        })
        .finally(() => setRestoring(false));
      return;
    }

    // Non-game URLs: create or home
    if (urlPage === "create") {
      setPageState("create");
    } else {
      // Home page — but check if there's a saved session to offer quick resume
      setPageState("home");
    }
    setRestoring(false);
  }, []);

  const handleSelectGame = (game: Game) => {
    setSelectedGameId(game.id);

    // Check if we're already a player in this game
    const session = loadSession();
    if (session?.gameId === game.id) {
      const stillInGame = game.players.some((p) => p.id === session.player.id);
      if (stillInGame) {
        setCurrentPlayer(session.player);
        if (game.status === "active" || game.status === "finished") {
          navigate("play", game.id);
        } else {
          navigate("lobby", game.id);
        }
      } else {
        saveSession(null);
        setCurrentPlayer(null);
        navigate("lobby", game.id);
      }
    } else {
      setCurrentPlayer(null);
      navigate("lobby", game.id);
    }
  };

  const handleGameCreated = (game: Game) => {
    // Clear old session — user hasn't joined this new game yet
    setCurrentPlayer(null);
    saveSession(null);
    setSelectedGameId(game.id);
    navigate("lobby", game.id);
  };

  const handleJoined = (player: Player) => {
    setCurrentPlayer(player);
    saveSession({ gameId: selectedGameId!, player });
    saveName(player.name);
  };

  const handleStart = () => {
    navigate("play");
  };

  const handleBackToHome = () => {
    navigate("home");
    setSelectedGameId(null);
  };

  if (restoring) {
    return (
      <div className="page text-center">
        <div className="spinner" />
      </div>
    );
  }

  const helpButton = (
    <button
      className="help-btn"
      onClick={() => setShowHelp(true)}
      aria-label="Help"
      title="How to play"
    >
      ?
    </button>
  );

  let content;
  switch (page) {
    case "home":
      content = (
        <Home
          onCreateGame={() => navigate("create")}
          onSelectGame={handleSelectGame}
        />
      );
      break;
    case "create":
      content = (
        <CreateGame
          onCreated={handleGameCreated}
          onBack={handleBackToHome}
        />
      );
      break;
    case "lobby":
      content = (
        <Lobby
          gameId={selectedGameId!}
          currentPlayer={currentPlayer}
          savedName={loadSavedName()}
          onJoined={handleJoined}
          onStart={handleStart}
          onBack={handleBackToHome}
        />
      );
      break;
    case "play":
      content = (
        <GameBoard
          gameId={selectedGameId!}
          player={currentPlayer!}
          onBack={handleBackToHome}
        />
      );
      break;
  }

  return (
    <>
      {helpButton}
      {content}
      {showHelp && <Help onClose={() => setShowHelp(false)} />}
    </>
  );
}
