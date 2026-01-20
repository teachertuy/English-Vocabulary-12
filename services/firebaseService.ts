
import { initializeApp, FirebaseApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, onValue, remove, Unsubscribe, Database, onDisconnect, runTransaction, update, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { GameResult, PlayerData, QuizQuestion, StudentProgress, UnitsState, VocabularyWord, WelcomeScreenConfig, DashboardConfig, ExerciseSelectionConfig } from "../types";

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
    await set(ref(db, `classrooms/${classroomId}/results/${playerKey}`), result);
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
    return s.val();
};

export const saveUnitVocabularyByGrade = async (classroomId: string, grade: number, unitId: string, vocab: VocabularyWord[]) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`), vocab);
};

export const listenToUnitVocabularyByGrade = (classroomId: string, grade: number, unitId: string, callback: (v: any) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`), (s) => callback(s.val()));
};

export const listenToUnitResultsByGrade = (classroomId: string, grade: number, unitId: string, callback: (r: any) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results`), (s) => callback(s.val()));
};

export const clearUnitResultsByGrade = async (classroomId: string, grade: number, unitId: string) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results`), null);
};

export const deleteUnitStudentResultByGrade = async (classroomId: string, grade: number, unitId: string, name: string, className: string, activityId: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(name, className);
    await remove(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results/${playerKey}/${activityId}`));
};

export const setUnitStatusByGrade = async (classroomId: string, grade: number, unitId: string, isEnabled: boolean) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/enabled`), isEnabled);
};

export const listenToUnitsStatusByGrade = (classroomId: string, grade: number, callback: (s: any) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/units_${grade}`), (s) => callback(s.val()));
};

export const startUnitActivity = async (classroomId: string, grade: any, unitId: string, player: PlayerData, gameType: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(player.name, player.class);
    const basePath = grade === 'topics' ? `topics/${unitId}` : `units_${grade}/${unitId}`;
    const activityRef = push(ref(db, `classrooms/${classroomId}/${basePath}/results/${playerKey}`));
    const activityId = activityRef.key!;
    
    await runTransaction(ref(db, `classrooms/${classroomId}/${basePath}/results/${playerKey}`), (curr: any) => {
        const attempts = curr ? Object.values(curr).filter((r: any) => r.gameType === gameType).length : 0;
        const newResult = { playerName: player.name, playerClass: player.class, score: '0', correct: 0, incorrect: 0, answered: 0, totalQuestions: 0, timeTakenSeconds: 0, details: [], gameType, status: 'in-progress', attempts: attempts + 1 };
        const updates = { ...curr };
        updates[activityId] = newResult;
        return updates;
    });
    return activityId;
};

export const updateUnitActivityProgress = async (classroomId: string, grade: any, unitId: string, player: PlayerData, activityId: string, result: any) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(player.name, player.class);
    const basePath = grade === 'topics' ? `topics/${unitId}` : `units_${grade}/${unitId}`;
    await update(ref(db, `classrooms/${classroomId}/${basePath}/results/${playerKey}/${activityId}`), result);
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
    return s.val();
};

export const saveTopicVocabulary = async (classroomId: string, topicId: string, vocab: VocabularyWord[]) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`), vocab);
};

export const listenToTopicVocabulary = (classroomId: string, topicId: string, callback: (v: any) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`), (s) => callback(s.val()));
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

export const setTopicStatus = async (classroomId: string, topicId: string, isEnabled: boolean) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/topics/${topicId}/enabled`), isEnabled);
};

export const listenToTopicsStatus = (classroomId: string, callback: (s: any) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/topics`), (s) => callback(s.val()));
};

export const updateVocabularyAudio = async (classroomId: string, grade: any, unitId: string, word: string, base64Audio: string) => {
    const db = checkFirebase();
    const basePath = grade === 'topics' ? `topics/${unitId}/vocabulary` : `units_${grade}/${unitId}/vocabulary`;
    const snapshot = await get(ref(db, `classrooms/${classroomId}/${basePath}`));
    const vocabList = snapshot.val() as VocabularyWord[];
    if (vocabList) {
        const index = vocabList.findIndex(v => v.word === word);
        if (index !== -1) await set(ref(db, `classrooms/${classroomId}/${basePath}/${index}/audio`), base64Audio);
    }
};

export const updateVocabularyImage = async (classroomId: string, grade: any, unitId: string, word: string, imageUrl: string) => {
    const db = checkFirebase();
    const basePath = grade === 'topics' ? `topics/${unitId}/vocabulary` : `units_${grade}/${unitId}/vocabulary`;
    const snapshot = await get(ref(db, `classrooms/${classroomId}/${basePath}`));
    const vocabList = snapshot.val() as VocabularyWord[];
    if (vocabList) {
        const index = vocabList.findIndex(v => v.word === word);
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
