
// ... (giữ nguyên các import hiện có)
import { initializeApp, FirebaseApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, onValue, remove, Unsubscribe, Database, onDisconnect, runTransaction, update, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { GameResult, PlayerData, QuizQuestion, StudentProgress, UnitsState, VocabularyWord } from "../types";

// ... (giữ nguyên cấu hình firebaseConfig và logic khởi tạo)

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
    if (!getApps().length) {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
    } else {
        db = getDatabase(getApp());
    }
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
    const normalizedName = (playerName || '').trim();
    const combined = `${normalizedClass}_${normalizedName}`;
    return combined.replace(/[.#$[\]]/g, '_');
};

// --- Cập nhật kết quả & Presence (giữ nguyên các hàm hiện có) ---
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

export const listenToOnlineStudents = (classroomId: string, callback: (students: Record<string, {name: string, class: string}> | null) => void): Unsubscribe => {
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

export const listenToStudentProgress = (classroomId: string, callback: (progress: Record<string, StudentProgress> | null) => void): Unsubscribe => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/progress`), (snapshot) => callback(snapshot.val()));
};

export const incrementCheatCount = (classroomId: string, playerName: string, playerClass: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    const cheatRef = ref(db, `classrooms/${classroomId}/cheatCounts/${playerKey}`);
    runTransaction(cheatRef, (current) => (current || 0) + 1);
};

export const listenToCheatCounts = (classroomId: string, callback: (counts: Record<string, number> | null) => void): Unsubscribe => {
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

export const listenToQuizQuestions = (classroomId: string, callback: (questions: QuizQuestion[] | null) => void): Unsubscribe => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/currentQuiz`), (snapshot) => callback(snapshot.val()));
};

export const deleteCurrentQuiz = async (classroomId: string): Promise<void> => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/currentQuiz`), null);
};

// --- Unit/Topic Management ---
export const getUnitQuizQuestionsByGrade = async (classroomId: string, grade: number, unitId: string) => {
    const db = checkFirebase();
    const snapshot = await get(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/quiz`));
    return snapshot.val();
};

export const saveUnitQuizQuestionsByGrade = async (classroomId: string, grade: number, unitId: string, questions: QuizQuestion[]) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/quiz`), questions);
};

export const listenToUnitQuizQuestionsByGrade = (classroomId: string, grade: number, unitId: string, callback: (q: QuizQuestion[] | null) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/quiz`), (s) => callback(s.val()));
};

// FIX: Added missing getUnitVocabularyByGrade function
export const getUnitVocabularyByGrade = async (classroomId: string, grade: number, unitId: string) => {
    const db = checkFirebase();
    const snapshot = await get(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`));
    return snapshot.val();
};

export const saveUnitVocabularyByGrade = async (classroomId: string, grade: number, unitId: string, vocabulary: VocabularyWord[]) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`), vocabulary);
};

export const listenToUnitVocabularyByGrade = (classroomId: string, grade: number, unitId: string, callback: (v: VocabularyWord[] | null) => void) => {
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

export const deleteUnitStudentResultByGrade = async (classroomId: string, grade: number, unitId: string, playerName: string, playerClass: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    await remove(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results/${playerKey}`));
};

export const setUnitStatusByGrade = async (classroomId: string, grade: number, unitId: string, isEnabled: boolean) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/enabled`), isEnabled);
};

export const listenToUnitsStatusByGrade = (classroomId: string, grade: number, callback: (s: UnitsState | null) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/units_${grade}`), (s) => callback(s.val()));
};

export const startUnitActivity = async (classroomId: string, grade: number | 'topics', unitId: string, playerData: PlayerData, gameType: string): Promise<string> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerData.name, playerData.class);
    const basePath = grade === 'topics' ? `topics/${unitId}` : `units_${grade}/${unitId}`;
    const playerResultsRef = ref(db, `classrooms/${classroomId}/${basePath}/results/${playerKey}`);
    const newActivityRef = push(playerResultsRef);
    const activityId = newActivityRef.key!;
    
    await runTransaction(playerResultsRef, (current: any) => {
        const resultsArray = current ? Object.values(current) : [];
        const attempts = resultsArray.filter((r: any) => r.gameType === gameType).length;
        const newResult = { playerName: playerData.name, playerClass: playerData.class, score: '0', correct: 0, incorrect: 0, answered: 0, totalQuestions: 0, timeTakenSeconds: 0, details: [], gameType, status: gameType === 'vocabulary' ? 'completed' : 'in-progress', attempts: attempts + 1 };
        const updates = { ...current };
        updates[activityId] = newResult;
        return updates;
    });
    return activityId;
};

export const updateUnitActivityResult = async (classroomId: string, grade: number | 'topics', unitId: string, playerData: PlayerData, activityId: string, finalResultData: Partial<GameResult>): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerData.name, playerData.class);
    const basePath = grade === 'topics' ? `topics/${unitId}` : `units_${grade}/${unitId}`;
    await update(ref(db, `classrooms/${classroomId}/${basePath}/results/${playerKey}/${activityId}`), { ...finalResultData, status: 'completed', timestamp: serverTimestamp() });
};

// --- Per-Topic Functions ---
export const getTopicQuizQuestions = async (classroomId: string, topicId: string) => {
    const db = checkFirebase();
    const snapshot = await get(ref(db, `classrooms/${classroomId}/topics/${topicId}/quiz`));
    return snapshot.val();
};

export const saveTopicQuizQuestions = async (classroomId: string, topicId: string, questions: QuizQuestion[]) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/topics/${topicId}/quiz`), questions);
};

export const listenToTopicQuizQuestions = (classroomId: string, topicId: string, callback: (q: QuizQuestion[] | null) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/topics/${topicId}/quiz`), (s) => callback(s.val()));
};

export const getTopicVocabulary = async (classroomId: string, topicId: string) => {
    const db = checkFirebase();
    const snapshot = await get(ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`));
    return snapshot.val();
};

export const saveTopicVocabulary = async (classroomId: string, topicId: string, vocabulary: VocabularyWord[]) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`), vocabulary);
};

export const listenToTopicVocabulary = (classroomId: string, topicId: string, callback: (v: VocabularyWord[] | null) => void) => {
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

export const deleteTopicStudentResult = async (classroomId: string, topicId: string, playerName: string, playerClass: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    await remove(ref(db, `classrooms/${classroomId}/topics/${topicId}/results/${playerKey}`));
};

export const setTopicStatus = async (classroomId: string, topicId: string, isEnabled: boolean) => {
    const db = checkFirebase();
    await set(ref(db, `classrooms/${classroomId}/topics/${topicId}/enabled`), isEnabled);
};

export const listenToTopicsStatus = (classroomId: string, callback: (s: UnitsState | null) => void) => {
    const db = checkFirebase();
    return onValue(ref(db, `classrooms/${classroomId}/topics`), (s) => callback(s.val()));
};

// --- CACHE ASSETS ---
export const updateVocabularyAudio = async (classroomId: string, grade: number | 'topics', unitId: string, word: string, base64Audio: string): Promise<void> => {
    const db = checkFirebase();
    const basePath = grade === 'topics' ? `topics/${unitId}/vocabulary` : `units_${grade}/${unitId}/vocabulary`;
    const vocabRef = ref(db, `classrooms/${classroomId}/${basePath}`);
    const snapshot = await get(vocabRef);
    const vocabList = snapshot.val() as VocabularyWord[];
    if (vocabList) {
        const index = vocabList.findIndex(v => v.word === word);
        if (index !== -1) {
            await set(ref(db, `classrooms/${classroomId}/${basePath}/${index}/audio`), base64Audio);
        }
    }
};

// --- CẬP NHẬT ẢNH VÀO DATABASE ---
export const updateVocabularyImage = async (classroomId: string, grade: number | 'topics', unitId: string, word: string, imageUrl: string): Promise<void> => {
    const db = checkFirebase();
    const basePath = grade === 'topics' ? `topics/${unitId}/vocabulary` : `units_${grade}/${unitId}/vocabulary`;
    const vocabRef = ref(db, `classrooms/${classroomId}/${basePath}`);
    const snapshot = await get(vocabRef);
    const vocabList = snapshot.val() as VocabularyWord[];
    if (vocabList) {
        const index = vocabList.findIndex(v => v.word === word);
        if (index !== -1) {
            await set(ref(db, `classrooms/${classroomId}/${basePath}/${index}/image`), imageUrl);
        }
    }
};

export const checkAndSyncQuizVersion = async (classroomId: string, codeVersion: string): Promise<void> => {
    const db = checkFirebase();
    const versionRef = ref(db, `classrooms/${classroomId}/quizVersion`);
    const snapshot = await get(versionRef);
    const dbVersion = snapshot.val();
    if (dbVersion !== codeVersion) {
        await clearResults(classroomId);
        await set(versionRef, codeVersion);
    }
};
