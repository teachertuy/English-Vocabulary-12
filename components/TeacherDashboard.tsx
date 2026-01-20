
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { GameResult, StudentProgress, QuizQuestion, UnitsState, VocabularyWord, WelcomeScreenConfig, DashboardConfig, ExerciseSelectionConfig } from '../types';
import { 
    listenToResults, clearResults, setGameStatus, getGameStatus, 
    listenToOnlineStudents, listenToCheatCounts, kickPlayer, deleteStudentResult, 
    checkAndSyncQuizVersion, listenToStudentProgress, saveQuizQuestions, 
    listenToQuizQuestions, listenToUnitsStatusByGrade, setUnitStatusByGrade,
    saveUnitQuizQuestionsByGrade, listenToUnitQuizQuestionsByGrade, listenToUnitResultsByGrade, clearUnitResultsByGrade,
    deleteUnitStudentResultByGrade, saveUnitVocabularyByGrade, listenToUnitVocabularyByGrade, deleteCurrentQuiz,
    listenToTopicsStatus, setTopicStatus, listenToTopicQuizQuestions, listenToTopicResults,
    listenToTopicVocabulary, saveTopicVocabulary, saveTopicQuizQuestions, clearTopicResults,
    deleteTopicStudentResult, saveWelcomeConfig, listenToWelcomeConfig, saveDashboardConfig, listenToDashboardConfig,
    saveExerciseSelectionConfig, listenToExerciseSelectionConfig
} from '../services/firebaseService';
import { QUIZ_VERSION, generateQuizFromCustomPrompt, generateQuizFromText, generateVocabularyList } from '../services/geminiService';
import TextToQuizModal from './TextToQuizModal';
import EditQuizModal from './EditQuizModal';
import AIQuizGeneratorModal from './AIQuizGeneratorModal';
import ConfirmationModal from './ConfirmationModal';
import EditVocabularyModal from './EditVocabularyModal';
import EditWelcomeScreenModal from './EditWelcomeScreenModal';
import EditDashboardConfigModal from './EditDashboardConfigModal';
import EditExerciseSelectionModal from './EditExerciseSelectionModal';

type Tab = 'dashboard' | 'units_12' | 'topics';

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString('vi-VN', { hour12: false });
    const d = date.toLocaleDateString('vi-VN');
    return `${time} ${d}`;
};

const VOCAB_PLACEHOLDER = `Dán danh sách từ vựng của bạn vào đây.
Định dạng mong muốn:
Từ Tiếng Anh - (Từ loại) /Phiên âm/ - Nghĩa Tiếng Việt

Ví dụ:
vocabulary - (n) /vəˈkæbjələri/ - từ vựng
pronunciation - (n) /prəˌnʌnsiˈeɪʃn/ - cách phát âm
intermediate - (adj) /ˌɪntərˈmiːdiət/ - trung cấp`;

const EMPTY_ACTIVITY_PROMPTS = {
    learn: '',
    match: '',
    spell: '',
    quiz: ''
};

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
    unitsTabLabel: 'Quản lý UNITs _ English 12',
    topicsTabLabel: 'Quản lý TOPICs',
    tabFontSize: 1,
    tabPadding: 1.5,
    sectionTitleFontSize: 1.875,
    sectionTitleColor: '#ffffff',
    cardUnitLabel: 'UNIT',
    cardTopicLabel: 'TOPIC',
    cardLabelFontSize: 1.5,
    cardLabelColor: '#fde047',
    cardValueFontSize: 6,
    manageButtonText: 'Quản lý Nội dung',
    manageButtonFontSize: 1,
    manageButtonColor: '#dc2626',
};

const DEFAULT_EXERCISE_CONFIG: ExerciseSelectionConfig = {
    mainTitle: 'TỪ VỰNG TIẾNG ANH 12 & TỪ VỰNG THEO CHỦ ĐỀ',
    mainTitleFontSize: 1.875,
    mainTitleColor: '#dc2626',
    card1Title: 'English 12',
    card1Icon: '📝',
    card1Color: '#3b82f6',
    card2Title: 'Topic-based vocabulary',
    card2Icon: '📰',
    card2Color: '#a855f7',
    cardFontSize: 1.5,
    cardHeight: 10,
    cardBorderRadius: 16,
};

interface StudentUnitSummary {
    playerKey: string;
    playerName: string;
    playerClass: string;
    results: GameResult[];
}

const ResultDetailModal: React.FC<{ result: GameResult; onClose: () => void }> = ({ result, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Chi tiết kết quả - {result.playerName}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>
                <div className="overflow-y-auto p-6 space-y-4">
                    {result.details.map((detail, index) => {
                        const isCorrect = detail.status === 'correct';
                        const userDidAnswer = detail.status !== null;
                        let resultColorClass = 'border-gray-300 bg-gray-50';
                        if (userDidAnswer) {
                            resultColorClass = isCorrect ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50';
                        }
                        const userChoiceText = detail.userAnswer ? `"${detail.userAnswer}"` : "Chưa trả lời";

                        return (
                             <div key={index} className={`p-4 rounded-lg border-2 ${resultColorClass}`}>
                                <p className="font-bold text-gray-900 mb-2">Câu {index + 1}: <span className="font-normal">{detail.question.replace('______', '...')}</span></p>
                                <p className="text-sm text-gray-600 italic mb-2">{detail.translation.replace('______', '...')}</p>
                                <p><span className="font-semibold">Bạn đã chọn:</span> <span className={`font-bold ${!userDidAnswer ? 'text-gray-500' : isCorrect ? 'text-green-700' : 'text-red-700'}`}>{userChoiceText}</span></p>
                                <p><span className="font-semibold">Đáp án đúng:</span> <span className="font-bold text-green-700">"{detail.correctAnswer}"</span></p>
                                <div className="mt-2 p-2 bg-blue-50 rounded text-sm border-l-4 border-blue-400">
                                    <p className="text-gray-800"><strong className="text-blue-800">Giải thích:</strong> {detail.explanation}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
                 <div className="p-4 border-t text-right">
                    <button onClick={onClose} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition shadow-md">Đóng</button>
                </div>
            </div>
        </div>
    );
};

const getPlayerKey = (playerName: string, playerClass: string) => {
    const normalizedClass = (playerClass || '').trim().toUpperCase();
    const normalizedName = (playerName || '').trim();
    const combined = `${normalizedClass}_${normalizedName}`;
    return combined.replace(/[.#$[\]]/g, '_');
};

const nameColors = [
    'text-red-600', 'text-blue-600', 'text-green-600', 'text-purple-600', 'text-pink-600',
    'text-indigo-600', 'text-teal-600', 'text-orange-600', 'text-lime-600', 'text-cyan-600',
    'text-rose-600', 'text-fuchsia-600'
];

const getColorForName = (name: string) => {
    if (!name) return 'text-gray-700';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % nameColors.length);
    return nameColors[index];
};

const getGameTypeStyle = (gameType?: 'quiz' | 'spelling' | 'matching' | 'vocabulary') => {
    switch (gameType) {
        case 'quiz': return 'text-purple-800 bg-purple-100 border-purple-200';
        case 'spelling': return 'text-orange-800 bg-orange-100 border-orange-200';
        case 'matching': return 'text-purple-700 bg-purple-50 border-purple-200';
        case 'vocabulary': return 'text-blue-800 bg-blue-100 border-blue-200';
        default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
};

const getGameTypeLabel = (gameType?: 'quiz' | 'spelling' | 'matching' | 'vocabulary') => {
    switch (gameType) {
        case 'quiz': return 'Trắc nghiệm';
        case 'spelling': return 'Chính tả';
        case 'matching': return 'Ghép cặp';
        case 'vocabulary': return 'Học từ vựng';
        default: return 'Khác';
    }
};

const unitCardStyles = [
  { gradient: 'from-red-500 to-amber-500', hoverShadow: 'hover:shadow-red-500/40', textColor: 'from-red-100 to-amber-100' },
  { gradient: 'from-emerald-500 to-lime-500', hoverShadow: 'hover:shadow-emerald-500/40', textColor: 'from-emerald-100 to-lime-100' },
  { gradient: 'from-blue-600 to-sky-400', hoverShadow: 'hover:shadow-blue-600/40', textColor: 'from-blue-200 to-sky-200' },
  { gradient: 'from-orange-500 to-yellow-500', hoverShadow: 'hover:shadow-orange-500/40', textColor: 'from-orange-100 to-yellow-100' },
  { gradient: 'from-violet-600 to-fuchsia-500', hoverShadow: 'hover:shadow-violet-600/40', textColor: 'from-violet-200 to-fuchsia-200' },
  { gradient: 'from-teal-500 to-cyan-400', hoverShadow: 'hover:shadow-teal-500/40', textColor: 'from-teal-100 to-cyan-100' },
  { gradient: 'from-rose-500 to-pink-500', hoverShadow: 'hover:shadow-rose-500/40', textColor: 'from-rose-100 to-pink-100' },
  { gradient: 'from-indigo-700 to-slate-500', hoverShadow: 'hover:shadow-indigo-700/40', textColor: 'from-indigo-200 to-slate-200' },
  { gradient: 'from-green-500 to-yellow-400', hoverShadow: 'hover:shadow-green-500/40', textColor: 'from-green-100 to-yellow-100' },
  { gradient: 'from-gray-800 via-slate-600 to-gray-800', hoverShadow: 'hover:shadow-gray-500/40', textColor: 'from-slate-200 to-white' },
];

const TeacherDashboard: React.FC<{ classroomId: string; onGoHome: () => void; }> = ({ classroomId, onGoHome }) => {
    // Main Dashboard State
    const [results, setResults] = useState<GameResult[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof GameResult | null; direction: 'ascending' | 'descending' }>({ key: 'score', direction: 'descending' });
    const [selectedClass, setSelectedClass] = useState('all');
    const [onlineStudents, setOnlineStudents] = useState<{name: string, class: string}[]>([]);
    const [cheatCounts, setCheatCounts] = useState<Record<string, number>>({});
    const [studentProgress, setStudentProgress] = useState<Record<string, StudentProgress>>({});
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [flashingStudents, setFlashingStudents] = useState<Set<string>>(new Set());
    const prevCheatCountsRef = useRef<Record<string, number>>({});
    const [deletingStudent, setDeletingStudent] = useState<string | null>(null);
    const [kickingStudent, setKickingStudent] = useState<string | null>(null);
    
    // Global State
    const [isGameEnabled, setIsGameEnabled] = useState(true);
    const [isClearing, setIsClearing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    
    // Welcome & Dashboard Config
    const [welcomeConfig, setWelcomeConfig] = useState<WelcomeScreenConfig | null>(null);
    const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>(DEFAULT_DASHBOARD_CONFIG);
    const [exerciseSelectionConfig, setExerciseSelectionConfig] = useState<ExerciseSelectionConfig>(DEFAULT_EXERCISE_CONFIG);
    const [isEditWelcomeModalOpen, setIsEditWelcomeModalOpen] = useState(false);
    const [isEditDashboardModalOpen, setIsEditDashboardModalOpen] = useState(false);
    const [isEditExerciseModalOpen, setIsEditExerciseModalOpen] = useState(false);

    // Modal & Editing State
    const [selectedResult, setSelectedResult] = useState<GameResult | null>(null);
    const [isTextQuizModalOpen, setIsTextQuizModalOpen] = useState(false);
    const [isAiQuizModalOpen, setIsAiQuizModalOpen] = useState(false);
    const [isGeneratingNewQuiz, setIsGeneratingNewQuiz] = useState(false);
    const [isGeneratingFromText, setIsGeneratingFromText] = useState(false);
    const [quizForEditing, setQuizForEditing] = useState<QuizQuestion[] | null>(null);
    const [isDeleteQuizConfirmOpen, setIsDeleteQuizConfirmOpen] = useState(false);
    const [isDeletingQuiz, setIsDeletingQuiz] = useState(false);
    const [isEditVocabModalOpen, setIsEditVocabModalOpen] = useState(false);
    const [vocabForEditing, setVocabForEditing] = useState<VocabularyWord[]>([]);
    
    // Units State
    const [unitsStatus12, setUnitsStatus12] = useState<UnitsState>({});
    const [viewingUnit, setViewingUnit] = useState<{ grade: number, unit: number } | null>(null);
    const [processedUnitResults, setProcessedUnitResults] = useState<StudentUnitSummary[]>([]);
    const [currentUnitQuiz, setCurrentUnitQuiz] = useState<QuizQuestion[]>([]);
    const [currentUnitVocabulary, setCurrentUnitVocabulary] = useState<VocabularyWord[]>([]);
    const [unitVocabList, setUnitVocabList] = useState('');
    const [isGeneratingUnitActivities, setIsGeneratingUnitActivities] = useState(false);
    const [unitSortConfig, setUnitSortConfig] = useState<{ key: keyof GameResult | null; direction: 'ascending' | 'descending' }>({ key: 'score', direction: 'descending' });
    const [selectedUnitClass, setSelectedUnitClass] = useState('all');
    const [deletingUnitStudent, setDeletingUnitStudent] = useState<{activityId: string, playerName: string} | null>(null);
    const [isClearingUnit, setIsClearingUnit] = useState(false);
    const [unitActivityPrompts, setUnitActivityPrompts] = useState(EMPTY_ACTIVITY_PROMPTS);

    // Topics State
    const [topicsStatus, setTopicsStatus] = useState<UnitsState>({});
    const [viewingTopic, setViewingTopic] = useState<number | null>(null);
    const [processedTopicResults, setProcessedTopicResults] = useState<StudentUnitSummary[]>([]);
    const [currentTopicQuiz, setCurrentTopicQuiz] = useState<QuizQuestion[]>([]);
    const [currentTopicVocabulary, setCurrentTopicVocabulary] = useState<VocabularyWord[]>([]);
    const [topicVocabList, setTopicVocabList] = useState('');
    const [isGeneratingTopicActivities, setIsGeneratingTopicActivities] = useState(false);
    const [topicSortConfig, setTopicSortConfig] = useState<{ key: keyof GameResult | null; direction: 'ascending' | 'descending' }>({ key: 'score', direction: 'descending' });
    const [selectedTopicClass, setSelectedTopicClass] = useState('all');
    const [deletingTopicStudent, setDeletingTopicStudent] = useState<{activityId: string, playerName: string} | null>(null);
    const [isClearingTopic, setIsClearingTopic] = useState(false);
    const [topicActivityPrompts, setTopicActivityPrompts] = useState(EMPTY_ACTIVITY_PROMPTS);

    const rowBorderColors = useMemo(() => [
        'border-b-indigo-200',
        'border-b-teal-200',
        'border-b-rose-200',
        'border-b-amber-200',
    ], []);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Main data listeners
    useEffect(() => {
        let unsubscribeResults: () => void;
        let unsubscribeStatus: () => void;
        let unsubscribeOnline: () => void;
        let unsubscribeCheats: () => void;
        let unsubscribeProgress: () => void;
        let unsubscribeQuiz: () => void;
        let unsubscribeUnits12: () => void;
        let unsubscribeTopics: () => void;
        let unsubscribeWelcome: () => void;
        let unsubscribeDashboard: () => void;
        let unsubscribeExercise: () => void;
    
        (async () => {
            try {
                await checkAndSyncQuizVersion(classroomId, QUIZ_VERSION);
            } catch (error) {
                console.error("Initialization failed due to Firebase errors.");
                setNotification({ message: 'Lỗi kết nối CSDL.', type: 'error' });
            }
    
            unsubscribeResults = listenToResults(classroomId, (data) => setResults(data ? Object.values(data) : []));
            unsubscribeStatus = getGameStatus(classroomId, setIsGameEnabled);
            unsubscribeOnline = listenToOnlineStudents(classroomId, (students) => setOnlineStudents(students ? Object.values(students) : []));
            unsubscribeCheats = listenToCheatCounts(classroomId, (counts) => setCheatCounts(counts || {}));
            unsubscribeProgress = listenToStudentProgress(classroomId, (progress) => setStudentProgress(progress || {}));
            unsubscribeQuiz = listenToQuizQuestions(classroomId, (questions) => setQuizQuestions(questions || []));
            unsubscribeUnits12 = listenToUnitsStatusByGrade(classroomId, 12, (status) => setUnitsStatus12(status || {}));
            unsubscribeTopics = listenToTopicsStatus(classroomId, (status) => setTopicsStatus(status || {}));
            unsubscribeWelcome = listenToWelcomeConfig(classroomId, (config) => setWelcomeConfig(config));
            unsubscribeDashboard = listenToDashboardConfig(classroomId, (config) => {
                if (config) setDashboardConfig(config);
            });
            unsubscribeExercise = listenToExerciseSelectionConfig(classroomId, (config) => {
                if (config) setExerciseSelectionConfig(config);
            });
        })();
    
        return () => {
            if (unsubscribeResults) unsubscribeResults();
            if (unsubscribeStatus) unsubscribeStatus();
            if (unsubscribeOnline) unsubscribeOnline();
            if (unsubscribeCheats) unsubscribeCheats();
            if (unsubscribeProgress) unsubscribeProgress();
            if (unsubscribeQuiz) unsubscribeQuiz();
            if (unsubscribeUnits12) unsubscribeUnits12();
            if (unsubscribeTopics) unsubscribeTopics();
            if (unsubscribeWelcome) unsubscribeWelcome();
            if (unsubscribeDashboard) unsubscribeDashboard();
            if (unsubscribeExercise) unsubscribeExercise();
        };
    }, [classroomId, refreshKey]);

    useEffect(() => {
        if (viewingUnit === null) return;
        const { grade, unit } = viewingUnit;
        const unitId = `unit_${unit}`;
        const unsubQuiz = listenToUnitQuizQuestionsByGrade(classroomId, grade, unitId, (questions) => setCurrentUnitQuiz(questions || []));
        const unsubResults = listenToUnitResultsByGrade(classroomId, grade, unitId, (data) => {
            if (!data) { setProcessedUnitResults([]); return; }
            // Added explicit Return Type to the map callback to satisfy StudentUnitSummary interface compatibility
            const processedData: StudentUnitSummary[] = Object.entries(data).map(([playerKey, resultsObj]): StudentUnitSummary | null => {
                const resultsArray = resultsObj ? Object.entries(resultsObj).map(([activityId, result]) => ({ ...result as GameResult, activityId })) : [];
                if (resultsArray.length === 0) return null;
                resultsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                return { playerKey, playerName: resultsArray[0].playerName, playerClass: resultsArray[0].playerClass, results: resultsArray };
            }).filter((item): item is StudentUnitSummary => item !== null);
            setProcessedUnitResults(processedData);
        });
        const unsubVocab = listenToUnitVocabularyByGrade(classroomId, grade, unitId, (vocab) => setCurrentUnitVocabulary(vocab || []));
        return () => { unsubQuiz(); unsubResults(); unsubVocab(); };
    }, [viewingUnit, classroomId]);

    useEffect(() => {
        if (viewingTopic === null) return;
        const topicId = `topic_${viewingTopic}`;
        const unsubQuiz = listenToTopicQuizQuestions(classroomId, topicId, (questions) => setCurrentTopicQuiz(questions || []));
        const unsubResults = listenToTopicResults(classroomId, topicId, (data) => {
            if (!data) { setProcessedTopicResults([]); return; }
            // Added explicit Return Type to the map callback to satisfy StudentUnitSummary interface compatibility
            const processedData: StudentUnitSummary[] = Object.entries(data).map(([playerKey, resultsObj]): StudentUnitSummary | null => {
                const resultsArray = resultsObj ? Object.entries(resultsObj).map(([activityId, result]) => ({ ...result as GameResult, activityId })) : [];
                if (resultsArray.length === 0) return null;
                resultsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                return { playerKey, playerName: resultsArray[0].playerName, playerClass: resultsArray[0].playerClass, results: resultsArray };
            }).filter((item): item is StudentUnitSummary => item !== null);
            setProcessedTopicResults(processedData);
        });
        const unsubVocab = listenToTopicVocabulary(classroomId, topicId, (vocab) => setCurrentTopicVocabulary(vocab || []));
        return () => { unsubQuiz(); unsubResults(); unsubVocab(); };
    }, [viewingTopic, classroomId]);

    const handleToggleGameStatus = useCallback(() => setGameStatus(classroomId, !isGameEnabled), [classroomId, isGameEnabled]);
    const handleToggleUnitStatus = useCallback(async (grade: number, unitNumber: number, isEnabled: boolean) => {
        const unitId = `unit_${unitNumber}`;
        try { await setUnitStatusByGrade(classroomId, grade, unitId, isEnabled); } catch (error) { console.error(error); setNotification({ message: `Lỗi khi cập nhật UNIT ${unitNumber}.`, type: 'error' }); }
    }, [classroomId]);
    const handleToggleTopicStatus = useCallback(async (topicNumber: number, isEnabled: boolean) => {
        const topicId = `topic_${topicNumber}`;
        try { await setTopicStatus(classroomId, topicId, isEnabled); } catch (error) { console.error(error); setNotification({ message: `Lỗi khi cập nhật TOPIC ${topicNumber}.`, type: 'error' }); }
    }, [classroomId]);

    const handleClearUnitResults = useCallback(async () => {
        if (!viewingUnit || isClearingUnit) return;
        setIsClearingUnit(true);
        try { await clearUnitResultsByGrade(classroomId, viewingUnit.grade, `unit_${viewingUnit.unit}`); setNotification({ message: `Đã xóa hết kết quả của UNIT ${viewingUnit.unit}!`, type: 'success' }); } catch (error) { setNotification({ message: 'Xóa kết quả thất bại.', type: 'error' }); } finally { setIsClearingUnit(false); }
    }, [classroomId, viewingUnit, isClearingUnit]);

    const handleClearTopicResults = useCallback(async () => {
        if (!viewingTopic || isClearingTopic) return;
        setIsClearingTopic(true);
        try { await clearTopicResults(classroomId, `topic_${viewingTopic}`); setNotification({ message: `Đã xóa hết kết quả của TOPIC ${viewingTopic}!`, type: 'success' }); } catch (error) { setNotification({ message: 'Xóa kết quả thất bại.', type: 'error' }); } finally { setIsClearingTopic(false); }
    }, [classroomId, viewingTopic, isClearingTopic]);

    const handleGenerateFromAiPrompt = useCallback(async (prompt: string) => {
        if (isGeneratingNewQuiz) return;
        setIsGeneratingNewQuiz(true);
        try { const newQuestions = await generateQuizFromCustomPrompt(prompt); setQuizForEditing(newQuestions); setNotification({ message: 'Đề đã được tạo!', type: 'success' }); setIsAiQuizModalOpen(false); } catch (error) { setNotification({ message: 'Tạo đề thất bại.', type: 'error' }); } finally { setIsGeneratingNewQuiz(false); }
    }, [isGeneratingNewQuiz]);

    const handleGenerateFromText = useCallback(async (context: string) => {
        if (isGeneratingFromText) return;
        setIsGeneratingFromText(true);
        try { const newQuestions = await generateQuizFromText(context); setQuizForEditing(newQuestions); setNotification({ message: 'Đề đã được tạo!', type: 'success' }); setIsTextQuizModalOpen(false); } catch (error) { setNotification({ message: 'Tạo đề từ văn bản thất bại.', type: 'error' }); } finally { setIsGeneratingFromText(false); }
    }, [isGeneratingFromText]);

    const handleSaveEditedQuiz = useCallback(async (editedQuestions: QuizQuestion[]) => {
        if (editedQuestions.length === 0) { setNotification({ message: 'Không thể lưu một đề trống.', type: 'error' }); setQuizForEditing(null); return; }
        try {
            if (viewingUnit !== null) { await saveUnitQuizQuestionsByGrade(classroomId, viewingUnit.grade, `unit_${viewingUnit.unit}`, editedQuestions); setNotification({ message: `Đã cập nhật đề thi cho UNIT ${viewingUnit.unit}!`, type: 'success' }); }
            else if (viewingTopic !== null) { await saveTopicQuizQuestions(classroomId, `topic_${viewingTopic}`, editedQuestions); setNotification({ message: `Đã cập nhật đề thi cho TOPIC ${viewingTopic}!`, type: 'success' }); }
            else { await saveQuizQuestions(classroomId, editedQuestions); setNotification({ message: 'Đã cập nhật đề thi chung!', type: 'success' }); }
        } catch (error) { setNotification({ message: 'Lưu đề thi thất bại.', type: 'error' }); } finally { setQuizForEditing(null); }
    }, [classroomId, viewingUnit, viewingTopic]);

    const handleSaveVocabulary = useCallback(async (editedVocab: VocabularyWord[]) => {
        try {
            if (viewingUnit !== null) { await saveUnitVocabularyByGrade(classroomId, viewingUnit.grade, `unit_${viewingUnit.unit}`, editedVocab); setNotification({ message: `Đã cập nhật từ vựng cho UNIT ${viewingUnit.unit}!`, type: 'success' }); }
            else if (viewingTopic !== null) { await saveTopicVocabulary(classroomId, `topic_${viewingTopic}`, editedVocab); setNotification({ message: `Đã cập nhật từ vựng cho TOPIC ${viewingTopic}!`, type: 'success' }); }
        } catch (error) { setNotification({ message: 'Lưu từ vựng thất bại.', type: 'error' }); }
    }, [classroomId, viewingUnit, viewingTopic]);

    const handleRefresh = useCallback(() => { setIsRefreshing(true); setRefreshKey(prev => prev + 1); setTimeout(() => setIsRefreshing(false), 1000); }, []);

    const handleSaveWelcomeConfig = async (config: WelcomeScreenConfig) => { try { await saveWelcomeConfig(classroomId, config); setNotification({ message: 'Đã lưu thay đổi!', type: 'success' }); } catch (error) { setNotification({ message: 'Lưu thất bại.', type: 'error' }); } };
    const handleSaveDashboardConfig = async (config: DashboardConfig) => { try { await saveDashboardConfig(classroomId, config); setNotification({ message: 'Đã lưu thay đổi!', type: 'success' }); } catch (error) { setNotification({ message: 'Lưu thất bại.', type: 'error' }); } };
    const handleSaveExerciseSelectionConfig = async (config: ExerciseSelectionConfig) => { try { await saveExerciseSelectionConfig(classroomId, config); setNotification({ message: 'Đã lưu thay đổi!', type: 'success' }); } catch (error) { setNotification({ message: 'Lưu thất bại.', type: 'error' }); } };

    const flattenedUnitResults = useMemo(() => {
        const list = processedUnitResults.flatMap(student => 
            student.results.map(res => ({ ...res, playerKey: student.playerKey }))
        );
        let filtered = list.filter(r => selectedUnitClass === 'all' || r.playerClass.toUpperCase() === selectedUnitClass.toUpperCase());
        if (unitSortConfig.key) {
            filtered.sort((a, b) => {
                const aVal = a[unitSortConfig.key!] ?? 0;
                const bVal = b[unitSortConfig.key!] ?? 0;
                let cmp = 0;
                if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
                else cmp = String(aVal).localeCompare(String(bVal));
                return unitSortConfig.direction === 'ascending' ? cmp : -cmp;
            });
        }
        return filtered;
    }, [processedUnitResults, selectedUnitClass, unitSortConfig]);

    const flattenedTopicResults = useMemo(() => {
        const list = processedTopicResults.flatMap(student => 
            student.results.map(res => ({ ...res, playerKey: student.playerKey }))
        );
        let filtered = list.filter(r => selectedTopicClass === 'all' || r.playerClass.toUpperCase() === selectedTopicClass.toUpperCase());
        if (topicSortConfig.key) {
            filtered.sort((a, b) => {
                const aVal = a[topicSortConfig.key!] ?? 0;
                const bVal = b[topicSortConfig.key!] ?? 0;
                let cmp = 0;
                if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
                else cmp = String(aVal).localeCompare(String(bVal));
                return topicSortConfig.direction === 'ascending' ? cmp : -cmp;
            });
        }
        return filtered;
    }, [processedTopicResults, selectedTopicClass, topicSortConfig]);

    const renderResultsTable = (data: any[], type: 'unit' | 'topic', onRowClick: (r: GameResult) => void, onDeleteRow: (r: any) => void) => {
        const setSort = type === 'unit' ? setUnitSortConfig : setTopicSortConfig;
        const config = type === 'unit' ? unitSortConfig : topicSortConfig;
        
        const toggleSort = (key: keyof GameResult) => {
            setSort({ key, direction: config.key === key && config.direction === 'descending' ? 'ascending' : 'descending' });
        };

        const currentClass = type === 'unit' ? selectedUnitClass : selectedTopicClass;
        const setClass = type === 'unit' ? setSelectedUnitClass : setSelectedTopicClass;

        return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mt-8">
                <div className="p-4 border-b bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <select 
                            value={currentClass} 
                            onChange={(e) => setClass(e.target.value)}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
                        >
                            {uniqueClasses.map(c => <option key={c} value={c}>{c === 'all' ? 'Tất cả các lớp' : c}</option>)}
                        </select>
                    </div>
                    <button 
                        onClick={type === 'unit' ? handleClearUnitResults : handleClearTopicResults}
                        disabled={type === 'unit' ? isClearingUnit : isClearingTopic}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-md disabled:bg-gray-400"
                        title="Xóa tất cả kết quả"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#fff2e0]">
                                {['STT', 'HỌ VÀ TÊN', 'LỚP', 'ĐIỂM', 'NỘI DUNG THAM GIA', 'LẦN LÀM', 'ĐÚNG', 'SAI', 'THỜI GIAN', 'NGÀY LÀM', 'HÀNH ĐỘNG'].map((label, i) => {
                                    const keys: (keyof GameResult | null)[] = [null, 'playerName', 'playerClass', 'score', 'gameType', 'attempts', 'correct', 'incorrect', 'timeTakenSeconds', 'timestamp', null];
                                    const key = keys[i];
                                    return (
                                        <th key={label} onClick={key ? () => toggleSort(key) : undefined} className={`p-4 text-[13px] font-black text-[#c05621] border-b border-gray-200 ${key ? 'cursor-pointer hover:bg-orange-100' : ''}`}>
                                            <div className="flex items-center gap-1 uppercase tracking-tight">
                                                {label}
                                                {key && config.key === key && (
                                                    <span className="text-[10px]">{config.direction === 'ascending' ? '↑' : '↓'}</span>
                                                )}
                                                {key && config.key !== key && (i === 3 || i === 9) && (
                                                    <span className="text-[10px] opacity-30">{i === 3 ? '▼' : '↑'}</span>
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((res, idx) => (
                                <tr key={`${res.playerKey}_${res.activityId}`} onClick={() => onRowClick(res)} className="hover:bg-blue-50/30 transition-colors cursor-pointer text-[14px] font-bold">
                                    <td className="p-4 text-blue-600 font-black">{idx + 1}</td>
                                    <td className="p-4 text-[#E91E63]">{res.playerName}</td>
                                    <td className="p-4 text-[#8E44AD]">{res.playerClass}</td>
                                    <td className="p-4 text-red-600 text-lg font-black">{res.score}</td>
                                    <td className="p-4">
                                        <span className={`px-4 py-1.5 rounded-full text-[12px] font-bold border ${getGameTypeStyle(res.gameType)}`}>
                                            {getGameTypeLabel(res.gameType)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-red-600 text-center">{res.attempts}</td>
                                    <td className="p-4 text-green-600 text-center">{res.correct}</td>
                                    <td className="p-4 text-red-600 text-center">{res.incorrect}</td>
                                    <td className="p-4 text-[#c05621]">{formatTime(res.timeTakenSeconds)}</td>
                                    <td className="p-4 text-slate-800 text-[13px]">{formatDate(res.timestamp)}</td>
                                    <td className="p-4">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteRow(res); }}
                                            className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr><td colSpan={11} className="p-10 text-center text-gray-400 font-medium">Chưa có kết quả nào.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderUnitDetailView = (grade: number, unitNumber: number) => {
        return (
            <div className="p-4 bg-white/70 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 tab-content-enter space-y-8">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewingUnit(null)} className="flex items-center gap-2 text-blue-600 font-semibold hover:underline">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            <span className="text-lime-700">Quay lại danh sách</span>
                        </button>
                        <h2 className="text-2xl font-bold text-indigo-800">Quản lý chi tiết: <span className="text-red-500">UNIT</span> {unitNumber}</h2>
                    </div>
                     <button onClick={handleRefresh} className="bg-blue-600 text-white font-bold p-2 rounded-full hover:bg-blue-700 transition shadow-sm disabled:bg-gray-500" title="Làm mới dữ liệu" disabled={isRefreshing}><svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 003.5 12" /></svg></button>
                </div>
                
                <div className="p-4 border rounded-lg bg-sky-50 border-sky-200 space-y-4">
                    <h3 className="text-xl font-bold text-purple-700">Soạn bài</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="vocab-list" className="font-semibold text-teal-700">1. Dán danh sách từ vựng:</label>
                            <textarea id="vocab-list" value={unitVocabList} onChange={(e) => setUnitVocabList(e.target.value)} placeholder={VOCAB_PLACEHOLDER} className="w-full h-96 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white text-slate-900" disabled={isGeneratingUnitActivities}/>
                            <div className="flex justify-end">
                                <button onClick={() => { setVocabForEditing(currentUnitVocabulary); setIsEditVocabModalOpen(true); }} className="text-sm flex items-center gap-1 bg-white border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 text-blue-600 font-bold transition shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                    Chỉnh sửa chi tiết
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="space-y-2">
                                <label className="font-semibold text-teal-700">2. Tùy chỉnh yêu cầu cho AI:</label>
                                <div className="space-y-2">
                                    <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                                        <label htmlFor="prompt-learn" className="block text-sm font-bold text-blue-600 mb-1">Học từ vựng</label>
                                        <textarea id="prompt-learn" value={unitActivityPrompts.learn} onChange={(e) => setUnitActivityPrompts(prev => ({...prev, learn: e.target.value}))} placeholder="VD: tạo 10 thẻ từ vựng..." className="w-full p-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-sky-100 text-slate-900" rows={2} disabled={isGeneratingUnitActivities}/>
                                    </div>
                                    <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                                        <label htmlFor="prompt-quiz" className="block text-sm font-bold text-green-600 mb-1">Bài tập trắc nghiệm</label>
                                        <textarea id="prompt-quiz" value={unitActivityPrompts.quiz} onChange={(e) => setUnitActivityPrompts(prev => ({...prev, quiz: e.target.value}))} placeholder="VD: tạo 10 câu hỏi trắc nghiệm..." className="w-full p-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-green-400 bg-sky-100 text-slate-900" rows={2} disabled={isGeneratingUnitActivities}/>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-grow flex items-end">
                                <button onClick={handleGenerateUnitActivities} disabled={isGeneratingUnitActivities || (Object.values(unitActivityPrompts).every(p => !String(p).trim()))} className="bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full mt-4">
                                    {isGeneratingUnitActivities ? (<span>Đang tạo...</span>) : ('✨ Tạo hoạt động với AI')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-indigo-700 border-l-4 border-indigo-600 pl-3">Kết quả làm bài (UNIT {unitNumber})</h3>
                    {renderResultsTable(flattenedUnitResults, 'unit', setSelectedResult, setDeletingUnitStudent)}
                </div>
            </div>
        );
    };

    const renderTopicDetailView = (topicNumber: number) => {
        return (
            <div className="p-4 bg-white/70 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 tab-content-enter space-y-8">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewingTopic(null)} className="flex items-center gap-2 text-blue-600 font-semibold hover:underline">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            <span className="text-lime-700">Quay lại danh sách</span>
                        </button>
                        <h2 className="text-2xl font-bold text-indigo-800">Quản lý chi tiết: <span className="text-blue-500">TOPIC</span> {topicNumber}</h2>
                    </div>
                     <button onClick={handleRefresh} className="bg-blue-600 text-white font-bold p-2 rounded-full hover:bg-blue-700 transition shadow-sm disabled:bg-gray-500" title="Làm mới dữ liệu" disabled={isRefreshing}><svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 003.5 12" /></svg></button>
                </div>
                
                <div className="p-4 border rounded-lg bg-sky-50 border-sky-200 space-y-4">
                    <h3 className="text-xl font-bold text-purple-700">Soạn bài</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="topic-vocab-list" className="font-semibold text-teal-700">1. Dán danh sách từ vựng:</label>
                            <textarea id="topic-vocab-list" value={topicVocabList} onChange={(e) => setTopicVocabList(e.target.value)} placeholder={VOCAB_PLACEHOLDER} className="w-full h-96 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white text-slate-900" disabled={isGeneratingTopicActivities}/>
                            <div className="flex justify-end">
                                <button onClick={() => { setVocabForEditing(currentTopicVocabulary); setIsEditVocabModalOpen(true); }} className="text-sm flex items-center gap-1 bg-white border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 text-blue-600 font-bold transition shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                    Chỉnh sửa chi tiết
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="space-y-4">
                                <label className="font-semibold text-teal-700">2. Tùy chỉnh yêu cầu cho AI:</label>
                                <div className="space-y-4">
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                        <label htmlFor="topic-prompt-learn" className="block text-sm font-bold text-blue-600 mb-2 uppercase">Học từ vựng</label>
                                        <textarea id="topic-prompt-learn" value={topicActivityPrompts.learn} onChange={(e) => setTopicActivityPrompts(prev => ({...prev, learn: e.target.value}))} placeholder="VD: tạo 10 thẻ từ vựng..." className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-sky-50 text-slate-900" rows={3} disabled={isGeneratingTopicActivities}/>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                        <label htmlFor="topic-prompt-quiz" className="block text-sm font-bold text-green-600 mb-2 uppercase">Bài tập trắc nghiệm</label>
                                        <textarea id="topic-prompt-quiz" value={topicActivityPrompts.quiz} onChange={(e) => setTopicActivityPrompts(prev => ({...prev, quiz: e.target.value}))} placeholder="VD: tạo 10 câu hỏi trắc nghiệm..." className="w-full p-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-400 bg-sky-50 text-slate-900" rows={3} disabled={isGeneratingTopicActivities}/>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-grow flex items-end">
                                <button onClick={handleGenerateTopicActivities} disabled={isGeneratingTopicActivities || (Object.values(topicActivityPrompts).every(p => !String(p).trim()))} className="bg-slate-500 text-white font-bold py-4 px-8 rounded-lg hover:bg-slate-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full mt-6 shadow-md">
                                    {isGeneratingTopicActivities ? (<span>Đang tạo...</span>) : ('✨ Tạo hoạt động với AI')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-indigo-700 border-l-4 border-indigo-600 pl-3">Kết quả làm bài (TOPIC {topicNumber})</h3>
                    {renderResultsTable(flattenedTopicResults, 'topic', setSelectedResult, setDeletingTopicStudent)}
                </div>
            </div>
        );
    };

    const summaryStats = useMemo(() => {
        const totalStudents = results.length;
        if (totalStudents === 0) return { totalStudents: 0, avgScore: 0, avgTime: 0 };
        const totalScore = results.reduce((sum, result) => sum + parseFloat(result.score), 0);
        const totalTime = results.reduce((sum, result) => sum + result.timeTakenSeconds, 0);
        return { totalStudents, avgScore: (totalScore / totalStudents).toFixed(1), avgTime: Math.round(totalTime / totalStudents) };
    }, [results]);

    const uniqueClasses = useMemo(() => {
        const allResults = [...results, ...processedUnitResults.flatMap(s => s.results), ...processedTopicResults.flatMap(s => s.results)];
        if (!allResults || allResults.length === 0) return ['all'];
        const classSet = new Set(allResults.map(r => (r.playerClass || '').trim().toUpperCase()));
        return ['all', ...Array.from(classSet).sort()];
    }, [results, processedUnitResults, processedTopicResults]);

    const sortedResults = useMemo(() => {
        let itemsWithCheats: GameResult[] = results.map(result => ({ ...result, cheatAttempts: cheatCounts[getPlayerKey(result.playerName, result.playerClass)] || 0 }));
        let filteredItems = itemsWithCheats.filter(result => (selectedClass === 'all' || (result.playerClass || '').trim().toUpperCase() === selectedClass));
        if (sortConfig.key) {
            filteredItems.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];
                let comparison = 0;
                if (typeof aValue === 'number' && typeof bValue === 'number') comparison = aValue - bValue;
                else if (sortConfig.key === 'score') comparison = parseFloat(aValue as string) - parseFloat(bValue as string);
                else comparison = String(aValue).localeCompare(String(bValue));
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return filteredItems;
    }, [results, cheatCounts, sortConfig, selectedClass]);

    const handleToggleTopicStatus_Local = useCallback(async (topicNumber: number, isEnabled: boolean) => {
        const topicId = `topic_${topicNumber}`;
        try { await setTopicStatus(classroomId, topicId, isEnabled); } catch (error) { setNotification({ message: 'Lỗi khi cập nhật TOPIC.', type: 'error' }); }
    }, [classroomId]);

    const handleClearRequest = useCallback(async () => {
        if (isClearing) return;
        setIsClearing(true);
        try { await clearResults(classroomId); setNotification({ message: 'Đã xóa toàn bộ lịch sử bài làm chung!', type: 'success' }); } catch (error) { setNotification({ message: 'Xóa thất bại.', type: 'error' }); } finally { setIsClearing(false); }
    }, [classroomId, isClearing]);

    const handleConfirmDeleteUnitResult = async () => {
        if (!deletingUnitStudent || !viewingUnit) return;
        try {
            const { grade, unit } = viewingUnit;
            const unitId = `unit_${unit}`;
            await deleteUnitStudentResultByGrade(classroomId, grade, unitId, deletingUnitStudent.playerName, '', deletingUnitStudent.activityId);
            setNotification({ message: `Đã xóa kết quả của ${deletingUnitStudent.playerName}!`, type: 'success' });
        } catch (error) { setNotification({ message: 'Xóa kết quả thất bại.', type: 'error' }); } finally { setDeletingUnitStudent(null); }
    };

    const handleConfirmDeleteTopicResult = async () => {
        if (!deletingTopicStudent || !viewingTopic) return;
        try {
            const topicId = `topic_${viewingTopic}`;
            await deleteTopicStudentResult(classroomId, topicId, deletingTopicStudent.playerName, '', deletingTopicStudent.activityId);
            setNotification({ message: `Đã xóa kết quả của ${deletingTopicStudent.playerName}!`, type: 'success' });
        } catch (error) { setNotification({ message: 'Xóa kết quả thất bại.', type: 'error' }); } finally { setDeletingTopicStudent(null); }
    };

    const handleGenerateUnitActivities = useCallback(async () => {
        if (!viewingUnit) return;
        setIsGeneratingUnitActivities(true);
        let hasError = false;
        try {
            const { grade, unit } = viewingUnit;
            const unitId = `unit_${unit}`;
            let vocabSourceText = unitVocabList.trim();
            if (!vocabSourceText && currentUnitVocabulary.length > 0) vocabSourceText = currentUnitVocabulary.map(v => `${v.word} - (${v.type}) /${v.phonetic}/ - ${v.translation}`).join('\n');
            if (!vocabSourceText) throw new Error('No vocab source');

            if (unitActivityPrompts.learn.trim()) {
                const vocabData = await generateVocabularyList(`Context: ${vocabSourceText}\n\nInstruction: ${unitActivityPrompts.learn}`);
                await saveUnitVocabularyByGrade(classroomId, grade, unitId, vocabData);
            }
            if (unitActivityPrompts.quiz.trim()) {
                const questions = await generateQuizFromCustomPrompt(`Context: ${vocabSourceText}\n\nInstruction: ${unitActivityPrompts.quiz}`);
                await saveUnitQuizQuestionsByGrade(classroomId, grade, unitId, questions);
            }
            setNotification({ message: `Đã cập nhật hoạt động cho UNIT ${unit}!`, type: 'success' });
        } catch (error) { hasError = true; } finally {
            if (hasError) setNotification({ message: 'Tạo hoạt động thất bại.', type: 'error' });
            setIsGeneratingUnitActivities(false);
        }
    }, [unitVocabList, currentUnitVocabulary, unitActivityPrompts, viewingUnit, classroomId]);

    const handleGenerateTopicActivities = useCallback(async () => {
        if (!viewingTopic) return;
        setIsGeneratingTopicActivities(true);
        let hasError = false;
        try {
            const topicId = `topic_${viewingTopic}`;
            let vocabSourceText = topicVocabList.trim();
            if (!vocabSourceText && currentTopicVocabulary.length > 0) vocabSourceText = currentTopicVocabulary.map(v => `${v.word} - (${v.type}) /${v.phonetic}/ - ${v.translation}`).join('\n');
            if (!vocabSourceText) throw new Error('No vocab source');

            if (topicActivityPrompts.learn.trim()) {
                const vocabData = await generateVocabularyList(`Context: ${vocabSourceText}\n\nInstruction: ${topicActivityPrompts.learn}`);
                await saveTopicVocabulary(classroomId, topicId, vocabData);
            }
            if (topicActivityPrompts.quiz.trim()) {
                const questions = await generateQuizFromCustomPrompt(`Context: ${vocabSourceText}\n\nInstruction: ${topicActivityPrompts.quiz}`);
                await saveTopicQuizQuestions(classroomId, topicId, questions);
            }
            setNotification({ message: `Đã cập nhật hoạt động cho TOPIC ${viewingTopic}!`, type: 'success' });
        } catch (error) { hasError = true; } finally {
            if (hasError) setNotification({ message: 'Tạo hoạt động thất bại.', type: 'error' });
            setIsGeneratingTopicActivities(false);
        }
    }, [topicVocabList, currentTopicVocabulary, topicActivityPrompts, viewingTopic, classroomId]);

    const renderContent = () => {
        if (viewingUnit) return renderUnitDetailView(viewingUnit.grade, viewingUnit.unit);
        if (viewingTopic) return renderTopicDetailView(viewingTopic);

        switch (activeTab) {
            case 'units_12':
                return (
                    <div className="p-6 bg-gradient-to-br from-green-700 via-green-800 to-green-900 rounded-lg shadow-2xl border border-green-700/50 tab-content-enter">
                         <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="font-bold" style={{ fontSize: `${dashboardConfig.sectionTitleFontSize}rem`, color: dashboardConfig.sectionTitleColor }}>{dashboardConfig.unitsTabLabel}</h2>
                                <p className="text-slate-400 mt-2">Kích hoạt, quản lý nội dung và xem kết quả cho từng bài học.</p>
                            </div>
                            <button onClick={handleRefresh} className="bg-slate-700/50 text-white font-bold p-2 rounded-full hover:bg-slate-600/50 transition shadow-md border border-slate-600 disabled:bg-gray-500" title="Làm mới dữ liệu" disabled={isRefreshing}><svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 003.5 12" /></svg></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(unitNumber => {
                                const unitId = `unit_${unitNumber}`;
                                const isEnabled = unitsStatus12[unitId]?.enabled ?? false;
                                const style = unitCardStyles[unitNumber - 1];
                                return (
                                    <div key={unitNumber} className={`rounded-2xl p-1.5 transition-all duration-300 ease-in-out group ${isEnabled ? `bg-gradient-to-br ${style.gradient} shadow-lg ${style.hoverShadow} hover:-translate-y-1` : 'bg-slate-700/50'}`}>
                                        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl h-full flex flex-col p-5">
                                            <div className="flex justify-end items-start">
                                                <label className="flex items-center cursor-pointer">
                                                    <div className="relative">
                                                        <input type="checkbox" className="sr-only" checked={isEnabled} onChange={(e) => handleToggleUnitStatus(12, unitNumber, e.target.checked)}/>
                                                        <div className="block w-14 h-8 rounded-full bg-slate-700"></div>
                                                        <div className={`dot absolute left-1 top-1 w-6 h-6 rounded-full shadow-lg transition-transform ${isEnabled ? 'transform translate-x-6 bg-gradient-to-r from-cyan-300 to-blue-400' : 'bg-slate-500'}`}></div>
                                                    </div>
                                                </label>
                                            </div>
                                            <div className="flex-grow flex flex-col items-center justify-center">
                                                <span className="font-bold" style={{ fontSize: `${dashboardConfig.cardLabelFontSize}rem`, color: dashboardConfig.cardLabelColor }}>{dashboardConfig.cardUnitLabel}</span>
                                                <span className={`font-black bg-clip-text text-transparent bg-gradient-to-br ${isEnabled ? style.textColor : 'from-slate-400 to-slate-600'} mb-2 -mt-2`} style={{ fontSize: `${dashboardConfig.cardValueFontSize}rem` }}>{unitNumber}</span>
                                                <span className={`font-semibold text-xs px-2 py-0.5 rounded-full self-center ${isEnabled ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>{isEnabled ? 'Đang Mở' : 'Đã Đóng'}</span>
                                            </div>
                                            <button onClick={isEnabled ? () => setViewingUnit({ grade: 12, unit: unitNumber }) : undefined} disabled={!isEnabled} className={`w-full font-bold px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg flex items-center justify-center gap-2 mt-4 ${isEnabled ? 'text-white hover:brightness-110 border border-black/20' : 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'}`} style={isEnabled ? { backgroundColor: dashboardConfig.manageButtonColor, fontSize: `${dashboardConfig.manageButtonFontSize}rem`, padding: '0.75rem 1rem' } : {}}><span>{dashboardConfig.manageButtonText}</span></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'topics':
                return (
                    <div className="p-6 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 rounded-lg shadow-2xl border border-blue-700/50 tab-content-enter">
                         <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="font-bold" style={{ fontSize: `${dashboardConfig.sectionTitleFontSize}rem`, color: dashboardConfig.sectionTitleColor }}>{dashboardConfig.topicsTabLabel}</h2>
                                <p className="text-slate-400 mt-2">Kích hoạt, quản lý nội dung và xem kết quả cho từng chủ đề.</p>
                            </div>
                            <button onClick={handleRefresh} className="bg-slate-700/50 text-white font-bold p-2 rounded-full hover:bg-slate-600/50 transition shadow-md border border-slate-600 disabled:bg-gray-500" title="Làm mới dữ liệu" disabled={isRefreshing}><svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 003.5 12" /></svg></button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {Array.from({ length: 60 }, (_, i) => i + 1).map(topicNumber => {
                                const topicId = `topic_${topicNumber}`;
                                const isEnabled = topicsStatus[topicId]?.enabled ?? false;
                                const style = unitCardStyles[(topicNumber - 1) % unitCardStyles.length];
                                return (
                                    <div key={topicNumber} className={`rounded-2xl p-1.5 transition-all duration-300 ease-in-out group ${isEnabled ? `bg-gradient-to-br ${style.gradient} shadow-lg ${style.hoverShadow} hover:-translate-y-1` : 'bg-slate-700/50'}`}>
                                        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl h-full flex flex-col p-4">
                                            <div className="flex justify-end items-start">
                                                <label className="flex items-center cursor-pointer">
                                                    <div className="relative"><input type="checkbox" className="sr-only" checked={isEnabled} onChange={(e) => handleToggleTopicStatus_Local(topicNumber, e.target.checked)} /><div className="block w-14 h-8 rounded-full bg-slate-700"></div><div className={`dot absolute left-1 top-1 w-6 h-6 rounded-full shadow-lg transition-transform ${isEnabled ? 'transform translate-x-6 bg-gradient-to-r from-cyan-300 to-blue-400' : 'bg-slate-500'}`}></div></div>
                                                </label>
                                            </div>
                                            <div className="flex-grow flex flex-col items-center justify-center text-center">
                                                <span className="font-bold" style={{ fontSize: `${dashboardConfig.cardLabelFontSize * 0.75}rem`, color: dashboardConfig.cardLabelColor }}>{dashboardConfig.cardTopicLabel}</span>
                                                <span className={`font-black bg-clip-text text-transparent bg-gradient-to-br ${isEnabled ? style.textColor : 'from-slate-400 to-slate-600'} mb-1 -mt-1`} style={{ fontSize: `${dashboardConfig.cardValueFontSize * 0.75}rem` }}>{topicNumber}</span>
                                                <span className={`font-semibold text-[10px] px-2 py-0.5 rounded-full self-center ${isEnabled ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>{isEnabled ? 'Mở' : 'Đóng'}</span>
                                            </div>
                                            <button onClick={isEnabled ? () => setViewingTopic(topicNumber) : undefined} disabled={!isEnabled} className={`w-full font-bold px-2 rounded-lg transition-all duration-300 ease-in-out shadow-lg flex items-center justify-center gap-1 mt-3 text-sm ${isEnabled ? 'text-white hover:brightness-110 border border-black/20' : 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'}`} style={isEnabled ? { backgroundColor: dashboardConfig.manageButtonColor, fontSize: `${dashboardConfig.manageButtonFontSize * 0.8}rem`, padding: '0.5rem 0.5rem' } : {}}><span>{dashboardConfig.manageButtonText}</span></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'dashboard':
            default:
                return (
                    <div className="tab-content-enter bg-white p-6 rounded-xl shadow-lg space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl flex flex-col items-center text-center">
                                 <div className="p-3 bg-white rounded-full shadow mb-3 text-teal-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg></div>
                                 <h4 className="font-bold text-teal-800 mb-2">Màn hình Đăng nhập</h4>
                                 <button onClick={() => setIsEditWelcomeModalOpen(true)} className="mt-auto px-4 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition text-sm shadow-md">⚙️ Chỉnh sửa thiết kế</button>
                             </div>
                             <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center text-center">
                                 <div className="p-3 bg-white rounded-full shadow mb-3 text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg></div>
                                 <h4 className="font-bold text-red-800 mb-2">Màn hình Chọn bài tập</h4>
                                 <button onClick={() => setIsEditExerciseModalOpen(true)} className="mt-auto px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition text-sm shadow-md">🎨 Chỉnh sửa thiết kế HS</button>
                             </div>
                             <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex flex-col items-center text-center">
                                 <div className="p-3 bg-white rounded-full shadow mb-3 text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></div>
                                 <h4 className="font-bold text-blue-800 mb-2">Màn hình Quản lý Admin</h4>
                                 <button onClick={() => setIsEditDashboardModalOpen(true)} className="mt-auto px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm shadow-md">🛠️ Chỉnh sửa thiết kế GV</button>
                             </div>
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white p-4 rounded-lg shadow-md text-center border-l-4 border-blue-500"><p className="text-sm font-bold text-gray-600">Đã nộp bài</p><p className="text-3xl font-extrabold text-blue-600">{summaryStats.totalStudents}</p></div>
                            <div className="bg-white p-4 rounded-lg shadow-md text-center border-l-4 border-green-500"><p className="text-sm font-bold text-gray-600">Điểm TB</p><p className="text-3xl font-extrabold text-green-600">{summaryStats.avgScore}</p></div>
                            <div className="bg-white p-4 rounded-lg shadow-md text-center border-l-4 border-orange-500"><p className="text-sm font-bold text-gray-600">Thời gian TB</p><p className="text-3xl font-extrabold text-orange-600">{formatTime(summaryStats.avgTime)}</p></div>
                            <div className="bg-white p-4 rounded-lg shadow-md text-center border-l-4 border-teal-500"><p className="text-sm font-bold text-gray-600">Đang làm bài</p><p className="text-3xl font-extrabold text-teal-600">{onlineStudents.length}</p></div>
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <div className="w-full bg-sky-100 min-h-screen">
            {notification && (
                <div className={`fixed top-5 right-5 shadow-lg rounded-lg p-4 text-center z-[150] transition-transform transform ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <p className="font-bold">{notification.message}</p>
                </div>
            )}
            <header className="flex justify-between items-center p-4 bg-white shadow-md">
                <div><h1 className="text-3xl font-extrabold text-slate-800 tracking-wider">FOR TEACHERTUY</h1><div className="flex mt-1"><div className="h-1 w-24 bg-red-500 rounded-full"></div><div className="h-1 w-12 bg-blue-500 ml-1 rounded-full"></div></div></div>
                <div className="flex items-center gap-2">
                    <button onClick={() => (window as any).aistudio?.openSelectKey()} className="bg-white text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-gray-50 transition shadow-sm flex items-center gap-2"><span>🔑 Đổi API Key</span></button>
                    <button onClick={onGoHome} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition shadow-md">Logout</button>
                </div>
            </header>
            <div className="p-6">
                <div className="bg-white rounded-lg shadow-md p-3 mb-6 flex items-center">
                    <span className="text-lg font-bold text-gray-700 mr-4">Trạng thái phòng:</span>
                    <label className="flex items-center cursor-pointer">
                        <div className="relative"><input type="checkbox" className="sr-only" checked={isGameEnabled} onChange={handleToggleGameStatus} /><div className="block w-14 h-8 rounded-full bg-gray-200"></div><div className={`dot absolute left-1 top-1 w-6 h-6 rounded-full shadow-lg transition-transform ${isGameEnabled ? 'transform translate-x-6 bg-green-500' : 'bg-gray-400'}`}></div></div>
                        <span className={`ml-3 font-bold text-lg ${isGameEnabled ? 'text-green-600' : 'text-gray-500'}`}>{isGameEnabled ? 'MỞ' : 'ĐÓNG'}</span>
                    </label>
                </div>
                <div className="mb-6 flex items-center flex-wrap gap-4">
                    <button onClick={() => { setViewingUnit(null); setViewingTopic(null); setActiveTab('dashboard'); }} className={`px-6 py-3 font-bold rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-green-600 text-white shadow-lg ring-4 ring-green-100' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>Bảng điều khiển</button>
                    <button onClick={() => { setViewingUnit(null); setViewingTopic(null); setActiveTab('units_12'); }} className={`px-6 py-3 font-bold rounded-lg transition-colors ${activeTab === 'units_12' ? 'bg-red-600 text-white shadow-lg ring-4 ring-red-100' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>{dashboardConfig.unitsTabLabel}</button>
                    <button onClick={() => { setViewingUnit(null); setViewingTopic(null); setActiveTab('topics'); }} className={`px-6 py-3 font-bold rounded-lg transition-colors ${activeTab === 'topics' ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>{dashboardConfig.topicsTabLabel}</button>
                </div>
                <div>{renderContent()}</div>
            </div>

            <EditWelcomeScreenModal show={isEditWelcomeModalOpen} onClose={() => setIsEditWelcomeModalOpen(false)} onSave={handleSaveWelcomeConfig} currentConfig={welcomeConfig} />
            <EditDashboardConfigModal show={isEditDashboardModalOpen} onClose={() => setIsEditDashboardModalOpen(false)} onSave={handleSaveDashboardConfig} currentConfig={dashboardConfig} />
            <EditExerciseSelectionModal show={isEditExerciseModalOpen} onClose={() => setIsEditExerciseModalOpen(false)} onSave={handleSaveExerciseSelectionConfig} currentConfig={exerciseSelectionConfig} />
            
            {quizForEditing && <EditQuizModal questions={quizForEditing} onClose={() => setQuizForEditing(null)} onSave={handleSaveEditedQuiz} />}
            {isEditVocabModalOpen && <EditVocabularyModal vocabulary={vocabForEditing} onClose={() => setIsEditVocabModalOpen(false)} onSave={handleSaveVocabulary} />}
            {selectedResult && <ResultDetailModal result={selectedResult} onClose={() => setSelectedResult(null)} />}
            
            <ConfirmationModal 
                show={!!deletingUnitStudent} 
                title="Xác nhận xóa" 
                message={`Bạn có chắc chắn muốn xóa kết quả của ${deletingUnitStudent?.playerName}?`} 
                onConfirm={handleConfirmDeleteUnitResult} 
                onCancel={() => setDeletingUnitStudent(null)} 
            />
            <ConfirmationModal 
                show={!!deletingTopicStudent} 
                title="Xác nhận xóa" 
                message={`Bạn có chắc chắn muốn xóa kết quả của ${deletingTopicStudent?.playerName}?`} 
                onConfirm={handleConfirmDeleteTopicResult} 
                onCancel={() => setDeletingTopicStudent(null)} 
            />
        </div>
    );
};

export default TeacherDashboard;
