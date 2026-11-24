import React from 'react';
import { X } from 'lucide-react';

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

const RULES_SECTIONS = [
  {
    title: '01. Castling (Kingside & Queenside)',
    body: 'Once per game, the King may move two squares toward an unmoved Rook, and the Rook leaps over to the adjacent square. Neither piece may have moved previously, squares between them must be empty, and the King cannot start in, pass through, or land in check.',
  },
  {
    title: '02. En Passant Capture',
    body: 'When a pawn advances two squares from its starting rank and lands beside an opponent pawn, the opponent pawn may capture it diagonally as if it had moved only one square—only on the very next turn.',
  },
  {
    title: '03. Pawn Promotion',
    body: 'Any pawn reaching the farthest rank immediately transforms into a Queen, Rook, Bishop, or Knight of the same color, regardless of how many pieces remain on the board.',
  },
  {
    title: '04. Checkmate & Stalemate',
    body: 'Checkmate ends the game immediately in victory when the King is attacked with no legal escape. Stalemate occurs when the side to move has no legal moves and is not in check, resulting in a draw.',
  },
  {
    title: '05. Official Draw Conditions',
    body: 'Chessverse enforces insufficient material draws (such as King vs. King or King + Bishop vs. King), threefold repetition of an identical board position, and the fifty-move rule (fifty consecutive moves by both sides without a pawn push or capture).',
  },
];

export const RulesModal: React.FC<RulesModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto chess-scroll bg-[#121622] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-modal-title"
      >
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/[0.08]">
          <div>
            <h2 id="rules-modal-title" className="font-display text-2xl font-semibold text-[#F6F1E7]">
              Official FIDE Rules Enforced
            </h2>
            <p className="text-sm text-[#9AA1B2] mt-1">
              Every local, computer, and server-authoritative online match follows standard tournament laws.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#9AA1B2] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close rules"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {RULES_SECTIONS.map((item) => (
            <div key={item.title} className="pb-5 border-b border-white/[0.06] last:border-b-0 last:pb-0">
              <h3 className="text-sm font-semibold text-[#E5C158]">{item.title}</h3>
              <p className="text-sm text-[#CFC7B4] leading-relaxed mt-1.5">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/[0.08] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#D4AF37] text-[#0A0D14] hover:bg-[#E5C158] transition-colors cursor-pointer whitespace-nowrap"
          >
            Return to Chessverse
          </button>
        </div>
      </div>
    </div>
  );
};
