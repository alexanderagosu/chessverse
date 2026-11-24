import React, { useState } from 'react';
import {
  AIDifficulty,
  GameMode,
  PieceColor,
  PublicRoomListing,
  TIME_CONTROLS,
} from '../types/chess';
import { Cpu, Globe, RefreshCw, ShieldCheck, Users } from 'lucide-react';

const HERO_ART_SRC = '/src/assets/images/chessverse_hero_crest_1795557253272.jpg';

interface LobbyViewProps {
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  // Computer settings
  aiDifficulty: AIDifficulty;
  onChangeAiDifficulty: (d: AIDifficulty) => void;
  playerColorPref: PieceColor | 'random';
  onChangePlayerColorPref: (c: PieceColor | 'random') => void;
  timeControlId: string;
  onChangeTimeControlId: (id: string) => void;
  // Local settings
  whiteName: string;
  blackName: string;
  onChangeWhiteName: (v: string) => void;
  onChangeBlackName: (v: string) => void;
  // Online settings
  onlineName: string;
  onChangeOnlineName: (v: string) => void;
  joinCode: string;
  onChangeJoinCode: (v: string) => void;
  isPublicRoom: boolean;
  onChangeIsPublicRoom: (v: boolean) => void;
  publicRooms: PublicRoomListing[];
  loadingRooms: boolean;
  onlineError: string | null;
  onlineConnecting: boolean;
  onRefreshRooms: () => void;
  onStartComputer: () => void;
  onStartLocal: () => void;
  onCreateOnline: () => void;
  onJoinOnline: (code: string) => void;
}

const DIFFICULTIES: Array<{ id: AIDifficulty; label: string; rating: string }> = [
  { id: 'initiate', label: 'Initiate', rating: '850' },
  { id: 'tactician', label: 'Tactician', rating: '1350' },
  { id: 'master', label: 'Master', rating: '1750' },
  { id: 'grandmaster', label: 'Grandmaster', rating: '2100+' },
];

export const LobbyView: React.FC<LobbyViewProps> = ({
  selectedMode,
  onSelectMode,
  aiDifficulty,
  onChangeAiDifficulty,
  playerColorPref,
  onChangePlayerColorPref,
  timeControlId,
  onChangeTimeControlId,
  whiteName,
  blackName,
  onChangeWhiteName,
  onChangeBlackName,
  onlineName,
  onChangeOnlineName,
  joinCode,
  onChangeJoinCode,
  isPublicRoom,
  onChangeIsPublicRoom,
  publicRooms,
  loadingRooms,
  onlineError,
  onlineConnecting,
  onRefreshRooms,
  onStartComputer,
  onStartLocal,
  onCreateOnline,
  onJoinOnline,
}) => {
  const [heroLoaded, setHeroLoaded] = useState(true);

  return (
    <main className="max-w-[1380px] mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Command Center & Gamemode Setup */}
        <section className="lg:col-span-7 flex flex-col justify-between bg-[#10141E] border border-white/[0.08] rounded-2xl p-6 sm:p-8">
          <div>
            <p className="text-xs font-medium text-[#D4AF37] tracking-wide">
              Celestial Strategy Arena · Official FIDE Laws
            </p>
            <h1 className="font-display text-3xl sm:text-4xl xl:text-[42px] font-semibold text-[#F7F3EA] leading-[1.15] mt-2 text-balance">
              Master the Celestial Board.
            </h1>
            <p className="text-sm sm:text-base text-[#A3AABB] leading-relaxed mt-3 max-w-xl">
              Challenge our calibrated tactical engine, play side by side on one screen, or host a live server-validated match with players anywhere.
            </p>

            {/* 3-Mode Interactive Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-7">
              <button
                type="button"
                onClick={() => onSelectMode('computer')}
                className={`flex flex-col items-start text-left p-4 rounded-xl border transition-colors duration-150 cursor-pointer ${
                  selectedMode === 'computer'
                    ? 'bg-[#181E2E] border-[#D4AF37]/70 text-[#F7F3EA]'
                    : 'bg-[#0C1018] border-white/[0.07] text-[#A3AABB] hover:border-white/20 hover:text-[#F7F3EA]'
                }`}
              >
                <Cpu className={`w-5 h-5 mb-2.5 ${selectedMode === 'computer' ? 'text-[#E5C158]' : 'text-[#7F8799]'}`} />
                <span className="text-sm font-semibold whitespace-nowrap">With a Computer</span>
                <span className="text-xs text-[#8E95A5] mt-1">Four calibrated AI tiers</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('local')}
                className={`flex flex-col items-start text-left p-4 rounded-xl border transition-colors duration-150 cursor-pointer ${
                  selectedMode === 'local'
                    ? 'bg-[#181E2E] border-[#D4AF37]/70 text-[#F7F3EA]'
                    : 'bg-[#0C1018] border-white/[0.07] text-[#A3AABB] hover:border-white/20 hover:text-[#F7F3EA]'
                }`}
              >
                <Users className={`w-5 h-5 mb-2.5 ${selectedMode === 'local' ? 'text-[#E5C158]' : 'text-[#7F8799]'}`} />
                <span className="text-sm font-semibold whitespace-nowrap">Local Multiplayer</span>
                <span className="text-xs text-[#8E95A5] mt-1">Pass-and-play dual clocks</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('online')}
                className={`flex flex-col items-start text-left p-4 rounded-xl border transition-colors duration-150 cursor-pointer ${
                  selectedMode === 'online'
                    ? 'bg-[#181E2E] border-[#D4AF37]/70 text-[#F7F3EA]'
                    : 'bg-[#0C1018] border-white/[0.07] text-[#A3AABB] hover:border-white/20 hover:text-[#F7F3EA]'
                }`}
              >
                <Globe className={`w-5 h-5 mb-2.5 ${selectedMode === 'online' ? 'text-[#E5C158]' : 'text-[#7F8799]'}`} />
                <span className="text-sm font-semibold whitespace-nowrap">Online Multiplayer</span>
                <span className="text-xs text-[#8E95A5] mt-1">Live rooms & invite codes</span>
              </button>
            </div>

            {/* Mode-Specific Configuration Panel */}
            <div className="mt-6 pt-6 border-t border-white/[0.08] space-y-5">
              {/* Time Control (shared across all modes) */}
              <div>
                <label className="block text-xs font-medium text-[#B8AF9C] mb-2">
                  Time Control
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {TIME_CONTROLS.map((tc) => (
                    <button
                      key={tc.id}
                      type="button"
                      onClick={() => onChangeTimeControlId(tc.id)}
                      className={`px-3 py-2 rounded-lg border text-center transition-colors cursor-pointer ${
                        timeControlId === tc.id
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F7F3EA]'
                          : 'bg-[#0C1018] border-white/[0.08] text-[#9AA1B2] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-mono-tabular font-semibold whitespace-nowrap">{tc.label}</div>
                      <div className="text-[11px] text-[#8E95A5] mt-0.5">{tc.category}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedMode === 'computer' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-[#B8AF9C] mb-2">
                      Engine Strength
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {DIFFICULTIES.map((tier) => (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => onChangeAiDifficulty(tier.id)}
                          className={`px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                            aiDifficulty === tier.id
                              ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F7F3EA]'
                              : 'bg-[#0C1018] border-white/[0.08] text-[#9AA1B2] hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-semibold">{tier.label}</div>
                          <div className="text-[11px] font-mono-tabular text-[#8E95A5]">ELO {tier.rating}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#B8AF9C] mb-2">
                      Play As
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'w', label: 'White' },
                          { id: 'random', label: 'Random' },
                          { id: 'b', label: 'Black' },
                        ] as const
                      ).map((side) => (
                        <button
                          key={side.id}
                          type="button"
                          onClick={() => onChangePlayerColorPref(side.id)}
                          className={`px-3 py-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            playerColorPref === side.id
                              ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F7F3EA]'
                              : 'bg-[#0C1018] border-white/[0.08] text-[#9AA1B2] hover:text-white'
                          }`}
                        >
                          {side.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedMode === 'local' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="local-white-name" className="block text-xs font-medium text-[#B8AF9C] mb-1.5">
                      White Player Name
                    </label>
                    <input
                      id="local-white-name"
                      type="text"
                      maxLength={24}
                      value={whiteName}
                      onChange={(e) => onChangeWhiteName(e.target.value)}
                      placeholder="Player 1"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#0C1018] border border-white/10 text-sm text-[#F7F3EA] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label htmlFor="local-black-name" className="block text-xs font-medium text-[#B8AF9C] mb-1.5">
                      Black Player Name
                    </label>
                    <input
                      id="local-black-name"
                      type="text"
                      maxLength={24}
                      value={blackName}
                      onChange={(e) => onChangeBlackName(e.target.value)}
                      placeholder="Player 2"
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#0C1018] border border-white/10 text-sm text-[#F7F3EA] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              )}

              {selectedMode === 'online' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="online-player-name" className="block text-xs font-medium text-[#B8AF9C] mb-1.5">
                        Your Display Name
                      </label>
                      <input
                        id="online-player-name"
                        type="text"
                        maxLength={24}
                        value={onlineName}
                        onChange={(e) => onChangeOnlineName(e.target.value)}
                        placeholder="Grandmaster"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#0C1018] border border-white/10 text-sm text-[#F7F3EA] focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#B8AF9C] mb-1.5">
                        Preferred Side & Visibility
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="grid grid-cols-3 gap-1.5 flex-1">
                          {(
                            [
                              { id: 'w', label: 'W' },
                              { id: 'random', label: 'Auto' },
                              { id: 'b', label: 'B' },
                            ] as const
                          ).map((side) => (
                            <button
                              key={side.id}
                              type="button"
                              onClick={() => onChangePlayerColorPref(side.id)}
                              className={`py-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                                playerColorPref === side.id
                                  ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F7F3EA]'
                                  : 'bg-[#0C1018] border-white/[0.08] text-[#9AA1B2] hover:text-white'
                              }`}
                            >
                              {side.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => onChangeIsPublicRoom(!isPublicRoom)}
                          className={`px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            isPublicRoom
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                              : 'bg-[#0C1018] border-white/10 text-[#9AA1B2]'
                          }`}
                        >
                          {isPublicRoom ? 'Public' : 'Private'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Join by Room Code */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={joinCode}
                      onChange={(e) => onChangeJoinCode(e.target.value.toUpperCase())}
                      placeholder="Enter 6-character room code"
                      className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#0C1018] border border-white/10 text-sm font-mono-tabular uppercase tracking-wider text-[#F7F3EA] focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      disabled={onlineConnecting || joinCode.trim().length < 4}
                      onClick={() => onJoinOnline(joinCode)}
                      className="px-5 py-2.5 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#E5C158] hover:bg-[#D4AF37]/20 disabled:opacity-45 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Join Room
                    </button>
                  </div>

                  {/* Open Public Lobby */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#B8AF9C]">
                        Open Public Matches
                      </span>
                      <button
                        type="button"
                        onClick={onRefreshRooms}
                        className="flex items-center gap-1.5 text-xs text-[#9AA1B2] hover:text-[#E5C158] transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>
                    {publicRooms.length === 0 ? (
                      <div className="px-4 py-3 rounded-lg bg-[#0C1018] border border-white/[0.06] text-xs text-[#7F8799]">
                        No open matches waiting right now. Create a public match below or share a private invite link.
                      </div>
                    ) : (
                      <div className="max-h-32 overflow-y-auto chess-scroll space-y-1.5">
                        {publicRooms.map((room) => (
                          <div
                            key={room.roomId}
                            className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-[#0C1018] border border-white/[0.07]"
                          >
                            <div className="text-xs text-[#CFC7B4] truncate">
                              <span className="font-semibold text-white">{room.hostName}</span>
                              <span className="text-[#7F8799]"> · {room.timeControlLabel} · Room </span>
                              <span className="font-mono-tabular text-[#E5C158]">{room.roomId}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => onJoinOnline(room.roomId)}
                              className="px-3 py-1 rounded-md bg-[#D4AF37] text-[#090B10] text-xs font-semibold hover:bg-[#E5C158] transition-colors cursor-pointer shrink-0"
                            >
                              Join
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {onlineError && (
                    <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
                      {onlineError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Primary Launch Action */}
          <div className="mt-7 pt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[#8E95A5]">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>Castling · En Passant · Promotion · Repetition & 50-Move Enforced</span>
            </div>

            {selectedMode === 'computer' && (
              <button
                type="button"
                onClick={onStartComputer}
                className="px-6 py-3 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#090B10] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Play vs Computer
              </button>
            )}
            {selectedMode === 'local' && (
              <button
                type="button"
                onClick={onStartLocal}
                className="px-6 py-3 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#090B10] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Start Local Match
              </button>
            )}
            {selectedMode === 'online' && (
              <button
                type="button"
                disabled={onlineConnecting}
                onClick={onCreateOnline}
                className="px-6 py-3 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-50 text-[#090B10] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {onlineConnecting ? 'Connecting...' : 'Create Online Room'}
              </button>
            )}
          </div>
        </section>

        {/* Right Column: Full-height AAA Visual Showcase */}
        <aside className="lg:col-span-5 flex">
          <div className="relative w-full min-h-[340px] lg:min-h-full rounded-2xl overflow-hidden border border-white/[0.09] bg-[#0D1018]">
            {heroLoaded ? (
              <img
                src={HERO_ART_SRC}
                alt="Chessverse obsidian and gold King standing on cosmic glass board"
                referrerPolicy="no-referrer"
                onError={() => setHeroLoaded(false)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background:
                    'radial-gradient(circle at 60% 35%, rgba(212,175,55,0.22) 0%, #101522 55%, #07090F 100%)',
                }}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#080A0F] via-[#080A0F]/45 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
              <p className="text-xs font-medium text-[#E5C158]">
                Chessverse Board Architecture
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F7F3EA] mt-1">
                Astrolabe Cosmic Surface
              </h2>
              <p className="text-xs sm:text-sm text-[#CFC7B4] leading-relaxed mt-2">
                Every match unfolds across the signature Chessverse celestial board—pairing translucent obsidian and ivory glass squares with precision-milled Staunton pieces.
              </p>

              <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/15 text-xs">
                <div>
                  <div className="text-[#8E95A5]">Ruleset</div>
                  <div className="font-semibold text-[#F7F3EA] mt-0.5">FIDE Standard</div>
                </div>
                <div>
                  <div className="text-[#8E95A5]">Online Sync</div>
                  <div className="font-semibold text-[#F7F3EA] mt-0.5">Authoritative WS</div>
                </div>
                <div>
                  <div className="text-[#8E95A5]">Engine</div>
                  <div className="font-semibold text-[#F7F3EA] mt-0.5">4 AI Tiers</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};
