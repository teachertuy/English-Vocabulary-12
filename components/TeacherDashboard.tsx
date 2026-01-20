
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

// Define the interface that was missing
interface StudentUnitSummary {
    playerKey: string;
    playerName: string;
    playerClass: string;
    results: GameResult[];
}

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const mo = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${h}:${m}:${s} ${d}/${mo}/${y}`;
};

const VOCAB_PLACEHOLDER = `Dán danh sách từ vựng của bạn vào đây...`;
const EMPTY_ACTIVITY_PROMPTS = { learn: '', match: '', spell: '', quiz: '' };

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

interface StudentGroupedResult {
    playerKey: string;
    playerName: string;
    playerClass: string;
    attempts: GameResult[];
    latestTimestamp: number;
}

const ResultDetailModal: React.FC<{ result: GameResult; onClose: () => void }> = ({ result, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">Chi tiết - {result.playerName}</h2><button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button></div>
                <div className="overflow-y-auto p-6 space-y-4">
                    {result.details?.map((detail, index) => (
                        <div key={index} className={`p-4 rounded-lg border-2 ${detail.status === 'correct' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
                            <p className="font-bold text-gray-900 mb-2">Câu {index + 1}: <span className="font-normal">{detail.question}</span></p>
                            <p><span className="font-semibold">Bạn đã chọn:</span> <span className={`font-bold ${detail.status === 'correct' ? 'text-green-700' : 'text-red-700'}`}>{detail.userAnswer || "Chưa trả lời"}</span></p>
                            <p><span className="font-semibold">Đáp án đúng:</span> <span className="font-bold text-green-700">"{detail.correctAnswer}"</span></p>
                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm border-l-4 border-blue-400"><p className="text-gray-800"><strong>Giải thích:</strong> {detail.explanation}</p></div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t text-right"><button onClick={onClose} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition">Đóng</button></div>
            </div>
        </div>
    );
};

const getGameTypeStyle = (gameType?: string) => {
    switch (gameType) {
        case 'quiz': return 'text-green-800 bg-green-100 border-green-200';
        case 'spelling': return 'text-orange-800 bg-orange-100 border-orange-200';
        case 'matching': return 'text-purple-700 bg-purple-50 border-purple-200';
        case 'vocabulary': return 'text-blue-800 bg-blue-100 border-blue-200';
        default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
};

const getGameTypeLabel = (gameType?: string) => {
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
    const [results, setResults] = useState<GameResult[]>([]);
    const [selectedClass, setSelectedClass] = useState('all');
    const [onlineStudents, setOnlineStudents] = useState<{name: string, class: string}[]>([]);
    const [cheatCounts, setCheatCounts] = useState<Record<string, number>>({});
    const [studentProgress, setStudentProgress] = useState<Record<string, StudentProgress>>({});
    const [refreshKey, setRefreshKey] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [welcomeConfig, setWelcomeConfig] = useState<WelcomeScreenConfig | null>(null);
    const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>(DEFAULT_DASHBOARD_CONFIG);
    const [exerciseSelectionConfig, setExerciseSelectionConfig] = useState<ExerciseSelectionConfig>(DEFAULT_EXERCISE_CONFIG);
    const [isEditWelcomeModalOpen, setIsEditWelcomeModalOpen] = useState(false);
    const [isEditDashboardModalOpen, setIsEditDashboardModalOpen] = useState(false);
    const [isEditExerciseModalOpen, setIsEditExerciseModalOpen] = useState(false);
    const [selectedResult, setSelectedResult] = useState<GameResult | null>(null);
    const [quizForEditing, setQuizForEditing] = useState<QuizQuestion[] | null>(null);
    const [isEditVocabModalOpen, setIsEditVocabModalOpen] = useState(false);
    const [vocabForEditing, setVocabForEditing] = useState<VocabularyWord[]>([]);
    const [unitsStatus12, setUnitsStatus12] = useState<UnitsState>({});
    const [viewingUnit, setViewingUnit] = useState<{ grade: number, unit: number } | null>(null);
    const [processedUnitResults, setProcessedUnitResults] = useState<StudentUnitSummary[]>([]);
    const [currentUnitQuiz, setCurrentUnitQuiz] = useState<QuizQuestion[]>([]);
    const [currentUnitVocabulary, setCurrentUnitVocabulary] = useState<VocabularyWord[]>([]);
    const [unitVocabList, setUnitVocabList] = useState('');
    const [isGeneratingUnitActivities, setIsGeneratingUnitActivities] = useState(false);
    const [selectedUnitClass, setSelectedUnitClass] = useState('all');
    const [deletingUnitStudent, setDeletingUnitStudent] = useState<GameResult | null>(null);
    const [isClearingUnit, setIsClearingUnit] = useState(false);
    const [unitActivityPrompts, setUnitActivityPrompts] = useState(EMPTY_ACTIVITY_PROMPTS);
    const [topicsStatus, setTopicsStatus] = useState<UnitsState>({});
    const [viewingTopic, setViewingTopic] = useState<number | null>(null);
    const [processedTopicResults, setProcessedTopicResults] = useState<StudentUnitSummary[]>([]);
    const [currentTopicQuiz, setCurrentTopicQuiz] = useState<QuizQuestion[]>([]);
    const [currentTopicVocabulary, setCurrentTopicVocabulary] = useState<VocabularyWord[]>([]);
    const [topicVocabList, setTopicVocabList] = useState('');
    const [isGeneratingTopicActivities, setIsGeneratingTopicActivities] = useState(false);
    const [selectedTopicClass, setSelectedTopicClass] = useState('all');
    const [deletingTopicStudent, setDeletingTopicStudent] = useState<GameResult | null>(null);
    const [isClearingTopic, setIsClearingTopic] = useState(false);
    const [topicActivityPrompts, setTopicActivityPrompts] = useState(EMPTY_ACTIVITY_PROMPTS);
    const [isGameEnabled, setIsGameEnabled] = useState(true);

    useEffect(() => { if (notification) { const timer = setTimeout(() => setNotification(null), 4000); return () => clearTimeout(timer); } }, [notification]);

    useEffect(() => {
        let unsubscribeResults: () => void, unsubscribeStatus: () => void, unsubscribeOnline: () => void, unsubscribeCheats: () => void, unsubscribeProgress: () => void, unsubscribeQuiz: () => void, unsubscribeUnits12: () => void, unsubscribeTopics: () => void, unsubscribeWelcome: () => void, unsubscribeDashboard: () => void, unsubscribeExercise: () => void;
        (async () => {
            try { await checkAndSyncQuizVersion(classroomId, QUIZ_VERSION); } catch (e) {}
            unsubscribeResults = listenToResults(classroomId, (data) => setResults(data ? Object.values(data) : []));
            unsubscribeStatus = getGameStatus(classroomId, setIsGameEnabled);
            unsubscribeOnline = listenToOnlineStudents(classroomId, (students) => setOnlineStudents(students ? Object.values(students) : []));
            unsubscribeCheats = listenToCheatCounts(classroomId, (counts) => setCheatCounts(counts || {}));
            unsubscribeProgress = listenToStudentProgress(classroomId, (progress) => setStudentProgress(progress || {}));
            unsubscribeUnits12 = listenToUnitsStatusByGrade(classroomId, 12, (status) => setUnitsStatus12(status || {}));
            unsubscribeTopics = listenToTopicsStatus(classroomId, (status) => setTopicsStatus(status || {}));
            unsubscribeWelcome = listenToWelcomeConfig(classroomId, setWelcomeConfig);
            unsubscribeDashboard = listenToDashboardConfig(classroomId, (config) => config && setDashboardConfig(config));
            unsubscribeExercise = listenToExerciseSelectionConfig(classroomId, (config) => config && setExerciseSelectionConfig(config));
        })();
        return () => { unsubscribeResults?.(); unsubscribeStatus?.(); unsubscribeOnline?.(); unsubscribeCheats?.(); unsubscribeProgress?.(); unsubscribeUnits12?.(); unsubscribeTopics?.(); unsubscribeWelcome?.(); unsubscribeDashboard?.(); unsubscribeExercise?.(); };
    }, [classroomId, refreshKey]);

    useEffect(() => {
        if (viewingUnit === null) return;
        const { grade, unit } = viewingUnit;
        const id = `unit_${unit}`;
        const unsubQuiz = listenToUnitQuizQuestionsByGrade(classroomId, grade, id, setCurrentUnitQuiz);
        const unsubResults = listenToUnitResultsByGrade(classroomId, grade, id, (data) => {
            if (!data) { setProcessedUnitResults([]); return; }
            const processed = Object.entries(data).map(([playerKey, resultsObj]): StudentUnitSummary | null => {
                const resultsArray = resultsObj ? Object.entries(resultsObj).map(([activityId, result]) => ({ ...result as GameResult, activityId })) : [];
                if (resultsArray.length === 0) return null;
                resultsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                return { playerKey, playerName: resultsArray[0].playerName, playerClass: resultsArray[0].playerClass, results: resultsArray };
            }).filter((item): item is StudentUnitSummary => item !== null);
            setProcessedUnitResults(processed);
        });
        const unsubVocab = listenToUnitVocabularyByGrade(classroomId, grade, id, (v) => setCurrentUnitVocabulary(v || []));
        return () => { unsubQuiz(); unsubResults(); unsubVocab(); };
    }, [viewingUnit, classroomId]);

    useEffect(() => {
        if (viewingTopic === null) return;
        const id = `topic_${viewingTopic}`;
        const unsubQuiz = listenToTopicQuizQuestions(classroomId, id, setCurrentTopicQuiz);
        const unsubResults = listenToTopicResults(classroomId, id, (data) => {
            if (!data) { setProcessedTopicResults([]); return; }
            const processed = Object.entries(data).map(([playerKey, resultsObj]): StudentUnitSummary | null => {
                const resultsArray = resultsObj ? Object.entries(resultsObj).map(([activityId, result]) => ({ ...result as GameResult, activityId })) : [];
                if (resultsArray.length === 0) return null;
                resultsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                return { playerKey, playerName: resultsArray[0].playerName, playerClass: resultsArray[0].playerClass, results: resultsArray };
            }).filter((item): item is StudentUnitSummary => item !== null);
            setProcessedTopicResults(processed);
        });
        const unsubVocab = listenToTopicVocabulary(classroomId, id, (v) => setCurrentTopicVocabulary(v || []));
        return () => { unsubQuiz(); unsubResults(); unsubVocab(); };
    }, [viewingTopic, classroomId]);

    const uniqueClasses = useMemo(() => {
        const allResults = [...results, ...processedUnitResults.flatMap(s => s.results), ...processedTopicResults.flatMap(s => s.results)];
        const classSet = new Set(allResults.map(r => (r.playerClass || '').trim().toUpperCase()));
        return ['all', ...Array.from(classSet).sort()];
    }, [results, processedUnitResults, processedTopicResults]);

    const getGroupedData = (rawStudents: StudentUnitSummary[], currentClass: string) => {
        const groups: StudentGroupedResult[] = rawStudents
            .filter(s => currentClass === 'all' || s.playerClass.toUpperCase() === currentClass.toUpperCase())
            .map(s => ({
                playerKey: s.playerKey,
                playerName: s.playerName,
                playerClass: s.playerClass,
                attempts: [...s.results].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
                latestTimestamp: Math.max(...s.results.map(r => r.timestamp || 0))
            }));
        
        return groups.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
    };

    const groupedUnitResults = useMemo(() => getGroupedData(processedUnitResults, selectedUnitClass), [processedUnitResults, selectedUnitClass]);
    const groupedTopicResults = useMemo(() => getGroupedData(processedTopicResults, selectedTopicClass), [processedTopicResults, selectedTopicClass]);

    const renderResultsTable = (groupedData: StudentGroupedResult[], type: 'unit' | 'topic', onRowClick: (r: GameResult) => void, onDeleteRow: (r: any) => void) => {
        const curClass = type === 'unit' ? selectedUnitClass : selectedTopicClass;
        const setClass = type === 'unit' ? setSelectedUnitClass : setSelectedTopicClass;

        return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-300 overflow-hidden mt-8">
                <div className="p-4 border-b border-gray-300 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
                    <select value={curClass} onChange={(e) => setClass(e.target.value)} className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all">
                        {uniqueClasses.map(c => <option key={c} value={c}>{c === 'all' ? 'Tất cả các lớp' : c}</option>)}
                    </select>
                    <button onClick={type === 'unit' ? () => clearUnitResultsByGrade(classroomId, viewingUnit!.grade, `unit_${viewingUnit!.unit}`) : () => clearTopicResults(classroomId, `topic_${viewingTopic}`)} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                        <thead>
                            <tr className="bg-[#fff2e0]">
                                <th className="p-3 border border-gray-300 text-[13px] font-black text-[#c05621] w-14 text-center">STT</th>
                                <th className="p-3 border border-gray-300 text-[13px] font-black text-[#c05621] w-40 uppercase tracking-tight">HỌ VÀ TÊN</th>
                                <th className="p-3 border border-gray-300 text-[13px] font-black text-[#c05621] w-20 uppercase tracking-tight text-center">LỚP</th>
                                <th className="p-3 border border-gray-300 text-[13px] font-black text-[#c05621] w-20 uppercase tracking-tight text-center">ĐIỂM ▼</th>
                                <th className="p-3 border border-gray-300 text-[13px] font-black text-[#c05621] w-40 uppercase tracking-tight text-center">NỘI DUNG ↑</th>
                                <th className="p-3 border border-gray-300 text-[13px] font-black text-[#c05621] w-20 uppercase tracking-tight text-center">LẦN LÀM ↑</th>
                                <th className="p-3 border border-gray-300 text-[13px] font-black text-[#c05621] w-16 uppercase tracking-tight text-center">ĐÚNG ↑</th>
                                <th className="p-3 border border-gray-300 text-[13px] font-black text-[#c05621] w-16 uppercase tracking-tight text-center">SAI ↑</th>
                                <th className="p-3 border border-gray-300 text-[13px] font-black text-[#c05621] w-28 uppercase tracking-tight text-center">THỜI GIAN ↑</th>
                                <th className="p-3 border border-gray-300 text-[13px] font-black text-[#c05621] w-48 uppercase tracking-tight text-center">NGÀY LÀM ↑</th>
                                <th className="p-3 border border-gray-300 text-[13px] font-black text-[#c05621] w-28 uppercase tracking-tight text-center">HÀNH ĐỘNG</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {groupedData.length === 0 ? (
                                <tr><td colSpan={11} className="p-12 text-center text-gray-400 font-bold border border-gray-300">Chưa có kết quả nào.</td></tr>
                            ) : groupedData.map((group, sttIdx) => (
                                <React.Fragment key={group.playerKey}>
                                    {group.attempts.map((res, attemptIdx) => (
                                        <tr key={res.activityId} onClick={() => onRowClick(res)} className="hover:bg-blue-50/50 transition-colors cursor-pointer text-[14px] font-bold">
                                            {/* Merged Columns */}
                                            {attemptIdx === 0 && (
                                                <>
                                                    <td rowSpan={group.attempts.length} className="p-3 border border-gray-300 text-blue-600 font-black text-center align-middle bg-white">{sttIdx + 1}</td>
                                                    <td rowSpan={group.attempts.length} className="p-3 border border-gray-300 text-[#E91E63] truncate align-middle bg-white">{group.playerName}</td>
                                                    <td rowSpan={group.attempts.length} className="p-3 border border-gray-300 text-[#8E44AD] text-center align-middle bg-white">{group.playerClass}</td>
                                                </>
                                            )}
                                            {/* Per Attempt Columns */}
                                            <td className="p-3 border border-gray-300 text-red-600 text-lg font-black text-center">{res.score}</td>
                                            <td className="p-3 border border-gray-300 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[12px] font-bold border ${getGameTypeStyle(res.gameType)}`}>
                                                    {getGameTypeLabel(res.gameType)}
                                                </span>
                                            </td>
                                            <td className="p-3 border border-gray-300 text-red-600 text-center">{res.attempts || 1}</td>
                                            <td className="p-3 border border-gray-300 text-green-600 text-center">{res.correct}</td>
                                            <td className="p-3 border border-gray-300 text-red-600 text-center">{res.incorrect}</td>
                                            <td className="p-3 border border-gray-300 text-[#c05621] text-center font-['Nunito'] font-black">{formatTime(res.timeTakenSeconds || 0)}</td>
                                            <td className="p-3 border border-gray-300 text-slate-800 text-[13px] text-center font-['Nunito']">{formatDate(res.timestamp)}</td>
                                            <td className="p-3 border border-gray-300 text-center">
                                                <button onClick={(e) => { e.stopPropagation(); onDeleteRow(res); }} className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition shadow-sm">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const handleRefresh = useCallback(() => { setIsRefreshing(true); setRefreshKey(prev => prev + 1); setTimeout(() => setIsRefreshing(false), 1000); }, []);

    const handleGenerateActivities = async (type: 'unit' | 'topic') => {
        const isUnit = type === 'unit';
        const setter = isUnit ? setIsGeneratingUnitActivities : setIsGeneratingTopicActivities;
        const currentVocab = isUnit ? currentUnitVocabulary : currentTopicVocabulary;
        const vocabListText = isUnit ? unitVocabList : topicVocabList;
        const prompts = isUnit ? unitActivityPrompts : topicActivityPrompts;
        const gradeVal = isUnit ? viewingUnit?.grade : 'topics';
        const idVal = isUnit ? `unit_${viewingUnit?.unit}` : `topic_${viewingTopic}`;

        setter(true);
        try {
            let source = vocabListText.trim();
            if (!source && currentVocab.length > 0) source = currentVocab.map(v => `${v.word} - (${v.type}) /${v.phonetic}/ - ${v.translation}`).join('\n');
            if (!source) throw new Error();
            if (prompts.learn.trim()) {
                const vocabData = await generateVocabularyList(`Context: ${source}\n\nInstruction: ${prompts.learn}`);
                isUnit ? await saveUnitVocabularyByGrade(classroomId, gradeVal as number, idVal, vocabData) : await saveTopicVocabulary(classroomId, idVal, vocabData);
            }
            if (prompts.quiz.trim()) {
                const questions = await generateQuizFromCustomPrompt(`Context: ${source}\n\nInstruction: ${prompts.quiz}`);
                isUnit ? await saveUnitQuizQuestionsByGrade(classroomId, gradeVal as number, idVal, questions) : await saveTopicQuizQuestions(classroomId, idVal, questions);
            }
            setNotification({ message: 'Thành công!', type: 'success' });
        } catch (e) { setNotification({ message: 'Thất bại.', type: 'error' }); } finally { setter(false); }
    };

    return (
        <div className="w-full bg-sky-100 min-h-screen">
            {notification && <div className={`fixed top-5 right-5 shadow-lg rounded-lg p-4 z-[150] transition-transform animate-bounce ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}><p className="font-bold">{notification.message}</p></div>}
            <header className="flex justify-between items-center p-4 bg-white shadow-md">
                <div><h1 className="text-3xl font-extrabold text-slate-800 tracking-wider">FOR TEACHERTUY</h1><div className="flex mt-1"><div className="h-1 w-24 bg-red-500 rounded-full"></div><div className="h-1 w-12 bg-blue-500 ml-1 rounded-full"></div></div></div>
                <div className="flex gap-2">
                    <button onClick={() => (window as any).aistudio?.openSelectKey()} className="bg-white text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-gray-50 transition shadow-sm">🔑 Đổi API Key</button>
                    <button onClick={onGoHome} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition shadow-md">Logout</button>
                </div>
            </header>
            <div className="p-6">
                <div className="bg-white rounded-lg shadow-md p-3 mb-6 flex items-center">
                    <span className="text-lg font-bold text-gray-700 mr-4">Trạng thái phòng:</span>
                    <label className="flex items-center cursor-pointer">
                        <div className="relative"><input type="checkbox" className="sr-only" checked={isGameEnabled} onChange={() => setGameStatus(classroomId, !isGameEnabled)} /><div className="block w-14 h-8 rounded-full bg-gray-200"></div><div className={`dot absolute left-1 top-1 w-6 h-6 rounded-full shadow-lg transition-transform ${isGameEnabled ? 'transform translate-x-6 bg-green-500' : 'bg-gray-400'}`}></div></div>
                        <span className={`ml-3 font-bold text-lg ${isGameEnabled ? 'text-green-600' : 'text-gray-500'}`}>{isGameEnabled ? 'MỞ' : 'ĐÓNG'}</span>
                    </label>
                </div>
                <div className="mb-6 flex gap-4 flex-wrap">
                    <button onClick={() => { setViewingUnit(null); setViewingTopic(null); setActiveTab('dashboard'); }} className={`px-6 py-3 font-bold rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-green-600 text-white shadow-lg ring-4 ring-green-100' : 'bg-white text-gray-600 border'}`}>Bảng điều khiển</button>
                    <button onClick={() => { setViewingUnit(null); setViewingTopic(null); setActiveTab('units_12'); }} className={`px-6 py-3 font-bold rounded-lg transition-all ${activeTab === 'units_12' ? 'bg-red-600 text-white shadow-lg ring-4 ring-red-100' : 'bg-white text-gray-600 border'}`}>{dashboardConfig.unitsTabLabel}</button>
                    <button onClick={() => { setViewingUnit(null); setViewingTopic(null); setActiveTab('topics'); }} className={`px-6 py-3 font-bold rounded-lg transition-all ${activeTab === 'topics' ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100' : 'bg-white text-gray-600 border'}`}>{dashboardConfig.topicsTabLabel}</button>
                </div>
                {viewingUnit ? (
                    <div className="p-4 bg-white/70 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 tab-content-enter space-y-8">
                        <div className="flex justify-between items-center"><button onClick={() => setViewingUnit(null)} className="flex items-center gap-2 text-blue-600 font-semibold hover:underline"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" /></svg><span>Quay lại danh sách</span></button><h2 className="text-2xl font-bold text-indigo-800">Quản lý chi tiết: UNIT {viewingUnit.unit}</h2></div>
                        <div className="p-4 border rounded-lg bg-sky-50 border-sky-200 grid grid-cols-1 lg:grid-cols-2 gap-6 shadow-inner">
                            <div><label className="font-semibold text-teal-700 block mb-1">1. Dán danh sách từ vựng:</label><textarea value={unitVocabList} onChange={(e) => setUnitVocabList(e.target.value)} placeholder="Dán từ vựng tại đây..." className="w-full h-96 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white" /></div>
                            <div className="flex flex-col justify-between"><div className="space-y-4"><label className="font-semibold text-teal-700">2. Tùy chỉnh yêu cầu cho AI:</label><div className="bg-white p-2 rounded-md border border-gray-200"><label className="block text-xs font-bold text-blue-600 mb-1">HỌC TỪ VỰNG</label><textarea value={unitActivityPrompts.learn} onChange={(e) => setUnitActivityPrompts(p => ({...p, learn: e.target.value}))} className="w-full p-2 border rounded-md text-xs bg-sky-100 focus:outline-none" rows={2}/></div><div className="bg-white p-2 rounded-md border border-gray-200"><label className="block text-xs font-bold text-green-600 mb-1">TRẮC NGHIỆM</label><textarea value={unitActivityPrompts.quiz} onChange={(e) => setUnitActivityPrompts(p => ({...p, quiz: e.target.value}))} className="w-full p-2 border rounded-md text-xs bg-sky-100 focus:outline-none" rows={2}/></div></div><button onClick={() => handleGenerateActivities('unit')} disabled={isGeneratingUnitActivities} className="bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 shadow-md transition-all active:scale-95 disabled:bg-gray-400 mt-4 w-full">{isGeneratingUnitActivities ? 'Đang tạo bài...' : '✨ Tạo hoạt động với AI'}</button></div>
                        </div>
                        <h3 className="text-xl font-bold text-indigo-700 border-l-4 border-indigo-600 pl-3">Kết quả làm bài (UNIT {viewingUnit.unit})</h3>
                        {renderResultsTable(groupedUnitResults, 'unit', setSelectedResult, setDeletingUnitStudent)}
                    </div>
                ) : viewingTopic ? (
                    <div className="p-4 bg-white/70 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 tab-content-enter space-y-8">
                        <div className="flex justify-between items-center"><button onClick={() => setViewingTopic(null)} className="flex items-center gap-2 text-blue-600 font-semibold hover:underline">Quay lại danh sách</button><h2 className="text-2xl font-bold text-indigo-800">Quản lý chi tiết: TOPIC {viewingTopic}</h2></div>
                        <div className="p-4 border rounded-lg bg-sky-50 border-sky-200 grid grid-cols-1 lg:grid-cols-2 gap-6 shadow-inner">
                            <div><textarea value={topicVocabList} onChange={(e) => setTopicVocabList(e.target.value)} placeholder="Dán từ vựng tại đây..." className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm bg-white" /></div>
                            <div className="flex flex-col justify-between"><div className="space-y-4"><textarea value={topicActivityPrompts.learn} onChange={(e) => topicActivityPrompts.learn !== undefined ? setTopicActivityPrompts(p => ({...p, learn: e.target.value})) : null} placeholder="Học từ vựng..." className="w-full p-2 border rounded-md text-sm bg-sky-50" rows={3}/><textarea value={topicActivityPrompts.quiz} onChange={(e) => topicActivityPrompts.quiz !== undefined ? setTopicActivityPrompts(p => ({...p, quiz: e.target.value})) : null} placeholder="Trắc nghiệm..." className="w-full p-2 border rounded-md text-sm bg-sky-50" rows={3}/></div><button onClick={() => handleGenerateActivities('topic')} disabled={isGeneratingTopicActivities} className="bg-slate-500 text-white font-bold py-4 px-8 rounded-lg hover:bg-slate-600 shadow-md transition-all active:scale-95 disabled:bg-gray-400 mt-6 w-full">{isGeneratingTopicActivities ? 'Đang tạo bài...' : '✨ Tạo hoạt động với AI'}</button></div>
                        </div>
                        <h3 className="text-xl font-bold text-indigo-700 border-l-4 border-indigo-600 pl-3">Kết quả làm bài (TOPIC {viewingTopic})</h3>
                        {renderResultsTable(groupedTopicResults, 'topic', setSelectedResult, setDeletingTopicStudent)}
                    </div>
                ) : activeTab === 'units_12' ? (
                    <div className="p-6 bg-gradient-to-br from-green-700 via-green-800 to-green-900 rounded-lg shadow-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 tab-content-enter">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(unit => {
                            const isEnabled = unitsStatus12[`unit_${unit}`]?.enabled ?? false;
                            const style = unitCardStyles[unit - 1];
                            return (
                                <div key={unit} className={`rounded-2xl p-1.5 transition-all duration-300 group ${isEnabled ? `bg-gradient-to-br ${style.gradient} shadow-lg ${style.hoverShadow} hover:-translate-y-1` : 'bg-slate-700/50'}`}>
                                    <div className="bg-slate-800/90 rounded-xl h-full flex flex-col p-5">
                                        <div className="flex justify-end"><input type="checkbox" checked={isEnabled} onChange={(e) => setUnitStatusByGrade(classroomId, 12, `unit_${unit}`, e.target.checked)} className="w-6 h-6 cursor-pointer" /></div>
                                        <div className="flex-grow flex flex-col items-center justify-center"><span className="font-bold text-yellow-300 uppercase tracking-widest text-xl">{dashboardConfig.cardUnitLabel}</span><span className={`font-black ${isEnabled ? 'text-white' : 'text-slate-500'} text-6xl my-2`}>{unit}</span><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isEnabled ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>{isEnabled ? 'Đang Mở' : 'Đã Đóng'}</span></div>
                                        <button onClick={() => setViewingUnit({ grade: 12, unit })} disabled={!isEnabled} className={`w-full font-bold px-4 py-3 rounded-lg mt-4 shadow-lg transition-all ${isEnabled ? 'bg-red-600 text-white hover:brightness-110 active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'}`}>Quản lý Nội dung</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : activeTab === 'topics' ? (
                    <div className="p-6 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 rounded-lg shadow-2xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 tab-content-enter">
                        {Array.from({ length: 60 }, (_, i) => i + 1).map(topic => {
                            const isEnabled = topicsStatus[`topic_${topic}`]?.enabled ?? false;
                            const style = unitCardStyles[(topic - 1) % unitCardStyles.length];
                            return (
                                <div key={topic} className={`rounded-2xl p-1.5 transition-all duration-300 ${isEnabled ? `bg-gradient-to-br ${style.gradient} shadow-md hover:-translate-y-1` : 'bg-slate-700/50'}`}>
                                    <div className="bg-slate-800/90 rounded-xl h-full flex flex-col p-4">
                                        <div className="flex justify-end"><input type="checkbox" checked={isEnabled} onChange={(e) => setTopicStatus(classroomId, `topic_${topic}`, e.target.checked)} className="w-5 h-5 cursor-pointer" /></div>
                                        <div className="flex-grow flex flex-col items-center justify-center"><span className="font-bold text-yellow-300 text-[10px] uppercase">{dashboardConfig.cardTopicLabel}</span><span className={`font-black ${isEnabled ? 'text-white' : 'text-slate-500'} text-3xl my-1`}>{topic}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isEnabled ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>{isEnabled ? 'Mở' : 'Đóng'}</span></div>
                                        <button onClick={() => setViewingTopic(topic)} disabled={!isEnabled} className={`w-full font-bold px-2 py-2 rounded-lg mt-3 text-xs shadow-md transition-all ${isEnabled ? 'bg-red-600 text-white hover:brightness-110 active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>Quản lý</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-xl shadow-lg space-y-8 tab-content-enter">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="p-4 bg-teal-50 border rounded-xl text-center shadow-sm"><h4 className="font-bold mb-2 text-teal-800 flex items-center justify-center gap-2"><span>🏷️</span> Đăng nhập</h4><button onClick={() => setIsEditWelcomeModalOpen(true)} className="px-4 py-2 bg-teal-600 text-white font-bold rounded-lg text-sm hover:bg-teal-700 transition shadow-md">⚙️ Thiết kế</button></div>
                             <div className="p-4 bg-red-50 border rounded-xl text-center shadow-sm"><h4 className="font-bold mb-2 text-red-800 flex items-center justify-center gap-2"><span>🎨</span> Chọn bài tập</h4><button onClick={() => setIsEditExerciseModalOpen(true)} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg text-sm hover:bg-red-700 transition shadow-md">🎨 Thiết kế HS</button></div>
                             <div className="p-4 bg-blue-50 border rounded-xl text-center shadow-sm"><h4 className="font-bold mb-2 text-blue-800 flex items-center justify-center gap-2"><span>🛠️</span> Admin</h4><button onClick={() => setIsEditDashboardModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 transition shadow-md">🛠️ Thiết kế GV</button></div>
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-lg shadow-md text-center border-l-4 border-blue-500"><p className="text-sm font-bold text-gray-600 mb-1">Đã nộp bài</p><p className="text-4xl font-black text-blue-600">{results.length}</p></div>
                            <div className="bg-white p-5 rounded-lg shadow-md text-center border-l-4 border-teal-500"><p className="text-sm font-bold text-gray-600 mb-1">Đang học</p><p className="text-4xl font-black text-teal-600">{onlineStudents.length}</p></div>
                             <div className="bg-white p-5 rounded-lg shadow-md text-center border-l-4 border-orange-500"><p className="text-sm font-bold text-gray-600 mb-1">Gian lận (tab)</p><p className="text-4xl font-black text-orange-600">{Object.keys(cheatCounts).length}</p></div>
                             <div className="bg-white p-5 rounded-lg shadow-md text-center border-l-4 border-indigo-500"><p className="text-sm font-bold text-gray-600 mb-1">Lượt hoạt động</p><p className="text-4xl font-black text-indigo-600">{Object.keys(studentProgress).length}</p></div>
                        </div>
                    </div>
                )}
            </div>
            <EditWelcomeScreenModal show={isEditWelcomeModalOpen} onClose={() => setIsEditWelcomeModalOpen(false)} onSave={async (c) => { await saveWelcomeConfig(classroomId, c); setNotification({ message: 'Đã lưu thiết kế!', type: 'success' }); }} currentConfig={welcomeConfig} />
            <EditDashboardConfigModal show={isEditDashboardModalOpen} onClose={() => setIsEditDashboardModalOpen(false)} onSave={async (c) => { await saveDashboardConfig(classroomId, c); setNotification({ message: 'Đã lưu thiết kế!', type: 'success' }); }} currentConfig={dashboardConfig} />
            <EditExerciseSelectionModal show={isEditExerciseModalOpen} onClose={() => setIsEditExerciseModalOpen(false)} onSave={async (c) => { await saveExerciseSelectionConfig(classroomId, c); setNotification({ message: 'Đã lưu thiết kế!', type: 'success' }); }} currentConfig={exerciseSelectionConfig} />
            {quizForEditing && <EditQuizModal questions={quizForEditing} onClose={() => setQuizForEditing(null)} onSave={async (q) => { await saveQuizQuestions(classroomId, q); setQuizForEditing(null); setNotification({ message: 'Cập nhật đề thành công!', type: 'success' }); }} />}
            {isEditVocabModalOpen && <EditVocabularyModal vocabulary={vocabForEditing} onClose={() => setIsEditVocabModalOpen(false)} onSave={async (v) => { if(viewingUnit) await saveUnitVocabularyByGrade(classroomId, viewingUnit.grade, `unit_${viewingUnit.unit}`, v); else if(viewingTopic) await saveTopicVocabulary(classroomId, `topic_${viewingTopic}`, v); setNotification({ message: 'Cập nhật từ vựng thành công!', type: 'success' }); }} />}
            {selectedResult && <ResultDetailModal result={selectedResult} onClose={() => setSelectedResult(null)} />}
            <ConfirmationModal show={!!deletingUnitStudent} title="Xác nhận" message={`Xóa kết quả của ${deletingUnitStudent?.playerName}?`} onConfirm={async () => { await deleteUnitStudentResultByGrade(classroomId, viewingUnit!.grade, `unit_${viewingUnit!.unit}`, deletingUnitStudent!.playerName, deletingUnitStudent!.playerClass, deletingUnitStudent!.activityId!); setDeletingUnitStudent(null); setNotification({ message: 'Đã xóa!', type: 'success' }); }} onCancel={() => setDeletingUnitStudent(null)} />
            <ConfirmationModal show={!!deletingTopicStudent} title="Xác nhận" message={`Xóa kết quả của ${deletingTopicStudent?.playerName}?`} onConfirm={async () => { await deleteTopicStudentResult(classroomId, `topic_${viewingTopic}`, deletingTopicStudent!.playerName, deletingTopicStudent!.playerClass, deletingTopicStudent!.activityId!); setDeletingTopicStudent(null); setNotification({ message: 'Đã xóa!', type: 'success' }); }} onCancel={() => setDeletingTopicStudent(null)} />
        </div>
    );
};

export default TeacherDashboard;
