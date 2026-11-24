import { Chess, Move, PieceSymbol } from 'chess.js';
import { AIDifficulty, PieceColor } from '../types/chess';

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables from White's perspective (rank 8 at index 0, rank 1 at index 7)
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 27, 27, 10, 5, 5],
  [0, 0, 0, 24, 24, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -22, -22, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_MID_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const KING_END_PST = [
  [-50, -40, -30, -20, -20, -30, -40, -50],
  [-30, -20, -10, 0, 0, -10, -20, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -30, 0, 0, 0, 0, -30, -30],
  [-50, -30, -30, -30, -30, -30, -30, -50],
];

function isEndgame(chess: Chess): boolean {
  const board = chess.board();
  let nonKingMaterial = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type !== 'k' && piece.type !== 'p') {
        nonKingMaterial += PIECE_VALUES[piece.type];
      }
    }
  }
  return nonKingMaterial <= 2600;
}

/**
 * Evaluates board position in centipawns from White's perspective (+ = White ahead).
 */
export function evaluatePosition(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw()) {
    return 0;
  }

  const board = chess.board();
  const endgame = isEndgame(chess);
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const row = piece.color === 'w' ? r : 7 - r;
      let pst = 0;

      switch (piece.type) {
        case 'p':
          pst = PAWN_PST[row][c];
          break;
        case 'n':
          pst = KNIGHT_PST[row][c];
          break;
        case 'b':
          pst = BISHOP_PST[row][c];
          break;
        case 'r':
          pst = ROOK_PST[row][c];
          break;
        case 'q':
          pst = QUEEN_PST[row][c];
          break;
        case 'k':
          pst = endgame ? KING_END_PST[row][c] : KING_MID_PST[row][c];
          break;
      }

      const value = PIECE_VALUES[piece.type] + pst;
      score += piece.color === 'w' ? value : -value;
    }
  }

  return score;
}

function scoreMoveGuess(move: Move): number {
  let guess = 0;
  if (move.captured) {
    guess += 10 * PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece];
  }
  if (move.promotion) {
    guess += PIECE_VALUES[move.promotion];
  }
  if (move.san.includes('+')) {
    guess += 55;
  }
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    guess += 45;
  }
  return guess;
}

function orderMoves(moves: Move[]): Move[] {
  return moves.sort((a, b) => scoreMoveGuess(b) - scoreMoveGuess(a));
}

function quiescence(
  chess: Chess,
  alpha: number,
  beta: number,
  maximizingColor: PieceColor,
  depthLeft: number
): number {
  const rawEval = evaluatePosition(chess);
  const standPat = maximizingColor === 'w' ? rawEval : -rawEval;

  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;
  if (depthLeft <= 0 || chess.isGameOver()) return alpha;

  const captures = orderMoves(
    chess.moves({ verbose: true }).filter((m) => Boolean(m.captured) || Boolean(m.promotion))
  );

  for (const move of captures) {
    chess.move(move);
    const score = -quiescence(chess, -beta, -alpha, maximizingColor === 'w' ? 'b' : 'w', depthLeft - 1);
    chess.undo();

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  useQuiescence: boolean,
  deadlineMs: number
): number {
  if (Date.now() > deadlineMs) {
    const raw = evaluatePosition(chess);
    return chess.turn() === 'w' ? raw : -raw;
  }

  if (chess.isCheckmate()) {
    // Prefer faster checkmates by adding depth bonus to opponent win
    return -90000 - depth * 100;
  }
  if (chess.isDraw()) {
    return 0;
  }
  if (depth <= 0) {
    if (useQuiescence) {
      return quiescence(chess, alpha, beta, chess.turn(), 2);
    }
    const raw = evaluatePosition(chess);
    return chess.turn() === 'w' ? raw : -raw;
  }

  const moves = orderMoves(chess.moves({ verbose: true }));
  let best = -Infinity;

  for (const move of moves) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, -beta, -alpha, useQuiescence, deadlineMs);
    chess.undo();

    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }

  return best;
}

export function selectAIMove(fen: string, difficulty: AIDifficulty): Move | null {
  const chess = new Chess(fen);
  const legalMoves = orderMoves(chess.moves({ verbose: true }));
  if (legalMoves.length === 0) return null;
  if (legalMoves.length === 1) return legalMoves[0];

  const config: Record<AIDifficulty, { depth: number; jitter: number; quiescence: boolean; maxMs: number }> = {
    initiate: { depth: 1, jitter: 95, quiescence: false, maxMs: 200 },
    tactician: { depth: 2, jitter: 35, quiescence: false, maxMs: 350 },
    master: { depth: 3, jitter: 8, quiescence: true, maxMs: 750 },
    grandmaster: { depth: 4, jitter: 0, quiescence: true, maxMs: 1400 },
  };

  const { depth, jitter, quiescence: useQ, maxMs } = config[difficulty];
  const deadline = Date.now() + maxMs;

  const scored: Array<{ move: Move; score: number }> = [];

  for (const move of legalMoves) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, -Infinity, Infinity, useQ, deadline);
    chess.undo();
    const noise = jitter > 0 ? (Math.random() - 0.5) * jitter : 0;
    scored.push({ move, score: score + noise });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.move ?? legalMoves[0];
}

export function getBestHintMove(fen: string): Move | null {
  return selectAIMove(fen, 'master');
}

export interface CapturedSummary {
  capturedByWhite: PieceSymbol[];
  capturedByBlack: PieceSymbol[];
  advantageWhite: number;
}

const STARTING_COUNTS: Record<Exclude<PieceSymbol, 'k'>, number> = {
  q: 1,
  r: 2,
  b: 2,
  n: 2,
  p: 8,
};

const DISPLAY_ORDER: Array<Exclude<PieceSymbol, 'k'>> = ['q', 'r', 'b', 'n', 'p'];

const MATERIAL_POINTS: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export function computeCapturedSummary(fen: string): CapturedSummary {
  const chess = new Chess(fen);
  const board = chess.board();

  const currentWhite: Record<string, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 };
  const currentBlack: Record<string, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 };

  let whiteMaterial = 0;
  let blackMaterial = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.type === 'k') continue;
      if (piece.color === 'w') {
        currentWhite[piece.type] = (currentWhite[piece.type] || 0) + 1;
        whiteMaterial += MATERIAL_POINTS[piece.type];
      } else {
        currentBlack[piece.type] = (currentBlack[piece.type] || 0) + 1;
        blackMaterial += MATERIAL_POINTS[piece.type];
      }
    }
  }

  const capturedByWhite: PieceSymbol[] = [];
  const capturedByBlack: PieceSymbol[] = [];

  for (const type of DISPLAY_ORDER) {
    const missingBlack = Math.max(0, STARTING_COUNTS[type] - (currentBlack[type] || 0));
    for (let i = 0; i < missingBlack; i++) capturedByWhite.push(type);

    const missingWhite = Math.max(0, STARTING_COUNTS[type] - (currentWhite[type] || 0));
    for (let i = 0; i < missingWhite; i++) capturedByBlack.push(type);
  }

  return {
    capturedByWhite,
    capturedByBlack,
    advantageWhite: whiteMaterial - blackMaterial,
  };
}
