import { useCallback, useEffect, useRef, useState } from 'react';
import {
  OnlineRoomSnapshot,
  PieceColor,
  PromotionPiece,
  PublicRoomListing,
} from '../types/chess';

interface CreateRoomParams {
  playerName: string;
  preferredColor: PieceColor | 'random';
  timeControlId: string;
  isPublic: boolean;
}

interface JoinRoomParams {
  roomId: string;
  playerName: string;
}

export function useOnlineChess() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<PieceColor | 'spectator' | null>(null);
  const [snapshot, setSnapshot] = useState<OnlineRoomSnapshot | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoomListing[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef<string>('');
  const roomIdRef = useRef<string>('');
  const playerNameRef = useRef<string>('Player');
  const pendingActionRef = useRef<Record<string, unknown> | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const intentionalCloseRef = useRef(false);

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const fetchPublicRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = (await res.json()) as { rooms?: PublicRoomListing[] };
        setPublicRooms(Array.isArray(data.rooms) ? data.rooms : []);
      }
    } catch {
      // Silent retry on next poll
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const connectSocket = useCallback((initialAction?: Record<string, unknown>) => {
    if (initialAction) {
      pendingActionRef.current = initialAction;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (pendingActionRef.current) {
        wsRef.current.send(JSON.stringify(pendingActionRef.current));
        pendingActionRef.current = null;
      }
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      return;
    }

    intentionalCloseRef.current = false;
    setConnecting(true);
    setError(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
      setError(null);

      if (pendingActionRef.current) {
        ws.send(JSON.stringify(pendingActionRef.current));
        pendingActionRef.current = null;
      } else if (roomIdRef.current) {
        ws.send(
          JSON.stringify({
            type: 'room:join',
            roomId: roomIdRef.current,
            playerName: playerNameRef.current,
            playerToken: tokenRef.current,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as Record<string, unknown>;
        if (data.type === 'room:joined') {
          const joinedSnapshot = data.snapshot as OnlineRoomSnapshot;
          roomIdRef.current = joinedSnapshot.roomId;
          tokenRef.current = typeof data.playerToken === 'string' ? data.playerToken : '';
          setRole((data.role as PieceColor | 'spectator') ?? 'spectator');
          setSnapshot(joinedSnapshot);
          setError(null);
        } else if (data.type === 'room:state') {
          setSnapshot(data.snapshot as OnlineRoomSnapshot);
        } else if (data.type === 'room:error') {
          setError(typeof data.message === 'string' ? data.message : 'Connection error');
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
      wsRef.current = null;

      if (!intentionalCloseRef.current && roomIdRef.current) {
        clearReconnectTimer();
        reconnectTimerRef.current = window.setTimeout(() => {
          connectSocket();
        }, 1500);
      }
    };

    ws.onerror = () => {
      setConnecting(false);
      setError((prev) => prev ?? 'Unable to establish live match connection. Retrying...');
    };
  }, []);

  const sendAction = useCallback((payload: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const createRoom = useCallback(
    async (params: CreateRoomParams) => {
      playerNameRef.current = params.playerName;
      roomIdRef.current = '';
      tokenRef.current = '';
      setConnecting(true);
      setError(null);

      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            roomId: string;
            role: PieceColor;
            playerToken: string;
            snapshot: OnlineRoomSnapshot;
          };
          roomIdRef.current = data.roomId;
          tokenRef.current = data.playerToken;
          setRole(data.role);
          setSnapshot(data.snapshot);
          connectSocket({
            type: 'room:join',
            roomId: data.roomId,
            playerName: params.playerName,
            playerToken: data.playerToken,
          });
          return;
        }
      } catch {
        // Fallback to WebSocket room:create
      }

      connectSocket({
        type: 'room:create',
        playerName: params.playerName,
        preferredColor: params.preferredColor,
        timeControlId: params.timeControlId,
        isPublic: params.isPublic,
      });
    },
    [connectSocket]
  );

  const joinRoom = useCallback(
    (params: JoinRoomParams) => {
      playerNameRef.current = params.playerName;
      const cleanId = params.roomId.trim().toUpperCase();
      if (!cleanId) {
        setError('Please enter a valid 6-character room code.');
        return;
      }
      connectSocket({
        type: 'room:join',
        roomId: cleanId,
        playerName: params.playerName,
        playerToken: roomIdRef.current === cleanId ? tokenRef.current : '',
      });
    },
    [connectSocket]
  );

  const leaveRoom = useCallback(() => {
    intentionalCloseRef.current = true;
    clearReconnectTimer();
    roomIdRef.current = '';
    tokenRef.current = '';
    pendingActionRef.current = null;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setConnecting(false);
    setRole(null);
    setSnapshot(null);
    setError(null);
  }, []);

  const submitMove = useCallback(
    (from: string, to: string, promotion?: PromotionPiece) => {
      if (!roomIdRef.current) return;
      sendAction({
        type: 'game:move',
        roomId: roomIdRef.current,
        from,
        to,
        promotion,
      });
    },
    [sendAction]
  );

  const resignMatch = useCallback(() => {
    if (!roomIdRef.current) return;
    sendAction({ type: 'game:resign', roomId: roomIdRef.current });
  }, [sendAction]);

  const offerDraw = useCallback(() => {
    if (!roomIdRef.current) return;
    sendAction({ type: 'game:draw_offer', roomId: roomIdRef.current });
  }, [sendAction]);

  const respondDraw = useCallback(
    (accept: boolean) => {
      if (!roomIdRef.current) return;
      sendAction({ type: 'game:draw_respond', roomId: roomIdRef.current, accept });
    },
    [sendAction]
  );

  const claimDraw = useCallback(() => {
    if (!roomIdRef.current) return;
    sendAction({ type: 'game:claim_draw', roomId: roomIdRef.current });
  }, [sendAction]);

  const requestRematch = useCallback(() => {
    if (!roomIdRef.current) return;
    sendAction({ type: 'game:rematch', roomId: roomIdRef.current });
  }, [sendAction]);

  const sendChat = useCallback(
    (text: string) => {
      if (!roomIdRef.current) return;
      sendAction({ type: 'game:chat', roomId: roomIdRef.current, text });
    },
    [sendAction]
  );

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    connected,
    connecting,
    error,
    setError,
    role,
    snapshot,
    publicRooms,
    loadingRooms,
    fetchPublicRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    submitMove,
    resignMatch,
    offerDraw,
    respondDraw,
    claimDraw,
    requestRematch,
    sendChat,
  };
}
