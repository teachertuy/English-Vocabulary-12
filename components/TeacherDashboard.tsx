
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { GameResult, StudentProgress, QuizQuestion, UnitsState, VocabularyWord } from '../types';
import { 
    listenToResults, clearResults, setGameStatus, getGameStatus, 
    listenToOnlineStudents, listenToCheatCounts, kickPlayer, deleteStudentResult, 
    checkAndSyncQuizVersion, listenToStudentProgress, saveQuizQuestions, 
    listenToQuizQuestions, listenToUnitsStatusByGrade, setUnitStatusByGrade,
    saveUnitQuizQuestionsByGrade, listenToUnitQuizQuestionsByGrade, listenToUnitResultsByGrade, clearUnitResultsByGrade,
    deleteUnitStudentResultByGrade, saveUnitVocabularyByGrade, listenToUnitVocabularyByGrade, deleteCurrentQuiz,
    listenToTopicsStatus, setTopicStatus, listenToTopicQuizQuestions, listenToTopicResults,
    listenToTopicVocabulary, saveTopicVocabulary, saveTopicQuizQuestions, clearTopicResults,
    deleteTopicStudentResult
} from '../services/firebaseService';
import { QUIZ_VERSION, generateQuizFromCustomPrompt, generateQuizFromText, generateVocabularyList } from '../services/geminiService';
import TextToQuizModal from './TextToQuizModal';
import EditQuizModal from './EditQuizModal';
import AIQuizGeneratorModal from './AIQuizGeneratorModal';
import ConfirmationModal from './ConfirmationModal';
import EditVocabularyModal from './EditVocabularyModal';

type Tab = 'dashboard' | 'units_12' | 'topics';

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

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
        case 'quiz': return 'text-green-800 bg-green-100 border-green-300';
        case 'spelling': return 'text-orange-800 bg-orange-100 border-orange-300';
        case 'matching': return 'text-purple-800 bg-purple-100 border-purple-300';
        case 'vocabulary': return 'text-blue-800 bg-blue-100 border-blue-300';
        default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
};

const unitCardStyles = [
  // Unit 1
  { gradient: 'from-red-500 to-amber-500', hoverShadow: 'hover:shadow-red-500/40', textColor: 'from-red-100 to-amber-100' },
  // Unit 2
  { gradient: 'from-emerald-500 to-lime-500', hoverShadow: 'hover:shadow-emerald-500/40', textColor: 'from-emerald-100 to-lime-100' },
  // Unit 3
  { gradient: 'from-blue-600 to-sky-400', hoverShadow: 'hover:shadow-blue-600/40', textColor: 'from-blue-200 to-sky-200' },
  // Unit 4
  { gradient: 'from-orange-500 to-yellow-500', hoverShadow: 'hover:shadow-orange-500/40', textColor: 'from-orange-100 to-yellow-100' },
  // Unit 5
  { gradient: 'from-violet-600 to-fuchsia-500', hoverShadow: 'hover:shadow-violet-600/40', textColor: 'from-violet-200 to-fuchsia-200' },
  // Unit 6
  { gradient: 'from-teal-500 to-cyan-400', hoverShadow: 'hover:shadow-teal-500/40', textColor: 'from-teal-100 to-cyan-100' },
  // Unit 7
  { gradient: 'from-rose-500 to-pink-500', hoverShadow: 'hover:shadow-rose-500/40', textColor: 'from-rose-100 to-pink-100' },
  // Unit 8
  { gradient: 'from-indigo-700 to-slate-500', hoverShadow: 'hover:shadow-indigo-700/40', textColor: 'from-indigo-200 to-slate-200' },
  // Unit 9
  { gradient: 'from-green-500 to-yellow-400', hoverShadow: 'hover:shadow-green-500/40', textColor: 'from-green-100 to-yellow-100' },
  // Unit 10
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
    const [deletingUnitStudent, setDeletingUnitStudent] = useState<string | null>(null);
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
    const [deletingTopicStudent, setDeletingTopicStudent] = useState<string | null>(null);
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
    
        (async () => {
            try {
                await checkAndSyncQuizVersion(classroomId, QUIZ_VERSION);
            } catch (error) {
                console.error("Initialization failed due to Firebase errors. The application might be in a read-only state.");
                setNotification({ message: 'Lỗi kết nối CSDL. Một số tính năng có thể không hoạt động.', type: 'error' });
            }
    
            unsubscribeResults = listenToResults(classroomId, (data) => setResults(data ? Object.values(data) : []));
            unsubscribeStatus = getGameStatus(classroomId, setIsGameEnabled);
            unsubscribeOnline = listenToOnlineStudents(classroomId, (students) => setOnlineStudents(students ? Object.values(students) : []));
            unsubscribeCheats = listenToCheatCounts(classroomId, (counts) => setCheatCounts(counts || {}));
            unsubscribeProgress = listenToStudentProgress(classroomId, (progress) => setStudentProgress(progress || {}));
            unsubscribeQuiz = listenToQuizQuestions(classroomId, (questions) => setQuizQuestions(questions || []));
            unsubscribeUnits12 = listenToUnitsStatusByGrade(classroomId, 12, (status) => setUnitsStatus12(status || {}));
            unsubscribeTopics = listenToTopicsStatus(classroomId, (status) => setTopicsStatus(status || {}));
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
        };
    }, [classroomId, refreshKey]);
    
    // Listeners for specific unit data when a unit is selected for viewing
    useEffect(() => {
        if (viewingUnit === null) return;
        
        const { grade, unit } = viewingUnit;
        const unitId = `unit_${unit}`;

        const unsubQuiz = listenToUnitQuizQuestionsByGrade(classroomId, grade, unitId, (questions) => {
            setCurrentUnitQuiz(questions || []);
        });
        const unsubResults = listenToUnitResultsByGrade(classroomId, grade, unitId, (data) => {
            if (!data) {
                setProcessedUnitResults([]);
                return;
            }
            const processedData: StudentUnitSummary[] = Object.entries(data).map(([playerKey, resultsObj]) => {
                const resultsArray = resultsObj ? Object.values(resultsObj) : [];
                if (resultsArray.length === 0) return null;
                resultsArray.sort((a, b) => (a.timeTakenSeconds || 0) - (b.timeTakenSeconds || 0));
                
                return {
                    playerKey,
                    playerName: resultsArray[0].playerName,
                    playerClass: resultsArray[0].playerClass,
                    results: resultsArray,
                };
            }).filter((item): item is StudentUnitSummary => item !== null);
            setProcessedUnitResults(processedData);
        });
        const unsubVocab = listenToUnitVocabularyByGrade(classroomId, grade, unitId, (vocab) => {
            setCurrentUnitVocabulary(vocab || []);
        });

        // Reset vocab list when changing units
        setUnitVocabList('');
        setUnitActivityPrompts(EMPTY_ACTIVITY_PROMPTS);

        return () => {
            unsubQuiz();
            unsubResults();
            unsubVocab();
        };
    }, [viewingUnit, classroomId]);

    // Listeners for specific topic data when a topic is selected for viewing
    useEffect(() => {
        if (viewingTopic === null) return;

        const topicId = `topic_${viewingTopic}`;
        const unsubQuiz = listenToTopicQuizQuestions(classroomId, topicId, (questions) => {
            setCurrentTopicQuiz(questions || []);
        });
        const unsubResults = listenToTopicResults(classroomId, topicId, (data) => {
            if (!data) {
                setProcessedTopicResults([]);
                return;
            }
            const processedData: StudentUnitSummary[] = Object.entries(data).map(([playerKey, resultsObj]) => {
                const resultsArray = resultsObj ? Object.values(resultsObj) : [];
                if (resultsArray.length === 0) return null;
                resultsArray.sort((a, b) => (a.timeTakenSeconds || 0) - (b.timeTakenSeconds || 0));
                
                return {
                    playerKey,
                    playerName: resultsArray[0].playerName,
                    playerClass: resultsArray[0].playerClass,
                    results: resultsArray,
                };
            }).filter((item): item is StudentUnitSummary => item !== null);
            setProcessedTopicResults(processedData);
        });
        const unsubVocab = listenToTopicVocabulary(classroomId, topicId, (vocab) => {
            setCurrentTopicVocabulary(vocab || []);
        });

        setTopicVocabList('');
        setTopicActivityPrompts(EMPTY_ACTIVITY_PROMPTS);

        return () => {
            unsubQuiz();
            unsubResults();
            unsubVocab();
        };
    }, [viewingTopic, classroomId]);


    useEffect(() => {
        const prevCounts = prevCheatCountsRef.current;
        const studentsWhoCheated = onlineStudents.filter(student => {
            const playerKey = getPlayerKey(student.name, student.class);
            const newCount = cheatCounts[playerKey] || 0;
            const prevCount = prevCounts[playerKey] || 0;
            return newCount > prevCount;
        });

        if (studentsWhoCheated.length > 0) {
            setFlashingStudents(currentSet => {
                const newSet = new Set(currentSet);
                studentsWhoCheated.forEach(s => newSet.add(s.name));
                return newSet;
            });

            setTimeout(() => {
                setFlashingStudents(currentSet => {
                    const newSet = new Set(currentSet);
                    studentsWhoCheated.forEach(s => newSet.delete(s.name));
                    return newSet;
                });
            }, 2000);
        }
        
        const allOnlinePlayerKeys = onlineStudents.reduce((acc, student) => {
            const playerKey = getPlayerKey(student.name, student.class);
            if (cheatCounts[playerKey] !== undefined) {
                acc[playerKey] = cheatCounts[playerKey];
            }
            return acc;
        }, {} as Record<string, number>);

        prevCheatCountsRef.current = allOnlinePlayerKeys;

    }, [cheatCounts, onlineStudents]);

    const handleToggleGameStatus = useCallback(() => setGameStatus(classroomId, !isGameEnabled), [classroomId, isGameEnabled]);
    
    const handleToggleUnitStatus = useCallback(async (grade: number, unitNumber: number, isEnabled: boolean) => {
        const unitId = `unit_${unitNumber}`;
        try {
            await setUnitStatusByGrade(classroomId, grade, unitId, isEnabled);
        } catch (error) {
            console.error(`Failed to update status for grade ${grade}, unit ${unitId}`, error);
            setNotification({ message: `Lỗi khi cập nhật UNIT ${unitNumber}.`, type: 'error' });
        }
    }, [classroomId]);

    const handleClearRequest = useCallback(async () => {
        if (isClearing || deletingStudent || kickingStudent) return;
        setIsClearing(true);
        try {
            await clearResults(classroomId);
        } catch (error) {
            console.error("Lỗi khi xoá lịch sử:", error);
            alert("Đã xảy ra lỗi khi xoá lịch sử làm bài.");
        } finally {
            setIsClearing(false);
        }
    }, [classroomId, isClearing, deletingStudent, kickingStudent]);

    const handleDeleteRequest = useCallback(async (result: GameResult) => {
        if (deletingStudent || isClearing || kickingStudent) return;
        setDeletingStudent(result.playerName);
        try {
            await deleteStudentResult(classroomId, result.playerName, result.playerClass);
        } catch (error) {
            console.error(`UI: Failed to delete student ${result.playerName}`, error);
            alert(`Đã xảy ra lỗi khi xoá dữ liệu của học sinh ${result.playerName}.`);
        } finally {
            setDeletingStudent(null);
        }
    }, [classroomId, deletingStudent, isClearing, kickingStudent]);

    const handleKickPlayer = useCallback(async (student: { name: string, class: string }) => {
        if (isClearing || deletingStudent || kickingStudent) return;
        setKickingStudent(student.name);
        try {
            await kickPlayer(classroomId, student.name, student.class);
        } catch (error) {
            console.error(`UI: Failed to kick player ${student.name}`, error);
            alert(`Đã xảy ra lỗi khi loại học sinh ${student.name}.`);
        } finally {
            setKickingStudent(null);
        }
    }, [classroomId, isClearing, deletingStudent, kickingStudent]);

    const handleGenerateFromAiPrompt = useCallback(async (prompt: string) => {
        if (isGeneratingNewQuiz) return;
        setIsGeneratingNewQuiz(true);
        setNotification(null);
        try {
            const newQuestions = await generateQuizFromCustomPrompt(prompt);
            setQuizForEditing(newQuestions);
            setNotification({ message: 'Đề đã được tạo! Vui lòng xem lại và chỉnh sửa.', type: 'success' });
            setIsAiQuizModalOpen(false);
        } catch (error) {
            console.error("Failed to generate new quiz from prompt:", error);
            setNotification({ message: 'Tạo đề thất bại. Vui lòng kiểm tra yêu cầu và thử lại.', type: 'error' });
            throw error; // Re-throw to be caught in the modal
        } finally {
            setIsGeneratingNewQuiz(false);
        }
    }, [isGeneratingNewQuiz]);

    const handleGenerateFromText = useCallback(async (context: string) => {
        if (isGeneratingFromText) return;
        setIsGeneratingFromText(true);
        setNotification(null);
        try {
            const newQuestions = await generateQuizFromText(context);
            setQuizForEditing(newQuestions);
            setNotification({ message: 'Đề đã được tạo! Vui lòng xem lại và chỉnh sửa.', type: 'success' });
            setIsTextQuizModalOpen(false);
        } catch (error) {
            console.error("Failed to generate quiz from text:", error);
            setNotification({ message: 'Tạo đề từ văn bản thất bại. Vui lòng thử lại.', type: 'error' });
            throw error;
        } finally {
            setIsGeneratingFromText(false);
        }
    }, [isGeneratingFromText]);

    const areAllUnitPromptsEmpty = useMemo(() => {
        return Object.values(unitActivityPrompts).every(prompt => !String(prompt).trim());
    }, [unitActivityPrompts]);

    // Generates activities from custom prompts via button click
    const handleGenerateUnitActivities = useCallback(async () => {
        if (areAllUnitPromptsEmpty || viewingUnit === null) return;
    
        // Determine the vocabulary source
        let vocabSourceText = unitVocabList.trim();
        if (!vocabSourceText && currentUnitVocabulary.length > 0) {
            // If user did not paste new vocab, use the existing saved vocab for this unit
            vocabSourceText = currentUnitVocabulary.map(v => `${v.word} - (${v.type}) /${v.phonetic}/ - ${v.translation}`).join('\n');
        }
    
        // If there's still no vocabulary source, we cannot proceed.
        if (!vocabSourceText) {
            setNotification({ message: 'Không có từ vựng nào để tạo hoạt động. Vui lòng dán danh sách từ vựng hoặc đảm bảo UNIT này đã có từ vựng được lưu.', type: 'error' });
            return;
        }

        setIsGeneratingUnitActivities(true);
        setNotification(null);
        
        const { grade, unit } = viewingUnit;
        const unitId = `unit_${unit}`;
        let generatedActivitiesCount = 0;
        const generatedActivityNames: string[] = [];
        let hasError = false;

        try {
            const generationPromises: Promise<void>[] = [];

            // Vocabulary Generation: Only run this if the user provided new text.
            if (unitVocabList.trim() && String(unitActivityPrompts.learn).trim()) {
                const vocabPrompt = `You are an expert English teacher creating a vocabulary list.
                Parse the provided list and format each item into a structured JSON object.
                Teacher's instruction: "${unitActivityPrompts.learn}"
                Vocabulary list:
                """
                ${vocabSourceText}
                """`;
                generationPromises.push((async () => {
                    const vocabData = await generateVocabularyList(vocabPrompt);
                    await saveUnitVocabularyByGrade(classroomId, grade, unitId, vocabData);
                    generatedActivityNames.push(`${vocabData.length} thẻ từ vựng`);
                    generatedActivitiesCount++;
                })());
            }

            // Quiz Generation
            const customQuizPrompt = unitActivityPrompts.quiz;
            if (String(customQuizPrompt).trim()) {
                const quizPrompt = `You are an expert English teacher creating a multiple-choice quiz.
                You will be given a list of vocabulary words and a specific instruction from the teacher.
                Teacher's instruction: "${customQuizPrompt}"
                Vocabulary list to use:
                """
                ${vocabSourceText}
                """`;
                generationPromises.push((async () => {
                    const quizQuestions = await generateQuizFromCustomPrompt(quizPrompt);
                    await saveUnitQuizQuestionsByGrade(classroomId, grade, unitId, quizQuestions);
                    generatedActivityNames.push(`${quizQuestions.length} câu hỏi trắc nghiệm`);
                    generatedActivitiesCount++;
                })());
            }

            // Note: Matching and Spelling games will automatically use the saved vocabulary data.
            // We only need to explicitly generate the Quiz and the Vocabulary list itself.

            if (generationPromises.length === 0 && !String(unitActivityPrompts.match).trim() && !String(unitActivityPrompts.spell).trim()) {
                 setNotification({ message: 'Vui lòng nhập yêu cầu cho ít nhất một hoạt động để tiếp tục.', type: 'error' });
                 setIsGeneratingUnitActivities(false);
                 return;
            } else if (generationPromises.length === 0 && (String(unitActivityPrompts.match).trim() || String(unitActivityPrompts.spell).trim())) {
                generatedActivityNames.push('Trò chơi Ghép cặp và/hoặc Viết chính tả (sử dụng từ vựng hiện có)');
            }


            await Promise.all(generationPromises);

        } catch (error) {
            console.error("Failed to generate unit activities:", error);
            hasError = true;
        } finally {
            if (hasError) {
                setNotification({ message: 'Tạo hoạt động thất bại. Một hoặc nhiều yêu cầu không thành công.', type: 'error' });
            } else if (generatedActivityNames.length > 0) {
                setNotification({ message: `Đã cập nhật/tạo thành công: ${generatedActivityNames.join(' và ')} cho UNIT ${viewingUnit.unit}!`, type: 'success' });
            }
            setIsGeneratingUnitActivities(false);
        }
    }, [unitVocabList, viewingUnit, classroomId, unitActivityPrompts, areAllUnitPromptsEmpty, currentUnitVocabulary]);


    const handleSaveEditedQuiz = useCallback(async (editedQuestions: QuizQuestion[]) => {
        if (editedQuestions.length === 0) {
            setNotification({ message: 'Không thể lưu một đề trống.', type: 'error' });
            setQuizForEditing(null);
            return;
        }
        try {
             if (viewingUnit !== null) {
                const { grade, unit } = viewingUnit;
                const unitId = `unit_${unit}`;
                await saveUnitQuizQuestionsByGrade(classroomId, grade, unitId, editedQuestions);
                setNotification({ message: `Đã cập nhật đề thi cho UNIT ${unit}!`, type: 'success' });
            } else if (viewingTopic !== null) {
                const topicId = `topic_${viewingTopic}`;
                await saveTopicQuizQuestions(classroomId, topicId, editedQuestions);
                setNotification({ message: `Đã cập nhật đề thi cho TOPIC ${viewingTopic}!`, type: 'success' });
            } else {
                await saveQuizQuestions(classroomId, editedQuestions);
                setNotification({ message: 'Đã cập nhật và áp dụng đề thi mới!', type: 'success' });
            }
        } catch (error) {
            console.error("Failed to save edited quiz:", error);
            setNotification({ message: 'Lưu đề thi thất bại.', type: 'error' });
        } finally {
            setQuizForEditing(null);
        }
    }, [classroomId, viewingUnit, viewingTopic]);

    // Handle saving manually edited vocabulary
    const handleSaveVocabulary = useCallback(async (editedVocab: VocabularyWord[]) => {
        try {
            if (viewingUnit !== null) {
                const { grade, unit } = viewingUnit;
                const unitId = `unit_${unit}`;
                await saveUnitVocabularyByGrade(classroomId, grade, unitId, editedVocab);
                setNotification({ message: `Đã cập nhật từ vựng cho UNIT ${unit}!`, type: 'success' });
            } else if (viewingTopic !== null) {
                const topicId = `topic_${viewingTopic}`;
                await saveTopicVocabulary(classroomId, topicId, editedVocab);
                setNotification({ message: `Đã cập nhật từ vựng cho TOPIC ${viewingTopic}!`, type: 'success' });
            }
        } catch (error) {
             console.error("Failed to save edited vocabulary:", error);
             setNotification({ message: 'Lưu từ vựng thất bại.', type: 'error' });
        }
    }, [classroomId, viewingUnit, viewingTopic]);

    // Open the vocabulary edit modal
    const handleOpenVocabEdit = useCallback(() => {
        if (viewingUnit !== null) {
            setVocabForEditing(currentUnitVocabulary);
            setIsEditVocabModalOpen(true);
        } else if (viewingTopic !== null) {
            setVocabForEditing(currentTopicVocabulary);
            setIsEditVocabModalOpen(true);
        }
    }, [viewingUnit, currentUnitVocabulary, viewingTopic, currentTopicVocabulary]);


    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        setRefreshKey(prev => prev + 1);
        setTimeout(() => setIsRefreshing(false), 1000);
    }, []);

    const handleDeleteQuizRequest = () => {
        setIsDeleteQuizConfirmOpen(true);
    };

    const handleConfirmDeleteQuiz = async () => {
        setIsDeletingQuiz(true);
        setNotification(null);
        try {
            await deleteCurrentQuiz(classroomId);
            setNotification({ message: 'Đã xóa đề thi thành công.', type: 'success' });
        } catch (error) {
            console.error("Failed to delete quiz:", error);
            setNotification({ message: 'Xóa đề thi thất bại.', type: 'error' });
        } finally {
            setIsDeletingQuiz(false);
            setIsDeleteQuizConfirmOpen(false);
        }
    };

    const summaryStats = useMemo(() => {
        const totalStudents = results.length;
        if (totalStudents === 0) return { totalStudents: 0, avgScore: 0, avgTime: 0 };
        const totalScore = results.reduce((sum, result) => sum + parseFloat(result.score), 0);
        const totalTime = results.reduce((sum, result) => sum + result.timeTakenSeconds, 0);
        return {
            totalStudents,
            avgScore: (totalScore / totalStudents).toFixed(1),
            avgTime: Math.round(totalTime / totalStudents)
        };
    }, [results]);
    
    const uniqueClasses = useMemo(() => {
        const allResults = [...results, ...processedUnitResults.flatMap(s => s.results), ...processedTopicResults.flatMap(s => s.results)];
        if (!allResults || allResults.length === 0) return ['all'];
        const classSet = new Set(allResults.map(r => (r.playerClass || '').trim().toUpperCase()));
        return ['all', ...Array.from(classSet).sort()];
    }, [results, processedUnitResults, processedTopicResults]);

    const sortedResults = useMemo(() => {
        let itemsWithCheats: GameResult[] = results.map(result => ({
            ...result,
            cheatAttempts: cheatCounts[getPlayerKey(result.playerName, result.playerClass)] || 0,
        }));
        
        let filteredItems = itemsWithCheats.filter(result => 
            (selectedClass === 'all' || (result.playerClass || '').trim().toUpperCase() === selectedClass)
        );

        if (sortConfig.key) {
            filteredItems.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];
                let comparison = 0;
                
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    if (aValue < bValue) comparison = -1;
                    if (aValue > bValue) comparison = 1;
                } else if (sortConfig.key === 'score') {
                     const numA = parseFloat(aValue as string);
                     const numB = parseFloat(bValue as string);
                     if (numA < numB) comparison = -1;
                     if (numA > bValue) comparison = 1;
                } else if (typeof aValue === 'string' && typeof bValue === 'string') {
                    comparison = aValue.localeCompare(bValue);
                }

                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return filteredItems;
    }, [results, cheatCounts, sortConfig, selectedClass]);

    const requestSort = (key: keyof GameResult) => {
        const direction = (sortConfig.key === key && sortConfig.direction === 'ascending') ? 'descending' : 'ascending';
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof GameResult) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const headers: { key: keyof GameResult, label: string }[] = [
      { key: 'playerName', label: 'Họ và tên' },
      { key: 'playerClass', label: 'Lớp' },
      { key: 'score', label: 'Điểm' },
      { key: 'cheatAttempts', label: 'Gian lận' },
      { key: 'correct', label: 'Đúng' },
      { key: 'incorrect', label: 'Sai' },
      { key: 'timeTakenSeconds', label: 'Thời gian' },
      { key: 'timestamp', label: 'Ngày làm' },
    ];
    
    const unitHeaders: { key: keyof GameResult | 'gameType', label: string }[] = [
      { key: 'score', label: 'Điểm' },
      { key: 'gameType', label: 'Nội dung tham gia' },
      { key: 'attempts', label: 'Lần làm' },
      { key: 'correct', label: 'Đúng' },
      { key: 'incorrect', label: 'Sai' },
      { key: 'timeTakenSeconds', label: 'Thời gian' },
      { key: 'timestamp', label: 'Ngày làm' },
    ];

    const getGameTypeName = (gameType?: 'quiz' | 'spelling' | 'matching' | 'vocabulary') => {
        switch (gameType) {
            case 'quiz': return 'Trắc nghiệm';
            case 'spelling': return 'Viết chính tả';
            case 'matching': return 'Ghép cặp';
            case 'vocabulary': return 'Học từ mới';
            default: return 'Không xác định';
        }
    };
    
    
    // --- UNIT Detail View Specific Logic ---
    const handleClearUnitResults = useCallback(async () => {
        if (!viewingUnit || isClearingUnit) return;
        setIsClearingUnit(true);
        try {
            await clearUnitResultsByGrade(classroomId, viewingUnit.grade, `unit_${viewingUnit.unit}`);
            setNotification({ message: `Đã xóa lịch sử hoạt động của UNIT ${viewingUnit.unit}.`, type: 'success' });
        } catch (error) {
            console.error("Lỗi khi xoá lịch sử unit:", error);
            setNotification({ message: `Lỗi khi xóa lịch sử UNIT ${viewingUnit.unit}.`, type: 'error' });
        } finally {
            setIsClearingUnit(false);
        }
    }, [classroomId, viewingUnit, isClearingUnit]);

    const handleDeleteUnitStudentResult = useCallback(async (student: StudentUnitSummary) => {
        if (!viewingUnit || deletingUnitStudent) return;
        setDeletingUnitStudent(student.playerName);
        try {
            await deleteUnitStudentResultByGrade(classroomId, viewingUnit.grade, `unit_${viewingUnit.unit}`, student.playerName, student.playerClass);
        } catch (error) {
            console.error(`UI: Failed to delete unit student result for ${student.playerName}`, error);
            alert(`Đã xảy ra lỗi khi xoá dữ liệu của học sinh ${student.playerName} ở UNIT này.`);
        } finally {
            setDeletingUnitStudent(null);
        }
    }, [classroomId, viewingUnit, deletingUnitStudent]);

    const sortedUnitResults = useMemo(() => {
        let filteredItems = processedUnitResults.filter(student => {
            const playerClass = (student.playerClass || '').trim().toUpperCase();
            return (selectedUnitClass === 'all' || playerClass === selectedUnitClass);
        });

        if (unitSortConfig.key) {
            filteredItems.sort((a, b) => {
                // Sort students based on their first result for simplicity
                const aFirstResult = a.results[0];
                const bFirstResult = b.results[0];
                const aValue = aFirstResult[unitSortConfig.key as keyof GameResult];
                const bValue = bFirstResult[unitSortConfig.key as keyof GameResult];
                
                let comparison = 0;
                
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    if (aValue < bValue) comparison = -1;
                    if (aValue > bValue) comparison = 1;
                } else if (unitSortConfig.key === 'score') {
                     const numA = parseFloat(aValue as string);
                     const numB = parseFloat(bValue as string);
                     if (numA < numB) comparison = -1;
                     if (numA > bValue) comparison = 1;
                } else if (typeof aValue === 'string' && typeof bValue === 'string') {
                    comparison = aValue.localeCompare(bValue);
                }

                return unitSortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return filteredItems;
    }, [processedUnitResults, unitSortConfig, selectedUnitClass]);
    
     const requestUnitSort = (key: keyof GameResult) => {
        const direction = (unitSortConfig.key === key && unitSortConfig.direction === 'ascending') ? 'descending' : 'ascending';
        setUnitSortConfig({ key, direction });
    };

    const getUnitSortIndicator = (key: keyof GameResult | 'gameType') => {
        if (unitSortConfig.key !== key) return '↕';
        return unitSortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const handleUnitPromptChange = (activity: keyof typeof unitActivityPrompts, value: string) => {
        setUnitActivityPrompts(prev => ({ ...prev, [activity]: value }));
    };

    const renderUnitDetailView = (grade: number, unitNumber: number) => {
        return (
            <div className="p-4 bg-white/70 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 tab-content-enter space-y-8">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewingUnit(null)} className="flex items-center gap-2 text-blue-600 font-semibold hover:underline">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lime-700">Quay lại danh sách</span>
                        </button>
                        <h2 className="text-2xl font-bold text-indigo-800">Quản lý chi tiết: <span className="text-red-500">UNIT</span> {unitNumber}</h2>
                    </div>
                     <button
                        onClick={handleRefresh}
                        className="bg-blue-600 text-white font-bold p-2 rounded-full hover:bg-blue-700 transition shadow-sm disabled:bg-gray-500"
                        title="Làm mới dữ liệu"
                        disabled={isRefreshing}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 003.5 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-4 border rounded-lg bg-sky-50 border-sky-200 space-y-4">
                    <h3 className="text-xl font-bold text-purple-700">Soạn bài</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left side: Vocabulary Input */}
                        <div className="space-y-2">
                            <label htmlFor="vocab-list" className="font-semibold text-teal-700">1. Dán danh sách từ vựng (không bắt buộc nếu đã có):</label>
                            <textarea
                                id="vocab-list"
                                value={unitVocabList}
                                onChange={(e) => setUnitVocabList(e.target.value)}
                                placeholder={VOCAB_PLACEHOLDER}
                                className="w-full h-96 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white text-slate-900"
                                disabled={isGeneratingUnitActivities}
                            />
                            <div className="flex justify-end">
                                <button 
                                    onClick={handleOpenVocabEdit}
                                    className="text-sm flex items-center gap-1 bg-white border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 text-blue-600 font-bold transition shadow-sm"
                                    title="Chỉnh sửa chi tiết danh sách hiện có"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                    Chỉnh sửa chi tiết
                                </button>
                            </div>
                        </div>

                        {/* Right side: Activity Prompts */}
                        <div className="flex flex-col">
                            <div className="space-y-2">
                                <label className="font-semibold text-teal-700">2. Tùy chỉnh yêu cầu cho AI (điền ít nhất 1 ô):</label>
                                <div className="space-y-2">
                                    {/* Learn Vocab Prompt */}
                                    <div className="bg-white p-2 rounded-md border border-gray-200">
                                        <label htmlFor="prompt-learn" className="block text-sm font-bold text-blue-600 mb-1">Học từ vựng</label>
                                        <textarea
                                            id="prompt-learn"
                                            value={unitActivityPrompts.learn}
                                            onChange={(e) => handleUnitPromptChange('learn', e.target.value)}
                                            placeholder="VD: tạo 10 thẻ từ vựng dựa trên danh sách..."
                                            className="w-full p-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-sky-100 text-slate-900"
                                            rows={2}
                                            disabled={isGeneratingUnitActivities}
                                        />
                                    </div>
                                    {/* Matching Game Prompt */}
                                    <div className="bg-white p-2 rounded-md border border-gray-200">
                                        <label htmlFor="prompt-match" className="block text-sm font-bold text-purple-600 mb-1">Trò chơi Ghép cặp</label>
                                        <textarea
                                            id="prompt-match"
                                            value={unitActivityPrompts.match}
                                            onChange={(e) => handleUnitPromptChange('match', e.target.value)}
                                            placeholder="Yêu cầu bị bỏ qua nếu ô Học từ vựng trống..."
                                            className="w-full p-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-sky-100 text-slate-900"
                                            rows={2}
                                            disabled={isGeneratingUnitActivities}
                                        />
                                    </div>
                                    {/* Spelling Game Prompt */}
                                    <div className="bg-white p-2 rounded-md border border-gray-200">
                                        <label htmlFor="prompt-spell" className="block text-sm font-bold text-orange-600 mb-1">Trò chơi Viết chính tả</label>
                                        <textarea
                                            id="prompt-spell"
                                            value={unitActivityPrompts.spell}
                                            onChange={(e) => handleUnitPromptChange('spell', e.target.value)}
                                            placeholder="Yêu cầu bị bỏ qua nếu ô Học từ vựng trống..."
                                            className="w-full p-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 bg-sky-100 text-slate-900"
                                            rows={2}
                                            disabled={isGeneratingUnitActivities}
                                        />
                                    </div>
                                    {/* Quiz Prompt */}
                                    <div className="bg-white p-2 rounded-md border border-gray-200">
                                        <label htmlFor="prompt-quiz" className="block text-sm font-bold text-green-600 mb-1">Bài tập trắc nghiệm</label>
                                        <textarea
                                            id="prompt-quiz"
                                            value={unitActivityPrompts.quiz}
                                            onChange={(e) => handleUnitPromptChange('quiz', e.target.value)}
                                            placeholder="VD: tạo 10 câu hỏi ngữ âm từ danh sách..."
                                            className="w-full p-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-green-400 bg-sky-100 text-slate-900"
                                            rows={2}
                                            disabled={isGeneratingUnitActivities}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-grow flex items-end">
                                <button
                                    onClick={handleGenerateUnitActivities}
                                    disabled={isGeneratingUnitActivities || areAllUnitPromptsEmpty}
                                    className="bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full mt-4"
                                >
                                    {isGeneratingUnitActivities ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Đang tạo...</span>
                                        </>
                                    ) : (
                                        '✨ Tạo hoạt động với AI'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Unit Results Section */}
                <div className="p-4 border rounded-lg bg-sky-50 border-sky-200">
                     {processedUnitResults.length > 0 ? (
                        <>
                            <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
                                <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
                                    <select value={selectedUnitClass} onChange={e => setSelectedUnitClass(e.target.value)} className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 text-slate-900">
                                        {uniqueClasses.map(c => <option key={c} value={c}>{c === 'all' ? 'Tất cả các lớp' : c}</option>)}
                                    </select>
                                    <button 
                                        onClick={handleClearUnitResults}
                                        className="bg-red-600 text-white font-bold p-2 rounded-lg hover:bg-red-700 transition shadow-sm disabled:bg-gray-500 disabled:cursor-wait" 
                                        title="Xoá tất cả kết quả của Unit này"
                                        disabled={isClearingUnit || !!deletingUnitStudent}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isClearingUnit ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-800">
                                            <thead className="text-xs font-bold text-orange-700 uppercase bg-orange-100">
                                                <tr className="border-b-4 border-orange-300">
                                                    <th scope="col" className="px-4 py-3 border-r-2 border-orange-300">STT</th>
                                                    <th scope="col" className="px-6 py-3 border-r-2 border-orange-300">Họ và tên</th>
                                                    <th scope="col" className="px-6 py-3 border-r-2 border-orange-300">Lớp</th>
                                                    {unitHeaders.map(({ key, label }) => (
                                                        <th key={key} scope="col" className="px-6 py-3 cursor-pointer hover:bg-orange-200/50 border-r-2 border-orange-300" onClick={() => requestUnitSort(key as keyof GameResult)}>
                                                            {label} {getUnitSortIndicator(key as keyof GameResult)}
                                                        </th>
                                                    ))}
                                                    <th scope="col" className="px-6 py-3 text-center">Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedUnitResults.map((student, studentIndex) => (
                                                    <React.Fragment key={student.playerKey}>
                                                        {student.results.map((result, resultIndex) => (
                                                            <tr key={`${student.playerKey}-${resultIndex}`} className={`bg-white hover:bg-gray-50 border-b-2 border-gray-200 ${studentIndex < sortedUnitResults.length - 1 && resultIndex === student.results.length - 1 ? 'border-b-4 border-gray-300' : ''}`}>
                                                                {resultIndex === 0 ? (
                                                                    <>
                                                                        <td rowSpan={student.results.length} className="px-4 py-4 font-black text-blue-600 text-center align-top border-x-2 border-gray-200">{studentIndex + 1}</td>
                                                                        <td rowSpan={student.results.length} className={`px-6 py-4 font-bold ${getColorForName(student.playerName)} whitespace-nowrap border-r-2 border-gray-200 align-top`}>{student.playerName}</td>
                                                                        <td rowSpan={student.results.length} className="px-6 py-4 font-bold text-purple-600 border-r-2 border-gray-200 align-top">{student.playerClass}</td>
                                                                    </>
                                                                ) : null}
                                                                <td className={`px-6 py-4 font-extrabold text-red-600 text-base border-r-2 border-gray-200 ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>{result.score}</td>
                                                                <td className={`px-6 py-4 whitespace-nowrap border-r-2 border-gray-200 ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getGameTypeStyle(result.gameType)}`}>
                                                                        {getGameTypeName(result.gameType)}
                                                                    </span>
                                                                </td>
                                                                <td className={`px-6 py-4 font-bold text-center text-red-600 border-r-2 border-gray-200 ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>{result.attempts || 1}</td>
                                                                <td className={`px-6 py-4 font-bold text-green-600 border-r-2 border-gray-200 ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>{result.correct}</td>
                                                                <td className={`px-6 py-4 font-bold text-red-700 border-r-2 border-gray-200 ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>{result.incorrect}</td>
                                                                <td className={`px-6 py-4 font-bold text-orange-600 border-r-2 border-gray-200 ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>{formatTime(result.timeTakenSeconds)}</td>
                                                                <td className={`px-6 py-4 font-bold text-slate-600 border-r-2 border-gray-200 whitespace-nowrap text-sm ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>
                                                                    {result.timestamp ? new Date(result.timestamp).toLocaleString('vi-VN') : ''}
                                                                </td>
                                                                {resultIndex === 0 ? (
                                                                    <td rowSpan={student.results.length} className="px-6 py-4 text-center align-top border-l-2 border-gray-200">
                                                                        <div className="flex items-center justify-center space-x-2">
                                                                            <button 
                                                                                onClick={() => handleDeleteUnitStudentResult(student)} 
                                                                                className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 disabled:bg-gray-200 disabled:cursor-wait"
                                                                                title={`Xóa tất cả kết quả của ${student.playerName}`}
                                                                                disabled={!!deletingUnitStudent || isClearingUnit}>
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${deletingUnitStudent === student.playerName ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                ) : null}
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {sortedUnitResults.length === 0 && <p className="text-center p-4 text-slate-600">Không tìm thấy kết quả phù hợp.</p>}
                                </div>
                            </div>
                        </>
                    ) : (
                         <div className="text-center text-slate-600 bg-gray-50 p-6 rounded-md border border-gray-200">
                            <p>Chưa có dữ liệu hoạt động cho UNIT này.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- TOPIC Specific Logic ---
    const handleToggleTopicStatus = useCallback(async (topicNumber: number, isEnabled: boolean) => {
        const topicId = `topic_${topicNumber}`;
        try {
            await setTopicStatus(classroomId, topicId, isEnabled);
        } catch (error) {
            console.error(`Failed to update status for ${topicId}`, error);
            setNotification({ message: `Lỗi khi cập nhật TOPIC ${topicNumber}.`, type: 'error' });
        }
    }, [classroomId]);

    const areAllTopicPromptsEmpty = useMemo(() => {
        return Object.values(topicActivityPrompts).every(prompt => !String(prompt).trim());
    }, [topicActivityPrompts]);

    const handleGenerateTopicActivities = useCallback(async () => {
        if (areAllTopicPromptsEmpty || viewingTopic === null) return;
    
        let vocabSourceText = topicVocabList.trim();
        if (!vocabSourceText && currentTopicVocabulary.length > 0) {
            vocabSourceText = currentTopicVocabulary.map(v => `${v.word} - (${v.type}) /${v.phonetic}/ - ${v.translation}`).join('\n');
        }
    
        if (!vocabSourceText) {
            setNotification({ message: 'Không có từ vựng nào để tạo hoạt động. Vui lòng dán danh sách từ vựng hoặc đảm bảo TOPIC này đã có từ vựng được lưu.', type: 'error' });
            return;
        }

        setIsGeneratingTopicActivities(true);
        setNotification(null);
        
        const topicId = `topic_${viewingTopic}`;
        const generatedActivityNames: string[] = [];
        let hasError = false;

        try {
            const generationPromises: Promise<void>[] = [];

            if (topicVocabList.trim() && String(topicActivityPrompts.learn).trim()) {
                const vocabPrompt = `You are an expert English teacher creating a vocabulary list.
                Parse the provided list and format each item into a structured JSON object.
                Teacher's instruction: "${topicActivityPrompts.learn}"
                Vocabulary list:
                """
                ${vocabSourceText}
                """`;
                generationPromises.push((async () => {
                    const vocabData = await generateVocabularyList(vocabPrompt);
                    await saveTopicVocabulary(classroomId, topicId, vocabData);
                    generatedActivityNames.push(`${vocabData.length} thẻ từ vựng`);
                })());
            }

            const customQuizPrompt = topicActivityPrompts.quiz;
            if (String(customQuizPrompt).trim()) {
                const quizPrompt = `You are an expert English teacher creating a multiple-choice quiz.
                You will be given a list of vocabulary words and a specific instruction from the teacher.
                Teacher's instruction: "${customQuizPrompt}"
                Vocabulary list to use:
                """
                ${vocabSourceText}
                """`;
                generationPromises.push((async () => {
                    const quizQuestions = await generateQuizFromCustomPrompt(quizPrompt);
                    await saveTopicQuizQuestions(classroomId, topicId, quizQuestions);
                    generatedActivityNames.push(`${quizQuestions.length} câu hỏi trắc nghiệm`);
                })());
            }

            if (generationPromises.length === 0 && !String(topicActivityPrompts.match).trim() && !String(topicActivityPrompts.spell).trim()) {
                 setNotification({ message: 'Vui lòng nhập yêu cầu cho ít nhất một hoạt động để tiếp tục.', type: 'error' });
                 setIsGeneratingTopicActivities(false);
                 return;
            } else if (generationPromises.length === 0 && (String(topicActivityPrompts.match).trim() || String(topicActivityPrompts.spell).trim())) {
                generatedActivityNames.push('Trò chơi Ghép cặp và/hoặc Viết chính tả (sử dụng từ vựng hiện có)');
            }

            await Promise.all(generationPromises);

        } catch (error) {
            console.error("Failed to generate topic activities:", error);
            hasError = true;
        } finally {
            if (hasError) {
                setNotification({ message: 'Tạo hoạt động thất bại. Một hoặc nhiều yêu cầu không thành công.', type: 'error' });
            } else if (generatedActivityNames.length > 0) {
                setNotification({ message: `Đã cập nhật/tạo thành công: ${generatedActivityNames.join(' và ')} cho TOPIC ${viewingTopic}!`, type: 'success' });
            }
            setIsGeneratingTopicActivities(false);
        }
    }, [topicVocabList, viewingTopic, classroomId, topicActivityPrompts, areAllTopicPromptsEmpty, currentTopicVocabulary]);
    
    const handleClearTopicResults = useCallback(async () => {
        if (!viewingTopic || isClearingTopic) return;
        setIsClearingTopic(true);
        try {
            await clearTopicResults(classroomId, `topic_${viewingTopic}`);
            setNotification({ message: `Đã xóa lịch sử hoạt động của TOPIC ${viewingTopic}.`, type: 'success' });
        } catch (error) {
            console.error("Lỗi khi xoá lịch sử topic:", error);
            setNotification({ message: `Lỗi khi xóa lịch sử TOPIC ${viewingTopic}.`, type: 'error' });
        } finally {
            setIsClearingTopic(false);
        }
    }, [classroomId, viewingTopic, isClearingTopic]);

    const handleDeleteTopicStudentResult = useCallback(async (student: StudentUnitSummary) => {
        if (!viewingTopic || deletingTopicStudent) return;
        setDeletingTopicStudent(student.playerName);
        try {
            await deleteTopicStudentResult(classroomId, `topic_${viewingTopic}`, student.playerName, student.playerClass);
        } catch (error) {
            console.error(`UI: Failed to delete topic student result for ${student.playerName}`, error);
            alert(`Đã xảy ra lỗi khi xoá dữ liệu của học sinh ${student.playerName} ở TOPIC này.`);
        } finally {
            setDeletingTopicStudent(null);
        }
    }, [classroomId, viewingTopic, deletingTopicStudent]);

    const sortedTopicResults = useMemo(() => {
        let filteredItems = processedTopicResults.filter(student => {
            const playerClass = (student.playerClass || '').trim().toUpperCase();
            return (selectedTopicClass === 'all' || playerClass === selectedTopicClass);
        });

        if (topicSortConfig.key) {
            filteredItems.sort((a, b) => {
                const aFirstResult = a.results[0];
                const bFirstResult = b.results[0];
                const aValue = aFirstResult[topicSortConfig.key as keyof GameResult];
                const bValue = bFirstResult[topicSortConfig.key as keyof GameResult];
                
                let comparison = 0;
                
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    if (aValue < bValue) comparison = -1;
                    if (aValue > bValue) comparison = 1;
                } else if (topicSortConfig.key === 'score') {
                     const numA = parseFloat(aValue as string);
                     const numB = parseFloat(bValue as string);
                     if (numA < numB) comparison = -1;
                     if (numA > bValue) comparison = 1;
                } else if (typeof aValue === 'string' && typeof bValue === 'string') {
                    comparison = aValue.localeCompare(bValue);
                }

                return topicSortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return filteredItems;
    }, [processedTopicResults, topicSortConfig, selectedTopicClass]);
    
     const requestTopicSort = (key: keyof GameResult) => {
        const direction = (topicSortConfig.key === key && topicSortConfig.direction === 'ascending') ? 'descending' : 'ascending';
        setTopicSortConfig({ key, direction });
    };

    const getTopicSortIndicator = (key: keyof GameResult | 'gameType') => {
        if (topicSortConfig.key !== key) return '↕';
        return topicSortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const handleTopicPromptChange = (activity: keyof typeof topicActivityPrompts, value: string) => {
        setTopicActivityPrompts(prev => ({ ...prev, [activity]: value }));
    };

    const renderTopicDetailView = (topicNumber: number) => {
        return (
            <div className="p-4 bg-white/70 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 tab-content-enter space-y-8">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewingTopic(null)} className="flex items-center gap-2 text-blue-600 font-semibold hover:underline">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-lime-700">Quay lại danh sách</span>
                        </button>
                        <h2 className="text-2xl font-bold text-indigo-800">Quản lý chi tiết: <span className="text-blue-500">TOPIC</span> {topicNumber}</h2>
                    </div>
                     <button
                        onClick={handleRefresh}
                        className="bg-blue-600 text-white font-bold p-2 rounded-full hover:bg-blue-700 transition shadow-sm disabled:bg-gray-500"
                        title="Làm mới dữ liệu"
                        disabled={isRefreshing}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 003.5 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-4 border rounded-lg bg-sky-50 border-sky-200 space-y-4">
                    <h3 className="text-xl font-bold text-purple-700">Soạn bài</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left side: Vocabulary Input */}
                        <div className="space-y-2">
                            <label htmlFor="topic-vocab-list" className="font-semibold text-teal-700">1. Dán danh sách từ vựng (không bắt buộc nếu đã có):</label>
                            <textarea
                                id="topic-vocab-list"
                                value={topicVocabList}
                                onChange={(e) => setTopicVocabList(e.target.value)}
                                placeholder={VOCAB_PLACEHOLDER}
                                className="w-full h-96 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white text-slate-900"
                                disabled={isGeneratingTopicActivities}
                            />
                            <div className="flex justify-end">
                                <button 
                                    onClick={handleOpenVocabEdit}
                                    className="text-sm flex items-center gap-1 bg-white border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 text-blue-600 font-bold transition shadow-sm"
                                    title="Chỉnh sửa chi tiết danh sách hiện có"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                    Chỉnh sửa chi tiết
                                </button>
                            </div>
                        </div>

                        {/* Right side: Activity Prompts */}
                        <div className="flex flex-col">
                            <div className="space-y-2">
                                <label className="font-semibold text-teal-700">2. Tùy chỉnh yêu cầu cho AI (điền ít nhất 1 ô):</label>
                                <div className="space-y-2">
                                    <div className="bg-white p-2 rounded-md border border-gray-200">
                                        <label htmlFor="topic-prompt-learn" className="block text-sm font-bold text-blue-600 mb-1">Học từ vựng</label>
                                        <textarea
                                            id="topic-prompt-learn"
                                            value={topicActivityPrompts.learn}
                                            onChange={(e) => handleTopicPromptChange('learn', e.target.value)}
                                            placeholder="VD: tạo 10 thẻ từ vựng dựa trên danh sách..."
                                            className="w-full p-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-sky-100 text-slate-900"
                                            rows={2}
                                            disabled={isGeneratingTopicActivities}
                                        />
                                    </div>
                                    <div className="bg-white p-2 rounded-md border border-gray-200">
                                        <label htmlFor="topic-prompt-match" className="block text-sm font-bold text-purple-600 mb-1">Trò chơi Ghép cặp</label>
                                        <textarea
                                            id="topic-prompt-match"
                                            value={topicActivityPrompts.match}
                                            onChange={(e) => handleTopicPromptChange('match', e.target.value)}
                                            placeholder="Yêu cầu bị bỏ qua nếu ô Học từ vựng trống..."
                                            className="w-full p-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-sky-100 text-slate-900"
                                            rows={2}
                                            disabled={isGeneratingTopicActivities}
                                        />
                                    </div>
                                    <div className="bg-white p-2 rounded-md border border-gray-200">
                                        <label htmlFor="topic-prompt-spell" className="block text-sm font-bold text-orange-600 mb-1">Trò chơi Viết chính tả</label>
                                        <textarea
                                            id="topic-prompt-spell"
                                            value={topicActivityPrompts.spell}
                                            onChange={(e) => handleTopicPromptChange('spell', e.target.value)}
                                            placeholder="Yêu cầu bị bỏ qua nếu ô Học từ vựng trống..."
                                            className="w-full p-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 bg-sky-100 text-slate-900"
                                            rows={2}
                                            disabled={isGeneratingTopicActivities}
                                        />
                                    </div>
                                    <div className="bg-white p-2 rounded-md border border-gray-200">
                                        <label htmlFor="topic-prompt-quiz" className="block text-sm font-bold text-green-600 mb-1">Bài tập trắc nghiệm</label>
                                        <textarea
                                            id="topic-prompt-quiz"
                                            value={topicActivityPrompts.quiz}
                                            onChange={(e) => handleTopicPromptChange('quiz', e.target.value)}
                                            placeholder="VD: tạo 10 câu hỏi ngữ âm từ danh sách..."
                                            className="w-full p-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-green-400 bg-sky-100 text-slate-900"
                                            rows={2}
                                            disabled={isGeneratingTopicActivities}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-grow flex items-end">
                                <button
                                    onClick={handleGenerateTopicActivities}
                                    disabled={isGeneratingTopicActivities || areAllTopicPromptsEmpty}
                                    className="bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full mt-4"
                                >
                                    {isGeneratingTopicActivities ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Đang tạo...</span>
                                        </>
                                    ) : (
                                        '✨ Tạo hoạt động với AI'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border rounded-lg bg-sky-50 border-sky-200">
                     {processedTopicResults.length > 0 ? (
                        <>
                            <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
                                <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
                                    <select value={selectedTopicClass} onChange={e => setSelectedTopicClass(e.target.value)} className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 text-slate-900">
                                        {uniqueClasses.map(c => <option key={c} value={c}>{c === 'all' ? 'Tất cả các lớp' : c}</option>)}
                                    </select>
                                    <button 
                                        onClick={handleClearTopicResults}
                                        className="bg-red-600 text-white font-bold p-2 rounded-lg hover:bg-red-700 transition shadow-sm disabled:bg-gray-500 disabled:cursor-wait" 
                                        title="Xoá tất cả kết quả của Topic này"
                                        disabled={isClearingTopic || !!deletingTopicStudent}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isClearingTopic ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-800">
                                            <thead className="text-xs font-bold text-orange-700 uppercase bg-orange-100">
                                                <tr className="border-b-4 border-orange-300">
                                                    <th scope="col" className="px-4 py-3 border-r-2 border-orange-300">STT</th>
                                                    <th scope="col" className="px-6 py-3 border-r-2 border-orange-300">Họ và tên</th>
                                                    <th scope="col" className="px-6 py-3 border-r-2 border-orange-300">Lớp</th>
                                                    {unitHeaders.map(({ key, label }) => (
                                                        <th key={key} scope="col" className="px-6 py-3 cursor-pointer hover:bg-orange-200/50 border-r-2 border-orange-300" onClick={() => requestTopicSort(key as keyof GameResult)}>
                                                            {label} {getTopicSortIndicator(key as keyof GameResult)}
                                                        </th>
                                                    ))}
                                                    <th scope="col" className="px-6 py-3 text-center">Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedTopicResults.map((student, studentIndex) => (
                                                    <React.Fragment key={student.playerKey}>
                                                        {student.results.map((result, resultIndex) => (
                                                            <tr key={`${student.playerKey}-${resultIndex}`} className={`bg-white hover:bg-gray-50 border-b-2 border-gray-200 ${studentIndex < sortedTopicResults.length - 1 && resultIndex === student.results.length - 1 ? 'border-b-4 border-gray-300' : ''}`}>
                                                                {resultIndex === 0 ? (
                                                                    <>
                                                                        <td rowSpan={student.results.length} className="px-4 py-4 font-black text-blue-600 text-center align-top border-x-2 border-gray-200">{studentIndex + 1}</td>
                                                                        <td rowSpan={student.results.length} className={`px-6 py-4 font-bold ${getColorForName(student.playerName)} whitespace-nowrap border-r-2 border-gray-200 align-top`}>{student.playerName}</td>
                                                                        <td rowSpan={student.results.length} className="px-6 py-4 font-bold text-purple-600 border-r-2 border-gray-200 align-top">{student.playerClass}</td>
                                                                    </>
                                                                ) : null}
                                                                <td className={`px-6 py-4 font-extrabold text-red-600 text-base border-r-2 border-gray-200 ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>{result.score}</td>
                                                                <td className={`px-6 py-4 whitespace-nowrap border-r-2 border-gray-200 ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getGameTypeStyle(result.gameType)}`}>
                                                                        {getGameTypeName(result.gameType)}
                                                                    </span>
                                                                </td>
                                                                <td className={`px-6 py-4 font-bold text-center text-red-600 border-r-2 border-gray-200 ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>{result.attempts || 1}</td>
                                                                <td className={`px-6 py-4 font-bold text-green-600 border-r-2 border-gray-200 ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>{result.correct}</td>
                                                                <td className={`px-6 py-4 font-bold text-red-700 border-r-2 border-gray-200 ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>{result.incorrect}</td>
                                                                <td className={`px-6 py-4 font-bold text-orange-600 border-r-2 border-gray-200 ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>{formatTime(result.timeTakenSeconds)}</td>
                                                                <td className={`px-6 py-4 font-bold text-slate-600 border-r-2 border-gray-200 whitespace-nowrap text-sm ${resultIndex > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>
                                                                    {result.timestamp ? new Date(result.timestamp).toLocaleString('vi-VN') : ''}
                                                                </td>
                                                                {resultIndex === 0 ? (
                                                                    <td rowSpan={student.results.length} className="px-6 py-4 text-center align-top border-l-2 border-gray-200">
                                                                        <div className="flex items-center justify-center space-x-2">
                                                                            <button 
                                                                                onClick={() => handleDeleteTopicStudentResult(student)} 
                                                                                className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 disabled:bg-gray-200 disabled:cursor-wait"
                                                                                title={`Xóa tất cả kết quả của ${student.playerName}`}
                                                                                disabled={!!deletingTopicStudent || isClearingTopic}>
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${deletingTopicStudent === student.playerName ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                ) : null}
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {sortedTopicResults.length === 0 && <p className="text-center p-4 text-slate-600">Không tìm thấy kết quả phù hợp.</p>}
                                </div>
                            </div>
                        </>
                    ) : (
                         <div className="text-center text-slate-600 bg-gray-50 p-6 rounded-md border border-gray-200">
                            <p>Chưa có dữ liệu hoạt động cho TOPIC này.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    const renderUnitListView = (grade: number, unitsStatus: UnitsState) => (
        <div className="p-6 bg-gradient-to-br from-green-700 via-green-800 to-green-900 rounded-lg shadow-2xl border border-green-700/50 tab-content-enter">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white">Ngân hàng câu hỏi theo UNITs</h2>
                    <p className="text-slate-400 mt-2">Kích hoạt, quản lý nội dung và xem kết quả cho từng bài học.</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="bg-slate-700/50 text-white font-bold p-2 rounded-full hover:bg-slate-600/50 transition shadow-md border border-slate-600 disabled:bg-gray-500"
                    title="Làm mới dữ liệu"
                    disabled={isRefreshing}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 003.5 12" />
                    </svg>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(unitNumber => {
                    const unitId = `unit_${unitNumber}`;
                    const isEnabled = unitsStatus[unitId]?.enabled ?? false;
                    const style = unitCardStyles[unitNumber - 1];
                    
                    return (
                        <div 
                            key={unitNumber} 
                            className={`
                                rounded-2xl p-1.5 transition-all duration-300 ease-in-out group
                                ${isEnabled 
                                    ? `bg-gradient-to-br ${style.gradient} shadow-lg ${style.hoverShadow} hover:-translate-y-1` 
                                    : 'bg-slate-700/50'
                                }
                            `}
                        >
                            <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl h-full flex flex-col p-5">
                                {/* Top section with Toggle */}
                                <div className="flex justify-end items-start">
                                    <label className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={isEnabled}
                                                onChange={(e) => handleToggleUnitStatus(grade, unitNumber, e.target.checked)}
                                            />
                                            <div className="block w-14 h-8 rounded-full bg-slate-700"></div>
                                            <div className={`dot absolute left-1 top-1 w-6 h-6 rounded-full shadow-lg transition-transform ${isEnabled ? 'transform translate-x-6 bg-gradient-to-r from-cyan-300 to-blue-400' : 'bg-slate-500'}`}></div>
                                        </div>
                                    </label>
                                </div>

                                {/* Middle section with Title */}
                                <div className="flex-grow flex flex-col items-center justify-center">
                                    <span className="font-bold text-yellow-300 text-2xl [text-shadow:0_0_8px_theme(colors.yellow.300)]">UNIT</span>
                                    <span className={`text-8xl font-black bg-clip-text text-transparent bg-gradient-to-br ${isEnabled ? style.textColor : 'from-slate-400 to-slate-600'} mb-2 -mt-2`}>{unitNumber}</span>
                                    <span className={`font-semibold text-xs px-2 py-0.5 rounded-full self-center ${isEnabled ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>
                                        {isEnabled ? 'Đang Mở' : 'Đã Đóng'}
                                    </span>
                                </div>
                                
                                {/* Bottom section with Manage Button */}
                                <button
                                    onClick={isEnabled ? () => setViewingUnit({ grade, unit: unitNumber }) : undefined}
                                    disabled={!isEnabled}
                                    className={`
                                        w-full font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg flex items-center justify-center gap-2 mt-4
                                        ${isEnabled
                                            ? 'bg-red-600 text-white hover:bg-red-700 border border-red-800'
                                            : 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'
                                        }`}
                                >
                                    <span>Quản lý Nội dung</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isEnabled ? 'group-hover:translate-x-1' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
    
    const renderTopicList = () => (
        <div className="p-6 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 rounded-lg shadow-2xl border border-blue-700/50 tab-content-enter">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white">Ngân hàng câu hỏi theo TOPICs</h2>
                    <p className="text-slate-400 mt-2">Kích hoạt, quản lý nội dung và xem kết quả cho từng chủ đề.</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="bg-slate-700/50 text-white font-bold p-2 rounded-full hover:bg-slate-600/50 transition shadow-md border border-slate-600 disabled:bg-gray-500"
                    title="Làm mới dữ liệu" disabled={isRefreshing}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 003.5 12" /></svg>
                </button>
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
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={isEnabled} onChange={(e) => handleToggleTopicStatus(topicNumber, e.target.checked)} />
                                            <div className="block w-14 h-8 rounded-full bg-slate-700"></div>
                                            <div className={`dot absolute left-1 top-1 w-6 h-6 rounded-full shadow-lg transition-transform ${isEnabled ? 'transform translate-x-6 bg-gradient-to-r from-cyan-300 to-blue-400' : 'bg-slate-500'}`}></div>
                                        </div>
                                    </label>
                                </div>
                                <div className="flex-grow flex flex-col items-center justify-center">
                                    <span className="font-bold text-yellow-300 text-lg [text-shadow:0_0_8px_theme(colors.yellow.300)]">TOPIC</span>
                                    <span className={`text-6xl font-black bg-clip-text text-transparent bg-gradient-to-br ${isEnabled ? style.textColor : 'from-slate-400 to-slate-600'} mb-1 -mt-1`}>{topicNumber}</span>
                                    <span className={`font-semibold text-xs px-2 py-0.5 rounded-full self-center ${isEnabled ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>{isEnabled ? 'Mở' : 'Đóng'}</span>
                                </div>
                                <button onClick={isEnabled ? () => setViewingTopic(topicNumber) : undefined} disabled={!isEnabled} className={`w-full font-bold py-2 px-2 rounded-lg transition-all duration-300 ease-in-out shadow-lg flex items-center justify-center gap-1 mt-3 text-sm ${isEnabled ? 'bg-red-600 text-white hover:bg-red-700 border border-red-800' : 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'}`}>
                                    <span>Quản lý</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isEnabled ? 'group-hover:translate-x-1' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderContent = () => {
        if (viewingUnit) return renderUnitDetailView(viewingUnit.grade, viewingUnit.unit);
        if (viewingTopic) return renderTopicDetailView(viewingTopic);

        switch (activeTab) {
            case 'units_12':
                return renderUnitListView(12, unitsStatus12);
            case 'topics':
                return renderTopicList();
            case 'dashboard':
            default:
                return (
                    <div className="tab-content-enter bg-white p-6 rounded-xl shadow-lg">
                        {results.length === 0 && onlineStudents.length === 0 ? (
                            <div className="text-center bg-white p-8 rounded-lg shadow-inner border border-gray-200">
                                <p className="text-xl text-gray-700">Chưa có học sinh nào nộp bài hoặc tham gia.</p>
                                <p className="text-gray-500 mt-2">Hãy chia sẻ liên kết, tạo đề thi và mở phòng để bắt đầu.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white p-4 rounded-lg shadow-md text-center border-l-4 border-blue-500"><p className="text-sm font-bold text-gray-600">Đã nộp bài</p><p className="text-3xl font-extrabold text-blue-600">{summaryStats.totalStudents}</p></div>
                                    <div className="bg-white p-4 rounded-lg shadow-md text-center border-l-4 border-green-500"><p className="text-sm font-bold text-gray-600">Điểm TB</p><p className="text-3xl font-extrabold text-green-600">{summaryStats.avgScore}</p></div>
                                    <div className="bg-white p-4 rounded-lg shadow-md text-center border-l-4 border-orange-500"><p className="text-sm font-bold text-gray-600">Thời gian TB</p><p className="text-3xl font-extrabold text-orange-600">{formatTime(summaryStats.avgTime)}</p></div>
                                    <div className="bg-white p-4 rounded-lg shadow-md text-center border-l-4 border-teal-500"><p className="text-sm font-bold text-gray-600">Đang làm bài</p><p className="text-3xl font-extrabold text-teal-600">{onlineStudents.length}</p></div>
                                </div>
                                
                                <div className="mb-6 p-6 bg-sky-50 rounded-xl shadow-xl border-2 border-sky-200">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-shrink-0 bg-white p-2 rounded-full shadow">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-blue-800">Quản lý Đề thi Trắc nghiệm Chung</h3>
                                            <p className="text-gray-600 mt-1">
                                                Đây là khu vực để bạn quản lý đề thi chính cho cả lớp. Bạn có thể tạo đề mới, nhập từ văn bản, hoặc chỉnh sửa/xóa đề hiện tại.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t-2 border-blue-200 pt-4">
                                        <div>
                                            {quizQuestions.length > 0 ? (
                                                <p className="text-gray-700 bg-sky-100 px-3 py-1 rounded-full">
                                                    <span className="font-semibold">Đề thi hiện tại:</span> <span className="font-bold text-blue-600">{quizQuestions.length} câu hỏi</span>.
                                                </p>
                                            ) : (
                                                <p className="text-gray-700 font-semibold bg-sky-100 px-3 py-1 rounded-full">
                                                    Chưa có đề thi chung. Hãy tạo một đề mới!
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            <button 
                                                onClick={() => setIsAiQuizModalOpen(true)}
                                                className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition text-sm shadow-md flex items-center gap-2"
                                            >
                                                ✨ Tạo mới bằng A.I
                                            </button>
                                            <button 
                                                onClick={() => setIsTextQuizModalOpen(true)}
                                                className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition text-sm shadow-md flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                                </svg>
                                                Tạo từ văn bản
                                            </button>
                                            <button 
                                                onClick={() => setQuizForEditing(quizQuestions)}
                                                disabled={quizQuestions.length === 0}
                                                className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition text-sm shadow-md disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                                </svg>
                                                Chỉnh sửa
                                            </button>
                                            <button 
                                                onClick={handleDeleteQuizRequest}
                                                disabled={quizQuestions.length === 0 || isDeletingQuiz}
                                                className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition text-sm shadow-md disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                {isDeletingQuiz ? 'Đang xóa...' : 'Xóa đề'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {onlineStudents.length > 0 && (
                                        <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow-md border border-gray-200">
                                        <h3 className="text-lg font-bold text-slate-700 mb-3">Học sinh đang làm bài:</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {onlineStudents.map(student => {
                                                const playerKey = getPlayerKey(student.name, student.class);
                                                const cheatCount = cheatCounts[playerKey] || 0;
                                                const progress = studentProgress[playerKey];
                                                const correctCount = progress?.correct ?? 0;
                                                const incorrectCount = progress?.incorrect ?? 0;
                                                const isFlashing = flashingStudents.has(student.name);
                                                
                                                const baseClass = "flex items-center text-sm font-medium pl-3 pr-1 py-1 rounded-full transition-colors duration-300 border";
                                                let statusClass = " bg-teal-100 text-teal-800 border-teal-300"; // Default
                                                if (isFlashing) {
                                                    statusClass = " flashing-red text-white font-bold border-red-700";
                                                }

                                                return (
                                                    <div key={playerKey} className={`${baseClass}${statusClass}`}>
                                                        <span className="font-bold">{student.name} ({student.class})</span>
                                                        <span className="ml-2 flex items-center space-x-1.5 bg-white rounded-full px-2 py-0.5 border border-gray-300">
                                                            <span title="Correct" className="flex items-center text-green-600 font-bold">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                                <span className="w-5 text-center">{correctCount}</span>
                                                            </span>
                                                            <span title="Incorrect" className="flex items-center text-red-600 font-bold">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                    </svg>
                                                                <span className="w-5 text-center">{incorrectCount}</span>
                                                            </span>
                                                        </span>
                                                        {cheatCount > 0 && (
                                                            <span className="ml-2 font-extrabold bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center border-2 border-white">
                                                                {cheatCount}
                                                            </span>
                                                        )}
                                                        <button 
                                                            onClick={() => handleKickPlayer(student)} 
                                                            className="ml-2 w-5 h-5 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                            title={`Loại ${student.name}`}
                                                            disabled={isClearing || !!deletingStudent || !!kickingStudent}>
                                                            &times;
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
                                        <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
                                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800">
                                            {uniqueClasses.map(c => <option key={c} value={c}>{c === 'all' ? 'Tất cả các lớp' : c}</option>)}
                                        </select>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleRefresh}
                                                className="bg-green-600 text-white font-bold p-2 rounded-lg hover:bg-green-700 transition shadow-sm disabled:bg-gray-500"
                                                title="Tải lại dữ liệu"
                                                disabled={isRefreshing}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 12M20 20l-1.5-1.5A9 9 0 003.5 12" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={handleClearRequest} 
                                                className="bg-red-600 text-white font-bold p-2 rounded-lg hover:bg-red-700 transition shadow-sm disabled:bg-gray-500 disabled:cursor-wait" 
                                                title="Xoá tất cả kết quả"
                                                disabled={isClearing || !!deletingStudent}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isClearing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    </div>
                                    <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200">
                                    <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-800">
                                        <thead className="text-xs font-bold text-gray-700 uppercase bg-gray-100">
                                            <tr className="border-b-4 border-gray-300">
                                                <th scope="col" className="px-4 py-3 border-r-2 border-gray-300">STT</th>
                                                 {headers.map(({ key, label }) => (
                                                    <th key={key} scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-200/50 border-r-2 border-gray-300" onClick={() => requestSort(key)}>
                                                        {label} {getSortIndicator(key)}
                                                    </th>
                                                ))}
                                                <th scope="col" className="px-6 py-3 text-center">Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedResults.map((result, index) => {
                                                const playerKey = getPlayerKey(result.playerName, result.playerClass);
                                                const isOnline = onlineStudents.some(s => getPlayerKey(s.name, s.class) === playerKey);
                                                return (
                                                    <tr key={playerKey} className={`bg-white hover:bg-gray-50 ${rowBorderColors[index % rowBorderColors.length]}`}>
                                                    <td className="px-4 py-4 font-black text-blue-600 text-center border-x-2 border-gray-200">{index + 1}</td>
                                                    <td className={`px-6 py-4 font-bold ${getColorForName(result.playerName)} whitespace-nowrap border-r-2 border-gray-200`}>
                                                        <div className="flex items-center gap-2">
                                                            <span 
                                                                className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} 
                                                                title={isOnline ? 'Online' : 'Offline'}>
                                                            </span>
                                                            <span>{result.playerName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-purple-600 border-r-2 border-gray-200">{result.playerClass}</td>
                                                    <td className="px-6 py-4 font-extrabold text-red-600 text-lg border-r-2 border-gray-200">{result.score}</td>
                                                    <td className="px-6 py-4 font-bold text-center text-red-600 border-r-2 border-gray-200">{result.cheatAttempts || 0}</td>
                                                    <td className="px-6 py-4 font-bold text-green-600 border-r-2 border-gray-200">{result.correct}</td>
                                                    <td className="px-6 py-4 font-bold text-red-700 border-r-2 border-gray-200">{result.incorrect}</td>
                                                    <td className="px-6 py-4 font-bold text-orange-600 border-r-2 border-gray-200">{formatTime(result.timeTakenSeconds)}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-600 border-r-2 border-gray-200 whitespace-nowrap text-sm">
                                                        {result.timestamp ? new Date(result.timestamp).toLocaleString('vi-VN') : ''}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <button onClick={() => setSelectedResult(result)} className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200" title="Xem chi tiết">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.27 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteRequest(result)} 
                                                                className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 disabled:bg-gray-200 disabled:cursor-wait"
                                                                title={`Xóa kết quả của ${result.playerName}`}
                                                                disabled={!!deletingStudent || isClearing}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${deletingStudent === result.playerName ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                    </div>
                                    {sortedResults.length === 0 && <p className="text-center p-4 text-gray-600">Không tìm thấy kết quả phù hợp.</p>}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                );
        }
    };
    
    return (
        <div className="w-full bg-sky-100 min-h-screen">
            {notification && (
                <div className={`fixed top-5 right-5 shadow-lg rounded-lg p-4 text-center z-50 transition-transform transform ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <p className="font-bold">{notification.message}</p>
                </div>
            )}
            
            <header className="flex justify-between items-center p-4 bg-white shadow-md">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-wider">FOR TEACHERTUY</h1>
                    <div className="flex mt-1">
                        <div className="h-1 w-24 bg-red-500 rounded-full"></div>
                        <div className="h-1 w-12 bg-blue-500 ml-1 rounded-full"></div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => (window as any).aistudio?.openSelectKey()} 
                        className="bg-white text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-gray-50 transition shadow-sm flex items-center gap-2"
                        title="Thay đổi khóa API"
                    >
                        <span>🔑 Đổi API Key</span>
                    </button>
                    <button 
                        onClick={onGoHome} 
                        className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition shadow-md"
                    >
                        Logout
                    </button>
                </div>
            </header>
            
            <div className="p-6">
                <div className="bg-white rounded-lg shadow-md p-3 mb-6 flex items-center">
                    <span className="text-lg font-bold text-gray-700 mr-4">Trạng thái phòng:</span>
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={isGameEnabled} onChange={handleToggleGameStatus} />
                            <div className="block w-14 h-8 rounded-full bg-gray-200"></div>
                            <div className={`dot absolute left-1 top-1 w-6 h-6 rounded-full shadow-lg transition-transform ${isGameEnabled ? 'transform translate-x-6 bg-green-500' : 'bg-gray-400'}`}></div>
                        </div>
                        <span className={`ml-3 font-bold text-lg ${isGameEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                            {isGameEnabled ? 'MỞ' : 'ĐÓNG'}
                        </span>
                    </label>
                </div>
                
                <div className="mb-6 flex items-center flex-wrap gap-4">
                    <div className={activeTab === 'dashboard' ? 'p-1 bg-white rounded-xl shadow-md' : ''}>
                        <button
                            onClick={() => { setViewingUnit(null); setViewingTopic(null); setActiveTab('dashboard'); }}
                            className="px-6 py-3 text-base font-bold text-white rounded-lg transition-colors bg-green-500 hover:bg-green-600"
                        >
                            Bảng điều khiển
                        </button>
                    </div>
                    <div className={activeTab === 'units_12' ? 'p-1 bg-white rounded-xl shadow-md' : ''}>
                        <button
                            onClick={() => { setViewingUnit(null); setViewingTopic(null); setActiveTab('units_12'); }}
                            className="px-6 py-3 text-base font-bold text-white rounded-lg transition-colors bg-red-600 hover:bg-red-700"
                        >
                            Quản lý UNITs _ English 12
                        </button>
                    </div>
                    <div className={activeTab === 'topics' ? 'p-1 bg-white rounded-xl shadow-md' : ''}>
                        <button
                            onClick={() => { setViewingUnit(null); setViewingTopic(null); setActiveTab('topics'); }}
                            className="px-6 py-3 text-base font-bold text-white rounded-lg transition-colors bg-blue-600 hover:bg-blue-700"
                        >
                            Quản lý TOPICs
                        </button>
                    </div>
                </div>

                <div>
                    {renderContent()}
                </div>
            </div>

             {selectedResult && <ResultDetailModal result={selectedResult} onClose={() => setSelectedResult(null)} />}
             <TextToQuizModal 
                show={isTextQuizModalOpen} 
                onClose={() => setIsTextQuizModalOpen(false)} 
                onSubmit={handleGenerateFromText}
                isGenerating={isGeneratingFromText}
            />
             <AIQuizGeneratorModal
                show={isAiQuizModalOpen}
                onClose={() => setIsAiQuizModalOpen(false)}
                onSubmit={handleGenerateFromAiPrompt}
                isGenerating={isGeneratingNewQuiz}
            />
             {quizForEditing && (
                <EditQuizModal 
                    questions={quizForEditing} 
                    onClose={() => setQuizForEditing(null)} 
                    onSave={handleSaveEditedQuiz} 
                />
            )}
            {isEditVocabModalOpen && (
                <EditVocabularyModal
                    vocabulary={vocabForEditing}
                    onClose={() => setIsEditVocabModalOpen(false)}
                    onSave={handleSaveVocabulary}
                />
            )}
            <ConfirmationModal
                show={isDeleteQuizConfirmOpen}
                title="Xác nhận Xóa Đề thi"
                message={<>
                    <p>Bạn có chắc chắn muốn xóa vĩnh viễn đề thi chung hiện tại?</p>
                    <p className="font-bold text-red-600 mt-2">Hành động này không thể hoàn tác.</p>
                </>}
                onConfirm={handleConfirmDeleteQuiz}
                onCancel={() => setIsDeleteQuizConfirmOpen(false)}
                confirmText="Xóa đề thi"
                isConfirming={isDeletingQuiz}
            />
        </div>
    );
};

export default TeacherDashboard;
