import React, { useId } from 'react';
import { PieceColor } from '../types/chess';
import { PieceSymbol } from 'chess.js';

interface ChessPieceProps {
  type: PieceSymbol;
  color: PieceColor;
  className?: string;
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, className = 'w-full h-full' }) => {
  const uid = useId().replace(/:/g, '');
  const isWhite = color === 'w';

  const bodyGradId = `cv-body-${uid}`;
  const trimGradId = `cv-trim-${uid}`;

  const strokeMain = isWhite ? '#7A5E2B' : '#C9A45C';
  const accentDetail = isWhite ? '#A9843E' : '#E5C158';
  const shadowColor = isWhite ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.68)';

  return (
    <svg
      viewBox="0 0 45 45"
      className={className}
      style={{ filter: `drop-shadow(0 3px 4px ${shadowColor})` }}
      aria-hidden="true"
    >
      <defs>
        {isWhite ? (
          <>
            <linearGradient id={bodyGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFDF8" />
              <stop offset="55%" stopColor="#EFE5D0" />
              <stop offset="100%" stopColor="#CBB893" />
            </linearGradient>
            <linearGradient id={trimGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#8A6924" />
            </linearGradient>
          </>
        ) : (
          <>
            <linearGradient id={bodyGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#353B4B" />
              <stop offset="52%" stopColor="#1B1F2A" />
              <stop offset="100%" stopColor="#0D1017" />
            </linearGradient>
            <linearGradient id={trimGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E6C667" />
              <stop offset="100%" stopColor="#9D7A30" />
            </linearGradient>
          </>
        )}
      </defs>

      {type === 'p' && (
        <g stroke={strokeMain} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="22.5" cy="13.5" r="5" fill={`url(#${bodyGradId})`} />
          <path
            d="M16.5 21.5 C16.5 18.8 19 18 22.5 18 C26 18 28.5 18.8 28.5 21.5 C26.5 23.2 25.5 26 26.8 29.5 L29.5 34.5 L15.5 34.5 L18.2 29.5 C19.5 26 18.5 23.2 16.5 21.5 Z"
            fill={`url(#${bodyGradId})`}
          />
          <rect x="13" y="34.5" width="19" height="3.8" rx="1.4" fill={`url(#${trimGradId})`} />
          <line x1="17.5" y1="21.5" x2="27.5" y2="21.5" stroke={accentDetail} strokeWidth="1.1" />
        </g>
      )}

      {type === 'r' && (
        <g stroke={strokeMain} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M12.5 9.5 L16.5 9.5 L16.5 13 L20.5 13 L20.5 9.5 L24.5 9.5 L24.5 13 L28.5 13 L28.5 9.5 L32.5 9.5 L32.5 16.5 L29.5 19.5 L29.5 31.5 L32.5 34.5 L12.5 34.5 L15.5 31.5 L15.5 19.5 L12.5 16.5 Z"
            fill={`url(#${bodyGradId})`}
          />
          <rect x="11" y="34.5" width="23" height="4" rx="1.4" fill={`url(#${trimGradId})`} />
          <line x1="15.5" y1="19.5" x2="29.5" y2="19.5" stroke={accentDetail} strokeWidth="1.15" />
          <line x1="15.5" y1="31.5" x2="29.5" y2="31.5" stroke={accentDetail} strokeWidth="1.15" />
        </g>
      )}

      {type === 'n' && (
        <g stroke={strokeMain} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M14.5 34.5 L15.8 28.5 C17.8 25.2 21.5 23.2 22.8 20.5 C20.5 21.2 17.5 22 14.8 22 C13.2 22 12 20.8 12.2 19.2 C12.7 16.5 15.8 12.2 19.8 9.8 L21.2 6.8 L24.2 9.2 C28.8 9.8 33 14.5 33 21.8 C33 26.8 31.5 31 30.2 34.5 Z"
            fill={`url(#${bodyGradId})`}
          />
          <circle cx="17.8" cy="14.5" r="1.1" fill={accentDetail} stroke="none" />
          <path
            d="M25.5 12.8 C28.2 15.2 29.2 19.5 28.6 24.5"
            fill="none"
            stroke={accentDetail}
            strokeWidth="1.15"
          />
          <rect x="11.5" y="34.5" width="22" height="4" rx="1.4" fill={`url(#${trimGradId})`} />
        </g>
      )}

      {type === 'b' && (
        <g stroke={strokeMain} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="22.5" cy="7.8" r="2.2" fill={`url(#${trimGradId})`} />
          <path
            d="M15.5 22.5 C15.5 16.5 19.5 11.2 22.5 10 C25.5 11.2 29.5 16.5 29.5 22.5 C29.5 25.8 27.6 27.8 26.2 29.2 L28.5 34.5 L16.5 34.5 L18.8 29.2 C17.4 27.8 15.5 25.8 15.5 22.5 Z"
            fill={`url(#${bodyGradId})`}
          />
          <line x1="22.5" y1="15.2" x2="22.5" y2="21.2" stroke={accentDetail} strokeWidth="1.35" />
          <line x1="19.5" y1="18.2" x2="25.5" y2="18.2" stroke={accentDetail} strokeWidth="1.35" />
          <line x1="17.5" y1="28.8" x2="27.5" y2="28.8" stroke={accentDetail} strokeWidth="1.1" />
          <rect x="12" y="34.5" width="21" height="4" rx="1.4" fill={`url(#${trimGradId})`} />
        </g>
      )}

      {type === 'q' && (
        <g stroke={strokeMain} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10.5" cy="12" r="2" fill={`url(#${trimGradId})`} />
          <circle cx="16.5" cy="9.2" r="2" fill={`url(#${trimGradId})`} />
          <circle cx="22.5" cy="7.8" r="2.2" fill={`url(#${trimGradId})`} />
          <circle cx="28.5" cy="9.2" r="2" fill={`url(#${trimGradId})`} />
          <circle cx="34.5" cy="12" r="2" fill={`url(#${trimGradId})`} />
          <path
            d="M11 14 L15 27.5 L16.8 11.5 L20.5 26.5 L22.5 10.2 L24.5 26.5 L28.2 11.5 L30 27.5 L34 14 L30.5 31.5 L14.5 31.5 Z"
            fill={`url(#${bodyGradId})`}
          />
          <path d="M14.5 31.5 L30.5 31.5 L31.8 34.5 L13.2 34.5 Z" fill={`url(#${bodyGradId})`} />
          <rect x="11.5" y="34.5" width="22" height="4" rx="1.4" fill={`url(#${trimGradId})`} />
        </g>
      )}

      {type === 'k' && (
        <g stroke={strokeMain} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22.5" y1="5.2" x2="22.5" y2="11.5" stroke={accentDetail} strokeWidth="2.1" />
          <line x1="19.5" y1="7.8" x2="25.5" y2="7.8" stroke={accentDetail} strokeWidth="2.1" />
          <path
            d="M15.8 15.8 C15.8 12.6 18.8 11.2 22.5 11.2 C26.2 11.2 29.2 12.6 29.2 15.8 C29.2 17.5 28 19 26.5 19.8 L32.2 16.5 C34.8 18.2 35 23.2 32 27.8 L29.5 31.5 L15.5 31.5 L13 27.8 C10 23.2 10.2 18.2 12.8 16.5 L18.5 19.8 C17 19 15.8 17.5 15.8 15.8 Z"
            fill={`url(#${bodyGradId})`}
          />
          <line x1="15.5" y1="28.2" x2="29.5" y2="28.2" stroke={accentDetail} strokeWidth="1.15" />
          <path d="M15.2 31.5 L29.8 31.5 L31.2 34.5 L13.8 34.5 Z" fill={`url(#${bodyGradId})`} />
          <rect x="11.5" y="34.5" width="22" height="4" rx="1.4" fill={`url(#${trimGradId})`} />
        </g>
      )}
    </svg>
  );
};
