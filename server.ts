import crypto from 'crypto';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import { Chess } from 'chess.js';
import type {
  GameResult,
  MoveRecord,
  OnlineChatMessage,
  OnlineRoomSnapshot,
  PieceColor,
  PublicRoomListing,
  TIME_CONTROLS,
} from './src/types/chess.js';

interface PlayerSlot {
  name: string;
  token: string;
  socket: WebSocket | null;
  connected: boolean;
}

interface OnlineRoom {
  roomId: string;
  chess: Chess;
  moves: MoveRecord[];
  lastMove: { from: string; to: string } | null;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
  status: 'waiting' | 'active' | 'finished';
  timeControl: {
    id: string;
    label: string;
    initialMs: number;
    incrementMs: number;
  };
  clocks: {
    whiteMs: number;
    blackMs: number;
    lastTickAt: number | null;
    active: boolean;
  };
  players: {
    w: PlayerSlot | null;
    b: PlayerSlot | null;
  };
  spectators: Set<WebSocket>;
  drawOfferBy: PieceColor | null;
  rematchRequestedBy: { w: boolean; b: boolean };
  result: GameResult | null;
  chat: OnlineChatMessage[];
}

const VALID_TIME_CONTROLS: Record<string, (typeof TIME_CONTROLS)[number]> = {
  '3+2': { id: '3+2', label: '3 + 2', category: 'Bullet', initialMs: 3 * 60_000, incrementMs: 2_000 },
  '5+3': { id: '5+3', label: '5 + 3', category: 'Blitz', initialMs: 5 * 60_000, incrementMs: 3_000 },
  '10+5': { id: '10+5', label: '10 + 5', category: 'Rapid', initialMs: 10 * 60_000, incrementMs: 5_000 },
  '15+10': { id: '15+10', label: '15 + 10', category: 'Rapid', initialMs: 15 * 60_000, incrementMs: 10_000 },
  untimed: { id: 'untimed', label: 'Unlimited', category: 'Untimed', initialMs: 0, incrementMs: 0 },
};

const rooms = new Map<string, OnlineRoom>();
const socketMeta = new WeakMap<WebSocket, { roomId: string; role: PieceColor | 'spectator' }>();

function generateRoomId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return rooms.has(out) ? generateRoomId() : out;
}

function sanitizeName(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 24);
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeRoomId(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function evaluateGameOver(chess: Chess): GameResult | null {
  if (chess.isCheckmate()) {
    const winner: PieceColor = chess.turn() === 'w' ? 'b' : 'w';
    return { winner, reason: 'Checkmate' };
  }
  if (chess.isStalemate()) {
    return { winner: 'draw', reason: 'Stalemate' };
  }
  if (chess.isInsufficientMaterial()) {
    return { winner: 'draw', reason: 'Draw by insufficient material' };
  }
  if (chess.isThreefoldRepetition()) {
    return { winner: 'draw', reason: 'Draw by threefold repetition' };
  }
  if (chess.isDrawByFiftyMoves()) {
    return { winner: 'draw', reason: 'Draw by fifty-move rule' };
  }
  return null;
}

function settleActiveClock(room: OnlineRoom): boolean {
  if (room.status !== 'active' || !room.clocks.active || room.timeControl.initialMs <= 0) {
    return false;
  }
  const now = Date.now();
  if (room.clocks.lastTickAt === null) {
    room.clocks.lastTickAt = now;
    return false;
  }
  const elapsed = Math.max(0, now - room.clocks.lastTickAt);
  room.clocks.lastTickAt = now;

  const turn = room.chess.turn();
  if (turn === 'w') {
    room.clocks.whiteMs = Math.max(0, room.clocks.whiteMs - elapsed);
    if (room.clocks.whiteMs === 0) {
      room.status = 'finished';
      room.clocks.active = false;
      room.result = { winner: 'b', reason: 'White ran out of time' };
      return true;
    }
  } else {
    room.clocks.blackMs = Math.max(0, room.clocks.blackMs - elapsed);
    if (room.clocks.blackMs === 0) {
      room.status = 'finished';
      room.clocks.active = false;
      room.result = { winner: 'w', reason: 'Black ran out of time' };
      return true;
    }
  }
  return false;
}

function buildSnapshot(room: OnlineRoom): OnlineRoomSnapshot {
  const canClaimDraw =
    room.status === 'active' &&
    (room.chess.isThreefoldRepetition() || room.chess.isDrawByFiftyMoves());

  return {
    roomId: room.roomId,
    fen: room.chess.fen(),
    pgn: room.chess.pgn(),
    turn: room.chess.turn(),
    status: room.status,
    isPublic: room.isPublic,
    timeControl: {
      id: room.timeControl.id,
      label: room.timeControl.label,
      initialMs: room.timeControl.initialMs,
      incrementMs: room.timeControl.incrementMs,
    },
    clocks: {
      whiteMs: room.clocks.whiteMs,
      blackMs: room.clocks.blackMs,
      active: room.clocks.active,
      serverTimestamp: Date.now(),
    },
    players: {
      w: room.players.w ? { name: room.players.w.name, connected: room.players.w.connected } : null,
      b: room.players.b ? { name: room.players.b.name, connected: room.players.b.connected } : null,
    },
    spectatorCount: room.spectators.size,
    moves: room.moves,
    lastMove: room.lastMove,
    inCheck: room.chess.isCheck(),
    drawOfferBy: room.drawOfferBy,
    canClaimDraw,
    rematchRequestedBy: { ...room.rematchRequestedBy },
    result: room.result,
    chat: room.chat.slice(-40),
  };
}

function sendJson(ws: WebSocket | null, payload: unknown): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function broadcastRoom(room: OnlineRoom): void {
  const snapshot = buildSnapshot(room);
  const message = { type: 'room:state', snapshot };
  sendJson(room.players.w?.socket ?? null, message);
  sendJson(room.players.b?.socket ?? null, message);
  for (const spec of room.spectators) {
    sendJson(spec, message);
  }
}

function detachSocket(ws: WebSocket): void {
  const meta = socketMeta.get(ws);
  if (!meta) return;
  socketMeta.delete(ws);

  const room = rooms.get(meta.roomId);
  if (!room) return;

  if (meta.role === 'w' && room.players.w?.socket === ws) {
    room.players.w.socket = null;
    room.players.w.connected = false;
  } else if (meta.role === 'b' && room.players.b?.socket === ws) {
    room.players.b.socket = null;
    room.players.b.connected = false;
  } else if (meta.role === 'spectator') {
    room.spectators.delete(ws);
  }

  room.updatedAt = Date.now();
  broadcastRoom(room);
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  function createRoomRecord(params: {
    playerName?: unknown;
    preferredColor?: unknown;
    timeControlId?: unknown;
    isPublic?: unknown;
    socket?: WebSocket | null;
  }): { room: OnlineRoom; role: PieceColor; token: string } {
    const playerName = sanitizeName(params.playerName, 'Player 1');
    const pref: PieceColor =
      params.preferredColor === 'w' || params.preferredColor === 'b'
        ? params.preferredColor
        : Math.random() < 0.5
          ? 'w'
          : 'b';
    const tcKey =
      typeof params.timeControlId === 'string' && VALID_TIME_CONTROLS[params.timeControlId]
        ? params.timeControlId
        : '10+5';
    const tc = VALID_TIME_CONTROLS[tcKey];
    const isPublic = params.isPublic !== false;

    const roomId = generateRoomId();
    const token = crypto.randomUUID();
    const now = Date.now();
    const sock = params.socket ?? null;

    const room: OnlineRoom = {
      roomId,
      chess: new Chess(),
      moves: [],
      lastMove: null,
      isPublic,
      createdAt: now,
      updatedAt: now,
      status: 'waiting',
      timeControl: {
        id: tc.id,
        label: tc.label,
        initialMs: tc.initialMs,
        incrementMs: tc.incrementMs,
      },
      clocks: {
        whiteMs: tc.initialMs,
        blackMs: tc.initialMs,
        lastTickAt: null,
        active: false,
      },
      players: {
        w: pref === 'w' ? { name: playerName, token, socket: sock, connected: Boolean(sock) } : null,
        b: pref === 'b' ? { name: playerName, token, socket: sock, connected: Boolean(sock) } : null,
      },
      spectators: new Set(),
      drawOfferBy: null,
      rematchRequestedBy: { w: false, b: false },
      result: null,
      chat: [],
    };

    rooms.set(roomId, room);
    return { room, role: pref, token };
  }

  app.get('/api/rooms', (_req, res) => {
    const publicRooms: PublicRoomListing[] = [];
    for (const room of rooms.values()) {
      if (room.isPublic && room.status === 'waiting') {
        const hostColor: PieceColor = room.players.w ? 'w' : 'b';
        const hostName = room.players[hostColor]?.name ?? 'Challenger';
        publicRooms.push({
          roomId: room.roomId,
          hostName,
          hostColor,
          timeControlLabel: room.timeControl.label,
          createdAt: room.createdAt,
        });
      }
    }
    publicRooms.sort((a, b) => b.createdAt - a.createdAt);
    res.json({ rooms: publicRooms });
  });

  app.post('/api/rooms', (req, res) => {
    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const { room, role, token } = createRoomRecord({
      playerName: body.playerName,
      preferredColor: body.preferredColor,
      timeControlId: body.timeControlId,
      isPublic: body.isPublic,
      socket: null,
    });

    res.status(201).json({
      roomId: room.roomId,
      role,
      playerToken: token,
      snapshot: buildSnapshot(room),
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (rawData) => {
      let msg: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(rawData.toString());
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
        msg = parsed as Record<string, unknown>;
      } catch {
        return;
      }

      const type = typeof msg.type === 'string' ? msg.type : '';

      if (type === 'room:create') {
        detachSocket(ws);
        const { room, role, token } = createRoomRecord({
          playerName: msg.playerName,
          preferredColor: msg.preferredColor,
          timeControlId: msg.timeControlId,
          isPublic: msg.isPublic,
          socket: ws,
        });
        socketMeta.set(ws, { roomId: room.roomId, role });

        sendJson(ws, {
          type: 'room:joined',
          roomId: room.roomId,
          role,
          playerToken: token,
          snapshot: buildSnapshot(room),
        });
        return;
      }

      if (type === 'room:join') {
        const roomId = sanitizeRoomId(msg.roomId);
        const room = rooms.get(roomId);
        if (!room) {
          sendJson(ws, { type: 'room:error', message: 'Match room not found. Check the code or create a new match.' });
          return;
        }

        detachSocket(ws);
        const playerName = sanitizeName(msg.playerName, 'Challenger');
        const providedToken = typeof msg.playerToken === 'string' ? msg.playerToken : '';

        let assignedRole: PieceColor | 'spectator' = 'spectator';
        let playerToken = '';

        // Check reconnection via token
        if (providedToken && room.players.w?.token === providedToken) {
          assignedRole = 'w';
          playerToken = providedToken;
          room.players.w.socket = ws;
          room.players.w.connected = true;
          room.players.w.name = playerName;
        } else if (providedToken && room.players.b?.token === providedToken) {
          assignedRole = 'b';
          playerToken = providedToken;
          room.players.b.socket = ws;
          room.players.b.connected = true;
          room.players.b.name = playerName;
        } else if (!room.players.w) {
          assignedRole = 'w';
          playerToken = crypto.randomUUID();
          room.players.w = { name: playerName, token: playerToken, socket: ws, connected: true };
        } else if (!room.players.b) {
          assignedRole = 'b';
          playerToken = crypto.randomUUID();
          room.players.b = { name: playerName, token: playerToken, socket: ws, connected: true };
        } else {
          room.spectators.add(ws);
        }

        if (room.players.w && room.players.b && room.status === 'waiting') {
          room.status = 'active';
          if (room.timeControl.initialMs > 0) {
            room.clocks.active = true;
            room.clocks.lastTickAt = Date.now();
          }
        }

        room.updatedAt = Date.now();
        socketMeta.set(ws, { roomId, role: assignedRole });

        sendJson(ws, {
          type: 'room:joined',
          roomId,
          role: assignedRole,
          playerToken,
          snapshot: buildSnapshot(room),
        });
        broadcastRoom(room);
        return;
      }

      const meta = socketMeta.get(ws);
      if (!meta) return;
      const room = rooms.get(meta.roomId);
      if (!room) return;

      if (type === 'game:move') {
        if (room.status !== 'active') return;
        if (meta.role !== room.chess.turn()) {
          sendJson(ws, { type: 'room:error', message: 'Not your turn.' });
          return;
        }

        if (settleActiveClock(room)) {
          broadcastRoom(room);
          return;
        }

        const from = typeof msg.from === 'string' ? msg.from : '';
        const to = typeof msg.to === 'string' ? msg.to : '';
        const promotion =
          msg.promotion === 'q' || msg.promotion === 'r' || msg.promotion === 'b' || msg.promotion === 'n'
            ? msg.promotion
            : undefined;

        try {
          const move = room.chess.move({ from, to, promotion });
          const moverColor = move.color;
          if (room.timeControl.initialMs > 0 && room.timeControl.incrementMs > 0) {
            if (moverColor === 'w') {
              room.clocks.whiteMs += room.timeControl.incrementMs;
            } else {
              room.clocks.blackMs += room.timeControl.incrementMs;
            }
          }

          const ply = room.moves.length + 1;
          room.moves.push({
            ply,
            moveNumber: Math.ceil(ply / 2),
            color: moverColor,
            san: move.san,
            from: move.from,
            to: move.to,
            fen: room.chess.fen(),
            captured: move.captured,
            promotion: move.promotion,
            isCheck: room.chess.isCheck(),
            isCheckmate: room.chess.isCheckmate(),
            isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
            isEnPassant: move.isEnPassant(),
          });
          room.lastMove = { from: move.from, to: move.to };
          room.drawOfferBy = null;
          room.updatedAt = Date.now();

          const gameOver = evaluateGameOver(room.chess);
          if (gameOver) {
            room.status = 'finished';
            room.clocks.active = false;
            room.result = gameOver;
          }

          broadcastRoom(room);
        } catch {
          sendJson(ws, { type: 'room:error', message: 'Illegal chess move.' });
        }
        return;
      }

      if (type === 'game:resign') {
        if (room.status !== 'active') return;
        if (meta.role !== 'w' && meta.role !== 'b') return;
        room.status = 'finished';
        room.clocks.active = false;
        room.result = {
          winner: meta.role === 'w' ? 'b' : 'w',
          reason: `${meta.role === 'w' ? 'White' : 'Black'} resigned`,
        };
        room.updatedAt = Date.now();
        broadcastRoom(room);
        return;
      }

      if (type === 'game:draw_offer') {
        if (room.status !== 'active') return;
        if (meta.role !== 'w' && meta.role !== 'b') return;
        room.drawOfferBy = meta.role;
        room.updatedAt = Date.now();
        broadcastRoom(room);
        return;
      }

      if (type === 'game:draw_respond') {
        if (room.status !== 'active' || !room.drawOfferBy) return;
        if (meta.role !== 'w' && meta.role !== 'b') return;
        if (meta.role === room.drawOfferBy) return;
        if (msg.accept === true) {
          room.status = 'finished';
          room.clocks.active = false;
          room.result = { winner: 'draw', reason: 'Draw by mutual agreement' };
        }
        room.drawOfferBy = null;
        room.updatedAt = Date.now();
        broadcastRoom(room);
        return;
      }

      if (type === 'game:claim_draw') {
        if (room.status !== 'active') return;
        if (meta.role !== 'w' && meta.role !== 'b') return;
        if (room.chess.isThreefoldRepetition()) {
          room.status = 'finished';
          room.clocks.active = false;
          room.result = { winner: 'draw', reason: 'Draw claimed by threefold repetition' };
          broadcastRoom(room);
        } else if (room.chess.isDrawByFiftyMoves()) {
          room.status = 'finished';
          room.clocks.active = false;
          room.result = { winner: 'draw', reason: 'Draw claimed by fifty-move rule' };
          broadcastRoom(room);
        }
        return;
      }

      if (type === 'game:rematch') {
        if (room.status !== 'finished') return;
        if (meta.role !== 'w' && meta.role !== 'b') return;
        room.rematchRequestedBy[meta.role] = true;

        if (room.rematchRequestedBy.w && room.rematchRequestedBy.b) {
          // Swap sides cleanly for rematch
          const prevW = room.players.w;
          const prevB = room.players.b;
          room.players.w = prevB;
          room.players.b = prevW;
          if (room.players.w?.socket) socketMeta.set(room.players.w.socket, { roomId: room.roomId, role: 'w' });
          if (room.players.b?.socket) socketMeta.set(room.players.b.socket, { roomId: room.roomId, role: 'b' });

          room.chess = new Chess();
          room.moves = [];
          room.lastMove = null;
          room.drawOfferBy = null;
          room.rematchRequestedBy = { w: false, b: false };
          room.result = null;
          room.status = 'active';
          room.clocks = {
            whiteMs: room.timeControl.initialMs,
            blackMs: room.timeControl.initialMs,
            lastTickAt: room.timeControl.initialMs > 0 ? Date.now() : null,
            active: room.timeControl.initialMs > 0,
          };
          room.updatedAt = Date.now();

          if (room.players.w?.socket) {
            sendJson(room.players.w.socket, {
              type: 'room:joined',
              roomId: room.roomId,
              role: 'w',
              playerToken: room.players.w.token,
              snapshot: buildSnapshot(room),
            });
          }
          if (room.players.b?.socket) {
            sendJson(room.players.b.socket, {
              type: 'room:joined',
              roomId: room.roomId,
              role: 'b',
              playerToken: room.players.b.token,
              snapshot: buildSnapshot(room),
            });
          }
        }
        broadcastRoom(room);
        return;
      }

      if (type === 'game:chat') {
        if (typeof msg.text !== 'string') return;
        const text = msg.text.trim().slice(0, 200);
        if (!text) return;
        const senderName =
          meta.role === 'w'
            ? room.players.w?.name ?? 'White'
            : meta.role === 'b'
              ? room.players.b?.name ?? 'Black'
              : 'Spectator';
        room.chat.push({
          id: crypto.randomUUID(),
          senderName,
          senderColor: meta.role,
          text,
          timestamp: Date.now(),
        });
        if (room.chat.length > 60) {
          room.chat = room.chat.slice(-60);
        }
        room.updatedAt = Date.now();
        broadcastRoom(room);
      }
    });

    ws.on('close', () => {
      detachSocket(ws);
    });
  });

  // Authoritative server clock timeout & stale room garbage collector
  setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms.entries()) {
      if (room.status === 'active' && room.clocks.active) {
        if (settleActiveClock(room)) {
          broadcastRoom(room);
        }
      }
      const noConnectedPlayers =
        !room.players.w?.connected && !room.players.b?.connected && room.spectators.size === 0;
      if (noConnectedPlayers && now - room.updatedAt > 30 * 60_000) {
        rooms.delete(roomId);
      }
    }
  }, 250);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`Chessverse server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Chessverse server:', err);
  process.exit(1);
});
