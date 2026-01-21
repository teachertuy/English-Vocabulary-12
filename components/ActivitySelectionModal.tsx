
import React, { useState, useEffect } from 'react';
import { QuizQuestion, VocabularyWord, ExerciseSelectionConfig } from '../types';
import { getUnitQuizQuestionsByGrade, getUnitVocabularyByGrade, getTopicQuizQuestions, getTopicVocabulary, listenToExerciseSelectionConfig } from '../services/firebaseService';

interface ActivitySelectionModalProps {
    show: boolean;
    unitNumber: number;
    grade: number | 'topics';
    onClose: () => void;
    classroomId: string;
    onStartQuiz: (questions: QuizQuestion[]) => void;
    onLearnVocabulary: (vocab: VocabularyWord[]) => void;
    onStartSpellingGame: (vocab: VocabularyWord[]) => void;
    onStartMatchingGame: (vocab: VocabularyWord[]) => void;
}

const DEFAULT_UNIT_COLORS = [
    '#00ACC1', '#2E7D32', '#AFB42B', '#D84315', '#C62828',
    '#D81B60', '#7B1FA2', '#1976D2', '#37474F', '#00897B'
];

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
};

const ActivitySelectionModal: React.FC<ActivitySelectionModalProps> = ({ show, unitNumber, grade, onClose, classroomId, onStartQuiz, onLearnVocabulary, onStartSpellingGame, onStartMatchingGame }) => {
    const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
    const [vocabulary, setVocabulary] = useState<VocabularyWord[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<ExerciseSelectionConfig>(DEFAULT_CONFIG);

    useEffect(() => {
        if (show) {
            setIsLoading(true);
            const isTopics = grade === 'topics';
            const id = isTopics ? `topic_${unitNumber}` : `unit_${unitNumber}`;
            
            const quizPromise = isTopics 
                ? getTopicQuizQuestions(classroomId, id) 
                : getUnitQuizQuestionsByGrade(classroomId, grade as number, id);
    
            const vocabPromise = isTopics
                ? getTopicVocabulary(classroomId, id)
                : getUnitVocabularyByGrade(classroomId, grade as number, id);

            const configPromise = new Promise<void>((resolve) => {
                let unsub: (() => void) | undefined;
                unsub = listenToExerciseSelectionConfig(classroomId, (newConfig) => {
                    if (newConfig) setConfig({ ...DEFAULT_CONFIG, ...newConfig });
                    // Safely resolve and unsubscribe
                    if (unsub) unsub();
                    resolve();
                });
            });

            Promise.all([quizPromise, vocabPromise, configPromise]).then(([quizData, vocabData]) => {
                setQuiz(quizData);
                setVocabulary(vocabData);
                setIsLoading(false);
            }).catch(error => {
                console.error("Failed to load unit activities:", error);
                setIsLoading(false);
            });
        }
    }, [show, unitNumber, classroomId, grade]);

    if (!show) {
        return null;
    }

    const hasQuiz = quiz && quiz.length > 0;
    const hasVocab = vocabulary && vocabulary.length > 0;
    const hasActivities = hasQuiz || hasVocab;
    const itemPrefix = grade === 'topics' ? config.topicLabelText : config.unitLabelText;
    const titleLabel = `${itemPrefix} ${unitNumber}`;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[150] p-4 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md transform transition-all text-center"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{titleLabel}</h2>
                <p className="text-gray-600 mb-6 italic">{config.subtitle}</p>
                
                <div className="space-y-4">
                    {isLoading ? (
                         <div className="flex justify-center items-center h-24">
                            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                         </div>
                    ) : hasActivities ? (
                        <>
                            {hasVocab && (
                                <button
                                    onClick={() => onLearnVocabulary(vocabulary)}
                                    className="w-full text-left flex items-center gap-4 p-4 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-transform transform hover:scale-105 shadow-lg"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L9 9.61v5.063l-2.31-1.39a1 1 0 00-1.38 1.38l3 2a1 1 0 001.38 0l3-2a1 1 0 00-1.38-1.38L11 14.673V9.61l6.606-2.69a1 1 0 000-1.84l-7-3zM9 4.19l6 2.4-6 2.41L3 6.59l6-2.4z" />
                                    </svg>
                                    <div>
                                        <span className="text-lg leading-tight block">{config.activityLearnLabel}</span>
                                        <span className="block text-[11px] font-normal opacity-90">{config.activityLearnDesc}</span>
                                    </div>
                                </button>
                            )}
                            {hasVocab && (
                                <button
                                    onClick={() => onStartMatchingGame(vocabulary)}
                                    className="w-full text-left flex items-center gap-4 p-4 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-transform transform hover:scale-105 shadow-lg"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                    <div>
                                        <span className="text-lg leading-tight block">{config.activityMatchLabel}</span>
                                        <span className="block text-[11px] font-normal opacity-90">{config.activityMatchDesc}</span>
                                    </div>
                                </button>
                            )}
                            {hasVocab && (
                                <button
                                    onClick={() => onStartSpellingGame(vocabulary)}
                                    className="w-full text-left flex items-center gap-4 p-4 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-transform transform hover:scale-105 shadow-lg"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                        <span className="text-lg leading-tight block">{config.activitySpellLabel}</span>
                                        <span className="block text-[11px] font-normal opacity-90">{config.activitySpellDesc}</span>
                                    </div>
                                </button>
                            )}
                             {hasQuiz && (
                                <button
                                    onClick={() => onStartQuiz(quiz)}
                                    className="w-full text-left flex items-center gap-4 p-4 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-transform transform hover:scale-105 shadow-lg"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                        <span className="text-lg leading-tight block">{config.activityQuizLabel}</span>
                                        <span className="block text-[11px] font-normal opacity-90">{config.activityQuizDesc}</span>
                                    </div>
                                </button>
                            )}
                        </>
                    ) : (
                         <div className="text-center py-4">
                            <p className="text-gray-700">Mục này chưa có hoạt động nào.</p>
                        </div>
                    )}
                </div>
                 <button
                    type="button"
                    onClick={onClose}
                    className="w-full mt-6 text-center text-sm text-gray-500 hover:text-gray-800 p-2"
                >
                    Đóng
                </button>
            </div>
        </div>
    );
};

export default ActivitySelectionModal;
