import React from 'react';
import { PieceSymbol } from 'chess.js';
import { PieceColor } from '../types/chess';
import { ChessPiece } from './ChessPieces';
import { Clock } from 'lucide-react';

const BOT_AVATAR_SRC = '/src/assets/images/chessverse_bot_avatar_1795557253182.jpg';

interface PlayerBarProps {
  name: string;
  subtitle: string;
  color: PieceColor;
  isTurn: boolean;
  isThinking?: boolean;
  isBot?: boolean;
  connected?: boolean;
  capturedPieces: PieceSymbol[];
  materialAdvantage: number;
  timeMs: number | null;
}

export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (clamped < 20_000) {
    const tenths = Math.floor((clamped % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  name,
  subtitle,
  color,
  isTurn,
  isThinking = false,
  isBot = false,
  connected = true,
  capturedPieces,
  materialAdvantage,
  timeMs,
}) => {
  const isLowTime = timeMs !== null && timeMs > 0 && timeMs < 20_000;

  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border transition-colors duration-200 ${
        isTurn
          ? 'bg-[#151A27] border-[#D4AF37]/45'
          : 'bg-[#10141E] border-white/[0.07]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div
          className={`relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border flex items-center justify-center ${
            color === 'w'
              ? 'bg-[#EFE5D0] text-[#171B26] border-[#D4AF37]/50'
              : 'bg-[#1A202E] text-[#EFE5D0] border-white/15'
          }`}
        >
          {isBot ? (
            <img
              src={BOT_AVATAR_SRC}
              alt={name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-display font-bold text-sm">
              {name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[#F4EFE4] truncate max-w-[160px]">
              {name}
            </span>
            <span className="text-xs text-[#9AA1B2] whitespace-nowrap">
              · {color === 'w' ? 'White' : 'Black'}
            </span>
            {!connected && (
              <span className="text-xs text-amber-400 whitespace-nowrap">
                · Reconnecting
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 min-h-[18px]">
            <span
              className={`text-xs whitespace-nowrap ${
                isTurn ? 'text-[#E5C158] font-medium' : 'text-[#7F8799]'
              }`}
            >
              {isThinking ? 'Calculating move...' : isTurn ? 'Active turn' : subtitle}
            </span>

            {capturedPieces.length > 0 && (
              <div className="flex items-center -space-x-1 ml-1">
                {capturedPieces.slice(0, 10).map((pieceType, idx) => (
                  <div key={`${pieceType}-${idx}`} className="w-4 h-4">
                    <ChessPiece
                      type={pieceType}
                      color={color === 'w' ? 'b' : 'w'}
                    />
                  </div>
                ))}
              </div>
            )}

            {materialAdvantage > 0 && (
              <span className="text-xs font-mono-tabular text-[#CFC7B4] font-medium">
                +{materialAdvantage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chess Clock */}
      {timeMs !== null && (
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono-tabular text-base font-semibold shrink-0 ${
            isLowTime && isTurn
              ? 'bg-red-950/50 border-red-500/50 text-red-300'
              : isTurn
                ? 'bg-[#1D2333] border-[#D4AF37]/40 text-[#F8F3E6]'
                : 'bg-[#0C1018] border-white/[0.06] text-[#8E95A5]'
          }`}
        >
          <Clock className="w-3.5 h-3.5 opacity-75" />
          <span>{formatClock(timeMs)}</span>
        </div>
      )}
    </div>
  );
};
