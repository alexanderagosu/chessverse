import React, { useState } from 'react';
import { GameMode, GameResult, PieceColor } from '../types/chess';
import { Check, Copy, Crown, Handshake } from 'lucide-react';

interface GameOverModalProps {
  open: boolean;
  mode: GameMode;
  result: GameResult | null;
  moveCount: number;
  pgn: string;
  onlineRole?: PieceColor | 'spectator' | null;
  rematchRequestedBy?: { w: boolean; b: boolean };
  onPlayAgain: () => void;
  onBackToLobby: () => void;
  onCloseInspect: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  open,
  mode,
  result,
  moveCount,
  pgn,
  onlineRole,
  rematchRequestedBy,
  onPlayAgain,
  onBackToLobby,
  onCloseInspect,
}) => {
  const [copiedPgn, setCopiedPgn] = useState(false);

  if (!open || !result) return null;

  const isDraw = result.winner === 'draw';
  const headline = isDraw
    ? 'Match Drawn'
    : result.winner === 'w'
      ? 'White Wins'
      : 'Black Wins';

  const myRematchSent = Boolean(
    mode === 'online' &&
      onlineRole &&
      onlineRole !== 'spectator' &&
      rematchRequestedBy?.[onlineRole]
  );

  const oppRematchSent = Boolean(
    mode === 'online' &&
      onlineRole &&
      onlineRole !== 'spectator' &&
      rematchRequestedBy?.[onlineRole === 'w' ? 'b' : 'w']
  );

  const handleCopyPgn = async () => {
    try {
      await navigator.clipboard.writeText(pgn);
      setCopiedPgn(true);
      setTimeout(() => setCopiedPgn(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      onClick={onCloseInspect}
    >
      <div
        className="w-full max-w-md bg-[#121622] border border-[#D4AF37]/35 rounded-2xl p-6 sm:p-7 shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#E5C158] mb-4">
          {isDraw ? <Handshake className="w-6 h-6" /> : <Crown className="w-6 h-6" />}
        </div>

        <h2 className="font-display text-2xl font-semibold text-[#F7F3EA]">
          {headline}
        </h2>
        <p className="text-sm text-[#CFC7B4] mt-1.5">{result.reason}</p>
        <p className="text-xs font-mono-tabular text-[#8E95A5] mt-2">
          {Math.ceil(moveCount / 2)} moves · {moveCount} half-moves
        </p>

        {oppRematchSent && !myRematchSent && (
          <p className="mt-4 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-3 py-2">
            Opponent requested a rematch. Accept below to swap colors and play again.
          </p>
        )}

        <div className="mt-6 space-y-2.5">
          {!(mode === 'online' && onlineRole === 'spectator') && (
            <button
              type="button"
              disabled={myRematchSent}
              onClick={onPlayAgain}
              className="w-full py-2.5 px-4 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-60 text-[#090B10] text-sm font-semibold transition-colors cursor-pointer"
            >
              {mode === 'online'
                ? myRematchSent
                  ? 'Waiting for opponent...'
                  : oppRematchSent
                    ? 'Accept Rematch'
                    : 'Request Rematch'
                : 'Play Again'}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCopyPgn}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#1A2030] border border-white/10 hover:border-white/25 text-xs font-medium text-[#EFEAE0] cursor-pointer"
            >
              {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPgn ? 'PGN Copied' : 'Copy PGN'}</span>
            </button>

            <button
              type="button"
              onClick={onCloseInspect}
              className="py-2.5 px-3 rounded-lg bg-[#1A2030] border border-white/10 hover:border-white/25 text-xs font-medium text-[#EFEAE0] cursor-pointer"
            >
              Inspect Board
            </button>
          </div>

          <button
            type="button"
            onClick={onBackToLobby}
            className="w-full py-2 text-xs text-[#9AA1B2] hover:text-white transition-colors cursor-pointer"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
