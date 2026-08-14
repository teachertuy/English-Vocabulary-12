import React from 'react';
import { ExerciseSelectionConfig } from '../types';

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
  const iconChoice = config?.actBackIcon ?? '<<';
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

  // Determine which icon to render
  let displayIcon = '';
  if (iconChoice === 'custom') {
    displayIcon = customIcon;
  } else if (iconChoice !== 'none') {
    displayIcon = iconChoice;
  }

  // Fallback if both icon and text are empty
  const hasContent = displayIcon || text;

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
      {displayIcon && <span className="inline-block leading-none">{displayIcon}</span>}
      {text && <span className="inline-block leading-none">{text}</span>}
      {!hasContent && <span className="inline-block leading-none">&lt;&lt;Quay lại</span>}
    </button>
  );
};
