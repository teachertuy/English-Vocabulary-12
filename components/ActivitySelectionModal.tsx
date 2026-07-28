import React, { useState, useEffect } from 'react';
import { QuizQuestion, VocabularyWord, ExerciseSelectionConfig, PlayerData } from '../types';
import { 
    getUnitQuizQuestionsByGrade, 
    getUnitVocabularyByGrade, 
    getTopicQuizQuestions, 
    getTopicVocabulary, 
    listenToExerciseSelectionConfig,
    listenToStudentActivityAttempts,
    ActivityAttemptCounts,
    ActivityStats
} from '../services/firebaseService';

interface ActivitySelectionModalProps {
    show: boolean;
    unitNumber: number;
    grade: number | 'topics';
    onClose: () => void;
    classroomId: string;
    playerData?: PlayerData;
    onStartQuiz: (questions: QuizQuestion[]) => void;
    onLearnVocabulary: (vocab: VocabularyWord[]) => void;
    onStartSpellingGame: (vocab: VocabularyWord[]) => void;
    onStartMatchingGame: (vocab: VocabularyWord[]) => void;
}

const DEFAULT_UNIT_COLORS = [
    '#00ACC1', '#2E7D32', '#AFB42B', '#D84315', '#C62828',
    '#D81B60', '#7B1FA2', '#1976D2', '#37474F', '#00897B'
];

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
    activityMatchLabel: 'Ghép cặp',
    activityMatchDesc: 'Nối từ tiếng Anh với nghĩa Việt',
    activitySpellLabel: 'Viết Chính tả',
    activitySpellDesc: 'Viết từ tiếng Anh tương ứng',
    activityQuizLabel: 'Trắc nghiệm',
    activityQuizDesc: 'Kiểm tra kiến thức của bạn',
    quizDuration: 30,
    quizTimerEnabled: true,
    spellingDuration: 30,
    spellingTimerEnabled: true,
    matchingDuration: 20,
    matchingTimerEnabled: true,

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

    actOpenCountBgColor: 'rgba(0,0,0,0.2)',
    actOpenCountLabelColor: '#ffffff',
    actOpenCountLabelFontSize: 0.65,
    actOpenCountValueColor: '#fef08a',
    actOpenCountValueFontSize: 0.875,

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
};

const formatDuration = (totalSecs: number) => {
    if (!totalSecs || totalSecs <= 0) return '0 giây';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs} giây`;
    if (secs === 0) return `${mins} phút`;
    return `${mins} phút ${secs} giây`;
};

const formatDateMonth = (timestamp: any) => {
    if (!timestamp) return '';
    let d: Date | null = null;
    if (typeof timestamp === 'number') {
        d = new Date(timestamp);
    } else if (typeof timestamp === 'object' && timestamp.seconds) {
        d = new Date(timestamp.seconds * 1000);
    }
    if (d && !isNaN(d.getTime())) {
        return ` (${d.getDate()}/${d.getMonth() + 1})`;
    }
    return '';
};

const defaultStats = (): ActivityStats => ({ count: 0, totalTimeSeconds: 0, attemptsList: [] });

interface ActivityCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    cardBgColor?: string;
    cardBgClass?: string;
    titleColor?: string;
    titleFontSize?: number;
    onClick: () => void;
    stats?: ActivityStats;
    playerData?: PlayerData;
    hideTimeDetails?: boolean;
    config?: ExerciseSelectionConfig;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
    title,
    description,
    icon,
    cardBgColor,
    cardBgClass,
    titleColor = '#ffffff',
    titleFontSize = 1.125,
    onClick,
    stats,
    playerData,
    hideTimeDetails = false,
    config
}) => {
    const count = stats?.count || 0;
    const totalTime = stats?.totalTimeSeconds || 0;
    const attemptsList = stats?.attemptsList || [];

    const openCountBg = config?.actOpenCountBgColor || 'rgba(0,0,0,0.2)';
    const openCountLabelColor = config?.actOpenCountLabelColor || '#ffffff';
    const openCountLabelSize = config?.actOpenCountLabelFontSize || 0.65;
    const openCountValColor = config?.actOpenCountValueColor || '#fef08a';
    const openCountValSize = config?.actOpenCountValueFontSize || 0.875;

    const timeHeaderColor = config?.actTimeHeaderColor || '#ffffff';
    const timeHeaderSize = config?.actTimeHeaderFontSize || 0.7;

    const attemptBg = config?.actAttemptBoxBgColor || 'rgba(0,0,0,0.2)';
    const attemptTextColor = config?.actAttemptTextColor || '#ffffff';
    const attemptTextSize = config?.actAttemptFontSize || 0.75;

    const totalTimeBg = config?.actTotalTimeBoxBgColor || 'rgba(0,0,0,0.25)';
    const totalTimeLabelColor = config?.actTotalTimeLabelColor || '#ffffff';
    const totalTimeLabelSize = config?.actTotalTimeLabelFontSize || 0.75;
    const totalTimeValColor = config?.actTotalTimeValueColor || '#fef08a';
    const totalTimeValSize = config?.actTotalTimeValueFontSize || 0.875;

    return (
        <div 
            onClick={onClick}
            style={cardBgColor ? { backgroundColor: cardBgColor } : undefined}
            className={`w-full text-left p-4 sm:p-5 rounded-2xl text-white shadow-md transition-all transform hover:scale-[1.01] hover:shadow-lg cursor-pointer ${!cardBgColor && cardBgClass ? cardBgClass : ''}`}
        >
            {/* Top row: Icon, Title & Description, and Open count badge */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl shrink-0">
                        {icon}
                    </div>
                    <div>
                        <span 
                            style={{ color: titleColor, fontSize: `${titleFontSize}rem` }}
                            className="font-extrabold leading-tight block"
                        >
                            {title}
                        </span>
                        <span className="text-xs sm:text-sm font-normal opacity-90 block mt-0.5">{description}</span>
                    </div>
                </div>

                {playerData && (
                    <div 
                        style={{ backgroundColor: openCountBg }}
                        className="flex flex-col items-end shrink-0 px-3 py-1.5 rounded-xl border border-white/20"
                    >
                        <span 
                            style={{ color: openCountLabelColor, fontSize: `${openCountLabelSize}rem` }}
                            className="font-extrabold uppercase tracking-wider block"
                        >
                            Số lần mở học
                        </span>
                        <span 
                            style={{ color: openCountValColor, fontSize: `${openCountValSize}rem` }}
                            className="mt-0.5 font-black font-mono block"
                        >
                            {count}
                        </span>
                    </div>
                )}
            </div>

            {/* Embedded tracking stats inside the activity card (hidden if hideTimeDetails is true) */}
            {playerData && !hideTimeDetails && (
                <div className="mt-3.5 pt-3 border-t border-white/25">
                    <div className="flex items-center justify-between mb-1.5">
                        <span 
                            style={{ color: timeHeaderColor, fontSize: `${timeHeaderSize}rem` }}
                            className="font-black uppercase tracking-wider flex items-center gap-1 block"
                        >
                            ⏱️ THỜI GIAN LÀM BÀI:
                        </span>
                    </div>

                    {attemptsList.length === 0 ? (
                        <div 
                            style={{ backgroundColor: attemptBg, color: attemptTextColor, fontSize: `${attemptTextSize}rem` }}
                            className="italic px-3 py-1 rounded-lg"
                        >
                            Chưa có lượt học
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1 w-full">
                            {attemptsList.map((att, idx) => (
                                <div 
                                    key={idx} 
                                    style={{ backgroundColor: attemptBg, color: attemptTextColor, fontSize: `${attemptTextSize}rem` }}
                                    className="flex items-center justify-between px-3 py-1 rounded-lg border border-white/15 font-medium"
                                >
                                    <span className="font-bold opacity-90">Lần {idx + 1}:</span>
                                    <span className="font-mono font-extrabold">
                                        {formatDuration(att.timeTakenSeconds)}{formatDateMonth(att.timestamp)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div 
                        style={{ backgroundColor: totalTimeBg }}
                        className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between px-3 py-1.5 rounded-xl font-bold"
                    >
                        <span 
                            style={{ color: totalTimeLabelColor, fontSize: `${totalTimeLabelSize}rem` }}
                        >
                            Tổng thời gian đã học:
                        </span>
                        <span 
                            style={{ color: totalTimeValColor, fontSize: `${totalTimeValSize}rem` }}
                            className="font-black font-mono"
                        >
                            {formatDuration(totalTime)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

const ActivitySelectionModal: React.FC<ActivitySelectionModalProps> = ({ show, unitNumber, grade, onClose, classroomId, playerData, onStartQuiz, onLearnVocabulary, onStartSpellingGame, onStartMatchingGame }) => {
    const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
    const [vocabulary, setVocabulary] = useState<VocabularyWord[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState<ExerciseSelectionConfig>(DEFAULT_CONFIG);
    const [attempts, setAttempts] = useState<ActivityAttemptCounts>({
        vocabulary: defaultStats(),
        matching: defaultStats(),
        spelling: defaultStats(),
        quiz: defaultStats()
    });

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

            Promise.all([quizPromise, vocabPromise]).then(([quizData, vocabData]) => {
                setQuiz(quizData);
                setVocabulary(vocabData);
                setIsLoading(false);
            }).catch(error => {
                console.error("Failed to load unit activities:", error);
                setIsLoading(false);
            });
        }
    }, [show, unitNumber, classroomId, grade]);

    useEffect(() => {
        if (show && classroomId) {
            const unsub = listenToExerciseSelectionConfig(classroomId, (newConfig) => {
                if (newConfig) setConfig({ ...DEFAULT_CONFIG, ...newConfig });
            });
            return () => unsub();
        }
    }, [show, classroomId]);

    useEffect(() => {
        if (!show || !classroomId || !playerData || !unitNumber) return;
        const unitId = grade === 'topics' ? `topic_${unitNumber}` : `unit_${unitNumber}`;
        const unsub = listenToStudentActivityAttempts(
            classroomId,
            grade,
            unitId,
            playerData.name,
            playerData.class,
            (counts) => setAttempts(counts)
        );
        return () => {
            if (unsub) unsub();
        };
    }, [show, classroomId, grade, unitNumber, playerData?.name, playerData?.class]);

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
                style={{ backgroundColor: config.actModalBgColor || '#ffffff' }}
                className="rounded-2xl shadow-xl p-5 sm:p-6 w-full max-w-xl transform transition-all text-center max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <h2 
                    style={{ color: config.actModalTitleColor || '#1e293b', fontSize: `${config.actModalTitleFontSize || 1.875}rem` }}
                    className="font-extrabold mb-1"
                >
                    {titleLabel}
                </h2>
                <p className="text-gray-600 mb-4 italic text-sm sm:text-base">{config.subtitle}</p>
                
                {playerData && (
                    <div 
                        style={{ 
                            backgroundColor: config.actStudentBadgeBgColor || '#fef3c7', 
                            color: config.actStudentBadgeTextColor || '#78350f', 
                            fontSize: `${config.actStudentBadgeFontSize || 0.75}rem` 
                        }}
                        className="mb-4 inline-flex items-center gap-1.5 font-bold px-3.5 py-1 rounded-full border border-amber-300"
                    >
                        👤 {playerData.name} - Lớp {playerData.class}
                    </div>
                )}
                
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
                                <ActivityCard
                                    title={config.activityLearnLabel}
                                    description={config.activityLearnDesc}
                                    icon={
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L9 9.61v5.063l-2.31-1.39a1 1 0 00-1.38 1.38l3 2a1 1 0 001.38 0l3-2a1 1 0 00-1.38-1.38L11 14.673V9.61l6.606-2.69a1 1 0 000-1.84l-7-3zM9 4.19l6 2.4-6 2.41L3 6.59l6-2.4z" />
                                        </svg>
                                    }
                                    cardBgColor={config.actLearnBgColor}
                                    cardBgClass="bg-gradient-to-r from-blue-500 to-blue-600"
                                    titleColor={config.actLearnTitleColor}
                                    titleFontSize={config.actLearnTitleFontSize}
                                    onClick={() => onLearnVocabulary(vocabulary)}
                                    stats={attempts.vocabulary}
                                    playerData={playerData}
                                    hideTimeDetails={true}
                                    config={config}
                                />
                            )}

                            {hasVocab && (
                                <ActivityCard
                                    title={config.activityMatchLabel}
                                    description={config.activityMatchDesc}
                                    icon={
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                        </svg>
                                    }
                                    cardBgColor={config.actMatchBgColor}
                                    cardBgClass="bg-gradient-to-r from-teal-500 to-teal-600"
                                    titleColor={config.actMatchTitleColor}
                                    titleFontSize={config.actMatchTitleFontSize}
                                    onClick={() => onStartMatchingGame(vocabulary)}
                                    stats={attempts.matching}
                                    playerData={playerData}
                                    config={config}
                                />
                            )}

                            {hasVocab && (
                                <ActivityCard
                                    title={config.activitySpellLabel}
                                    description={config.activitySpellDesc}
                                    icon={
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                        </svg>
                                    }
                                    cardBgColor={config.actSpellBgColor}
                                    cardBgClass="bg-gradient-to-r from-sky-500 to-sky-600"
                                    titleColor={config.actSpellTitleColor}
                                    titleFontSize={config.actSpellTitleFontSize}
                                    onClick={() => onStartSpellingGame(vocabulary)}
                                    stats={attempts.spelling}
                                    playerData={playerData}
                                    config={config}
                                />
                            )}

                            {hasQuiz && (
                                <ActivityCard
                                    title={config.activityQuizLabel}
                                    description={config.activityQuizDesc}
                                    icon={
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                        </svg>
                                    }
                                    cardBgColor={config.actQuizBgColor}
                                    cardBgClass="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900"
                                    titleColor={config.actQuizTitleColor}
                                    titleFontSize={config.actQuizTitleFontSize}
                                    onClick={() => onStartQuiz(quiz)}
                                    stats={attempts.quiz}
                                    playerData={playerData}
                                    config={config}
                                />
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
                    Thoát
                </button>
            </div>
        </div>
    );
};

export default ActivitySelectionModal;
