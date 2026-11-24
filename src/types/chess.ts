export type GameMode = 'computer' | 'local' | 'online';

export type PieceColor = 'w' | 'b';

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export type AIDifficulty = 'initiate' | 'tactician' | 'master' | 'grandmaster';

export type BoardTheme = 'chessverse-nebula' | 'chessverse-deep' | 'tournament-obsidian';

export interface TimeControlPreset {
  id: string;
  label: string;
  category: 'Bullet' | 'Blitz' | 'Rapid' | 'Classical' | 'Untimed';
  initialMs: number;
  incrementMs: number;
}

export const TIME_CONTROLS: TimeControlPreset[] = [
  { id: '3+2', label: '3 + 2', category: 'Bullet', initialMs: 3 * 60_000, incrementMs: 2_000 },
  { id: '5+3', label: '5 + 3', category: 'Blitz', initialMs: 5 * 60_000, incrementMs: 3_000 },
  { id: '10+5', label: '10 + 5', category: 'Rapid', initialMs: 10 * 60_000, incrementMs: 5_000 },
  { id: '15+10', label: '15 + 10', category: 'Rapid', initialMs: 15 * 60_000, incrementMs: 10_000 },
  { id: 'untimed', label: 'Unlimited', category: 'Untimed', initialMs: 0, incrementMs: 0 },
];

export interface MoveRecord {
  ply: number;
  moveNumber: number;
  color: PieceColor;
  san: string;
  from: string;
  to: string;
  fen: string;
  captured?: string;
  promotion?: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isCastle: boolean;
  isEnPassant: boolean;
}

export interface GameResult {
  winner: PieceColor | 'draw' | null;
  reason: string;
}

export interface OnlinePlayerSummary {
  name: string;
  connected: boolean;
}

export interface OnlineChatMessage {
  id: string;
  senderName: string;
  senderColor: PieceColor | 'spectator';
  text: string;
  timestamp: number;
}

export interface OnlineRoomSnapshot {
  roomId: string;
  fen: string;
  pgn: string;
  turn: PieceColor;
  status: 'waiting' | 'active' | 'finished';
  isPublic: boolean;
  timeControl: {
    id: string;
    label: string;
    initialMs: number;
    incrementMs: number;
  };
  clocks: {
    whiteMs: number;
    blackMs: number;
    active: boolean;
    serverTimestamp: number;
  };
  players: {
    w: OnlinePlayerSummary | null;
    b: OnlinePlayerSummary | null;
  };
  spectatorCount: number;
  moves: MoveRecord[];
  lastMove: { from: string; to: string } | null;
  inCheck: boolean;
  drawOfferBy: PieceColor | null;
  canClaimDraw: boolean;
  rematchRequestedBy: { w: boolean; b: boolean };
  result: GameResult | null;
  chat: OnlineChatMessage[];
}

export interface PublicRoomListing {
  roomId: string;
  hostName: string;
  hostColor: PieceColor;
  timeControlLabel: string;
  createdAt: number;
}
