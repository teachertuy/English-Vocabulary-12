
import React, { useState, useEffect } from 'react';
import { ExerciseSelectionConfig } from '../types';
import { listenToExerciseSelectionConfig } from '../services/firebaseService';
import { FIXED_CLASSROOM_ID } from '../constants';

interface Props {
  onSelect: (type: number | 'topics') => void;
  onBack: () => void;
}

// Fixed missing properties in DEFAULT_CONFIG
const DEFAULT_CONFIG: ExerciseSelectionConfig = {
    mainTitle: 'TỪ VỰNG TIẾNG ANH 12 & TỪ VỰNG THEO CHỦ ĐỀ',
    mainTitleFontSize: 1.875,
    mainTitleColor: '#dc2626',
    subtitle: '(Chọn một mục bên dưới để bắt đầu luyện tập)',
    subtitleFontSize: 1.125,
    subtitleColor: '#4b5563',
    backButtonText: 'Quay lại',
    card1Title: 'English 12',
    card1Icon: '📝',
    card1Color: '#3b82f6',
    card2Title: 'Topic-based vocabulary',
    card2Icon: '📰',
    card2Color: '#a855f7',
    cardFontSize: 1.5,
    cardHeight: 10,
    cardBorderRadius: 16,
    unitLabelText: 'UNIT',
    topicLabelText: 'TOPIC',
    exitButtonText: 'Thoát',
    unitCardBgColor: '#00A9C3',
    unitCardColors: ['#00ACC1', '#2E7D32', '#AFB42B', '#D84315', '#C62828', '#D81B60', '#7B1FA2', '#1976D2', '#37474F', '#00897B'],
    topicCardColors: ['#00ACC1', '#2E7D32', '#AFB42B', '#D84315', '#C62828', '#D81B60', '#7B1FA2', '#1976D2', '#37474F', '#00897B'],
    dividerColor1: '#ffffff',
    dividerColor2: '#facc15',
    unitCardTextColor: '#ffffff',
    unitCardLabelColor: '#fde047',
    unitCardFontSize: 2.25,
    unitCardHeight: 7,
    unitCardBorderRadius: 8,
    activityLearnLabel: 'Học từ vựng',
    activityLearnDesc: 'Xem lại danh sách từ của bài',
    activityMatchLabel: 'Trò chơi Ghép cặp',
    activityMatchDesc: 'Nối từ tiếng Anh với nghĩa Việt',
    activitySpellLabel: 'Trò chơi Viết Chính tả',
    activitySpellDesc: 'Viết từ tiếng Anh tương ứng',
    activityQuizLabel: 'Làm bài trắc nghiệm',
    activityQuizDesc: 'Kiểm tra kiến thức của bạn',
};

const Card: React.FC<{ title: string, icon: string, color: string, fontSize: number, height: number, borderRadius: number, onClick: () => void }> = ({ title, icon, color, fontSize, height, borderRadius, onClick }) => (
    <button 
      onClick={onClick} 
      style={{ backgroundColor: color, height: `${height}rem`, borderRadius: `${borderRadius}px`, fontSize: `${fontSize}rem` }}
      className="w-full flex flex-col items-center justify-center text-white font-bold shadow-lg transform transition duration-300 hover:scale-105 active:scale-95"
    >
        <span className="text-4xl mb-2">{icon}</span>
        <span className={title.length > 20 ? 'text-[0.8em] px-2' : ''}>{title}</span>
    </button>
);

const ExerciseTypeSelectionScreen: React.FC<Props> = ({ onSelect, onBack }) => {
    const [config, setConfig] = useState<ExerciseSelectionConfig>(DEFAULT_CONFIG);

    useEffect(() => {
        const unsubscribe = listenToExerciseSelectionConfig(FIXED_CLASSROOM_ID, (newConfig) => {
            if (newConfig) setConfig({ ...DEFAULT_CONFIG, ...newConfig });
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="flex flex-col items-center p-6 text-center min-h-[600px] bg-gray-50 relative">
            <button onClick={onBack} className="absolute top-6 left-6 flex items-center bg-white px-4 py-2 rounded-lg shadow font-semibold text-gray-700 hover:bg-gray-200 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {config.backButtonText}
            </button>
            <div className="w-full max-w-4xl mx-auto mt-16">
                <div className="mb-12">
                    <h1 
                        style={{ color: config.mainTitleColor, fontSize: `${config.mainTitleFontSize}rem` }}
                        className="relative inline-block font-extrabold"
                    >
                        {config.mainTitle}
                    </h1>
                    {config.subtitle && (
                        <p 
                            style={{ color: config.subtitleColor, fontSize: `${config.subtitleFontSize}rem` }}
                            className="mt-2 font-medium opacity-90"
                        >
                            {config.subtitle}
                        </p>
                    )}
                    <div className="mt-4 flex justify-center gap-1">
                        <span className="w-24 h-1 rounded-full" style={{ backgroundColor: '#ec4899' }}></span>
                        <span className="w-12 h-1 bg-black rounded-full"></span>
                        <span className="w-24 h-1 rounded-full" style={{ backgroundColor: '#f97316' }}></span>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card 
                        title={config.card1Title} 
                        icon={config.card1Icon} 
                        color={config.card1Color} 
                        fontSize={config.cardFontSize}
                        height={config.cardHeight}
                        borderRadius={config.cardBorderRadius}
                        onClick={() => onSelect(12)} 
                    />
                    <Card 
                        title={config.card2Title} 
                        icon={config.card2Icon} 
                        color={config.card2Color} 
                        fontSize={config.cardFontSize}
                        height={config.cardHeight}
                        borderRadius={config.cardBorderRadius}
                        onClick={() => onSelect('topics')} 
                    />
                </div>
            </div>
        </div>
    );
};

export default ExerciseTypeSelectionScreen;
