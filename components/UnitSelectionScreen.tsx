
import React, { useState, useEffect, useMemo } from 'react';
import { PlayerData, QuizQuestion, UnitsState, VocabularyWord, WelcomeScreenConfig } from '../types';
import { listenToUnitsStatusByGrade, listenToTopicsStatus, listenToWelcomeConfig } from '../services/firebaseService';
import ActivitySelectionModal from './ActivitySelectionModal';

interface UnitSelectionScreenProps {
  playerData: PlayerData;
  classroomId: string;
  grade: number | 'topics';
  onStartQuiz: (questions: QuizQuestion[], unitNumber: number) => void;
  onLearnVocabulary: (vocab: VocabularyWord[], unitNumber: number) => void;
  onStartSpellingGame: (vocab: VocabularyWord[], unitNumber: number) => void;
  onStartMatchingGame: (vocab: VocabularyWord[], unitNumber: number) => void;
  onBack: () => void;
  selectedUnit: number | null;
  onUnitSelect: (unitNumber: number) => void;
  onCloseActivityModal: () => void;
}

// Colors based on the provided image
const unitColors = [
    'bg-[#00A9C3]', // Unit 1 - Teal
    'bg-[#00A859]', // Unit 2 - Green
    'bg-[#AF8A00]', // Unit 3 - Olive
    'bg-[#D36D2C]', // Unit 4 - Orange
    'bg-[#C3423F]', // Unit 5 - Red-brown
    'bg-[#D8507F]', // Unit 6 - Pink
    'bg-[#8E44AD]', // Unit 7 - Purple
    'bg-[#3498DB]', // Unit 8 - Blue
    'bg-[#2C3E50]', // Unit 9 - Dark Blue
    'bg-[#16A085]', // Unit 10 - Dark Teal
];

const DEFAULT_CONFIG: WelcomeScreenConfig = {
    titleText: 'ENGLISH VOCABULARY 12',
    titleFontSize: 1.8,
    titleFontSizeLine2: 1.6,
    titleColor: '#facc15',
    inputNameWidth: 100,
    inputNameFontSize: 1.25,
    inputNameColor: '#ffffff',
    inputNamePlaceholder: 'Nhập họ và tên của bạn..',
    inputClassWidth: 10,
    inputClassFontSize: 1.25,
    inputClassColor: '#facc15',
    inputClassPlaceholder: 'Lớp...',
};

const UnitSelectionScreen: React.FC<UnitSelectionScreenProps> = ({ playerData, classroomId, grade, onStartQuiz, onLearnVocabulary, onStartSpellingGame, onStartMatchingGame, onBack, selectedUnit, onUnitSelect, onCloseActivityModal }) => {
    const [unitsStatus, setUnitsStatus] = useState<UnitsState>({});
    const [config, setConfig] = useState<WelcomeScreenConfig>(DEFAULT_CONFIG);

    useEffect(() => {
        let unsubscribe: () => void;
        if (grade === 'topics') {
            unsubscribe = listenToTopicsStatus(classroomId, (status) => {
                setUnitsStatus(status || {});
            });
        } else {
            unsubscribe = listenToUnitsStatusByGrade(classroomId, grade, (status) => {
                setUnitsStatus(status || {});
            });
        }
        
        const unsubConfig = listenToWelcomeConfig(classroomId, (newConfig) => {
            if (newConfig) setConfig(newConfig);
        });

        return () => {
            unsubscribe();
            unsubConfig();
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
    const itemLabel = isTopics ? 'Topic' : 'Unit';
    
    // Yêu cầu: Đổi tên phần Topics thành VOCABULARY BY TOPIC
    const displayTitle = isTopics ? 'VOCABULARY BY TOPIC' : config.titleText;
    const subtitle = isTopics ? '(Từ vựng theo chủ đề)' : `(Từ vựng Tiếng Anh Lớp ${grade})`;
    
    // Hệ số thu nhỏ cho màn hình bên trong (30% nhỏ hơn so với màn hình chào)
    const scaleFactor = 0.7;
    const innerFontSize1 = config.titleFontSize * scaleFactor;
    const innerFontSize2 = (config.titleFontSizeLine2 || (config.titleFontSize * 0.9)) * scaleFactor;

    const titleLines = useMemo(() => {
        const lines = displayTitle.split('\n').filter(l => l.trim() !== '');
        // Logic tự động ngắt dòng nếu quá dài
        if (lines.length === 1 && displayTitle.length > 20) {
             const mid = Math.floor(displayTitle.length / 2);
             const splitIndex = displayTitle.lastIndexOf(' ', mid + 5);
             if (splitIndex !== -1) return [displayTitle.substring(0, splitIndex), displayTitle.substring(splitIndex + 1)];
        }
        return lines.slice(0, 2);
    }, [displayTitle]);

    const items = Array.from({ length: itemCount }, (_, i) => i + 1);

    const firstEnabledIndex = items.findIndex(itemNumber => {
        const unitId = `${itemPrefix}${itemNumber}`;
        return unitsStatus[unitId]?.enabled ?? false;
    });

    return (
        <div className="flex flex-col items-center justify-center p-6 text-center min-h-[600px] blueprint-bg relative">
            {selectedUnit && (
                <ActivitySelectionModal 
                    show={!!selectedUnit}
                    unitNumber={selectedUnit}
                    onClose={onCloseActivityModal}
                    classroomId={classroomId}
                    grade={grade}
                    onStartQuiz={(q) => onStartQuiz(q, selectedUnit)}
                    onLearnVocabulary={(v) => onLearnVocabulary(v, selectedUnit)}
                    onStartSpellingGame={(v) => onStartSpellingGame(v, selectedUnit)}
                    onStartMatchingGame={(v) => onStartMatchingGame(v, selectedUnit)}
                />
            )}
            <button onClick={onBack} className="absolute top-4 right-4 bg-black/20 text-white font-semibold py-2 px-4 rounded-full hover:bg-black/30 transition shadow-md z-10">
                Thoát
            </button>

            <div className="w-full max-w-5xl mx-auto">
                 <div className={`w-full transition-all duration-300 ${titleLines.length > 1 ? 'h-36' : 'h-24'} mb-2`}>
                    <svg viewBox={titleLines.length > 1 ? "0 0 500 120" : "0 0 500 80"} className="w-full h-full overflow-visible">
                        {/* Hàng 1 - Làm phẳng đường cong hơn một chút cho chữ nhỏ */}
                        <path id="unit-curve1" d={titleLines.length > 1 ? "M 50, 50 Q 250, 10 450, 50" : "M 20, 60 Q 250, 25 480, 60"} stroke="transparent" fill="transparent"/>
                        <text width="500" style={{fill: config.titleColor, textShadow: '2px 2px 4px rgba(0,0,0,0.5)', fontSize: `${innerFontSize1}rem` }} className="font-extrabold tracking-wider uppercase">
                            <textPath href="#unit-curve1" startOffset="50%" textAnchor="middle">
                                {titleLines[0]}
                            </textPath>
                        </text>
                        
                        {/* Hàng 2 (nếu có) */}
                        {titleLines.length > 1 ? (
                             <>
                                <path id="unit-curve2" d="M 50, 90 Q 250, 50 450, 90" stroke="transparent" fill="transparent"/>
                                <text width="500" style={{fill: config.titleColor, textShadow: '2px 2px 4px rgba(0,0,0,0.5)', fontSize: `${innerFontSize2}rem` }} className="font-extrabold tracking-wider uppercase">
                                    <textPath href="#unit-curve2" startOffset="50%" textAnchor="middle">
                                        {titleLines[1]}
                                    </textPath>
                                </text>
                                <text x="250" y="115" text-anchor="middle" className="fill-current text-white text-lg font-bold tracking-normal opacity-80" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
                                    {subtitle}
                                </text>
                             </>
                        ) : (
                            <text x="250" y="75" text-anchor="middle" className="fill-current text-white text-xl font-bold tracking-normal opacity-80" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
                                {subtitle}
                            </text>
                        )}
                    </svg>
                </div>
                
                 {firstEnabledIndex !== -1 && (
                    <div className="text-4xl pointing-finger-down z-10 mb-4">
                        <span>👇</span>
                    </div>
                )}
                
                <div className="grid grid-cols-5 gap-4">
                    {items.map((itemNumber, index) => {
                        const unitId = `${itemPrefix}${itemNumber}`;
                        const isEnabled = unitsStatus[unitId]?.enabled ?? false;
                        const color = isEnabled ? unitColors[(itemNumber - 1) % unitColors.length] : 'bg-gray-500';

                        return (
                            <React.Fragment key={itemNumber}>
                                <div className="relative">
                                    <button 
                                        onClick={() => handleUnitSelect(itemNumber)}
                                        disabled={!isEnabled}
                                        className={`w-full h-28 rounded-lg flex flex-col items-center justify-center text-white transition-transform transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none ${color}`}
                                    >
                                        <span className="text-sm uppercase font-extrabold text-yellow-300">{itemLabel}</span>
                                        <span className="text-4xl font-black -mt-1 font-['Nunito']">{itemNumber}</span>
                                    </button>
                                </div>
                                {!isTopics && index === 4 && (
                                    <div className="col-span-5 my-4">
                                        <div className="h-1 bg-white w-full rounded-full"></div>
                                        <div className="h-1 bg-yellow-300 w-full rounded-full mt-1"></div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default UnitSelectionScreen;
