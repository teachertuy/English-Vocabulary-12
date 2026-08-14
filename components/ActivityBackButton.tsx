import React from 'react';
import { ExerciseSelectionConfig } from '../types';

export const CurvedBackArrowSVG: React.FC<{ className?: string; strokeWidth?: number }> = ({ 
  className = "w-[1.2em] h-[1.2em] inline-block", 
  strokeWidth = 3.2 
}) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    style={{ display: 'inline-block', verticalAlign: '-0.15em' }}
  >
    <path 
      d="M9.5 5.5L4 11L9.5 16.5" 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <path 
      d="M4.5 11H13.5C16.8137 11 19.5 13.6863 19.5 17V20" 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);

interface ActivityBackButtonProps {
  onClick: () => void;
  config?: Partial<ExerciseSelectionConfig>;
  className?: string;
}

export const ActivityBackButton: React.FC<ActivityBackButtonProps> = ({
  onClick,
  config,
  className = ''
}) => {
  const iconChoice = config?.actBackIcon ?? 'curved-arrow';
  const customIcon = config?.actBackCustomIcon ?? '';
  const text = config?.actBackText !== undefined ? config.actBackText : 'Quay lại';
  const color = config?.actBackColor || '#dc2626';
  const fontSize = config?.actBackFontSize !== undefined ? config.actBackFontSize : 1.0;
  const fontWeightClass = config?.actBackFontWeight === 'black' 
    ? 'font-black' 
    : config?.actBackFontWeight === 'medium' 
    ? 'font-medium' 
    : config?.actBackFontWeight === 'extrabold' 
    ? 'font-extrabold' 
    : 'font-bold';

  // Determine icon to render
  const renderIcon = () => {
    if (iconChoice === 'none') return null;
    if (iconChoice === 'curved-arrow' || iconChoice === 'arrow-curve' || iconChoice === 'corner-up-left') {
      return <CurvedBackArrowSVG />;
    }
    if (iconChoice === 'custom') {
      return customIcon ? <span className="inline-block leading-none">{customIcon}</span> : null;
    }
    return <span className="inline-block leading-none">{iconChoice}</span>;
  };

  const iconElement = renderIcon();
  const hasContent = iconElement || text;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        color: color,
        fontSize: `${fontSize}rem`,
      }}
      className={`inline-flex items-center gap-1.5 transition-all duration-200 focus:outline-none rounded active:scale-95 cursor-pointer select-none hover:opacity-80 hover:brightness-110 drop-shadow-2xs ${fontWeightClass} ${className}`}
      title="Quay lại danh sách bài tập"
    >
      {iconElement}
      {text && <span className="inline-block leading-none">{text}</span>}
      {!hasContent && <span className="inline-block leading-none"><CurvedBackArrowSVG /> Quay lại</span>}
    </button>
  );
};
