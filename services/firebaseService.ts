
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
    const normalizedClass = (playerClass || '').trim().toUpperCase();
    const normalizedName = (playerName || '').trim().toUpperCase();
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
}

export interface ActivityStats {
    count: number;
    totalTimeSeconds: number;
    attemptsList: AttemptDetail[];
}

export interface ActivityAttemptCounts {
    vocabulary: ActivityStats;
    matching: ActivityStats;
    spelling: ActivityStats;
    quiz: ActivityStats;
}

export const calculateStudentCompletionPercent = (
    attemptsList: Array<{
        gameType?: string;
        timeTakenSeconds?: number;
        correct?: number;
        incorrect?: number;
        totalQuestions?: number;
    }>,
    unitVocabCount?: number,
    unitQuizCount?: number
): number => {
    if (!attemptsList || attemptsList.length === 0) return 0;

    let vTime = 0;
    let mMaxCorrect = 0;
    let sMaxDone = 0;
    let qMaxDone = 0;

    let maxVocabTotalQuestions = 0;
    let maxQuizTotalQuestions = 0;

    attemptsList.forEach(a => {
        const gType = a.gameType;
        const time = Math.max(0, parseInt(a.timeTakenSeconds as any, 10) || 0);
        const corr = typeof a.correct === 'number' ? a.correct : (parseInt(a.correct as any, 10) || 0);
        const incorr = typeof a.incorrect === 'number' ? a.incorrect : (parseInt(a.incorrect as any, 10) || 0);
        const totQ = typeof a.totalQuestions === 'number' ? a.totalQuestions : (parseInt(a.totalQuestions as any, 10) || 0);

        if (gType === 'vocabulary') {
            vTime += time;
            if (totQ > maxVocabTotalQuestions) maxVocabTotalQuestions = totQ;
        } else if (gType === 'matching') {
            if (corr > mMaxCorrect) mMaxCorrect = corr;
            if (totQ > maxVocabTotalQuestions) maxVocabTotalQuestions = totQ;
        } else if (gType === 'spelling') {
            const done = corr + incorr;
            if (done > sMaxDone) sMaxDone = done;
            if (totQ > maxVocabTotalQuestions) maxVocabTotalQuestions = totQ;
        } else if (gType === 'quiz') {
            const done = corr + incorr;
            if (done > qMaxDone) qMaxDone = done;
            if (totQ > maxQuizTotalQuestions) maxQuizTotalQuestions = totQ;
        }
    });

    const vocabCount = (unitVocabCount && unitVocabCount > 0)
        ? unitVocabCount
        : (maxVocabTotalQuestions > 0 ? maxVocabTotalQuestions : 10);

    const quizCount = (unitQuizCount && unitQuizCount > 0)
        ? unitQuizCount
        : (maxQuizTotalQuestions > 0 ? maxQuizTotalQuestions : 10);

    // Thẻ 1 - Từ vựng (Vocabulary): Standard time 12s per word
    const standardVocabTimeSeconds = vocabCount * 12;
    const rateCard1 = standardVocabTimeSeconds > 0 ? Math.min(1.0, vTime / standardVocabTimeSeconds) : 0;
    const pctCard1 = rateCard1 * 25;

    // Thẻ 2 - Ghép cặp (Matching): Number of correctly matched pairs out of vocabCount
    const rateCard2 = vocabCount > 0 ? Math.min(1.0, mMaxCorrect / vocabCount) : 0;
    const pctCard2 = rateCard2 * 25;

    // Thẻ 3 - Viết chính tả (Spelling): Number of questions typed/answered out of vocabCount
    const rateCard3 = vocabCount > 0 ? Math.min(1.0, sMaxDone / vocabCount) : 0;
    const pctCard3 = rateCard3 * 25;

    // Thẻ 4 - Trắc nghiệm (Quiz): Number of quiz questions answered out of quizCount
    const rateCard4 = quizCount > 0 ? Math.min(1.0, qMaxDone / quizCount) : 0;
    const pctCard4 = rateCard4 * 25;

    const rawOverallPercent = pctCard1 + pctCard2 + pctCard3 + pctCard4;
    let overallPercent = Math.min(100, Math.round(rawOverallPercent));

    if (rateCard1 >= 1.0 && rateCard2 >= 1.0 && rateCard3 >= 1.0 && rateCard4 >= 1.0) {
        overallPercent = 100;
    }

    return overallPercent;
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
                spelling: defaultStats(),
                quiz: defaultStats()
            };
            if (val && typeof val === 'object') {
                const grouped: Record<string, any[]> = {
                    vocabulary: [],
                    matching: [],
                    spelling: [],
                    quiz: []
                };
                Object.values(val).forEach((item: any) => {
                    if (item && item.gameType && grouped[item.gameType]) {
                        grouped[item.gameType].push(item);
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
                        timeTakenSeconds: Math.max(0, parseInt(item.timeTakenSeconds, 10) || 0),
                        timestamp: item.timestamp,
                        correct: typeof item.correct === 'number' ? item.correct : (item.correct !== undefined ? (parseInt(item.correct, 10) || 0) : 0),
                        incorrect: typeof item.incorrect === 'number' ? item.incorrect : (item.incorrect !== undefined ? (parseInt(item.incorrect, 10) || 0) : 0),
                        totalQuestions: typeof item.totalQuestions === 'number' ? item.totalQuestions : (item.totalQuestions !== undefined ? (parseInt(item.totalQuestions, 10) || 0) : 0),
                        audioListenedCount: typeof item.audioListenedCount === 'number' ? item.audioListenedCount : (item.audioListenedCount !== undefined ? (parseInt(item.audioListenedCount, 10) || 0) : 0),
                        uniqueWordsListenedCount: typeof item.uniqueWordsListenedCount === 'number' ? item.uniqueWordsListenedCount : (item.uniqueWordsListenedCount !== undefined ? (parseInt(item.uniqueWordsListenedCount, 10) || 0) : 0),
                        listenedWords: Array.isArray(item.listenedWords) ? item.listenedWords : [],
                        gameType: gt
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
                spelling: defaultStats(),
                quiz: defaultStats()
            });
        });
    } catch (e) {
        const defaultStats = (): ActivityStats => ({ count: 0, totalTimeSeconds: 0, attemptsList: [] });
        callback({
            vocabulary: defaultStats(),
            matching: defaultStats(),
            spelling: defaultStats(),
            quiz: defaultStats()
        });
        return () => {};
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
