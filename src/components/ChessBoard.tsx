import React, { useMemo, useState } from 'react';
import { Chess, Square } from 'chess.js';
import { BoardTheme, PieceColor, PromotionPiece } from '../types/chess';
import { ChessPiece } from './ChessPieces';

const BOARD_BACKDROP_SRC = '/src/assets/images/chessverse_board_backdrop_1795557252397.jpg';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

interface ChessBoardProps {
  fen: string;
  orientation: PieceColor;
  interactive: boolean;
  allowedColor?: PieceColor | 'both';
  boardTheme: BoardTheme;
  lastMove: { from: string; to: string } | null;
  hintMove?: { from: string; to: string } | null;
  inCheck: boolean;
  onMove: (from: string, to: string, promotion?: PromotionPiece) => void;
}

interface PendingPromotion {
  from: string;
  to: string;
  color: PieceColor;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  orientation,
  interactive,
  allowedColor = 'both',
  boardTheme,
  lastMove,
  hintMove,
  inCheck,
  onMove,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [dragFrom, setDragFrom] = useState<Square | null>(null);
  const [dragOverSquare, setDragOverSquare] = useState<Square | null>(null);
  const [pendingPromo, setPendingPromo] = useState<PendingPromotion | null>(null);
  const [backdropLoaded, setBackdropLoaded] = useState(true);

  const chess = useMemo(() => new Chess(fen), [fen]);
  const turn = chess.turn();

  const legalMovesForSelected = useMemo(() => {
    const activeSq = selectedSquare ?? dragFrom;
    if (!activeSq || !interactive) return new Map<Square, { isCapture: boolean; isPromotion: boolean }>();
    const moves = chess.moves({ square: activeSq, verbose: true });
    const map = new Map<Square, { isCapture: boolean; isPromotion: boolean }>();
    for (const m of moves) {
      map.set(m.to, {
        isCapture: m.isCapture(),
        isPromotion: m.isPromotion(),
      });
    }
    return map;
  }, [chess, selectedSquare, dragFrom, interactive]);

  const checkedKingSquare = useMemo(() => {
    if (!inCheck) return null;
    const kings = chess.findPiece({ type: 'k', color: turn });
    return kings[0] ?? null;
  }, [chess, inCheck, turn]);

  const displayedRanks = orientation === 'w' ? RANKS : [...RANKS].reverse();
  const displayedFiles = orientation === 'w' ? FILES : [...FILES].reverse();

  const canSelectPiece = (sq: Square): boolean => {
    if (!interactive) return false;
    const piece = chess.get(sq);
    if (!piece) return false;
    if (piece.color !== turn) return false;
    if (allowedColor !== 'both' && piece.color !== allowedColor) return false;
    return true;
  };

  const attemptMove = (from: Square, to: Square) => {
    const targetInfo = legalMovesForSelected.get(to);
    if (!targetInfo) {
      // Check directly in case drag-drop skipped selection state
      const directMoves = chess.moves({ square: from, verbose: true }).filter((m) => m.to === to);
      if (directMoves.length === 0) return false;
      const sample = directMoves[0];
      if (sample.isPromotion()) {
        setPendingPromo({ from, to, color: sample.color });
        setSelectedSquare(null);
        setDragFrom(null);
        return true;
      }
      onMove(from, to);
      setSelectedSquare(null);
      setDragFrom(null);
      return true;
    }

    if (targetInfo.isPromotion) {
      const piece = chess.get(from);
      setPendingPromo({ from, to, color: piece?.color ?? turn });
      setSelectedSquare(null);
      setDragFrom(null);
      return true;
    }

    onMove(from, to);
    setSelectedSquare(null);
    setDragFrom(null);
    return true;
  };

  const handleSquareClick = (sq: Square) => {
    if (!interactive || pendingPromo) return;

    if (selectedSquare) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        return;
      }
      if (legalMovesForSelected.has(sq)) {
        attemptMove(selectedSquare, sq);
        return;
      }
    }

    if (canSelectPiece(sq)) {
      setSelectedSquare(sq);
    } else {
      setSelectedSquare(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, sq: Square) => {
    if (!canSelectPiece(sq) || pendingPromo) {
      e.preventDefault();
      return;
    }
    setDragFrom(sq);
    setSelectedSquare(sq);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sq);
  };

  const handleDrop = (e: React.DragEvent, targetSq: Square) => {
    e.preventDefault();
    const fromSq = (dragFrom || (e.dataTransfer.getData('text/plain') as Square)) as Square;
    setDragOverSquare(null);
    if (!fromSq || fromSq === targetSq) {
      setDragFrom(null);
      return;
    }
    attemptMove(fromSq, targetSq);
  };

  const getSquareFill = (isLight: boolean): string => {
    switch (boardTheme) {
      case 'chessverse-deep':
        return isLight ? 'rgba(222, 210, 184, 0.44)' : 'rgba(9, 13, 22, 0.62)';
      case 'tournament-obsidian':
        return isLight ? '#E6DFCE' : '#252D3D';
      case 'chessverse-nebula':
      default:
        return isLight ? 'rgba(232, 223, 204, 0.72)' : 'rgba(14, 19, 31, 0.74)';
    }
  };

  const promotionOptions: PromotionPiece[] = ['q', 'r', 'b', 'n'];

  return (
    <div className="relative select-none w-full max-w-[600px] mx-auto">
      {/* Precision-milled Chessverse bezel */}
      <div className="relative rounded-2xl p-2.5 sm:p-3.5 bg-[#0C0F18] border border-[#D4AF37]/25 shadow-[0_24px_64px_rgba(0,0,0,0.75)]">
        {/* Chessverse Board Surface Container */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-[#07090F]">
          {/* Living Chessverse Cosmic Backdrop directly behind the squares */}
          {boardTheme !== 'tournament-obsidian' && (
            <div className="absolute inset-0 pointer-events-none">
              {backdropLoaded ? (
                <img
                  src={BOARD_BACKDROP_SRC}
                  alt="Chessverse cosmic astrolabe board surface"
                  referrerPolicy="no-referrer"
                  onError={() => setBackdropLoaded(false)}
                  className="w-full h-full object-cover opacity-90 scale-[1.03]"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 50%, rgba(212,175,55,0.16) 0%, rgba(16,24,42,0.92) 60%, #07090F 100%)',
                  }}
                />
              )}
              <div className="absolute inset-0 bg-[#080B12]/20" />
            </div>
          )}

          {/* 8x8 Grid */}
          <div className="relative z-10 grid grid-cols-8 grid-rows-8 w-full h-full">
            {displayedRanks.map((rank, rIdx) =>
              displayedFiles.map((file, fIdx) => {
                const sq = `${file}${rank}` as Square;
                const fileIndex = FILES.indexOf(file);
                const rankNumber = Number(rank);
                const isLight = (fileIndex + rankNumber) % 2 === 1;
                const piece = chess.get(sq);

                const isSelected = selectedSquare === sq;
                const isLastFrom = lastMove?.from === sq;
                const isLastTo = lastMove?.to === sq;
                const isHintFrom = hintMove?.from === sq;
                const isHintTo = hintMove?.to === sq;
                const legalTarget = legalMovesForSelected.get(sq);
                const isCheckedKing = checkedKingSquare === sq;
                const isDragHover = dragOverSquare === sq;
                const isSelectable = canSelectPiece(sq);

                return (
                  <button
                    key={sq}
                    type="button"
                    onClick={() => handleSquareClick(sq)}
                    onDragOver={(e) => {
                      if (!interactive) return;
                      e.preventDefault();
                      if (dragOverSquare !== sq) setDragOverSquare(sq);
                    }}
                    onDragLeave={() => {
                      if (dragOverSquare === sq) setDragOverSquare(null);
                    }}
                    onDrop={(e) => handleDrop(e, sq)}
                    aria-label={`Square ${sq}${piece ? ` ${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}` : ''}`}
                    style={{ backgroundColor: getSquareFill(isLight) }}
                    className={`relative flex items-center justify-center w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] transition-colors duration-150 ${
                      isSelectable ? 'cursor-pointer' : legalTarget ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {/* Last move warm gold wash */}
                    {(isLastFrom || isLastTo) && (
                      <span
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundColor: isLight
                            ? 'rgba(212, 175, 55, 0.34)'
                            : 'rgba(212, 175, 55, 0.28)',
                        }}
                      />
                    )}

                    {/* Selected square highlight */}
                    {isSelected && (
                      <span className="absolute inset-0 pointer-events-none bg-[#D4AF37]/38 ring-2 ring-inset ring-[#F3D977]" />
                    )}

                    {/* Hint move highlight */}
                    {(isHintFrom || isHintTo) && (
                      <span className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-emerald-400 bg-emerald-400/20" />
                    )}

                    {/* Drag target highlight */}
                    {isDragHover && legalTarget && (
                      <span className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-[#F3D977] bg-[#D4AF37]/25" />
                    )}

                    {/* King in check radial warning */}
                    {isCheckedKing && (
                      <span
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(circle, rgba(239,68,68,0.85) 0%, rgba(220,38,38,0.45) 55%, transparent 80%)',
                        }}
                      />
                    )}

                    {/* Rank coordinate (left edge) */}
                    {fIdx === 0 && (
                      <span
                        className={`absolute top-0.5 left-1 text-[10px] font-mono-tabular font-semibold leading-none pointer-events-none ${
                          isLight ? 'text-[#202634]/80' : 'text-[#EDE6D6]/75'
                        }`}
                      >
                        {rank}
                      </span>
                    )}

                    {/* File coordinate (bottom edge) */}
                    {rIdx === 7 && (
                      <span
                        className={`absolute bottom-0.5 right-1 text-[10px] font-mono-tabular font-semibold leading-none pointer-events-none ${
                          isLight ? 'text-[#202634]/80' : 'text-[#EDE6D6]/75'
                        }`}
                      >
                        {file}
                      </span>
                    )}

                    {/* Legal move indicator */}
                    {legalTarget && !legalTarget.isCapture && (
                      <span className="relative z-20 w-[26%] h-[26%] rounded-full bg-[#D4AF37]/80 ring-2 ring-black/25 pointer-events-none transition-transform duration-150" />
                    )}
                    {legalTarget && legalTarget.isCapture && (
                      <span className="absolute inset-[6%] z-20 rounded-full border-[3px] border-[#D4AF37]/85 pointer-events-none" />
                    )}

                    {/* Chess piece */}
                    {piece && (
                      <div
                        draggable={isSelectable && !pendingPromo}
                        onDragStart={(e) => handleDragStart(e, sq)}
                        onDragEnd={() => {
                          setDragFrom(null);
                          setDragOverSquare(null);
                        }}
                        className={`relative z-10 w-[84%] h-[84%] transition-transform duration-150 ${
                          isSelected ? 'scale-108 -translate-y-0.5' : 'hover:scale-[1.04]'
                        }`}
                      >
                        <ChessPiece type={piece.type} color={piece.color} />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Pawn Promotion Picker Modal inside board frame */}
          {pendingPromo && (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-xs"
              onClick={() => setPendingPromo(null)}
            >
              <div
                className="bg-[#121622] border border-[#D4AF37]/40 rounded-xl p-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs font-medium text-[#CFC7B4] text-center mb-3">
                  Choose promotion piece
                </p>
                <div className="flex items-center gap-2.5">
                  {promotionOptions.map((promoType) => (
                    <button
                      key={promoType}
                      type="button"
                      onClick={() => {
                        onMove(pendingPromo.from, pendingPromo.to, promoType);
                        setPendingPromo(null);
                      }}
                      className="w-14 h-14 p-2 rounded-lg bg-[#1A2030] border border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/15 transition-colors cursor-pointer"
                      aria-label={`Promote to ${promoType}`}
                    >
                      <ChessPiece type={promoType} color={pendingPromo.color} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Engraved Chessverse nameplate on the board bezel */}
        <div className="mt-2 flex items-center justify-between px-1.5 text-[11px] text-[#B8AF9C]">
          <span className="font-display tracking-[0.22em] text-[#D4AF37]/90 font-semibold">
            CHESSVERSE
          </span>
          <span className="font-mono-tabular text-[#8E95A5]">
            {orientation === 'w' ? 'White Perspective' : 'Black Perspective'}
          </span>
        </div>
      </div>
    </div>
  );
};
