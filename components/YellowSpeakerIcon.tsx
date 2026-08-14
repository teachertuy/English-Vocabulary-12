import React from 'react';

export const YellowSpeakerSVG: React.FC<{ className?: string }> = ({ className = "w-11 h-11" }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="rotate(-18 32 32)">
      {/* Speaker rear body cylinder */}
      <path 
        d="M18 36L12 32C11 31.2 11 29.8 12 29L20 23.5C21 22.8 22.5 23.5 22.5 24.8V34.2C22.5 35.5 21 36.2 20 35.5L18 36Z" 
        fill="#334155" 
        stroke="#1E293B" 
        strokeWidth="1.2"
      />
      {/* Speaker cone body */}
      <path 
        d="M22.5 24.8L39 15C40.2 14.2 42 15.1 42 16.5V43.5C42 44.9 40.2 45.8 39 45L22.5 35.2V24.8Z" 
        fill="#475569" 
        stroke="#1E293B" 
        strokeWidth="1.2"
      />
      {/* Horn mouth outer blue ellipse */}
      <ellipse 
        cx="42" 
        cy="30" 
        rx="3.5" 
        ry="14" 
        fill="#0EA5E9" 
        stroke="#0284C7" 
        strokeWidth="1.2"
      />
      {/* Horn mouth inner dark ellipse */}
      <ellipse 
        cx="42" 
        cy="30" 
        rx="1.8" 
        ry="9" 
        fill="#0F172A" 
      />
      {/* Sound waves (curved arcs top-right) */}
      <path 
        d="M48 21C52.5 24 52.5 36 48 39" 
        stroke="#475569" 
        strokeWidth="2.8" 
        strokeLinecap="round"
      />
      <path 
        d="M53.5 16C60 21 60 39 53.5 44" 
        stroke="#64748b" 
        strokeWidth="2.8" 
        strokeLinecap="round"
      />
    </g>
  </svg>
);

interface YellowSpeakerButtonProps {
  onClick: () => void;
  isPlaying?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  size?: 'normal' | 'large';
}

export const YellowSpeakerButton: React.FC<YellowSpeakerButtonProps> = ({
  onClick,
  isPlaying = false,
  isLoading = false,
  disabled = false,
  size = 'normal'
}) => {
  const sizeClasses = size === 'large' ? 'w-22 h-22 sm:w-24 sm:h-24' : 'w-20 h-20 sm:w-22 sm:h-22';
  const iconSizeClasses = size === 'large' ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-10 h-10 sm:w-12 sm:h-12';

  return (
    <div className="flex flex-col items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`group relative flex items-center justify-center rounded-full transition-all duration-300 shadow-lg border-4 border-white cursor-pointer ${sizeClasses} ${
          isPlaying 
            ? 'bg-amber-400 scale-110 ring-8 ring-amber-200 animate-pulse' 
            : 'bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-60'
        }`}
        title="Nhấn để nghe phát âm"
      >
        {isPlaying && (
          <span className="absolute inset-0 rounded-full bg-amber-300 opacity-75 animate-ping"></span>
        )}
        
        {isLoading ? (
          <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <YellowSpeakerSVG className={`${iconSizeClasses} transition-transform ${isPlaying ? 'scale-110' : 'group-hover:scale-110'}`} />
        )}
      </button>

      <p className="text-xs sm:text-sm font-black text-amber-800 uppercase tracking-wide flex items-center gap-1.5 mt-0.5">
        <span className="text-base">👉</span>
        {isPlaying ? (
          <span className="text-amber-600 font-black animate-pulse">ĐANG PHÁT ÂM...</span>
        ) : (
          <span>NHẤN LOA ĐỂ NGHE PHÁT ÂM</span>
        )}
      </p>
    </div>
  );
};
