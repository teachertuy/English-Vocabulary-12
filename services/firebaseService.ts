
// @ts-ignore
import { initializeApp, FirebaseApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
// @ts-ignore
import { getDatabase, ref, set, get, onValue, remove, Unsubscribe, Database, onDisconnect, runTransaction, update, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { GameResult, PlayerData, QuizQuestion, StudentProgress, UnitsState, VocabularyWord, WelcomeScreenConfig, DashboardConfig, ExerciseSelectionConfig, LoginRosterConfig } from "../types";
import { resolveVocabImages, setVocabImageToCache } from "./imageCacheService";

const firebaseConfig = {
    apiKey: "AIzaSyDL_Jg9VrJuV3sVyy_Gb5a4iLzy_QaTBGo",
    authDomain: "teachertuy-englishapp.firebaseapp.com",
    databaseURL: "https://teachertuy-englishapp-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "teachertuy-englishapp",
    storageBucket: "teachertuy-englishapp.firebasestorage.app",
    messagingSenderId: "563130893921",
    appId: "1:563130893921:web:07116ceb3bb562d403cc20",
    measurementId: "G-0VB38TF6RH"
};

let db: Database;
let firebaseInitialized = false;

try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getDatabase(app);
    firebaseInitialized = true;
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

const checkFirebase = (): Database => {
    if (!firebaseInitialized) throw new Error("Firebase not initialized");
    return db;
};

const getPlayerKey = (playerName: string, playerClass: string) => {
    const normalizedClass = (playerClass || '').trim().normalize('NFC').toUpperCase();
    const normalizedName = (playerName || '').trim().normalize('NFC').toUpperCase();
    const combined = `${normalizedClass}_${normalizedName}`;
    return combined.replace(/[.#$[\]]/g, '_');
};

export const submitResult = async (classroomId: string, result: GameResult): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(result.playerName, result.playerClass);
    await set(ref(db, `classrooms/${classroomId}/results/${playerKey}`), { ...result, timestamp: serverTimestamp() });
};

export const listenToResults = (classroomId: string, callback: (results: Record<string, GameResult> | null) => void): Unsubscribe => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/results`), (snapshot) => callback(snapshot.val()));
};

export const clearResults = async (classroomId: string): Promise<void> => {
    const db = checkFirebase();
    const updates: any = { results: null, online: null, cheatCounts: null, kicked: null, progress: null };
    await update(ref(db, `classrooms/${classroomId}`), updates);
};

export const deleteStudentResult = async (classroomId: string, playerName: string, playerClass: string): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    const updates: any = {};
    updates[`results/${playerKey}`] = null;
    updates[`online/${playerKey}`] = null;
    updates[`progress/${playerKey}`] = null;
    await update(ref(db, `classrooms/${classroomId}`), updates);
};

export const setGameStatus = async (classroomId: string, isEnabled: boolean): Promise<void> => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/settings/gameEnabled`), isEnabled);
};

export const getGameStatus = (classroomId: string, callback: (isEnabled: boolean) => void): Unsubscribe => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/settings/gameEnabled`), (snapshot) => {
        const val = snapshot.val();
        callback(val === null ? true : val);
    });
};

export const trackStudentPresence = (classroomId: string, playerName: string, playerClass: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    const onlineRef = ref(db, `classrooms/${classroomId}/online/${playerKey}`);
    set(onlineRef, { name: playerName, class: playerClass });
    onDisconnect(onlineRef).remove();
};

export const listenToOnlineStudents = (classroomId: string, callback: (students: any) => void): Unsubscribe => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/online`), (snapshot) => callback(snapshot.val()));
};

export const removeStudentPresence = async (classroomId: string, playerName: string, playerClass: string): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    await remove(ref(db, `classrooms/${classroomId}/online/${playerKey}`));
};

export const updateStudentProgress = async (classroomId: string, playerName: string, playerClass: string, correct: number, incorrect: number): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    await set(ref(db, `classrooms/${classroomId}/progress/${playerKey}`), { name: playerName, class: playerClass, correct, incorrect });
};

export const listenToStudentProgress = (classroomId: string, callback: (progress: any) => void): Unsubscribe => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/progress`), (snapshot) => callback(snapshot.val()));
};

export const incrementCheatCount = (classroomId: string, playerName: string, playerClass: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    runTransaction(ref(db, `classrooms/${classroomId}/cheatCounts/${playerKey}`), (curr) => (curr || 0) + 1);
};

export const listenToCheatCounts = (classroomId: string, callback: (counts: any) => void): Unsubscribe => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/cheatCounts`), (snapshot) => callback(snapshot.val()));
};

export const kickPlayer = async (classroomId: string, playerName: string, playerClass: string): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    const updates: any = {};
    updates[`kicked/${playerKey}`] = true;
    updates[`online/${playerKey}`] = null;
    await update(ref(db, `classrooms/${classroomId}`), updates);
};

export const listenForKickedStatus = (classroomId: string, playerName: string, playerClass: string, callback: () => void): Unsubscribe => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    return onValue(ref(db, `classrooms/${classroomId}/kicked/${playerKey}`), (snapshot) => {
        if (snapshot.val() === true) {
            callback();
            remove(ref(db, `classrooms/${classroomId}/kicked/${playerKey}`));
        }
    });
};

export const saveQuizQuestions = async (classroomId: string, questions: QuizQuestion[]): Promise<void> => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/currentQuiz`), questions);
};

export const listenToQuizQuestions = (classroomId: string, callback: (q: any) => void): Unsubscribe => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/currentQuiz`), (s) => callback(s.val()));
};

export const deleteCurrentQuiz = async (classroomId: string): Promise<void> => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/currentQuiz`), null);
};

export const getUnitQuizQuestionsByGrade = async (classroomId: string, grade: number, unitId: string) => {
    const db = checkFirebase();
    const s = await get(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/quiz`));
    return s.val();
};

export const saveUnitQuizQuestionsByGrade = async (classroomId: string, grade: number, unitId: string, questions: QuizQuestion[]) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/quiz`), questions);
};

export const listenToUnitQuizQuestionsByGrade = (classroomId: string, grade: number, unitId: string, callback: (q: any) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/quiz`), (s) => callback(s.val()));
};

export const getUnitVocabularyByGrade = async (classroomId: string, grade: number, unitId: string) => {
    const db = checkFirebase();
    const s = await get(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`));
    return resolveVocabImages(s.val());
};

export const saveUnitVocabularyByGrade = async (classroomId: string, grade: number, unitId: string, vocab: VocabularyWord[]) => {
    const db = checkFirebase();
    const resolvedVocab = resolveVocabImages(vocab);
    await set(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`), resolvedVocab);
};

export const listenToUnitVocabularyByGrade = (classroomId: string, grade: number, unitId: string, callback: (v: any) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`), (s) => callback(resolveVocabImages(s.val())));
};

export const listenToUnitResultsByGrade = (classroomId: string, grade: number, unitId: string, callback: (r: any) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results`), (s) => callback(s.val()));
};

export const clearUnitResultsByGrade = async (classroomId: string, grade: number, unitId: string) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results`), null);
};

export const clearAllUnitsResultsByGrade = async (classroomId: string, grade: number = 12) => {
    const db = checkFirebase();
    const updates: Record<string, null> = {};
    for (let i = 1; i <= 10; i++) {
        updates[`units_${grade}/unit_${i}/results`] = null;
    }
    updates[`results`] = null;
    updates[`progress`] = null;
    updates[`cheatCounts`] = null;
    await update(ref(db, `classrooms/${classroomId}`), updates);
};

export const deleteUnitStudentResultByGrade = async (classroomId: string, grade: number, unitId: string, name: string, className: string, activityId: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(name, className);
    await remove(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results/${playerKey}/${activityId}`));
};

export const deleteUnitOrTopicStudentResult = async (classroomId: string, grade: any, unitId: string, name: string, className: string, activityId: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(name, className);
    const basePath = grade === 'topics' ? `topics/${unitId}` : `units_${grade}/${unitId}`;
    await remove(ref(db, `classrooms/${classroomId}/${basePath}/results/${playerKey}/${activityId}`));
};

export const deleteUnitStudentAllResultsByGrade = async (classroomId: string, grade: number, unitId: string, name: string, className: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(name, className);
    await remove(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results/${playerKey}`));
};

export const setUnitStatusByGrade = async (classroomId: string, grade: number, unitId: string, isEnabled: boolean) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/enabled`), isEnabled);
    await set(ref(db, `classrooms/${classroomId}/units_status_${grade}/${unitId}/enabled`), isEnabled);
};

export const listenToUnitsStatusByGrade = (classroomId: string, grade: number, callback: (s: any) => void) => {
    const db = checkFirebase();
    const statusRef = ref(db, `classrooms/${classroomId}/units_status_${grade}`);
    
    return onValue(statusRef, (s) => {
        const val = s.val();
        if (val && Object.keys(val).length > 0) {
            callback(val);
        } else {
            // Fallback for legacy database paths: fetch full units node once to extract status & backfill
            const fullRef = ref(db, `classrooms/${classroomId}/units_${grade}`);
            onValue(fullRef, (fullSnapshot) => {
                const fullVal = fullSnapshot.val();
                if (fullVal) {
                    const statusMap: Record<string, { enabled: boolean }> = {};
                    Object.keys(fullVal).forEach((key) => {
                        if (fullVal[key] && typeof fullVal[key] === 'object') {
                            statusMap[key] = { enabled: !!fullVal[key].enabled };
                        }
                    });
                    callback(statusMap);
                    set(ref(db, `classrooms/${classroomId}/units_status_${grade}`), statusMap).catch(() => {});
                } else {
                    callback({});
                }
            }, { onlyOnce: true });
        }
    });
};

export const startUnitActivity = (classroomId: string, grade: any, unitId: string, player: PlayerData, gameType: string): string => {
    try {
        const db = checkFirebase();
        const playerKey = getPlayerKey(player.name, player.class);
        const basePath = grade === 'topics' ? `topics/${unitId}` : `units_${grade}/${unitId}`;
        const activityRef = push(ref(db, `classrooms/${classroomId}/${basePath}/results/${playerKey}`));
        const activityId = activityRef.key || `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        const initialResult = { 
            playerName: player.name, 
            playerClass: player.class, 
            score: '0', 
            correct: 0, 
            incorrect: 0, 
            answered: 0, 
            totalQuestions: 0, 
            timeTakenSeconds: 0, 
            details: [], 
            gameType, 
            status: 'in-progress', 
            attempts: 1, 
            timestamp: serverTimestamp() 
        };

        set(ref(db, `classrooms/${classroomId}/${basePath}/results/${playerKey}/${activityId}`), initialResult)
            .then(() => {
                return runTransaction(ref(db, `classrooms/${classroomId}/${basePath}/results/${playerKey}`), (curr: any) => {
                    if (curr && curr[activityId]) {
                        const attempts = Object.values(curr).filter((r: any) => r.gameType === gameType && r.status === 'completed').length;
                        curr[activityId].attempts = attempts + 1;
                    }
                    return curr;
                });
            })
            .catch(() => {});

        return activityId;
    } catch (e) {
        return `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
};

export const decodePushIdTimestamp = (id: string): number | null => {
    if (!id || typeof id !== 'string' || id.length < 8) return null;
    const PUSH_CHARS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
    let time = 0;
    for (let i = 0; i < 8; i++) {
        const idx = PUSH_CHARS.indexOf(id.charAt(i));
        if (idx === -1) return null;
        time = time * 64 + idx;
    }
    // Sanity check: valid Unix ms timestamp between 2024 and 2030
    if (time < 1700000000000 || time > 1900000000000) return null;
    return time;
};

export const resolveAttemptTimeSeconds = (item: any, actId?: string): number => {
    const recordedTime = parseInt(item?.timeTakenSeconds, 10);
    if (!isNaN(recordedTime) && recordedTime > 0) {
        return recordedTime;
    }

    const effectiveActId = actId || item?._actId || item?.activityId;

    // Check if we can derive from push ID start timestamp and session timestamp
    if (effectiveActId) {
        const startTime = decodePushIdTimestamp(effectiveActId);
        const endTime = typeof item?.timestamp === 'number' 
            ? item.timestamp 
            : (item?.timestamp?.seconds ? item.timestamp.seconds * 1000 : null);
        
        if (startTime && endTime && endTime >= startTime) {
            const calculatedSec = Math.round((endTime - startTime) / 1000);
            if (calculatedSec >= 5 && calculatedSec <= 7200) {
                return calculatedSec;
            }
        }
    }

    // Realistic fallback based on verified student learning activity
    const audioCount = typeof item?.audioListenedCount === 'number' ? item.audioListenedCount : (parseInt(item?.audioListenedCount, 10) || 0);
    const uniqueWordsCount = typeof item?.uniqueWordsListenedCount === 'number'
        ? item.uniqueWordsListenedCount
        : (Array.isArray(item?.listenedWords) ? item.listenedWords.length : 0);
    const answeredCount = typeof item?.answered === 'number' ? item.answered : (parseInt(item?.answered, 10) || 0);
    const corrCount = typeof item?.correct === 'number' ? item.correct : (parseInt(item?.correct, 10) || 0);
    const incorrCount = typeof item?.incorrect === 'number' ? item.incorrect : (parseInt(item?.incorrect, 10) || 0);
    const totalDone = Math.max(answeredCount, corrCount + incorrCount);

    if (item?.gameType === 'vocabulary') {
        if (audioCount > 0 || uniqueWordsCount > 0) {
            return Math.max(10, audioCount * 3, uniqueWordsCount * 6);
        }
    } else {
        if (totalDone > 0) {
            return Math.max(10, totalDone * 5);
        }
    }

    return Math.max(0, recordedTime || 0);
};

export const isRealStudentAttempt = (item: any): boolean => {
    if (!item) return false;
    const recordedTime = parseInt(item.timeTakenSeconds, 10) || 0;
    const audioCount = parseInt(item.audioListenedCount, 10) || 0;
    const uniqueCount = parseInt(item.uniqueWordsListenedCount, 10) || (Array.isArray(item.listenedWords) ? item.listenedWords.length : 0);
    const answered = parseInt(item.answered, 10) || 0;
    const correct = parseInt(item.correct, 10) || 0;
    const incorrect = parseInt(item.incorrect, 10) || 0;
    const hasDetails = Array.isArray(item.details) && item.details.length > 0;
    const isCompleted = item.status === 'completed' || item.score === 'ĐÃ HỌC';

    if (audioCount > 0 || uniqueCount > 0 || answered > 0 || correct > 0 || incorrect > 0 || hasDetails || recordedTime >= 5) {
        return true;
    }
    if (isCompleted && (recordedTime > 0 || answered > 0)) {
        return true;
    }
    return false;
};

export interface AttemptDetail {
    timeTakenSeconds: number;
    timestamp?: any;
    correct?: number;
    incorrect?: number;
    totalQuestions?: number;
    score?: number | string;
    gameType?: string;
    audioListenedCount?: number;
    uniqueWordsListenedCount?: number;
    listenedWords?: string[];
    _actId?: string;
    activityId?: string;
}

export interface ActivityStats {
    count: number;
    totalTimeSeconds: number;
    attemptsList: AttemptDetail[];
}

export interface ActivityAttemptCounts {
    vocabulary: ActivityStats;
    matching: ActivityStats;
    listenChoose: ActivityStats;
    spelling: ActivityStats;
    quiz: ActivityStats;
}

export interface DetailedCompletionResult {
    overallPercent: number;           // Rounded 0-100%
    is100PercentEligible: boolean;   // True ONLY if all 4 teacher conditions pass
    totalValidTimeSeconds: number;   // Total valid active learning time
    contentScore: number;            // Component C (0-100%)
    timeScore: number;               // Component T (0-100%)
    card1Coverage: number;           // Card 1 Coverage (0-100%)
    card2Coverage: number;           // Card 2 Coverage (0-100%)
    card3Coverage: number;           // Card 3 Coverage (0-100%)
    card4Coverage: number;           // Card 4 Coverage (0-100%)
    card5Coverage: number;           // Card 5 Coverage (0-100%)
    card2Accuracy: number;           // Card 2 Accuracy Rate (0-100%)
    card3Accuracy: number;           // Card 3 Accuracy Rate (0-100%)
    card4Accuracy: number;           // Card 4 Accuracy Rate (0-100%)
    card5Accuracy: number;           // Card 5 Accuracy Rate (0-100%)
    card2Correct: number;
    card2Answered: number;
    card3Correct: number;
    card3Answered: number;
    card4Correct: number;
    card4Answered: number;
    card5Correct: number;
    card5Answered: number;
}

export const calculateStudentCompletionDetails = (
    attemptsList: Array<{
        gameType?: string;
        timeTakenSeconds?: number;
        correct?: number;
        incorrect?: number;
        answered?: number;
        totalQuestions?: number;
        audioListenedCount?: number;
        uniqueWordsListenedCount?: number;
        listenedWords?: string[];
        details?: Array<any>;
        score?: number | string;
        status?: string;
        _actId?: string;
        activityId?: string;
    }>,
    unitVocabCount?: number,
    unitQuizCount?: number
): DetailedCompletionResult => {
    const defaultResult: DetailedCompletionResult = {
        overallPercent: 0,
        is100PercentEligible: false,
        totalValidTimeSeconds: 0,
        contentScore: 0,
        timeScore: 0,
        card1Coverage: 0,
        card2Coverage: 0,
        card3Coverage: 0,
        card4Coverage: 0,
        card5Coverage: 0,
        card2Accuracy: 0,
        card3Accuracy: 0,
        card4Accuracy: 0,
        card5Accuracy: 0,
        card2Correct: 0,
        card2Answered: 0,
        card3Correct: 0,
        card3Answered: 0,
        card4Correct: 0,
        card4Answered: 0,
        card5Correct: 0,
        card5Answered: 0,
    };

    if (!attemptsList || !Array.isArray(attemptsList) || attemptsList.length === 0) {
        return defaultResult;
    }

    // Filter out ghost attempts (0 time, 0 audio, 0 answers, 0 questions)
    const validAttempts = attemptsList.filter(a => a && isRealStudentAttempt(a));
    if (validAttempts.length === 0) {
        return defaultResult;
    }

    // 1. Calculate Total Valid Learning Time (Condition 1 & Component T)
    let totalValidTimeSeconds = 0;
    validAttempts.forEach(a => {
        totalValidTimeSeconds += resolveAttemptTimeSeconds(a, a._actId || a.activityId);
    });

    // Tracking unique items & stats for each card
    let maxVocabTotQ = 0;
    let maxQuizTotQ = 0;

    // Card 1 (Vocabulary)
    const card1WordsSet = new Set<string>();
    let card1MaxUnique = 0;

    // Card 2 (Matching)
    const card2ItemsSet = new Set<string>();
    let card2MaxAnsweredSingle = 0;
    let card2SumAnswered = 0;
    let card2SumCorrect = 0;

    // Card 3 (Listen & Choose)
    const card3ItemsSet = new Set<string>();
    let card3MaxAnsweredSingle = 0;
    let card3SumAnswered = 0;
    let card3SumCorrect = 0;

    // Card 4 (Spelling)
    const card4ItemsSet = new Set<string>();
    let card4MaxAnsweredSingle = 0;
    let card4SumAnswered = 0;
    let card4SumCorrect = 0;

    // Card 5 (Quiz)
    const card5ItemsSet = new Set<string>();
    let card5MaxAnsweredSingle = 0;
    let card5SumAnswered = 0;
    let card5SumCorrect = 0;

    validAttempts.forEach(a => {
        const gType = (a.gameType === 'listen-choose' || a.gameType === 'listenChoose') ? 'listenChoose' : a.gameType;
        const corr = typeof a.correct === 'number' ? a.correct : (parseInt(a.correct as any, 10) || 0);
        const incorr = typeof a.incorrect === 'number' ? a.incorrect : (parseInt(a.incorrect as any, 10) || 0);
        const ans = typeof a.answered === 'number' ? a.answered : (corr + incorr);
        const totQ = typeof a.totalQuestions === 'number' ? a.totalQuestions : (parseInt(a.totalQuestions as any, 10) || 0);

        if (gType === 'vocabulary') {
            if (totQ > maxVocabTotQ) maxVocabTotQ = totQ;
            const uniqueCount = typeof a.uniqueWordsListenedCount === 'number'
                ? a.uniqueWordsListenedCount
                : (Array.isArray(a.listenedWords) ? a.listenedWords.length : 0);
            if (uniqueCount > card1MaxUnique) card1MaxUnique = uniqueCount;
            if (Array.isArray(a.listenedWords)) {
                a.listenedWords.forEach(w => { if (w) card1WordsSet.add(w); });
            }
        } else if (gType === 'matching') {
            if (totQ > maxVocabTotQ) maxVocabTotQ = totQ;
            if (ans > card2MaxAnsweredSingle) card2MaxAnsweredSingle = ans;
            card2SumAnswered += ans;
            card2SumCorrect += corr;
            if (Array.isArray(a.details)) {
                a.details.forEach(d => {
                    const key = d.correctAnswer || d.question || d.translation;
                    if (key) card2ItemsSet.add(key);
                });
            }
        } else if (gType === 'listenChoose') {
            if (totQ > maxVocabTotQ) maxVocabTotQ = totQ;
            if (ans > card3MaxAnsweredSingle) card3MaxAnsweredSingle = ans;
            card3SumAnswered += ans;
            card3SumCorrect += corr;
            if (Array.isArray(a.details)) {
                a.details.forEach(d => {
                    const key = d.correctAnswer || d.question;
                    if (key) card3ItemsSet.add(key);
                });
            }
        } else if (gType === 'spelling') {
            if (totQ > maxVocabTotQ) maxVocabTotQ = totQ;
            if (ans > card4MaxAnsweredSingle) card4MaxAnsweredSingle = ans;
            card4SumAnswered += ans;
            card4SumCorrect += corr;
            if (Array.isArray(a.details)) {
                a.details.forEach(d => {
                    const key = d.correctAnswer || d.question;
                    if (key) card4ItemsSet.add(key);
                });
            }
        } else if (gType === 'quiz') {
            if (totQ > maxQuizTotQ) maxQuizTotQ = totQ;
            if (ans > card5MaxAnsweredSingle) card5MaxAnsweredSingle = ans;
            card5SumAnswered += ans;
            card5SumCorrect += corr;
            if (Array.isArray(a.details)) {
                a.details.forEach(d => {
                    const key = d.question || d.correctAnswer;
                    if (key) card5ItemsSet.add(key);
                });
            }
        }
    });

    // Catalog item totals (denom for coverage)
    const totalVocab = (unitVocabCount && unitVocabCount > 0)
        ? unitVocabCount
        : (maxVocabTotQ > 0 ? maxVocabTotQ : 10);

    const totalQuiz = (unitQuizCount && unitQuizCount > 0)
        ? unitQuizCount
        : (maxQuizTotQ > 0 ? maxQuizTotQ : 10);

    // Card 1 Coverage
    const effectiveCard1Unique = Math.max(card1WordsSet.size, card1MaxUnique);
    const card1Coverage = totalVocab > 0 ? Math.min(100, (effectiveCard1Unique / totalVocab) * 100) : 0;

    // Card 2 Coverage & Accuracy
    const card2UniqueCount = Math.min(totalVocab, Math.max(card2ItemsSet.size, card2MaxAnsweredSingle, Math.min(totalVocab, card2SumAnswered)));
    const card2Coverage = totalVocab > 0 ? Math.min(100, (card2UniqueCount / totalVocab) * 100) : 0;
    const card2Accuracy = card2SumAnswered > 0 ? Math.min(100, (card2SumCorrect / card2SumAnswered) * 100) : 0;

    // Card 3 Coverage & Accuracy
    const card3UniqueCount = Math.min(totalVocab, Math.max(card3ItemsSet.size, card3MaxAnsweredSingle, Math.min(totalVocab, card3SumAnswered)));
    const card3Coverage = totalVocab > 0 ? Math.min(100, (card3UniqueCount / totalVocab) * 100) : 0;
    const card3Accuracy = card3SumAnswered > 0 ? Math.min(100, (card3SumCorrect / card3SumAnswered) * 100) : 0;

    // Card 4 Coverage & Accuracy
    const card4UniqueCount = Math.min(totalVocab, Math.max(card4ItemsSet.size, card4MaxAnsweredSingle, Math.min(totalVocab, card4SumAnswered)));
    const card4Coverage = totalVocab > 0 ? Math.min(100, (card4UniqueCount / totalVocab) * 100) : 0;
    const card4Accuracy = card4SumAnswered > 0 ? Math.min(100, (card4SumCorrect / card4SumAnswered) * 100) : 0;

    // Card 5 Coverage & Accuracy
    const card5UniqueCount = Math.min(totalQuiz, Math.max(card5ItemsSet.size, card5MaxAnsweredSingle, Math.min(totalQuiz, card5SumAnswered)));
    const card5Coverage = totalQuiz > 0 ? Math.min(100, (card5UniqueCount / totalQuiz) * 100) : 0;
    const card5Accuracy = card5SumAnswered > 0 ? Math.min(100, (card5SumCorrect / card5SumAnswered) * 100) : 0;

    // Evaluate 4 Mandatory Teacher Conditions for 100%
    // Condition 1: Time >= 150 minutes (9000 seconds)
    const cond1_time = totalValidTimeSeconds >= 9000;

    // Condition 2: 100% Content Coverage across ALL 5 Cards
    const cond2_coverage = card1Coverage >= 99.99 &&
                            card2Coverage >= 99.99 &&
                            card3Coverage >= 99.99 &&
                            card4Coverage >= 99.99 &&
                            card5Coverage >= 99.99;

    // Condition 3: Accuracy strictly > 50% for Cards 2 to 5
    const cond3_accuracy = (card2SumAnswered > 0 && card2Accuracy > 50) &&
                            (card3SumAnswered > 0 && card3Accuracy > 50) &&
                            (card4SumAnswered > 0 && card4Accuracy > 50) &&
                            (card5SumAnswered > 0 && card5Accuracy > 50);

    const is100PercentEligible = cond1_time && cond2_coverage && cond3_accuracy;

    // Calculate Progress Score Components
    // Component C (0-100%): Average content coverage across 5 cards
    const contentScore = (card1Coverage + card2Coverage + card3Coverage + card4Coverage + card5Coverage) / 5;

    // Component T (0-100%): Time score = min(100, totalValidTimeSeconds / 9000 * 100)
    const timeScore = Math.min(100, (totalValidTimeSeconds / 9000) * 100);

    // Composite P = 0.7 * C + 0.3 * T
    const rawP = 0.7 * contentScore + 0.3 * timeScore;
    const roundedP = Math.round(rawP);

    let overallPercent = 0;
    if (is100PercentEligible) {
        overallPercent = 100;
    } else {
        // Must cap at 99% if mandatory conditions are not met
        overallPercent = Math.min(99, roundedP);
    }

    return {
        overallPercent,
        is100PercentEligible,
        totalValidTimeSeconds,
        contentScore,
        timeScore,
        card1Coverage,
        card2Coverage,
        card3Coverage,
        card4Coverage,
        card5Coverage,
        card2Accuracy,
        card3Accuracy,
        card4Accuracy,
        card5Accuracy,
        card2Correct: card2SumCorrect,
        card2Answered: card2SumAnswered,
        card3Correct: card3SumCorrect,
        card3Answered: card3SumAnswered,
        card4Correct: card4SumCorrect,
        card4Answered: card4SumAnswered,
        card5Correct: card5SumCorrect,
        card5Answered: card5SumAnswered,
    };
};

export const calculateStudentCompletionPercent = (
    attemptsList: Array<any>,
    unitVocabCount?: number,
    unitQuizCount?: number
): number => {
    return calculateStudentCompletionDetails(attemptsList, unitVocabCount, unitQuizCount).overallPercent;
};

export const listenToStudentActivityAttempts = (
    classroomId: string,
    grade: any,
    unitId: string,
    playerName: string,
    playerClass: string,
    callback: (counts: ActivityAttemptCounts) => void
) => {
    try {
        const db = checkFirebase();
        const playerKey = getPlayerKey(playerName, playerClass);
        const basePath = grade === 'topics' ? `topics/${unitId}` : `units_${grade}/${unitId}`;
        const resultsRef = ref(db, `classrooms/${classroomId}/${basePath}/results/${playerKey}`);
        
        return onValue(resultsRef, (snapshot) => {
            const val = snapshot.val();
            const defaultStats = (): ActivityStats => ({ count: 0, totalTimeSeconds: 0, attemptsList: [] });
            const counts: ActivityAttemptCounts = {
                vocabulary: defaultStats(),
                matching: defaultStats(),
                listenChoose: defaultStats(),
                spelling: defaultStats(),
                quiz: defaultStats()
            };
            if (val && typeof val === 'object') {
                const grouped: Record<string, any[]> = {
                    vocabulary: [],
                    matching: [],
                    listenChoose: [],
                    spelling: [],
                    quiz: []
                };
                Object.entries(val).forEach(([key, item]: [string, any]) => {
                    if (item && item.gameType) {
                        const gt = (item.gameType === 'listen-choose' || item.gameType === 'listenChoose') ? 'listenChoose' : item.gameType;
                        if (grouped[gt] && isRealStudentAttempt(item)) {
                            grouped[gt].push({ ...item, _actId: key });
                        }
                    }
                });

                (Object.keys(grouped) as Array<keyof ActivityAttemptCounts>).forEach((gt) => {
                    const items = grouped[gt];
                    items.sort((a, b) => {
                        const getTs = (x: any) => {
                            if (typeof x.timestamp === 'number') return x.timestamp;
                            if (x.timestamp && typeof x.timestamp === 'object' && typeof x.timestamp.seconds === 'number') {
                                return x.timestamp.seconds * 1000;
                            }
                            return 0;
                        };
                        return getTs(a) - getTs(b);
                    });

                    const attemptsList: AttemptDetail[] = items.map((item) => ({
                        timeTakenSeconds: resolveAttemptTimeSeconds(item, item._actId),
                        timestamp: item.timestamp,
                        correct: typeof item.correct === 'number' ? item.correct : (item.correct !== undefined ? (parseInt(item.correct, 10) || 0) : 0),
                        incorrect: typeof item.incorrect === 'number' ? item.incorrect : (item.incorrect !== undefined ? (parseInt(item.incorrect, 10) || 0) : 0),
                        totalQuestions: typeof item.totalQuestions === 'number' ? item.totalQuestions : (item.totalQuestions !== undefined ? (parseInt(item.totalQuestions, 10) || 0) : 0),
                        audioListenedCount: typeof item.audioListenedCount === 'number' ? item.audioListenedCount : (item.audioListenedCount !== undefined ? (parseInt(item.audioListenedCount, 10) || 0) : 0),
                        uniqueWordsListenedCount: typeof item.uniqueWordsListenedCount === 'number' ? item.uniqueWordsListenedCount : (item.uniqueWordsListenedCount !== undefined ? (parseInt(item.uniqueWordsListenedCount, 10) || 0) : 0),
                        listenedWords: Array.isArray(item.listenedWords) ? item.listenedWords : [],
                        gameType: gt,
                        _actId: item._actId,
                        activityId: item._actId
                    }));

                    const totalTimeSeconds = attemptsList.reduce((acc, curr) => acc + curr.timeTakenSeconds, 0);

                    counts[gt] = {
                        count: items.length,
                        totalTimeSeconds,
                        attemptsList
                    };
                });
            }
            callback(counts);
        }, (error) => {
            console.error("Failed to listen to student activity attempts:", error);
            const defaultStats = (): ActivityStats => ({ count: 0, totalTimeSeconds: 0, attemptsList: [] });
            callback({
                vocabulary: defaultStats(),
                matching: defaultStats(),
                listenChoose: defaultStats(),
                spelling: defaultStats(),
                quiz: defaultStats()
            });
        });
    } catch (e) {
        const defaultStats = (): ActivityStats => ({ count: 0, totalTimeSeconds: 0, attemptsList: [] });
        callback({
            vocabulary: defaultStats(),
            matching: defaultStats(),
            listenChoose: defaultStats(),
            spelling: defaultStats(),
            quiz: defaultStats()
        });
    }
};

export const updateUnitActivityProgress = async (classroomId: string, grade: any, unitId: string, player: PlayerData, activityId: string, result: any) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(player.name, player.class);
    const basePath = grade === 'topics' ? `topics/${unitId}` : `units_${grade}/${unitId}`;
    await update(ref(db, `classrooms/${classroomId}/${basePath}/results/${playerKey}/${activityId}`), { ...result, timestamp: serverTimestamp() });
};

export const updateUnitActivityResult = async (classroomId: string, grade: any, unitId: string, player: PlayerData, activityId: string, result: any) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(player.name, player.class);
    const basePath = grade === 'topics' ? `topics/${unitId}` : `units_${grade}/${unitId}`;
    await update(ref(db, `classrooms/${classroomId}/${basePath}/results/${playerKey}/${activityId}`), { ...result, status: 'completed', timestamp: serverTimestamp() });
};

export const getTopicQuizQuestions = async (classroomId: string, topicId: string) => {
    const db = checkFirebase();
    const s = await get(ref(db, `classrooms/${classroomId}/topics/${topicId}/quiz`));
    return s.val();
};

export const saveTopicQuizQuestions = async (classroomId: string, topicId: string, questions: QuizQuestion[]) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/topics/${topicId}/quiz`), questions);
};

export const listenToTopicQuizQuestions = (classroomId: string, topicId: string, callback: (q: any) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/topics/${topicId}/quiz`), (s) => callback(s.val()));
};

export const getTopicVocabulary = async (classroomId: string, topicId: string) => {
    const db = checkFirebase();
    const s = await get(ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`));
    return resolveVocabImages(s.val());
};

export const saveTopicVocabulary = async (classroomId: string, topicId: string, vocab: VocabularyWord[]) => {
    const db = checkFirebase();
    const resolvedVocab = resolveVocabImages(vocab);
    await set(ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`), resolvedVocab);
};

export const listenToTopicVocabulary = (classroomId: string, topicId: string, callback: (v: any) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`), (s) => callback(resolveVocabImages(s.val())));
};

export const listenToTopicResults = (classroomId: string, topicId: string, callback: (r: any) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/topics/${topicId}/results`), (s) => callback(s.val()));
};

export const clearTopicResults = async (classroomId: string, topicId: string) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/topics/${topicId}/results`), null);
};

export const deleteTopicStudentResult = async (classroomId: string, topicId: string, name: string, className: string, activityId: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(name, className);
    await remove(ref(db, `classrooms/${classroomId}/topics/${topicId}/results/${playerKey}/${activityId}`));
};

export const deleteTopicStudentAllResults = async (classroomId: string, topicId: string, name: string, className: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(name, className);
    await remove(ref(db, `classrooms/${classroomId}/topics/${topicId}/results/${playerKey}`));
};

export const setTopicStatus = async (classroomId: string, topicId: string, isEnabled: boolean) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/topics/${topicId}/enabled`), isEnabled);
    await set(ref(db, `classrooms/${classroomId}/topics_status/${topicId}/enabled`), isEnabled);
};

export const listenToTopicsStatus = (classroomId: string, callback: (s: any) => void) => {
    const db = checkFirebase();
    const statusRef = ref(db, `classrooms/${classroomId}/topics_status`);
    
    return onValue(statusRef, (s) => {
        const val = s.val();
        if (val && Object.keys(val).length > 0) {
            callback(val);
        } else {
            // Fallback for legacy database paths: fetch full topics node once to extract status & backfill
            const fullRef = ref(db, `classrooms/${classroomId}/topics`);
            onValue(fullRef, (fullSnapshot) => {
                const fullVal = fullSnapshot.val();
                if (fullVal) {
                    const statusMap: Record<string, { enabled: boolean }> = {};
                    Object.keys(fullVal).forEach((key) => {
                        if (fullVal[key] && typeof fullVal[key] === 'object') {
                            statusMap[key] = { enabled: !!fullVal[key].enabled };
                        }
                    });
                    callback(statusMap);
                    set(ref(db, `classrooms/${classroomId}/topics_status`), statusMap).catch(() => {});
                } else {
                    callback({});
                }
            }, { onlyOnce: true });
        }
    });
};

export const updateVocabularyAudio = async (classroomId: string, grade: any, unitId: string, word: string, base64Audio: string) => {
    const db = checkFirebase();
    const basePath = grade === 'topics' ? `topics/${unitId}/vocabulary` : `units_${grade}/${unitId}/vocabulary`;
    const snapshot = await get(ref(db, `classrooms/${classroomId}/${basePath}`));
    const vocabList = snapshot.val() as VocabularyWord[];
    if (vocabList) {
        const index = vocabList.findIndex(v => v.word.toLowerCase() === word.toLowerCase());
        if (index !== -1) await set(ref(db, `classrooms/${classroomId}/${basePath}/${index}/audio`), base64Audio);
    }
};

export const updateVocabularyImage = async (classroomId: string, grade: any, unitId: string, word: string, imageUrl: string) => {
    setVocabImageToCache(word, imageUrl);
    const db = checkFirebase();
    const basePath = grade === 'topics' ? `topics/${unitId}/vocabulary` : `units_${grade}/${unitId}/vocabulary`;
    const snapshot = await get(ref(db, `classrooms/${classroomId}/${basePath}`));
    const vocabList = snapshot.val() as VocabularyWord[];
    if (vocabList) {
        const index = vocabList.findIndex(v => v.word.toLowerCase() === word.toLowerCase());
        if (index !== -1) await set(ref(db, `classrooms/${classroomId}/${basePath}/${index}/image`), imageUrl);
    }
};

export const checkAndSyncQuizVersion = async (classroomId: string, codeVersion: string) => {
    const db = checkFirebase();
    const versionRef = ref(db, `classrooms/${classroomId}/quizVersion`);
    const snapshot = await get(versionRef);
    if (snapshot.val() !== codeVersion) {
        await clearResults(classroomId);
        await set(versionRef, codeVersion);
    }
};

export const saveWelcomeConfig = async (classroomId: string, config: WelcomeScreenConfig): Promise<void> => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/welcomeConfig`), config);
};

export const listenToWelcomeConfig = (classroomId: string, callback: (config: WelcomeScreenConfig | null) => void): Unsubscribe => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/welcomeConfig`), (snapshot) => callback(snapshot.val()));
};

export const saveDashboardConfig = async (classroomId: string, config: DashboardConfig): Promise<void> => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/dashboardConfig`), config);
};

export const listenToDashboardConfig = (classroomId: string, callback: (config: DashboardConfig | null) => void): Unsubscribe => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/dashboardConfig`), (snapshot) => callback(snapshot.val()));
};

export const saveExerciseSelectionConfig = async (classroomId: string, config: ExerciseSelectionConfig): Promise<void> => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/exerciseSelectionConfig`), config);
};

export const listenToExerciseSelectionConfig = (classroomId: string, callback: (config: ExerciseSelectionConfig | null) => void): Unsubscribe => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/exerciseSelectionConfig`), (snapshot) => callback(snapshot.val()));
};

export const saveLoginRosterConfig = async (classroomId: string, config: LoginRosterConfig): Promise<void> => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/loginRosterConfig`), config);
};

export const listenToLoginRosterConfig = (classroomId: string, callback: (config: LoginRosterConfig | null) => void): Unsubscribe => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/loginRosterConfig`), (snapshot) => callback(snapshot.val()));
};
