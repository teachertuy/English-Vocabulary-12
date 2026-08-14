
// components/UnitSelectionScreen.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { PlayerData, QuizQuestion, UnitsState, VocabularyWord, WelcomeScreenConfig, ExerciseSelectionConfig } from '../types';
import { listenToUnitsStatusByGrade, listenToTopicsStatus, listenToWelcomeConfig, listenToExerciseSelectionConfig } from '../services/firebaseService';
import ActivitySelectionModal from './ActivitySelectionModal';

interface UnitSelectionScreenProps {
  playerData: PlayerData;
  classroomId: string;
  grade: number | 'topics';
  onStartQuiz: (questions: QuizQuestion[], unitNumber: number) => void;
  onLearnVocabulary: (vocab: VocabularyWord[], unitNumber: number) => void;
  onStartSpellingGame: (vocab: VocabularyWord[], unitNumber: number) => void;
  onStartMatchingGame: (vocab: VocabularyWord[], unitNumber: number) => void;
  onStartListenChooseGame: (vocab: VocabularyWord[], unitNumber: number) => void;
  onBack: () => void;
  selectedUnit: number | null;
  onUnitSelect: (unitNumber: number) => void;
  onCloseActivityModal: () => void;
}

const DEFAULT_UNIT_COLORS = [
    '#00ACC1', '#2E7D32', '#AFB42B', '#D84315', '#C62828',
    '#D81B60', '#7B1FA2', '#1976D2', '#37474F', '#00897B'
];

// Fix: Add missing quizTimerEnabled, spellingTimerEnabled, and matchingTimerEnabled properties
const DEFAULT_EXERCISE_CONFIG: ExerciseSelectionConfig = {
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
    unitCardColors: DEFAULT_UNIT_COLORS,
    unitCardTextColor: '#ffffff',
    unitCardLabelColor: '#fde047',
    unitCardFontSize: 2.25,
    unitCardHeight: 7,
    unitCardWidth: 100,
    unitCardBorderRadius: 8,
    unitItemsPerRow: 5,

    topicLabelText: 'TOPIC',
    topicCardColors: DEFAULT_UNIT_COLORS,
    topicCardTextColor: '#ffffff',
    topicCardLabelColor: '#fde047',
    topicCardFontSize: 1.8,
    topicCardHeight: 6,
    topicCardWidth: 100,
    topicCardBorderRadius: 12,
    topicItemsPerRow: 6,

    exitButtonText: 'Thoát',
    dividerColor1: '#ffffff',
    dividerColor2: '#facc15',

    activityLearnLabel: 'Học từ vựng',
    activityLearnDesc: 'Xem lại danh sách từ của bài',
    activityMatchLabel: 'Trò chơi Ghép cặp',
    activityMatchDesc: 'Nối từ tiếng Anh với nghĩa Việt',
    activitySpellLabel: 'Trò chơi Viết Chính tả',
    activitySpellDesc: 'Viết từ tiếng Anh tương ứng',
    activityQuizLabel: 'Làm bài trắc nghiệm',
    activityQuizDesc: 'Kiểm tra kiến thức của bạn',
    quizDuration: 30,
    quizTimerEnabled: true,
    spellingDuration: 30,
    spellingTimerEnabled: true,
    matchingDuration: 20,
    matchingTimerEnabled: true,

    actHeaderLine1: 'GV: Trương Thanh Tùy',
    actHeaderLine2: 'Tổ trưởng tổ Tiếng Anh_ Trường THPT Nguyễn Trường Tộ',
    actHeaderColor: '#ffffff',
    actHeaderFontSize: 1.5,
    actHeaderFontFamily: 'sans-serif',

    actModalBgColor: '#ffffff',
    actModalTitleColor: '#1e293b',
    actModalTitleFontSize: 1.875,
    actStudentBadgeBgColor: '#fef3c7',
    actStudentBadgeTextColor: '#78350f',
    actStudentBadgeFontSize: 0.75,

    actLearnBgColor: '#2563eb',
    actLearnTitleColor: '#ffffff',
    actLearnTitleFontSize: 1.125,

    actMatchBgColor: '#0d9488',
    actMatchTitleColor: '#ffffff',
    actMatchTitleFontSize: 1.125,

    actSpellBgColor: '#0284c7',
    actSpellTitleColor: '#ffffff',
    actSpellTitleFontSize: 1.125,

    actQuizBgColor: '#0f172a',
    actQuizTitleColor: '#ffffff',
    actQuizTitleFontSize: 1.125,

    actOpenCountLabelText: 'Số lần học',
    actOpenCountMinWidth: 60,
    actOpenCountPadding: 0.2,
    actOpenCountBgColor: '#ffffff',
    actOpenCountLabelColor: '#dc2626',
    actOpenCountLabelFontSize: 0.7,
    actOpenCountValueColor: '#dc2626',
    actOpenCountValueFontSize: 1.125,

    actTimeHeaderText: 'THỜI GIAN LÀM BÀI:',
    actTimeHeaderColor: '#ffffff',
    actTimeHeaderFontSize: 0.7,
    actAttemptBoxBgColor: 'rgba(0,0,0,0.2)',
    actAttemptTextColor: '#ffffff',
    actAttemptFontSize: 0.75,
    actTotalTimeBoxBgColor: 'rgba(0,0,0,0.25)',
    actTotalTimeLabelColor: '#ffffff',
    actTotalTimeLabelFontSize: 0.75,
    actTotalTimeValueColor: '#fef08a',
    actTotalTimeValueFontSize: 0.875,

    actSummaryEnabled: true,
    actSummaryBgColor: '#0f172a',
    actSummaryBorderColor: '#3b82f6',
    actSummaryBorderWidth: 2,
    actSummaryWidth: 100,
    actSummaryBorderRadius: 16,
    actSummaryTitleText: 'Tổng thời gian học & làm bài cả 4 phần',
    actSummaryTitleColor: '#f59e0b',
    actSummaryTitleFontSize: 0.9,
    actSummarySubTitleText: 'Tổng thời gian tham gia:',
    actSummarySubTitleColor: '#ffffff',
    actSummarySubTitleFontSize: 0.85,
    actSummaryValueColor: '#ef4444',
    actSummaryValueFontSize: 0.95,

    actSummaryCompletionLabelText: 'Đã hoàn thành:',
    actSummaryCompletionLabelColor: '#ffffff',
    actSummaryCompletionLabelFontSize: 0.85,
    actSummaryCompletionValueColor: '#ef4444',
    actSummaryCompletionNumFontSize: 0.95,
    actSummaryCompletionPctFontSize: 0.7,
    actSummaryCompletionCircleSize: 38,
    actSummaryCompletionCircleBorderColor: '#ef4444',
    actSummaryCompletionCircleBorderWidth: 2,
    actSummaryCompletionCircleBgColor: '#ffffff',

    actSummaryItemTextColor: '#ffffff',
    actSummaryItemFontSize: 0.8,
    actSummaryCommentTextColor: '#4ade80',
    actSummaryCommentFontSize: 0.8,

    actCommentEnabled: true,
    actCommentTextColor: '#fde047',
    actCommentFontSize: 0.6,
    actCommentHighText: 'Xuất sắc! Rất chăm chỉ và làm bài tốt',
    actCommentHighColor: '#15803d',
    actCommentGoodText: 'Khá tốt! Luyện tập thêm chút nữa nhé',
    actCommentGoodColor: '#1d4ed8',
    actCommentRushText: 'Làm bài quá vội! Cần siêng năng hơn',
    actCommentLowText: 'Chưa siêng năng! Cần làm bài kỹ hơn',
    actCommentLowColor: '#dc2626',
};

// Fix: Complete DEFAULT_WELCOME_CONFIG to match WelcomeScreenConfig interface
const DEFAULT_WELCOME_CONFIG: WelcomeScreenConfig = {
    titleText: 'ENGLISH VOCABULARY 12',
    titleFontSize: 1.8,
    titleFontSizeLine2: 1.6,
    titleColor: '#facc15',
    titleLineGap: 0,
    titleLetterSpacing1: 0.05,
    titleLetterSpacing2: -0.08,
    titleCurveArc: 35,
    logoSize: 64,
    logoNameGap: -6,
    logoTitleGap: 16,
    logoPosition: 'left',
    teacherNameText: '{teachertuy}',
    inputNameWidth: 100,
    inputNameFontSize: 1.25,
    inputNameColor: '#ffffff',
    inputNamePlaceholder: 'Nhập họ và tên của bạn..',
    inputNameBorderColor: '#ffffff',
    inputNameBorderWidth: 2,
    inputClassWidth: 10,
    inputClassFontSize: 1.25,
    inputClassColor: '#facc15',
    inputClassPlaceholder: 'Lớp...',
    inputClassBorderColor: '#ffffff',
    inputClassBorderWidth: 2,
    startButtonText: 'START',
    startButtonSize: 4,
    startButtonBgColor: '#facc15',
    startButtonTextColor: '#dc2626',
    startButtonRingColor: '#ffffff',
    startButtonRingWidth: 2
};

const getCachedUnitsStatus = (classroomId: string, grade: number | 'topics'): UnitsState => {
    try {
        const cached = localStorage.getItem(`units_status_cache_${classroomId}_${grade}`);
        if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {};
};

const UnitSelectionScreen: React.FC<UnitSelectionScreenProps> = ({ playerData, classroomId, grade, onStartQuiz, onLearnVocabulary, onStartSpellingGame, onStartMatchingGame, onStartListenChooseGame, onBack, selectedUnit, onUnitSelect, onCloseActivityModal }) => {
    const [unitsStatus, setUnitsStatus] = useState<UnitsState>(() => getCachedUnitsStatus(classroomId, grade));
    const [welcomeConfig, setWelcomeConfig] = useState<WelcomeScreenConfig>(DEFAULT_WELCOME_CONFIG);
    const [exerciseConfig, setExerciseConfig] = useState<ExerciseSelectionConfig>(DEFAULT_EXERCISE_CONFIG);

    useEffect(() => {
        // Synchronously load cache when grade changes
        const cached = getCachedUnitsStatus(classroomId, grade);
        if (Object.keys(cached).length > 0) {
            setUnitsStatus(cached);
        }

        const handleStatusUpdate = (status: UnitsState) => {
            const newStatus = status || {};
            setUnitsStatus(newStatus);
            try {
                localStorage.setItem(`units_status_cache_${classroomId}_${grade}`, JSON.stringify(newStatus));
            } catch (e) {}
        };

        let unsubscribe: () => void;
        if (grade === 'topics') {
            unsubscribe = listenToTopicsStatus(classroomId, handleStatusUpdate);
        } else {
            unsubscribe = listenToUnitsStatusByGrade(classroomId, grade, handleStatusUpdate);
        }
        
        const unsubWelcome = listenToWelcomeConfig(classroomId, (newConfig) => {
            if (newConfig) setWelcomeConfig({ ...DEFAULT_WELCOME_CONFIG, ...newConfig });
        });

        const unsubExercise = listenToExerciseSelectionConfig(classroomId, (newConfig) => {
            if (newConfig) setExerciseConfig({ ...DEFAULT_EXERCISE_CONFIG, ...newConfig });
        });

        return () => {
            unsubscribe();
            unsubWelcome();
            unsubExercise();
        };
    }, [classroomId, grade]);
    
    const handleUnitSelect = (unitNumber: number) => {
        const unitId = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        if (unitsStatus[unitId]?.enabled) {
            onUnitSelect(unitNumber);
        }
    };

    const isTopics = grade === 'topics';
    const itemCount = isTopics ? 60 : 10;
    const itemPrefix = isTopics ? 'topic_' : 'unit_';
    
    const itemLabel = isTopics ? exerciseConfig.topicLabelText : exerciseConfig.unitLabelText;
    const cardHeight = isTopics ? exerciseConfig.topicCardHeight : exerciseConfig.unitCardHeight;
    const cardWidth = isTopics ? exerciseConfig.topicCardWidth : exerciseConfig.unitCardWidth;
    const cardFontSize = isTopics ? exerciseConfig.topicCardFontSize : exerciseConfig.unitCardFontSize;
    const cardBorderRadius = isTopics ? exerciseConfig.topicCardBorderRadius : exerciseConfig.unitCardBorderRadius;
    const labelColor = isTopics ? exerciseConfig.topicCardLabelColor : exerciseConfig.unitCardLabelColor;
    const textColor = isTopics ? exerciseConfig.topicCardTextColor : exerciseConfig.unitCardTextColor;
    const itemsPerRow = isTopics ? (exerciseConfig.topicItemsPerRow || 6) : (exerciseConfig.unitItemsPerRow || 5);
    
    const displayTitle = isTopics ? exerciseConfig.card2Title.toUpperCase() : welcomeConfig.titleText;
    const subtitleText = isTopics ? exerciseConfig.subtitle : `(Từ vựng Tiếng Anh Lớp ${grade})`;
    
    const scaleFactor = 0.7;
    const innerFontSize1 = welcomeConfig.titleFontSize * scaleFactor;
    const innerFontSize2 = (welcomeConfig.titleFontSizeLine2 || (welcomeConfig.titleFontSize * 0.9)) * scaleFactor;

    const titleLines = useMemo(() => {
        const lines = displayTitle.split('\n').filter(l => l.trim() !== '');
        if (lines.length === 1) {
            const text = displayTitle.trim();
            // Handle specific English Vocabulary 12 case to match image request
            if (text.endsWith(" 12")) {
                return [text.substring(0, text.length - 3).trim(), "12"];
            }
            if (text.length > 20) {
                 const mid = Math.floor(text.length / 2);
                 const splitIndex = text.lastIndexOf(' ', mid + 5);
                 if (splitIndex !== -1) return [text.substring(0, splitIndex), text.substring(splitIndex + 1)];
            }
        }
        return lines.slice(0, 2);
    }, [displayTitle]);

    const line2LetterSpacing = useMemo(() => {
        if (titleLines.length > 1) {
            const line2 = titleLines[1].trim();
            if (line2 === '12') return '-0.08em';
            if (line2.includes('12')) return '0.05em';
        }
        return '0.1em';
    }, [titleLines]);

    const items = Array.from({ length: itemCount }, (_, i) => i + 1);

    const firstEnabledIndex = items.findIndex(itemNumber => {
        const unitId = `${itemPrefix}${itemNumber}`;
        return unitsStatus[unitId]?.enabled ?? false;
    });

    const getCardColor = (index: number) => {
        const colors = isTopics 
            ? (exerciseConfig.topicCardColors || DEFAULT_UNIT_COLORS)
            : (exerciseConfig.unitCardColors || DEFAULT_UNIT_COLORS);
        
        return colors[index % colors.length] || '#00A9C3';
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 text-center min-h-[600px] blueprint-bg relative">
            {selectedUnit && (
                <ActivitySelectionModal 
                    show={!!selectedUnit}
                    unitNumber={selectedUnit}
                    onClose={onCloseActivityModal}
                    classroomId={classroomId}
                    grade={grade}
                    playerData={playerData}
                    onStartQuiz={(q) => onStartQuiz(q, selectedUnit)}
                    onLearnVocabulary={(v) => onLearnVocabulary(v, selectedUnit)}
                    onStartSpellingGame={(v) => onStartSpellingGame(v, selectedUnit)}
                    onStartMatchingGame={(v) => onStartMatchingGame(v, selectedUnit)}
                    onStartListenChooseGame={(v) => onStartListenChooseGame(v, selectedUnit)}
                />
            )}
            {/* Moved exit button to top-left corner */}
            <button onClick={onBack} className="absolute top-4 left-4 bg-black/20 text-white font-semibold py-2 px-4 rounded-full hover:bg-black/30 transition shadow-md z-10">
                {exerciseConfig.exitButtonText}
            </button>

            <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
                 <div className={`w-full transition-all duration-300 ${titleLines.length > 1 ? 'h-48' : 'h-24'} mb-2`}>
                    <svg viewBox={titleLines.length > 1 ? "0 0 500 170" : "0 0 500 80"} className="w-full h-full overflow-visible">
                        <path id="unit-curve1" d={titleLines.length > 1 ? "M 50, 50 Q 250, 10 450, 50" : "M 20, 60 Q 250, 25 480, 60"} stroke="transparent" fill="transparent"/>
                        <text width="500" style={{fill: welcomeConfig.titleColor, textShadow: '2px 2px 4px rgba(0,0,0,0.5)', fontSize: `${innerFontSize1}rem` }} className="font-extrabold tracking-wider uppercase">
                            <textPath href="#unit-curve1" startOffset="50%" textAnchor="middle">
                                {titleLines[0]}
                            </textPath>
                        </text>
                        
                        {titleLines.length > 1 ? (
                             <>
                                {/* Adjusted curve2 and subtitle position to lower "12" and Vietnamese text */}
                                <path id="unit-curve2" d="M 50, 130 Q 250, 100 450, 130" stroke="transparent" fill="transparent"/>
                                <text width="500" style={{fill: welcomeConfig.titleColor, textShadow: '2px 2px 4px rgba(0,0,0,0.5)', fontSize: `${innerFontSize2}rem`, letterSpacing: line2LetterSpacing }} className="font-black tracking-wider uppercase">
                                    <textPath href="#unit-curve2" startOffset="50%" textAnchor="middle">
                                        {titleLines[1]}
                                    </textPath>
                                </text>
                                <text x="250" y="160" textAnchor="middle" className="fill-current text-white text-lg font-bold tracking-normal opacity-80" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
                                    {subtitleText}
                                </text>
                             </>
                        ) : (
                            <text x="250" y="75" textAnchor="middle" className="fill-current text-white text-xl font-bold tracking-normal opacity-80" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
                                {subtitleText}
                            </text>
                        )}
                    </svg>
                </div>
                
                 {firstEnabledIndex !== -1 && (
                    <div className="text-4xl pointing-finger-down z-10 mb-4 mt-2">
                        <span>👇</span>
                    </div>
                )}
                
                <div 
                    style={{ 
                        display: 'grid', 
                        gridTemplateColumns: `repeat(${itemsPerRow}, minmax(0, 1fr))`,
                    }}
                    className="gap-x-4 gap-y-2 max-h-[500px] overflow-y-auto px-4 py-2 custom-scrollbar w-full justify-items-center mt-2"
                >
                    {items.map((itemNumber, index) => {
                        const unitId = `${itemPrefix}${itemNumber}`;
                        const isEnabled = unitsStatus[unitId]?.enabled ?? false;
                        const cardColor = getCardColor(index);
                        const isAtDividerRow = index > 0 && index % itemsPerRow === 0;

                        return (
                            <React.Fragment key={itemNumber}>
                                {isAtDividerRow && (
                                    <div style={{ gridColumn: `span ${itemsPerRow}` }} className="w-full my-6 space-y-1">
                                        <div className="h-0.5 w-full" style={{ backgroundColor: exerciseConfig.dividerColor1 }}></div>
                                        <div className="h-0.5 w-full" style={{ backgroundColor: exerciseConfig.dividerColor2 }}></div>
                                        <div className="h-0.5 w-full" style={{ backgroundColor: exerciseConfig.dividerColor1 }}></div>
                                    </div>
                                )}
                                
                                <div className="flex justify-center w-full">
                                    <button 
                                        onClick={() => handleUnitSelect(itemNumber)}
                                        disabled={!isEnabled}
                                        style={{ 
                                            backgroundColor: isEnabled ? cardColor : '#374151', 
                                            height: `${cardHeight}rem`,
                                            width: `${cardWidth}%`,
                                            borderRadius: `${cardBorderRadius}px`,
                                            boxShadow: isEnabled ? `0 10px 15px -3px ${cardColor}55, 0 4px 6px -2px ${cardColor}33` : 'none'
                                        }}
                                        className="flex flex-col items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none border border-white/20"
                                    >
                                        <span style={{ color: labelColor }} className="text-[11px] uppercase font-black tracking-widest">{itemLabel}</span>
                                        <span style={{ color: textColor, fontSize: `${cardFontSize}rem` }} className="font-black -mt-2 font-['Nunito'] leading-tight drop-shadow-md">{itemNumber}</span>
                                    </button>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
            `}</style>
        </div>
    );
};

export default UnitSelectionScreen;
