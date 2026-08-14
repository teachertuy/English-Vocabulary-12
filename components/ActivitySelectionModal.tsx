import React, { useState, useEffect } from 'react';
import { QuizQuestion, VocabularyWord, ExerciseSelectionConfig, PlayerData } from '../types';
import { 
    getUnitQuizQuestionsByGrade, 
    getUnitVocabularyByGrade, 
    getTopicQuizQuestions, 
    getTopicVocabulary, 
    listenToExerciseSelectionConfig,
    listenToStudentActivityAttempts,
    calculateStudentCompletionPercent,
    ActivityAttemptCounts,
    ActivityStats,
    AttemptDetail
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
    onStartListenChooseGame: (vocab: VocabularyWord[]) => void;
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
    activityListenChooseLabel: 'Nghe & Chọn',
    activityListenChooseDesc: 'Nghe phát âm và chọn từ tiếng Anh tương ứng',
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
    listenChooseDuration: 20,
    listenChooseTimerEnabled: true,

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

    actListenChooseBgColor: '#e11d48',
    actListenChooseTitleColor: '#ffffff',
    actListenChooseTitleFontSize: 1.125,

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

const getAttemptRemarkData = (att: AttemptDetail, config?: ExerciseSelectionConfig) => {
    const correct = att.correct !== undefined ? att.correct : 0;
    const time = att.timeTakenSeconds || 0;
    const total = att.totalQuestions || 0;

    let ratio = 0;
    if (total > 0) {
        ratio = correct / total;
    } else if (att.score !== undefined && att.score !== null) {
        const parsed = parseFloat(String(att.score));
        if (!isNaN(parsed)) ratio = parsed > 10 ? parsed / 100 : parsed / 10;
    } else {
        if (correct >= 15) ratio = 0.9;
        else if (correct >= 10) ratio = 0.75;
        else if (correct >= 5) ratio = 0.5;
        else ratio = 0.2;
    }

    if (ratio >= 0.85) {
        if (total > 0 && total <= 5) {
            return {
                text: 'Làm đúng tốt! Tiếp tục phát huy',
                color: config?.actCommentHighColor || config?.actCommentTextColor || '#fde047'
            };
        }
        return {
            text: config?.actCommentHighText || 'Xuất sắc! Rất chăm chỉ và làm bài tốt',
            color: config?.actCommentHighColor || config?.actCommentTextColor || '#fde047'
        };
    }
    if (ratio >= 0.5) {
        return {
            text: config?.actCommentGoodText || 'Khá tốt! Luyện tập thêm chút nữa nhé',
            color: config?.actCommentGoodColor || config?.actCommentTextColor || '#fde047'
        };
    }
    if (time < 30 || (time < 60 && ratio < 0.3)) {
        return {
            text: config?.actCommentRushText || config?.actCommentLowText || 'Làm bài quá vội! Cần siêng năng hơn',
            color: config?.actCommentLowColor || config?.actCommentTextColor || '#fde047'
        };
    }
    return {
        text: config?.actCommentLowText || 'Chưa siêng năng! Cần làm bài kỹ hơn',
        color: config?.actCommentLowColor || config?.actCommentTextColor || '#fde047'
    };
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
    showCorrectCount?: boolean;
    isHorizontalAttempts?: boolean;
    config?: ExerciseSelectionConfig;
}

const PointingFingerIcon: React.FC = () => (
    <div className="relative flex items-center justify-center w-9 h-9">
        <style>{`
            @keyframes fingerPointRightAnim {
                0%, 100% {
                    transform: translateX(-4px) scale(0.95);
                }
                50% {
                    transform: translateX(6px) scale(1.15);
                }
            }
            @keyframes fingerPulseGlow {
                0%, 100% {
                    opacity: 0.3;
                    transform: scale(0.85);
                }
                50% {
                    opacity: 0.8;
                    transform: scale(1.25);
                }
            }
            .animate-pointing-finger-hand {
                animation: fingerPointRightAnim 0.65s infinite ease-in-out;
            }
            .animate-pointing-glow {
                animation: fingerPulseGlow 1.3s infinite ease-in-out;
            }
        `}</style>
        {/* Soft glowing aura behind finger */}
        <div className="absolute w-7 h-7 bg-yellow-300/80 rounded-full blur-xs animate-pointing-glow"></div>
        {/* Pointing Finger 👉 */}
        <div className="relative animate-pointing-finger-hand text-3xl select-none leading-none flex items-center justify-center filter drop-shadow-md">
            👉
        </div>
    </div>
);

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
    showCorrectCount = false,
    isHorizontalAttempts = false,
    config
}) => {
    const count = stats?.count || 0;
    const totalTime = stats?.totalTimeSeconds || 0;
    const attemptsList = stats?.attemptsList || [];

    const openCountLabelText = config?.actOpenCountLabelText !== undefined ? config.actOpenCountLabelText : 'Số lần học';
    const openCountMinWidth = config?.actOpenCountMinWidth !== undefined ? config.actOpenCountMinWidth : 60;
    const openCountPadding = config?.actOpenCountPadding !== undefined ? config.actOpenCountPadding : 0.2;
    const openCountBg = config?.actOpenCountBgColor || '#ffffff';
    const openCountLabelColor = config?.actOpenCountLabelColor || '#dc2626';
    const openCountLabelSize = config?.actOpenCountLabelFontSize || 0.7;
    const openCountValColor = config?.actOpenCountValueColor || '#dc2626';
    const openCountValSize = config?.actOpenCountValueFontSize || 1.125;

    const timeHeaderText = config?.actTimeHeaderText !== undefined ? config.actTimeHeaderText : 'THỜI GIAN LÀM BÀI:';
    const timeHeaderColor = config?.actTimeHeaderColor || '#ffffff';
    const timeHeaderSize = config?.actTimeHeaderFontSize || 0.7;

    const attemptBg = config?.actAttemptBoxBgColor || '#ffffff';
    const attemptTextColor = config?.actAttemptTextColor || '#1e293b';
    const attemptTextSize = config?.actAttemptFontSize || 0.8;

    const commentTextColor = config?.actCommentTextColor || '#fde047';
    const commentFontSize = config?.actCommentFontSize || 0.7;

    return (
        <div 
            onClick={onClick}
            style={cardBgColor ? { backgroundColor: cardBgColor } : undefined}
            className={`w-full text-left p-3.5 sm:p-4 rounded-2xl text-white shadow-md transition-all transform hover:scale-[1.005] hover:shadow-lg cursor-pointer ${!cardBgColor && cardBgClass ? cardBgClass : ''}`}
        >
            {/* Top row: Icon, Title & Description, and Open count badge */}
            <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl shrink-0">
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
                        style={{ 
                            backgroundColor: openCountBg,
                            minWidth: `${openCountMinWidth}px`,
                            padding: `${openCountPadding}rem ${openCountPadding * 1.5}rem`
                        }}
                        className="flex flex-col items-center justify-center shrink-0 rounded-full border border-white/20 text-center shadow-xs"
                    >
                        <span 
                            style={{ color: openCountLabelColor, fontSize: `${openCountLabelSize}rem` }}
                            className="font-extrabold tracking-tight block leading-tight whitespace-nowrap"
                        >
                            {openCountLabelText}
                        </span>
                        <span 
                            style={{ color: openCountValColor, fontSize: `${openCountValSize}rem` }}
                            className="mt-0.5 font-black font-mono block leading-none"
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
                            ⏱️ {timeHeaderText}
                        </span>
                    </div>

                    {attemptsList.length === 0 ? (
                        <div 
                            style={{ backgroundColor: attemptBg, color: attemptTextColor, fontSize: `${attemptTextSize}rem` }}
                            className="italic px-3 py-1 rounded-lg"
                        >
                            Chưa có lượt học
                        </div>
                    ) : isHorizontalAttempts || !showCorrectCount ? (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full">
                            {attemptsList.map((att, idx) => (
                                <div 
                                    key={idx} 
                                    style={{ backgroundColor: attemptBg, color: attemptTextColor, fontSize: `${attemptTextSize}rem` }}
                                    className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-white/15 font-medium shadow-2xs text-center min-w-[95px]"
                                >
                                    <span className="font-bold shrink-0" style={{ color: openCountLabelColor || '#dc2626' }}>
                                        Lần {idx + 1}
                                    </span>
                                    <span className="font-mono font-extrabold text-[0.85em] shrink-0 opacity-90 mt-0.5">
                                        {formatDuration(att.timeTakenSeconds)}{formatDateMonth(att.timestamp)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5 w-full">
                            {attemptsList.map((att, idx) => (
                                <div 
                                    key={idx} 
                                    style={{ backgroundColor: attemptBg, color: attemptTextColor, fontSize: `${attemptTextSize}rem` }}
                                    className="flex flex-col px-3 py-1.5 rounded-lg border border-white/15 font-medium gap-1"
                                >
                                    <div className="flex items-center justify-between w-full gap-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="font-bold opacity-90 shrink-0">Lần {idx + 1}:</span>
                                            {showCorrectCount && (
                                                <span className="font-extrabold text-emerald-600 bg-emerald-50/90 border border-emerald-200/80 px-2 py-0.5 rounded-md text-[0.85em] leading-none shrink-0 shadow-2xs">
                                                    (Đúng: {att.correct !== undefined ? att.correct : 0})
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-mono font-extrabold shrink-0">
                                            {formatDuration(att.timeTakenSeconds)}{formatDateMonth(att.timestamp)}
                                        </span>
                                    </div>

                                    {showCorrectCount && (config?.actCommentEnabled !== false) && (() => {
                                        const remark = getAttemptRemarkData(att, config);
                                        return (
                                            <div 
                                                style={{ color: remark.color, fontSize: `${commentFontSize}rem` }}
                                                className="flex items-start gap-1 font-semibold leading-snug pt-1 border-t border-white/10 text-left"
                                            >
                                                <span className="shrink-0 text-[1.05em]">💬</span>
                                                <span>{remark.text}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ActivitySelectionModal: React.FC<ActivitySelectionModalProps> = ({ 
    show, 
    unitNumber, 
    grade, 
    onClose, 
    classroomId, 
    playerData, 
    onStartQuiz, 
    onLearnVocabulary, 
    onStartSpellingGame, 
    onStartMatchingGame,
    onStartListenChooseGame
}) => {
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

    const calcSummaryStats = () => {
        const vTime = attempts.vocabulary.totalTimeSeconds || 0;
        const vCount = attempts.vocabulary.count || 0;
        
        const vocabListCount = (vocabulary && vocabulary.length > 0) ? vocabulary.length : 0;
        let vAudioTimes = 0;
        let maxVocabTotal = vocabListCount;
        const uniqueWordsSet = new Set<string>();

        (attempts.vocabulary.attemptsList || []).forEach(a => {
            vAudioTimes += a.audioListenedCount || 0;
            if (Array.isArray(a.listenedWords)) {
                a.listenedWords.forEach(w => uniqueWordsSet.add(w));
            }
            if (a.totalQuestions && a.totalQuestions > maxVocabTotal) {
                maxVocabTotal = a.totalQuestions;
            }
        });

        let vUniqueWords = uniqueWordsSet.size;
        if (vUniqueWords === 0 && vAudioTimes > 0) {
            let maxUnique = 0;
            (attempts.vocabulary.attemptsList || []).forEach(a => {
                if (typeof a.uniqueWordsListenedCount === 'number') {
                    maxUnique = Math.max(maxUnique, a.uniqueWordsListenedCount);
                }
            });
            vUniqueWords = maxUnique > 0 ? maxUnique : Math.min(vAudioTimes, maxVocabTotal || 10);
        }

        const vTotalWords = maxVocabTotal > 0 ? maxVocabTotal : (vocabListCount > 0 ? vocabListCount : 10);
        const vUnheardWords = Math.max(0, vTotalWords - vUniqueWords);
        
        const mTime = attempts.matching.totalTimeSeconds || 0;
        const mCount = attempts.matching.count || 0;
        let mCorrect = 0, mIncorrect = 0;
        (attempts.matching.attemptsList || []).forEach(a => {
            mCorrect += a.correct || 0;
            mIncorrect += a.incorrect || 0;
        });

        const lTime = attempts.listenChoose?.totalTimeSeconds || 0;
        const lCount = attempts.listenChoose?.count || 0;
        let lCorrect = 0, lIncorrect = 0;
        (attempts.listenChoose?.attemptsList || []).forEach(a => {
            lCorrect += a.correct || 0;
            lIncorrect += a.incorrect || 0;
        });

        const sTime = attempts.spelling.totalTimeSeconds || 0;
        const sCount = attempts.spelling.count || 0;
        let sCorrect = 0, sIncorrect = 0;
        (attempts.spelling.attemptsList || []).forEach(a => {
            sCorrect += a.correct || 0;
            sIncorrect += a.incorrect || 0;
        });

        const qTime = attempts.quiz.totalTimeSeconds || 0;
        const qCount = attempts.quiz.count || 0;
        let qCorrect = 0, qIncorrect = 0;
        (attempts.quiz.attemptsList || []).forEach(a => {
            qCorrect += a.correct || 0;
            qIncorrect += a.incorrect || 0;
        });

        const totalTime = vTime + mTime + lTime + sTime + qTime;
        const totalCorrect = mCorrect + lCorrect + sCorrect + qCorrect;
        const totalIncorrect = mIncorrect + lIncorrect + sIncorrect + qIncorrect;
        const totalAnswered = totalCorrect + totalIncorrect;
        const totalAttemptsCount = vCount + mCount + lCount + sCount + qCount;

        // Number of sections participated out of 5 (Học từ mới, Ghép cặp, Nghe & Chọn, Viết chính tả, Kiểm tra lại)
        const vDone = vTime > 0 || vCount > 0;
        const mDone = mTime > 0 || mCount > 0 || (mCorrect + mIncorrect > 0);
        const lDone = lTime > 0 || lCount > 0 || (lCorrect + lIncorrect > 0);
        const sDone = sTime > 0 || sCount > 0 || (sCorrect + sIncorrect > 0);
        const qDone = qTime > 0 || qCount > 0 || (qCorrect + qIncorrect > 0);

        const partsDone = (vDone ? 1 : 0) + (mDone ? 1 : 0) + (lDone ? 1 : 0) + (sDone ? 1 : 0) + (qDone ? 1 : 0);
        const ratio = totalAnswered > 0 ? (totalCorrect / totalAnswered) : 0;

        const vocabCount = (vocabulary && vocabulary.length > 0) ? vocabulary.length : 10;
        const quizCount = (quiz && quiz.length > 0) ? quiz.length : 10;

        const allAttempts = [
            ...(attempts.vocabulary.attemptsList || []).map(a => ({ ...a, gameType: 'vocabulary' })),
            ...(attempts.matching.attemptsList || []).map(a => ({ ...a, gameType: 'matching' })),
            ...(attempts.listenChoose?.attemptsList || []).map(a => ({ ...a, gameType: 'listen-choose' })),
            ...(attempts.spelling.attemptsList || []).map(a => ({ ...a, gameType: 'spelling' })),
            ...(attempts.quiz.attemptsList || []).map(a => ({ ...a, gameType: 'quiz' }))
        ];

        const overallPercent = calculateStudentCompletionPercent(allAttempts, vocabulary?.length, quiz?.length);

        const totalUnitQuestions = vocabCount * 3 + quizCount;
        const completionRate = totalUnitQuestions > 0 ? (totalAnswered / totalUnitQuestions) : 0;
        const timePerQuestion = totalAnswered > 0 ? (totalTime / totalAnswered) : 0;

        let comment = '';

        if (totalAttemptsCount === 0 || (totalTime === 0 && totalAnswered === 0)) {
            comment = 'Chưa có lượt học nào. Em hãy bắt đầu luyện tập ngay nhé!';
        } else if (totalAnswered === 0) {
            if (vTime < 30) {
                comment = 'Mới lướt qua từ vựng. Em hãy đọc kỹ lại danh sách từ và bắt đầu làm các bài tập nhé!';
            } else {
                comment = 'Em đã dành thời gian xem từ vựng. Hãy tiếp tục thử sức với các bài tập Ghép cặp, Nghe & Chọn, Viết chính tả và Trắc nghiệm nhé!';
            }
        } else if (completionRate < 0.4 || totalAnswered < 10) {
            // Very low completion rate or very few questions answered (< 40% of unit exercises)
            if (ratio >= 0.8) {
                comment = 'Kết quả các câu đã làm rất tốt, tuy nhiên lượng bài tập thực hiện còn ít và sơ sài. Em cần làm đầy đủ các bài tập hơn để đạt hiệu quả cao nhé!';
            } else if (ratio >= 0.5) {
                comment = 'Mới làm được một số ít câu hỏi. Em cần dành thêm thời gian ôn lại bài và tích cực làm đầy đủ các bài tập nhé!';
            } else {
                comment = 'Mới làm ít câu hỏi và tỉ lệ đúng còn thấp. Em hãy xem kỹ lại danh sách từ vựng trước khi tiếp tục làm bài nhé!';
            }
        } else if (completionRate < 0.7) {
            // Medium completion rate (40% to 69% of unit exercises)
            if (ratio >= 0.85 && totalTime >= 120) {
                comment = 'Làm bài cẩn thận và có tỉ lệ đúng tốt, nhưng chưa hoàn thành đủ số lượng bài tập. Em hãy tiếp tục làm nốt các phần còn lại nhé!';
            } else if (ratio >= 0.65) {
                comment = 'Đã hoàn thành một phần lượng bài tập. Em hãy cố gắng duy trì sự tập trung và tiếp tục làm nốt các phần còn lại nhé!';
            } else {
                comment = 'Đã có cố gắng làm bài nhưng kết quả đạt được chưa cao. Em nên dành thêm thời gian học kỹ lại từ vựng nhé!';
            }
        } else {
            // High completion rate (>= 70% of unit exercises completed)
            if (timePerQuestion < 3.5) {
                // Rushed / guessed questions
                comment = 'Đã làm nhiều bài tập nhưng thời gian thao tác quá vội vàng. Em hãy đọc kỹ yêu cầu và suy nghĩ chu đáo hơn trước khi chọn nhé!';
            } else if (ratio >= 0.85 && completionRate >= 0.80 && partsDone >= 4) {
                comment = config.actCommentHighText || 'Xuất sắc! Em đã hoàn thành hầu hết các bài tập rất chu đáo với kết quả rất cao. Tinh thần học tập thật tuyệt vời!';
            } else if (ratio >= 0.75) {
                comment = config.actCommentGoodText || 'Rất tốt! Em đã chăm chỉ hoàn thành phần lớn các bài tập và đạt kết quả tốt. Hãy tiếp tục phát huy nhé!';
            } else if (ratio >= 0.60) {
                comment = 'Em đã rất chăm chỉ hoàn thành phần lớn các bài tập, tuy nhiên tỉ lệ đúng chưa thật cao. Hãy ôn tập lại những câu còn sai để nâng cao điểm số nhé!';
            } else {
                comment = config.actCommentLowText || 'Em đã cố gắng hoàn thành bài tập nhưng kết quả chưa đạt yêu cầu. Hãy dành thời gian học kỹ lý thuyết từ vựng và luyện tập lại nhé!';
            }
        }

        return {
            vTime,
            vUniqueWords,
            vAudioTimes,
            vUnheardWords,
            vTotalWords,
            mTime, mCorrect, mIncorrect,
            lTime, lCorrect, lIncorrect,
            sTime, sCorrect, sIncorrect,
            qTime, qCorrect, qIncorrect,
            totalTime,
            comment,
            overallPercent
        };
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[150] p-1.5 sm:p-3 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                style={{ backgroundColor: config.actModalBgColor || '#ffffff' }}
                className="rounded-2xl shadow-xl pt-4 sm:pt-5 pb-4 px-2 sm:px-3.5 w-full max-w-2xl transform transition-all text-center max-h-[96vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* 4-Part Summary Notice Box (Replaces Teacher Header) */}
                {config.actSummaryEnabled !== false && (() => {
                    const stats = calcSummaryStats();
                    const bg = config.actSummaryBgColor || '#0f172a';
                    const borderCol = config.actSummaryBorderColor || '#3b82f6';
                    const borderWidth = config.actSummaryBorderWidth !== undefined ? config.actSummaryBorderWidth : 2;
                    const widthPct = config.actSummaryWidth || 100;
                    const borderRadius = config.actSummaryBorderRadius !== undefined ? config.actSummaryBorderRadius : 16;
                    
                    const titleText = config.actSummaryTitleText || 'Tổng thời gian học & làm bài cả 4 phần';
                    const titleColor = config.actSummaryTitleColor || '#f59e0b';
                    const titleFontSize = config.actSummaryTitleFontSize || 0.9;

                    const subTitleText = config.actSummarySubTitleText !== undefined ? config.actSummarySubTitleText : 'Tổng thời gian tham gia:';
                    const subTitleColor = config.actSummarySubTitleColor || config.actSummaryItemTextColor || '#ffffff';
                    const subTitleFontSize = config.actSummarySubTitleFontSize || 0.85;

                    const valueColor = config.actSummaryValueColor || '#ef4444';
                    const valueFontSize = config.actSummaryValueFontSize || 0.95;

                    const compLabelText = config.actSummaryCompletionLabelText !== undefined ? config.actSummaryCompletionLabelText : 'Đã hoàn thành:';
                    const compLabelColor = config.actSummaryCompletionLabelColor || config.actSummaryItemTextColor || '#ffffff';
                    const compLabelFontSize = config.actSummaryCompletionLabelFontSize || 0.85;

                    const compValueColor = config.actSummaryCompletionValueColor || '#ef4444';
                    const compNumFontSize = config.actSummaryCompletionNumFontSize || 0.95;
                    const compPctFontSize = config.actSummaryCompletionPctFontSize || 0.7;
                    const compCircleSize = config.actSummaryCompletionCircleSize !== undefined ? config.actSummaryCompletionCircleSize : 38;
                    const compCircleBorderColor = config.actSummaryCompletionCircleBorderColor || '#ef4444';
                    const compCircleBorderWidth = config.actSummaryCompletionCircleBorderWidth !== undefined ? config.actSummaryCompletionCircleBorderWidth : 2;
                    const compCircleBgColor = config.actSummaryCompletionCircleBgColor || '#ffffff';

                    const itemColor = config.actSummaryItemTextColor || '#ffffff';
                    const itemFontSize = config.actSummaryItemFontSize || 0.8;

                    const commentColor = config.actSummaryCommentTextColor || '#15803d';
                    const commentFontSize = config.actSummaryCommentFontSize || 0.8;

                    return (
                        <div className="mx-auto mb-3.5 flex justify-center w-full">
                            <div 
                                style={{ 
                                    backgroundColor: bg,
                                    borderColor: borderCol,
                                    borderWidth: `${borderWidth}px`,
                                    borderRadius: `${borderRadius}px`,
                                    width: `${widthPct}%`
                                }}
                                className="p-3 sm:p-4 text-left shadow-lg space-y-1.5 border"
                            >
                                <div 
                                    style={{ color: titleColor, fontSize: `${titleFontSize}rem`, borderColor: '#000000' }}
                                    className="font-extrabold border-b border-black pb-2 text-center space-y-1"
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span>⏱️</span>
                                        <span>{titleText}</span>
                                    </div>
                                    <div className="text-center font-bold tracking-wide mt-0.5">
                                        <span style={{ color: subTitleColor, fontSize: `${subTitleFontSize}rem` }}>{subTitleText} </span>
                                        <span className="font-extrabold px-1 inline-block" style={{ color: valueColor, fontSize: `${valueFontSize}rem` }}>
                                            {formatDuration(stats.totalTime)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                        <span style={{ color: compLabelColor, fontSize: `${compLabelFontSize}rem` }} className="font-bold">
                                            {compLabelText}
                                        </span>
                                        <div 
                                            style={{ 
                                                width: `${compCircleSize}px`, 
                                                height: `${compCircleSize}px`, 
                                                backgroundColor: compCircleBgColor, 
                                                borderColor: compCircleBorderColor, 
                                                borderWidth: `${compCircleBorderWidth}px`,
                                                borderStyle: 'solid',
                                                borderRadius: '9999px',
                                                color: compValueColor
                                            }}
                                            className="flex items-center justify-center font-black shrink-0 leading-none shadow-sm"
                                        >
                                            <span style={{ fontSize: `${compNumFontSize}rem` }}>{stats.overallPercent}</span>
                                            <span style={{ fontSize: `${compPctFontSize}rem` }}>%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1 font-medium pt-1" style={{ color: itemColor, fontSize: `${itemFontSize}rem` }}>
                                    <div className="flex items-start gap-1">
                                        <span className="font-bold shrink-0">1.</span>
                                        <span>Học từ vựng: <strong style={{ color: titleColor }}>{formatDuration(stats.vTime)}</strong> (nghe phát âm <strong style={{ color: titleColor }}>{stats.vUniqueWords}</strong> từ (<strong style={{ color: titleColor }}>{stats.vAudioTimes}</strong> lần) còn <strong style={{ color: titleColor }}>{stats.vUnheardWords}</strong> từ chưa nghe)</span>
                                    </div>
                                    <div className="flex items-start gap-1">
                                        <span className="font-bold shrink-0">2.</span>
                                        <span>Ghép cặp: đúng: <strong className="text-emerald-400">{stats.mCorrect}</strong> / sai: <strong className="text-red-400">{stats.mIncorrect}</strong> (<span className="opacity-90">{formatDuration(stats.mTime)}</span>)</span>
                                    </div>
                                    <div className="flex items-start gap-1">
                                        <span className="font-bold shrink-0">3.</span>
                                        <span>Nghe & chọn: đúng: <strong className="text-emerald-400">{stats.lCorrect}</strong> / sai: <strong className="text-red-400">{stats.lIncorrect}</strong> (<span className="opacity-90">{formatDuration(stats.lTime)}</span>)</span>
                                    </div>
                                    <div className="flex items-start gap-1">
                                        <span className="font-bold shrink-0">4.</span>
                                        <span>Viết chính tả: đúng: <strong className="text-emerald-400">{stats.sCorrect}</strong> / sai: <strong className="text-red-400">{stats.sIncorrect}</strong> (<span className="opacity-90">{formatDuration(stats.sTime)}</span>)</span>
                                    </div>
                                    <div className="flex items-start gap-1">
                                        <span className="font-bold shrink-0">5.</span>
                                        <span>Kiểm tra lại: đúng: <strong className="text-emerald-400">{stats.qCorrect}</strong> / sai: <strong className="text-red-400">{stats.qIncorrect}</strong> (<span className="opacity-90">{formatDuration(stats.qTime)}</span>)</span>
                                    </div>
                                </div>

                                <div 
                                    style={{ fontSize: `${commentFontSize}rem`, borderColor: 'rgba(0,0,0,0.2)' }}
                                    className="pt-1.5 border-t border-black/20 flex items-start gap-1.5 text-left"
                                >
                                    <span className="shrink-0 text-base">💬</span>
                                    <div className="leading-snug">
                                        <span className="font-extrabold text-red-500 underline mr-1.5 inline-block" style={{ color: '#ef4444' }}>Nhận xét chung:</span>
                                        <span className="font-bold inline" style={{ color: commentColor }}>{stats.comment}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                
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
                                    icon={<PointingFingerIcon />}
                                    cardBgColor={config.actLearnBgColor}
                                    cardBgClass="bg-gradient-to-r from-blue-500 to-blue-600"
                                    titleColor={config.actLearnTitleColor}
                                    titleFontSize={config.actLearnTitleFontSize}
                                    onClick={() => onLearnVocabulary(vocabulary)}
                                    stats={attempts.vocabulary}
                                    playerData={playerData}
                                    showCorrectCount={false}
                                    isHorizontalAttempts={true}
                                    config={config}
                                />
                            )}

                            {hasVocab && (
                                <ActivityCard
                                    title={config.activityMatchLabel}
                                    description={config.activityMatchDesc}
                                    icon={<PointingFingerIcon />}
                                    cardBgColor={config.actMatchBgColor}
                                    cardBgClass="bg-gradient-to-r from-teal-500 to-teal-600"
                                    titleColor={config.actMatchTitleColor}
                                    titleFontSize={config.actMatchTitleFontSize}
                                    onClick={() => onStartMatchingGame(vocabulary)}
                                    stats={attempts.matching}
                                    playerData={playerData}
                                    showCorrectCount={true}
                                    config={config}
                                />
                            )}

                            {hasVocab && (
                                <ActivityCard
                                    title={config.activityListenChooseLabel || 'Nghe & Chọn'}
                                    description={config.activityListenChooseDesc || 'Nghe phát âm và chọn từ tiếng Anh tương ứng'}
                                    icon={<PointingFingerIcon />}
                                    cardBgColor={config.actListenChooseBgColor || '#e11d48'}
                                    cardBgClass="bg-gradient-to-r from-rose-500 to-pink-600"
                                    titleColor={config.actListenChooseTitleColor || '#ffffff'}
                                    titleFontSize={config.actListenChooseTitleFontSize || 1.125}
                                    onClick={() => onStartListenChooseGame(vocabulary)}
                                    stats={attempts.listenChoose}
                                    playerData={playerData}
                                    showCorrectCount={true}
                                    config={config}
                                />
                            )}

                            {hasVocab && (
                                <ActivityCard
                                    title={config.activitySpellLabel}
                                    description={config.activitySpellDesc}
                                    icon={<PointingFingerIcon />}
                                    cardBgColor={config.actSpellBgColor}
                                    cardBgClass="bg-gradient-to-r from-sky-500 to-sky-600"
                                    titleColor={config.actSpellTitleColor}
                                    titleFontSize={config.actSpellTitleFontSize}
                                    onClick={() => onStartSpellingGame(vocabulary)}
                                    stats={attempts.spelling}
                                    playerData={playerData}
                                    showCorrectCount={true}
                                    config={config}
                                />
                            )}

                            {hasQuiz && (
                                <ActivityCard
                                    title={config.activityQuizLabel}
                                    description={config.activityQuizDesc}
                                    icon={<PointingFingerIcon />}
                                    cardBgColor={config.actQuizBgColor}
                                    cardBgClass="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900"
                                    titleColor={config.actQuizTitleColor}
                                    titleFontSize={config.actQuizTitleFontSize}
                                    onClick={() => onStartQuiz(quiz)}
                                    stats={attempts.quiz}
                                    playerData={playerData}
                                    showCorrectCount={true}
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
