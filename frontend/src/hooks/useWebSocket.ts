import { useEffect, useRef, useCallback, useState } from "react";
import type { WSMessage } from "../types/game";

export function useWebSocket(
  gameId: string | null,
  playerId: string | null,
  onMessage: (msg: WSMessage) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!gameId || !playerId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws/${gameId}/${playerId}`;
    const ws = new WebSocket(url);

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        onMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 2s
      setTimeout(connect, 2000);
    };

    wsRef.current = ws;
  }, [gameId, playerId, onMessage]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { connected, send };
}
