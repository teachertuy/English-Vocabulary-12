
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
    titleFontSize: 2.2,
    titleColor: '#facc15',
    inputNameWidth: 100,
    inputNameFontSize: 1.25,
    inputNameColor: '#ffffff',
    inputClassWidth: 10,
    inputClassFontSize: 1.25,
    inputClassColor: '#facc15',
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
    
    // Nếu giáo viên có tùy chỉnh văn bản tiêu đề, ta ưu tiên sử dụng nó nhưng vẫn giữ hậu tố lớp học/chủ đề
    const titleText = config.titleText || (isTopics ? 'TOPIC-BASED VOCABULARY' : `ENGLISH VOCABULARY ${grade}`);
    const subtitle = isTopics ? '(Từ vựng theo chủ đề)' : `(Từ vựng Tiếng Anh Lớp ${grade})`;
    
    const titleLines = useMemo(() => {
        return titleText.split('\n').filter(l => l.trim() !== '').slice(0, 2);
    }, [titleText]);

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
                 <div className={`w-full transition-all duration-300 ${titleLines.length > 1 ? 'h-48' : 'h-36'} mb-2`}>
                    <svg viewBox={titleLines.length > 1 ? "0 0 500 140" : "0 0 500 100"} className="w-full h-full overflow-visible">
                        {/* Hàng 1 */}
                        <path id="unit-curve1" d={titleLines.length > 1 ? "M 20, 60 Q 250, 5 480, 60" : "M 20, 65 Q 250, 10 480, 65"} stroke="transparent" fill="transparent"/>
                        <text width="500" style={{fill: config.titleColor, textShadow: '2px 2px 4px rgba(0,0,0,0.5)', fontSize: `${config.titleFontSize}rem` }} className="font-extrabold tracking-wider uppercase">
                            <textPath href="#unit-curve1" startOffset="50%" textAnchor="middle">
                                {titleLines[0]}
                            </textPath>
                        </text>
                        
                        {/* Hàng 2 (nếu có) */}
                        {titleLines.length > 1 ? (
                             <>
                                <path id="unit-curve2" d="M 20, 100 Q 250, 45 480, 100" stroke="transparent" fill="transparent"/>
                                <text width="500" style={{fill: config.titleColor, textShadow: '2px 2px 4px rgba(0,0,0,0.5)', fontSize: `${config.titleFontSize * 0.9}rem` }} className="font-extrabold tracking-wider uppercase">
                                    <textPath href="#unit-curve2" startOffset="50%" textAnchor="middle">
                                        {titleLines[1]}
                                    </textPath>
                                </text>
                                <text x="250" y="130" text-anchor="middle" className="fill-current text-white text-xl font-bold tracking-normal" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
                                    {subtitle}
                                </text>
                             </>
                        ) : (
                            <text x="250" y="88" text-anchor="middle" className="fill-current text-white text-2xl font-bold tracking-normal" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
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
