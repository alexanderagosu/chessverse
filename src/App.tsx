import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import {
  AIDifficulty,
  BoardTheme,
  GameMode,
  GameResult,
  MoveRecord,
  PieceColor,
  PromotionPiece,
  TIME_CONTROLS,
} from './types/chess';
import { computeCapturedSummary, evaluatePosition, getBestHintMove, selectAIMove } from './engine/chessAI';
import { soundFX } from './engine/soundFX';
import { useOnlineChess } from './hooks/useOnlineChess';
import { ChessBoard } from './components/ChessBoard';
import { PlayerBar } from './components/PlayerBar';
import { ArenaSidebar } from './components/ArenaSidebar';
import { LobbyView } from './components/LobbyView';
import { RulesModal } from './components/RulesModal';
import { GameOverModal } from './components/GameOverModal';
import { ArrowLeft, Eye } from 'lucide-react';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function evaluateChessResult(chess: Chess): GameResult | null {
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

function playMoveSound(record: MoveRecord, isGameOver: boolean, winner: PieceColor | 'draw' | null): void {
  if (isGameOver) {
    soundFX.playGameEnd(winner !== 'draw');
    return;
  }
  if (record.isCheck) {
    soundFX.playCheck();
  } else if (record.promotion) {
    soundFX.playPromotion();
  } else if (record.isCastle) {
    soundFX.playCastle();
  } else if (record.captured) {
    soundFX.playCapture();
  } else {
    soundFX.playMove();
  }
}

export default function App() {
  const [view, setView] = useState<'lobby' | 'arena'>('lobby');
  const [selectedMode, setSelectedMode] = useState<GameMode>('computer');
  const [activeMode, setActiveMode] = useState<GameMode>('computer');
  const [rulesOpen, setRulesOpen] = useState(false);

  // Lobby configuration
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('tactician');
  const [playerColorPref, setPlayerColorPref] = useState<PieceColor | 'random'>('w');
  const [timeControlId, setTimeControlId] = useState<string>('10+5');
  const [whiteName, setWhiteName] = useState('Player 1');
  const [blackName, setBlackName] = useState('Player 2');
  const [onlineName, setOnlineName] = useState('Challenger');
  const [joinCode, setJoinCode] = useState('');
  const [isPublicRoom, setIsPublicRoom] = useState(true);

  // Arena preferences
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('chessverse-nebula');
  const [muted, setMuted] = useState(false);
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);

  // Local / Computer game state
  const localChessRef = useRef<Chess>(new Chess());
  const [localFen, setLocalFen] = useState(START_FEN);
  const [localMoves, setLocalMoves] = useState<MoveRecord[]>([]);
  const [localLastMove, setLocalLastMove] = useState<{ from: string; to: string } | null>(null);
  const [localResult, setLocalResult] = useState<GameResult | null>(null);
  const [localEvalCp, setLocalEvalCp] = useState(0);
  const [humanColor, setHumanColor] = useState<PieceColor>('w');
  const [aiThinking, setAiThinking] = useState(false);
  const [localClocks, setLocalClocks] = useState<{ whiteMs: number; blackMs: number; incrementMs: number; enabled: boolean }>({
    whiteMs: 10 * 60_000,
    blackMs: 10 * 60_000,
    incrementMs: 5_000,
    enabled: true,
  });
  const lastLocalTickRef = useRef<number | null>(null);
  const aiTimerRef = useRef<number | null>(null);

  // Online multiplayer hook
  const online = useOnlineChess();
  const prevOnlinePlyRef = useRef<number>(0);
  const prevOnlineStatusRef = useRef<string>('waiting');
  const [onlineDisplayClocks, setOnlineDisplayClocks] = useState<{ whiteMs: number; blackMs: number }>({
    whiteMs: 0,
    blackMs: 0,
  });

  // Load public rooms when viewing lobby in online mode
  useEffect(() => {
    if (view === 'lobby' && selectedMode === 'online') {
      void online.fetchPublicRooms();
    }
  }, [view, selectedMode, online.fetchPublicRooms]);

  // Deep-link ?room=XXXXXX support
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && /^[A-Za-z0-9]{4,8}$/.test(roomParam.trim())) {
      const code = roomParam.trim().toUpperCase();
      setSelectedMode('online');
      setJoinCode(code);
      setActiveMode('online');
      setView('arena');
      online.joinRoom({ roomId: code, playerName: onlineName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAiTimer = useCallback(() => {
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    setAiThinking(false);
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundFX.setMuted(next);
  };

  // Start Computer or Local Match
  const startLocalOrComputerMatch = useCallback(
    (mode: 'computer' | 'local') => {
      clearAiTimer();
      online.leaveRoom();

      const tc = TIME_CONTROLS.find((t) => t.id === timeControlId) ?? TIME_CONTROLS[2];
      const fresh = new Chess();
      localChessRef.current = fresh;

      const resolvedHumanColor: PieceColor =
        mode === 'computer'
          ? playerColorPref === 'random'
            ? Math.random() < 0.5
              ? 'w'
              : 'b'
            : playerColorPref
          : 'w';

      setActiveMode(mode);
      setHumanColor(resolvedHumanColor);
      setOrientation(resolvedHumanColor);
      setLocalFen(fresh.fen());
      setLocalMoves([]);
      setLocalLastMove(null);
      setLocalResult(null);
      setLocalEvalCp(0);
      setViewPly(null);
      setHintMove(null);
      setShowGameOverModal(false);

      setLocalClocks({
        whiteMs: tc.initialMs,
        blackMs: tc.initialMs,
        incrementMs: tc.incrementMs,
        enabled: tc.initialMs > 0,
      });
      lastLocalTickRef.current = tc.initialMs > 0 ? Date.now() : null;
      setView('arena');
    },
    [clearAiTimer, online, playerColorPref, timeControlId]
  );

  // Start Online Match
  const handleCreateOnline = () => {
    clearAiTimer();
    prevOnlinePlyRef.current = 0;
    prevOnlineStatusRef.current = 'waiting';
    setActiveMode('online');
    setViewPly(null);
    setHintMove(null);
    setShowGameOverModal(false);
    setView('arena');
    online.createRoom({
      playerName: onlineName.trim() || 'Player 1',
      preferredColor: playerColorPref,
      timeControlId,
      isPublic: isPublicRoom,
    });
  };

  const handleJoinOnline = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    clearAiTimer();
    prevOnlinePlyRef.current = 0;
    prevOnlineStatusRef.current = 'waiting';
    setActiveMode('online');
    setViewPly(null);
    setHintMove(null);
    setShowGameOverModal(false);
    setView('arena');
    online.joinRoom({
      roomId: clean,
      playerName: onlineName.trim() || 'Challenger',
    });
  };

  // Sync online board orientation, sounds, and modal when snapshot updates
  useEffect(() => {
    if (activeMode !== 'online' || !online.snapshot) return;
    const snap = online.snapshot;

    if (online.role === 'b') {
      setOrientation('b');
    } else if (online.role === 'w' && snap.moves.length === 0) {
      setOrientation('w');
    }

    setOnlineDisplayClocks({
      whiteMs: snap.clocks.whiteMs,
      blackMs: snap.clocks.blackMs,
    });

    if (snap.moves.length > prevOnlinePlyRef.current) {
      const latest = snap.moves[snap.moves.length - 1];
      playMoveSound(latest, snap.status === 'finished', snap.result?.winner ?? null);
      setViewPly(null);
    } else if (snap.status === 'finished' && prevOnlineStatusRef.current !== 'finished') {
      soundFX.playGameEnd(snap.result?.winner !== 'draw');
    }

    prevOnlinePlyRef.current = snap.moves.length;
    prevOnlineStatusRef.current = snap.status;

    if (snap.status === 'finished' && snap.result) {
      setShowGameOverModal(true);
    } else {
      setShowGameOverModal(false);
    }
  }, [activeMode, online.snapshot, online.role]);

  // Smooth local display ticker for Online clocks
  useEffect(() => {
    if (activeMode !== 'online' || !online.snapshot) return;
    const snap = online.snapshot;
    if (snap.status !== 'active' || !snap.clocks.active || snap.timeControl.initialMs <= 0) {
      return;
    }
    const baseWhite = snap.clocks.whiteMs;
    const baseBlack = snap.clocks.blackMs;
    const startAt = Date.now();
    const activeTurn = snap.turn;

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startAt;
      setOnlineDisplayClocks({
        whiteMs: activeTurn === 'w' ? Math.max(0, baseWhite - elapsed) : baseWhite,
        blackMs: activeTurn === 'b' ? Math.max(0, baseBlack - elapsed) : baseBlack,
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [activeMode, online.snapshot]);

  // Local / Computer clock tick loop
  useEffect(() => {
    if (view !== 'arena' || activeMode === 'online' || localResult || !localClocks.enabled) {
      return;
    }

    lastLocalTickRef.current = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const prev = lastLocalTickRef.current ?? now;
      const elapsed = Math.max(0, now - prev);
      lastLocalTickRef.current = now;

      const turn = localChessRef.current.turn();
      setLocalClocks((curr) => {
        if (!curr.enabled) return curr;
        if (turn === 'w') {
          const nextW = Math.max(0, curr.whiteMs - elapsed);
          if (nextW === 0) {
            clearAiTimer();
            const res: GameResult = { winner: 'b', reason: 'White ran out of time' };
            setLocalResult(res);
            setShowGameOverModal(true);
            soundFX.playGameEnd(true);
          }
          return { ...curr, whiteMs: nextW };
        } else {
          const nextB = Math.max(0, curr.blackMs - elapsed);
          if (nextB === 0) {
            clearAiTimer();
            const res: GameResult = { winner: 'w', reason: 'Black ran out of time' };
            setLocalResult(res);
            setShowGameOverModal(true);
            soundFX.playGameEnd(true);
          }
          return { ...curr, blackMs: nextB };
        }
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [view, activeMode, localResult, localClocks.enabled, clearAiTimer]);

  // Commit a move in Local / Computer mode
  const commitLocalMove = useCallback(
    (from: string, to: string, promotion?: PromotionPiece): boolean => {
      if (localResult) return false;
      const chess = localChessRef.current;

      try {
        const move = chess.move({ from, to, promotion });
        const moverColor = move.color;

        if (localClocks.enabled && localClocks.incrementMs > 0) {
          setLocalClocks((curr) => ({
            ...curr,
            whiteMs: moverColor === 'w' ? curr.whiteMs + curr.incrementMs : curr.whiteMs,
            blackMs: moverColor === 'b' ? curr.blackMs + curr.incrementMs : curr.blackMs,
          }));
        }

        const ply = localMoves.length + 1;
        const record: MoveRecord = {
          ply,
          moveNumber: Math.ceil(ply / 2),
          color: moverColor,
          san: move.san,
          from: move.from,
          to: move.to,
          fen: chess.fen(),
          captured: move.captured,
          promotion: move.promotion,
          isCheck: chess.isCheck(),
          isCheckmate: chess.isCheckmate(),
          isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
          isEnPassant: move.isEnPassant(),
        };

        const endResult = evaluateChessResult(chess);
        playMoveSound(record, Boolean(endResult), endResult?.winner ?? null);

        setLocalFen(chess.fen());
        setLocalMoves((prev) => [...prev, record]);
        setLocalLastMove({ from: move.from, to: move.to });
        setLocalEvalCp(evaluatePosition(chess));
        setHintMove(null);
        setViewPly(null);

        if (endResult) {
          setLocalResult(endResult);
          setShowGameOverModal(true);
        }
        return true;
      } catch {
        return false;
      }
    },
    [localResult, localClocks.enabled, localClocks.incrementMs, localMoves.length]
  );

  // Trigger AI response automatically when it is the computer's turn
  useEffect(() => {
    if (view !== 'arena' || activeMode !== 'computer' || localResult) return;
    const chess = localChessRef.current;
    if (chess.isGameOver()) return;

    const aiColor: PieceColor = humanColor === 'w' ? 'b' : 'w';
    if (chess.turn() !== aiColor) return;

    setAiThinking(true);
    const delayMs = aiDifficulty === 'grandmaster' ? 380 : 520;
    const fenSnapshot = chess.fen();

    aiTimerRef.current = window.setTimeout(() => {
      const chosen = selectAIMove(fenSnapshot, aiDifficulty);
      setAiThinking(false);
      aiTimerRef.current = null;
      if (chosen) {
        commitLocalMove(chosen.from, chosen.to, chosen.promotion as PromotionPiece | undefined);
      }
    }, delayMs);

    return () => {
      if (aiTimerRef.current !== null) {
        window.clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
      setAiThinking(false);
    };
  }, [view, activeMode, localFen, localResult, humanColor, aiDifficulty, commitLocalMove]);

  const handleBoardMove = (from: string, to: string, promotion?: PromotionPiece) => {
    if (viewPly !== null) return;
    if (activeMode === 'online') {
      online.submitMove(from, to, promotion);
      return;
    }
    if (activeMode === 'computer') {
      if (localChessRef.current.turn() !== humanColor || aiThinking) return;
    }
    commitLocalMove(from, to, promotion);
  };

  const handleUndo = () => {
    if (activeMode === 'online' || localResult || localMoves.length === 0) return;
    clearAiTimer();

    const chess = localChessRef.current;
    let pliesToUndo = 1;
    if (activeMode === 'computer' && chess.turn() === humanColor && localMoves.length >= 2) {
      pliesToUndo = 2;
    }

    for (let i = 0; i < pliesToUndo; i++) {
      chess.undo();
    }

    const updatedMoves = localMoves.slice(0, localMoves.length - pliesToUndo);
    const prevMove = updatedMoves[updatedMoves.length - 1];

    setLocalMoves(updatedMoves);
    setLocalFen(chess.fen());
    setLocalLastMove(prevMove ? { from: prevMove.from, to: prevMove.to } : null);
    setLocalEvalCp(evaluatePosition(chess));
    setHintMove(null);
    setViewPly(null);
  };

  const handleHint = () => {
    if (activeMode !== 'computer' || localResult || aiThinking) return;
    if (localChessRef.current.turn() !== humanColor) return;
    const best = getBestHintMove(localChessRef.current.fen());
    if (best) {
      setHintMove({ from: best.from, to: best.to });
    }
  };

  const handleResign = () => {
    if (activeMode === 'online') {
      online.resignMatch();
      return;
    }
    if (localResult) return;
    clearAiTimer();
    const loser = activeMode === 'computer' ? humanColor : localChessRef.current.turn();
    const winner: PieceColor = loser === 'w' ? 'b' : 'w';
    setLocalResult({
      winner,
      reason: `${loser === 'w' ? 'White' : 'Black'} resigned`,
    });
    setShowGameOverModal(true);
    soundFX.playGameEnd(true);
  };

  const handleReturnToLobby = () => {
    clearAiTimer();
    if (activeMode === 'online') {
      online.leaveRoom();
      // Remove ?room= query param cleanly
      if (window.location.search.includes('room=')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    setShowGameOverModal(false);
    setView('lobby');
  };

  // Derive active Arena display props
  const isOnline = activeMode === 'online';
  const snap = online.snapshot;

  const liveFen = isOnline ? snap?.fen ?? START_FEN : localFen;
  const liveMoves = isOnline ? snap?.moves ?? [] : localMoves;
  const liveLastMove = isOnline ? snap?.lastMove ?? null : localLastMove;
  const liveTurn: PieceColor = isOnline ? snap?.turn ?? 'w' : localChessRef.current.turn();
  const liveResult = isOnline ? snap?.result ?? null : localResult;
  const liveInCheck = isOnline ? snap?.inCheck ?? false : localChessRef.current.isCheck();
  const livePgn = isOnline ? snap?.pgn ?? '' : localChessRef.current.pgn();

  const displayedFen = useMemo(() => {
    if (viewPly === null) return liveFen;
    if (viewPly <= 0) return START_FEN;
    return liveMoves[viewPly - 1]?.fen ?? liveFen;
  }, [viewPly, liveFen, liveMoves]);

  const displayedLastMove = useMemo(() => {
    if (viewPly === null) return liveLastMove;
    if (viewPly <= 0) return null;
    const m = liveMoves[viewPly - 1];
    return m ? { from: m.from, to: m.to } : null;
  }, [viewPly, liveLastMove, liveMoves]);

  const displayedInCheck = useMemo(() => {
    if (viewPly === null) return liveInCheck;
    if (viewPly <= 0) return false;
    return liveMoves[viewPly - 1]?.isCheck ?? false;
  }, [viewPly, liveInCheck, liveMoves]);

  const captured = useMemo(() => computeCapturedSummary(displayedFen), [displayedFen]);

  const canInteractWithBoard = useMemo(() => {
    if (viewPly !== null) return false;
    if (liveResult) return false;
    if (isOnline) {
      if (!snap || snap.status !== 'active') return false;
      if (online.role !== 'w' && online.role !== 'b') return false;
      return snap.turn === online.role;
    }
    if (activeMode === 'computer') {
      return !aiThinking && liveTurn === humanColor;
    }
    return true;
  }, [viewPly, liveResult, isOnline, snap, online.role, activeMode, aiThinking, liveTurn, humanColor]);

  const allowedColor: PieceColor | 'both' = isOnline
    ? online.role === 'w' || online.role === 'b'
      ? online.role
      : 'w'
    : activeMode === 'computer'
      ? humanColor
      : 'both';

  // Player info for top & bottom bars based on board orientation
  const topColor: PieceColor = orientation === 'w' ? 'b' : 'w';
  const bottomColor: PieceColor = orientation;

  const getPlayerProps = (color: PieceColor) => {
    if (isOnline) {
      const slot = snap?.players[color] ?? null;
      const timeEnabled = (snap?.timeControl.initialMs ?? 0) > 0;
      const timeMs = timeEnabled
        ? color === 'w'
          ? onlineDisplayClocks.whiteMs
          : onlineDisplayClocks.blackMs
        : null;

      return {
        name: slot?.name ?? (snap?.status === 'waiting' ? 'Waiting for opponent...' : 'Open Seat'),
        subtitle: snap?.status === 'waiting' ? 'Share room code' : 'Standing by',
        color,
        isTurn: snap?.status === 'active' && snap.turn === color,
        isThinking: false,
        isBot: false,
        connected: slot ? slot.connected : true,
        capturedPieces: color === 'w' ? captured.capturedByWhite : captured.capturedByBlack,
        materialAdvantage:
          color === 'w'
            ? Math.max(0, captured.advantageWhite)
            : Math.max(0, -captured.advantageWhite),
        timeMs,
      };
    }

    if (activeMode === 'computer') {
      const isBot = color !== humanColor;
      const diffTitle = aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1);
      return {
        name: isBot ? `Chessverse ${diffTitle}` : 'You',
        subtitle: isBot ? 'Calibrated Engine' : 'Challenger',
        color,
        isTurn: !localResult && liveTurn === color,
        isThinking: isBot && aiThinking,
        isBot,
        connected: true,
        capturedPieces: color === 'w' ? captured.capturedByWhite : captured.capturedByBlack,
        materialAdvantage:
          color === 'w'
            ? Math.max(0, captured.advantageWhite)
            : Math.max(0, -captured.advantageWhite),
        timeMs: localClocks.enabled ? (color === 'w' ? localClocks.whiteMs : localClocks.blackMs) : null,
      };
    }

    return {
      name: color === 'w' ? whiteName.trim() || 'Player 1' : blackName.trim() || 'Player 2',
      subtitle: 'Local Player',
      color,
      isTurn: !localResult && liveTurn === color,
      isThinking: false,
      isBot: false,
      connected: true,
      capturedPieces: color === 'w' ? captured.capturedByWhite : captured.capturedByBlack,
      materialAdvantage:
        color === 'w'
          ? Math.max(0, captured.advantageWhite)
          : Math.max(0, -captured.advantageWhite),
      timeMs: localClocks.enabled ? (color === 'w' ? localClocks.whiteMs : localClocks.blackMs) : null,
    };
  };

  return (
    <div className="min-h-screen bg-[#090B10] text-[#F1EDE4] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#090B10]/95 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text wordmark */}
          <button
            type="button"
            onClick={handleReturnToLobby}
            className="font-display text-xl font-bold tracking-[0.14em] text-[#F7F3EA] hover:text-[#E5C158] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            CHESSVERSE
          </button>

          {/* Zone 2: 4 clean single-line text nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#A3AABB]">
            <button
              type="button"
              onClick={() => {
                setSelectedMode('computer');
                if (view === 'arena') handleReturnToLobby();
              }}
              className={`hover:text-[#F7F3EA] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'lobby' && selectedMode === 'computer'
                  ? 'text-[#E5C158] underline underline-offset-8 decoration-[#D4AF37]/70'
                  : ''
              }`}
            >
              Play Computer
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedMode('local');
                if (view === 'arena') handleReturnToLobby();
              }}
              className={`hover:text-[#F7F3EA] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'lobby' && selectedMode === 'local'
                  ? 'text-[#E5C158] underline underline-offset-8 decoration-[#D4AF37]/70'
                  : ''
              }`}
            >
              Local Match
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedMode('online');
                if (view === 'arena') handleReturnToLobby();
              }}
              className={`hover:text-[#F7F3EA] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'lobby' && selectedMode === 'online'
                  ? 'text-[#E5C158] underline underline-offset-8 decoration-[#D4AF37]/70'
                  : ''
              }`}
            >
              Online Arena
            </button>
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="hover:text-[#F7F3EA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Rules
            </button>
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="shrink-0">
            {view === 'lobby' ? (
              <button
                type="button"
                onClick={() => {
                  if (selectedMode === 'computer') startLocalOrComputerMatch('computer');
                  else if (selectedMode === 'local') startLocalOrComputerMatch('local');
                  else handleCreateOnline();
                }}
                className="px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#090B10] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                New Match
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReturnToLobby}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#161B28] border border-white/10 hover:border-[#D4AF37]/50 text-[#F7F3EA] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Lobby</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      {view === 'lobby' ? (
        <LobbyView
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          aiDifficulty={aiDifficulty}
          onChangeAiDifficulty={setAiDifficulty}
          playerColorPref={playerColorPref}
          onChangePlayerColorPref={setPlayerColorPref}
          timeControlId={timeControlId}
          onChangeTimeControlId={setTimeControlId}
          whiteName={whiteName}
          blackName={blackName}
          onChangeWhiteName={setWhiteName}
          onChangeBlackName={setBlackName}
          onlineName={onlineName}
          onChangeOnlineName={setOnlineName}
          joinCode={joinCode}
          onChangeJoinCode={setJoinCode}
          isPublicRoom={isPublicRoom}
          onChangeIsPublicRoom={setIsPublicRoom}
          publicRooms={online.publicRooms}
          loadingRooms={online.loadingRooms}
          onlineError={online.error}
          onlineConnecting={online.connecting}
          onRefreshRooms={() => void online.fetchPublicRooms()}
          onStartComputer={() => startLocalOrComputerMatch('computer')}
          onStartLocal={() => startLocalOrComputerMatch('local')}
          onCreateOnline={handleCreateOnline}
          onJoinOnline={handleJoinOnline}
        />
      ) : (
        <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-8 py-5 sm:py-7">
          {isOnline && online.error && (
            <div className="mb-4 flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-500/35 text-xs text-red-200">
              <span>{online.error}</span>
              <button
                type="button"
                onClick={handleReturnToLobby}
                className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-white font-semibold cursor-pointer"
              >
                Back to Lobby
              </button>
            </div>
          )}

          {isOnline && online.role === 'spectator' && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141926] border border-white/10 text-xs text-[#CFC7B4]">
              <Eye className="w-4 h-4 text-[#E5C158]" />
              <span>Spectator mode · This room already has two active players.</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_370px] xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
            {/* Board Column */}
            <section className="flex flex-col gap-3 w-full max-w-[600px] mx-auto lg:max-w-none">
              <div className="w-full max-w-[600px] mx-auto space-y-3">
                <PlayerBar {...getPlayerProps(topColor)} />

                {viewPly !== null && (
                  <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-[#1A2133] border border-[#D4AF37]/40 text-xs">
                    <span className="text-[#F7F3EA]">
                      Inspecting move {viewPly} of {liveMoves.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewPly(null)}
                      className="font-semibold text-[#E5C158] hover:underline cursor-pointer"
                    >
                      Return to Live
                    </button>
                  </div>
                )}

                <ChessBoard
                  fen={displayedFen}
                  orientation={orientation}
                  interactive={canInteractWithBoard}
                  allowedColor={allowedColor}
                  boardTheme={boardTheme}
                  lastMove={displayedLastMove}
                  hintMove={viewPly === null ? hintMove : null}
                  inCheck={displayedInCheck}
                  onMove={handleBoardMove}
                />

                <PlayerBar {...getPlayerProps(bottomColor)} />
              </div>
            </section>

            {/* Right Tactical Panel */}
            <ArenaSidebar
              mode={activeMode}
              turn={liveTurn}
              inCheck={liveInCheck}
              isGameOver={Boolean(liveResult)}
              result={liveResult}
              evalCentipawns={localEvalCp}
              moves={liveMoves}
              viewPly={viewPly}
              onSelectPly={setViewPly}
              boardTheme={boardTheme}
              onChangeBoardTheme={setBoardTheme}
              muted={muted}
              onToggleMute={toggleMute}
              onFlipBoard={() => setOrientation((prev) => (prev === 'w' ? 'b' : 'w'))}
              onUndo={activeMode !== 'online' ? handleUndo : undefined}
              canUndo={
                activeMode === 'computer'
                  ? localMoves.length >= (localChessRef.current.turn() === humanColor ? 2 : 1)
                  : localMoves.length >= 1
              }
              onHint={activeMode === 'computer' ? handleHint : undefined}
              onResign={handleResign}
              onNewMatch={() => {
                if (activeMode === 'online') {
                  if (liveResult) {
                    online.requestRematch();
                  } else {
                    handleReturnToLobby();
                  }
                } else {
                  startLocalOrComputerMatch(activeMode);
                }
              }}
              onlineRoomId={snap?.roomId}
              onlineStatus={snap?.status}
              onlineRole={online.role}
              spectatorCount={snap?.spectatorCount ?? 0}
              drawOfferBy={snap?.drawOfferBy ?? null}
              canClaimDraw={snap?.canClaimDraw ?? false}
              onOfferDraw={online.offerDraw}
              onRespondDraw={online.respondDraw}
              onClaimDraw={online.claimDraw}
              chat={snap?.chat ?? []}
              onSendChat={online.sendChat}
            />
          </div>
        </main>
      )}

      {/* Modals */}
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <GameOverModal
        open={showGameOverModal}
        mode={activeMode}
        result={liveResult}
        moveCount={liveMoves.length}
        pgn={livePgn}
        onlineRole={online.role}
        rematchRequestedBy={snap?.rematchRequestedBy}
        onPlayAgain={() => {
          if (activeMode === 'online') {
            online.requestRematch();
          } else {
            startLocalOrComputerMatch(activeMode);
          }
        }}
        onBackToLobby={handleReturnToLobby}
        onCloseInspect={() => setShowGameOverModal(false)}
      />
    </div>
  );
}
