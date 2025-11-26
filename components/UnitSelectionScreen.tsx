import React, { useState, useEffect } from 'react';
import { PlayerData, QuizQuestion, UnitsState, VocabularyWord } from '../types';
import { listenToUnitsStatusByGrade, listenToTopicsStatus } from '../services/firebaseService';
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


const UnitSelectionScreen: React.FC<UnitSelectionScreenProps> = ({ playerData, classroomId, grade, onStartQuiz, onLearnVocabulary, onStartSpellingGame, onStartMatchingGame, onBack, selectedUnit, onUnitSelect, onCloseActivityModal }) => {
    const [unitsStatus, setUnitsStatus] = useState<UnitsState>({});

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
        return () => unsubscribe();
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
    const title = isTopics ? 'TOPIC-BASED VOCABULARY' : `ENGLISH VOCABULARY ${grade}`;
    const subtitle = isTopics ? '(Từ vựng theo chủ đề)' : `(Từ vựng Tiếng Anh Lớp ${grade})`;
    
    const titleClassName = isTopics
        ? "text-[2.0rem] sm:text-[2.5rem] font-extrabold tracking-wider uppercase"
        : "text-[2.2rem] sm:text-[2.8rem] font-extrabold tracking-wider uppercase";

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
                 <div className="w-full h-36 mb-2">
                    <svg viewBox="0 0 500 100" className="w-full h-full">
                        <path id="curve" d="M 20, 65 Q 250, 10 480, 65" stroke="transparent" fill="transparent"/>
                        <text width="500" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}} className="text-yellow-300 fill-current">
                            <textPath href="#curve" startOffset="50%" text-anchor="middle" className={titleClassName}>
                                {title}
                            </textPath>
                        </text>
                        <text x="250" y="88" text-anchor="middle" className="fill-current text-white text-2xl font-bold tracking-normal" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
                            {subtitle}
                        </text>
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
                                        <span className="text-4xl font-black -mt-1">{itemNumber}</span>
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