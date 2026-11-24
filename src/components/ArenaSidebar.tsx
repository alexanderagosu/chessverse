import React, { useEffect, useRef, useState } from 'react';
import {
  BoardTheme,
  GameMode,
  GameResult,
  MoveRecord,
  OnlineChatMessage,
  PieceColor,
} from '../types/chess';
import {
  Check,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Copy,
  Flag,
  Handshake,
  Lightbulb,
  RotateCcw,
  RotateCw,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface ArenaSidebarProps {
  mode: GameMode;
  turn: PieceColor;
  inCheck: boolean;
  isGameOver: boolean;
  result: GameResult | null;
  evalCentipawns: number;
  moves: MoveRecord[];
  viewPly: number | null;
  onSelectPly: (ply: number | null) => void;
  boardTheme: BoardTheme;
  onChangeBoardTheme: (theme: BoardTheme) => void;
  muted: boolean;
  onToggleMute: () => void;
  onFlipBoard: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onHint?: () => void;
  onResign: () => void;
  onNewMatch: () => void;
  // Online specific
  onlineRoomId?: string;
  onlineStatus?: 'waiting' | 'active' | 'finished';
  onlineRole?: PieceColor | 'spectator' | null;
  spectatorCount?: number;
  drawOfferBy?: PieceColor | null;
  canClaimDraw?: boolean;
  onOfferDraw?: () => void;
  onRespondDraw?: (accept: boolean) => void;
  onClaimDraw?: () => void;
  chat?: OnlineChatMessage[];
  onSendChat?: (text: string) => void;
}

export const ArenaSidebar: React.FC<ArenaSidebarProps> = ({
  mode,
  turn,
  inCheck,
  isGameOver,
  result,
  evalCentipawns,
  moves,
  viewPly,
  onSelectPly,
  boardTheme,
  onChangeBoardTheme,
  muted,
  onToggleMute,
  onFlipBoard,
  onUndo,
  canUndo = false,
  onHint,
  onResign,
  onNewMatch,
  onlineRoomId,
  onlineStatus,
  onlineRole,
  spectatorCount = 0,
  drawOfferBy,
  canClaimDraw = false,
  onOfferDraw,
  onRespondDraw,
  onClaimDraw,
  chat = [],
  onSendChat,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const movesContainerRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (viewPly === null && movesContainerRef.current) {
      movesContainerRef.current.scrollTop = movesContainerRef.current.scrollHeight;
    }
  }, [moves.length, viewPly]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat.length]);

  useEffect(() => {
    setConfirmResign(false);
  }, [isGameOver, mode]);

  // Pair moves into rows of [White, Black]
  const movePairs: Array<{ moveNumber: number; white: MoveRecord; black?: MoveRecord }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  // Clamp evaluation bar smoothly between 6% and 94%
  const clampedCp = Math.max(-1000, Math.min(1000, evalCentipawns));
  const whitePercent = Math.round(50 + (clampedCp / 1000) * 44);
  const evalLabel =
    Math.abs(evalCentipawns) >= 90000
      ? evalCentipawns > 0
        ? 'M'
        : '-M'
      : `${evalCentipawns > 0 ? '+' : ''}${(evalCentipawns / 100).toFixed(1)}`;

  const handleCopyInvite = async () => {
    if (!onlineRoomId) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${onlineRoomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const activePly = viewPly ?? moves.length;

  const statusText = (() => {
    if (mode === 'online' && onlineStatus === 'waiting') {
      return 'Waiting for opponent to join room';
    }
    if (isGameOver && result) {
      return result.reason;
    }
    const sideLabel = turn === 'w' ? 'White' : 'Black';
    return inCheck ? `${sideLabel} to move · In Check` : `${sideLabel} to move`;
  })();

  return (
    <aside className="flex flex-col bg-[#10141E] border border-white/[0.08] rounded-2xl overflow-hidden h-full">
      {/* Header Status & Eval Bar */}
      <div className="p-4 border-b border-white/[0.07]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-[#E5C158]">
            {mode === 'computer'
              ? 'Solo vs Engine'
              : mode === 'local'
                ? 'Local Pass & Play'
                : 'Online Arena'}
          </span>
          <span className="text-xs font-mono-tabular text-[#8E95A5]">
            Ply {moves.length}
          </span>
        </div>

        <div className="mt-1.5 text-sm font-semibold text-[#F7F3EA]">
          {statusText}
        </div>

        {mode !== 'online' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#9AA1B2] mb-1">
              <span>Position Evaluation</span>
              <span>{evalLabel}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#1C2232] overflow-hidden border border-white/10">
              <div
                className="h-full bg-[#EDE5D0] transition-all duration-300"
                style={{ width: `${whitePercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Online Room Invite & Draw Offers */}
      {mode === 'online' && onlineRoomId && (
        <div className="px-4 py-3 bg-[#0C1018] border-b border-white/[0.07] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-[#CFC7B4]">
              Room <span className="font-mono-tabular font-semibold text-[#E5C158] tracking-wider">{onlineRoomId}</span>
              {spectatorCount > 0 && (
                <span className="text-[#8E95A5]"> · {spectatorCount} watching</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(onlineRoomId);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  } catch {
                    // Fallback ignored
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#181E2D] border border-white/10 hover:border-[#D4AF37]/50 text-xs text-[#F7F3EA] transition-colors cursor-pointer whitespace-nowrap"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#D4AF37]" />}
                <span>{copiedCode ? 'Copied' : 'Code'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="px-2.5 py-1 rounded-md bg-[#181E2D] border border-white/10 hover:border-[#D4AF37]/50 text-xs text-[#F7F3EA] transition-colors cursor-pointer whitespace-nowrap"
              >
                Invite Link
              </button>
            </div>
          </div>

          {/* Incoming Draw Offer */}
          {drawOfferBy &&
            onlineRole &&
            onlineRole !== 'spectator' &&
            drawOfferBy !== onlineRole &&
            !isGameOver && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#1A2133] border border-[#D4AF37]/40">
                <span className="text-xs text-[#F7F3EA]">Opponent offers a draw</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onRespondDraw?.(true)}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => onRespondDraw?.(false)}
                    className="px-2.5 py-1 rounded bg-[#262E42] hover:bg-[#323C56] text-[#CFC7B4] text-xs font-semibold cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

          {/* Claim Draw (3-fold repetition / 50-move rule) */}
          {canClaimDraw && onlineRole !== 'spectator' && !isGameOver && (
            <button
              type="button"
              onClick={onClaimDraw}
              className="w-full py-1.5 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37] text-[#E5C158] text-xs font-semibold hover:bg-[#D4AF37]/30 transition-colors cursor-pointer"
            >
              Claim Official FIDE Draw
            </button>
          )}
        </div>
      )}

      {/* Board Surface Theme Selector */}
      <div className="px-4 py-2.5 border-b border-white/[0.07] flex items-center justify-between gap-2">
        <span className="text-xs text-[#8E95A5] whitespace-nowrap">Board Surface</span>
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0B0E16] border border-white/[0.07]">
          {(
            [
              { id: 'chessverse-nebula', label: 'Nebula' },
              { id: 'chessverse-deep', label: 'Deep' },
              { id: 'tournament-obsidian', label: 'Slate' },
            ] as const
          ).map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChangeBoardTheme(theme.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                boardTheme === theme.id
                  ? 'bg-[#1D2333] text-[#E5C158]'
                  : 'text-[#8E95A5] hover:text-white'
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      {/* Move History List */}
      <div
        ref={movesContainerRef}
        className="flex-1 min-h-[180px] max-h-[280px] lg:max-h-[320px] overflow-y-auto chess-scroll px-3 py-2"
      >
        {movePairs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[#737B8C] py-10">
            No moves played yet. White opens.
          </div>
        ) : (
          <div className="space-y-0.5 font-mono-tabular text-xs">
            {movePairs.map((pair) => (
              <div
                key={pair.moveNumber}
                className="grid grid-cols-[36px_1fr_1fr] items-center gap-1 rounded px-1 py-0.5"
              >
                <span className="text-[#6F7788] select-none">{pair.moveNumber}.</span>
                <button
                  type="button"
                  onClick={() =>
                    onSelectPly(pair.white.ply === moves.length ? null : pair.white.ply)
                  }
                  className={`text-left px-2 py-1 rounded transition-colors cursor-pointer ${
                    activePly === pair.white.ply
                      ? 'bg-[#D4AF37]/25 text-[#F7F3EA] font-semibold'
                      : 'text-[#CFC7B4] hover:bg-white/[0.06]'
                  }`}
                >
                  {pair.white.san}
                </button>
                {pair.black ? (
                  <button
                    type="button"
                    onClick={() =>
                      onSelectPly(pair.black!.ply === moves.length ? null : pair.black!.ply)
                    }
                    className={`text-left px-2 py-1 rounded transition-colors cursor-pointer ${
                      activePly === pair.black.ply
                        ? 'bg-[#D4AF37]/25 text-[#F7F3EA] font-semibold'
                        : 'text-[#CFC7B4] hover:bg-white/[0.06]'
                    }`}
                  >
                    {pair.black.san}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Navigation Controls */}
      <div className="px-4 py-2 border-t border-white/[0.07] flex items-center justify-between bg-[#0C1018]">
        <button
          type="button"
          disabled={moves.length === 0 || activePly === 0}
          onClick={() => onSelectPly(0)}
          className="p-1.5 rounded text-[#9AA1B2] hover:text-white disabled:opacity-30 cursor-pointer"
          aria-label="Start position"
        >
          <ChevronFirst className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={moves.length === 0 || activePly <= 0}
          onClick={() => onSelectPly(Math.max(0, activePly - 1))}
          className="p-1.5 rounded text-[#9AA1B2] hover:text-white disabled:opacity-30 cursor-pointer"
          aria-label="Previous move"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={moves.length === 0 || viewPly === null}
          onClick={() => {
            if (viewPly === null) return;
            const next = viewPly + 1;
            onSelectPly(next >= moves.length ? null : next);
          }}
          className="p-1.5 rounded text-[#9AA1B2] hover:text-white disabled:opacity-30 cursor-pointer"
          aria-label="Next move"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={moves.length === 0 || viewPly === null}
          onClick={() => onSelectPly(null)}
          className="p-1.5 rounded text-[#9AA1B2] hover:text-white disabled:opacity-30 cursor-pointer"
          aria-label="Live position"
        >
          <ChevronLast className="w-4 h-4" />
        </button>
      </div>

      {/* Online Match Chat */}
      {mode === 'online' && onSendChat && (
        <div className="border-t border-white/[0.07] bg-[#0B0E16]">
          <div
            ref={chatContainerRef}
            className="h-28 overflow-y-auto chess-scroll px-3 py-2 space-y-1.5 text-xs"
          >
            {chat.length === 0 ? (
              <p className="text-[#6F7788] py-4 text-center">Match chat is open</p>
            ) : (
              chat.map((msg) => (
                <div key={msg.id} className="leading-snug">
                  <span className="font-semibold text-[#E5C158]">{msg.senderName}: </span>
                  <span className="text-[#D4CEC0] break-words">{msg.text}</span>
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatInput.trim()) return;
              onSendChat(chatInput);
              setChatInput('');
            }}
            className="flex items-center gap-1.5 p-2 border-t border-white/[0.06]"
          >
            <input
              type="text"
              maxLength={200}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message..."
              className="flex-1 px-2.5 py-1.5 rounded-md bg-[#121622] border border-white/10 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              className="p-1.5 rounded-md bg-[#D4AF37] text-[#090B10] hover:bg-[#E5C158] cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Tactical Action Bar */}
      <div className="p-3.5 border-t border-white/[0.08] bg-[#121622] space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {mode !== 'online' && onUndo && (
            <button
              type="button"
              disabled={!canUndo || isGameOver}
              onClick={onUndo}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#191F2E] border border-white/[0.07] hover:border-white/20 disabled:opacity-35 text-xs font-medium text-[#EFEAE0] cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          )}

          {mode === 'computer' && onHint && (
            <button
              type="button"
              disabled={isGameOver}
              onClick={onHint}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#191F2E] border border-white/[0.07] hover:border-white/20 disabled:opacity-35 text-xs font-medium text-[#EFEAE0] cursor-pointer whitespace-nowrap"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#E5C158]" />
              <span>Hint</span>
            </button>
          )}

          {mode === 'online' && onOfferDraw && (
            <button
              type="button"
              disabled={
                isGameOver ||
                onlineStatus !== 'active' ||
                onlineRole === 'spectator' ||
                drawOfferBy === onlineRole
              }
              onClick={onOfferDraw}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#191F2E] border border-white/[0.07] hover:border-white/20 disabled:opacity-35 text-xs font-medium text-[#EFEAE0] cursor-pointer whitespace-nowrap"
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>{drawOfferBy === onlineRole ? 'Offered' : 'Draw'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onFlipBoard}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#191F2E] border border-white/[0.07] hover:border-white/20 text-xs font-medium text-[#EFEAE0] cursor-pointer whitespace-nowrap"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Flip</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#191F2E] border border-white/[0.07] hover:border-white/20 text-xs font-medium text-[#EFEAE0] cursor-pointer whitespace-nowrap"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{muted ? 'Muted' : 'Sound'}</span>
          </button>
        </div>

        {/* Resign / New Game */}
        {!isGameOver ? (
          mode === 'online' && onlineRole === 'spectator' ? (
            <button
              type="button"
              onClick={onNewMatch}
              className="w-full py-2 rounded-lg bg-[#191F2E] border border-white/10 hover:border-white/25 text-xs font-semibold text-[#CFC7B4] cursor-pointer"
            >
              Leave Spectator View
            </button>
          ) : !confirmResign ? (
            <button
              type="button"
              disabled={mode === 'online' && onlineStatus !== 'active'}
              onClick={() => setConfirmResign(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#191F2E] border border-white/[0.07] hover:border-red-500/40 hover:text-red-300 disabled:opacity-35 text-xs font-medium text-[#B8AF9C] transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Resign Match</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmResign(false);
                  onResign();
                }}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Resign
              </button>
              <button
                type="button"
                onClick={() => setConfirmResign(false)}
                className="flex-1 py-2 rounded-lg bg-[#1E2436] text-[#CFC7B4] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )
        ) : (
          <button
            type="button"
            onClick={onNewMatch}
            className="w-full py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#090B10] text-xs font-semibold transition-colors cursor-pointer"
          >
            Play Again
          </button>
        )}
      </div>
    </aside>
  );
};
