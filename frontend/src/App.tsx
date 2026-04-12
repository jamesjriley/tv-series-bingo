import { useState, useEffect } from "react";
import Home from "./pages/Home";
import CreateGame from "./pages/CreateGame";
import Lobby from "./pages/Lobby";
import GameBoard from "./pages/GameBoard";
import type { Game, Player } from "./types/game";
import "./styles/global.css";

type Page = "home" | "create" | "lobby" | "play";

const STORAGE_KEY = "tv-bingo-session";

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

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  // Restore session on mount
  useEffect(() => {
    const session = loadSession();
    if (session) {
      setSelectedGameId(session.gameId);
      setCurrentPlayer(session.player);
    }
  }, []);

  const handleSelectGame = (game: Game) => {
    setSelectedGameId(game.id);

    // Check if we're already a player in this game
    const session = loadSession();
    if (session?.gameId === game.id) {
      setCurrentPlayer(session.player);
      if (game.status === "active" || game.status === "finished") {
        setPage("play");
      } else {
        setPage("lobby");
      }
    } else {
      setCurrentPlayer(null);
      setPage("lobby");
    }
  };

  const handleGameCreated = (game: Game) => {
    setSelectedGameId(game.id);
    setPage("lobby");
  };

  const handleJoined = (player: Player) => {
    setCurrentPlayer(player);
    saveSession({ gameId: selectedGameId!, player });
  };

  const handleStart = () => {
    setPage("play");
  };

  const handleBackToHome = () => {
    setPage("home");
    setSelectedGameId(null);
  };

  switch (page) {
    case "home":
      return (
        <Home
          onCreateGame={() => setPage("create")}
          onSelectGame={handleSelectGame}
        />
      );
    case "create":
      return (
        <CreateGame
          onCreated={handleGameCreated}
          onBack={handleBackToHome}
        />
      );
    case "lobby":
      return (
        <Lobby
          gameId={selectedGameId!}
          currentPlayer={currentPlayer}
          onJoined={handleJoined}
          onStart={handleStart}
          onBack={handleBackToHome}
        />
      );
    case "play":
      return (
        <GameBoard
          gameId={selectedGameId!}
          player={currentPlayer!}
          onBack={handleBackToHome}
        />
      );
  }
}
