
import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, onValue, set, get, remove, update, push } from "firebase/database";
import { PlayerData, QuizQuestion, GameResult, VocabularyWord, UnitsState } from "../types";

// Firebase configuration (usually injected or managed externally)
const firebaseConfig = {
  apiKey: "placeholder",
  authDomain: "placeholder",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "placeholder",
  storageBucket: "placeholder",
  messagingSenderId: "placeholder",
  appId: "placeholder"
};

// Initialize Firebase App if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

// Helper to check if Firebase is initialized
export const checkFirebase = () => db;

// Standardized key for students to avoid special character issues in Firebase
const getPlayerKey = (playerName: string, playerClass: string) => {
    const normalizedClass = (playerClass || '').trim().toUpperCase();
    const normalizedName = (playerName || '').trim();
    const combined = `${normalizedClass}_${normalizedName}`;
    return combined.replace(/[.#$[\]]/g, '_');
};

// --- Room & Global Status ---
export const getGameStatus = (classroomId: string, callback: (isEnabled: boolean) => void) => {
    const statusRef = ref(db, `classrooms/${classroomId}/gameEnabled`);
    return onValue(statusRef, (snapshot) => {
        callback(snapshot.val() !== false);
    });
};

export const setGameStatus = async (classroomId: string, isEnabled: boolean) => {
    await set(ref(db, `classrooms/${classroomId}/gameEnabled`), isEnabled);
};

// --- Presence & Tracking ---
export const trackStudentPresence = (classroomId: string, name: string, className: string) => {
    const playerKey = getPlayerKey(name, className);
    set(ref(db, `classrooms/${classroomId}/onlineStudents/${playerKey}`), { name, class: className });
};

export const removeStudentPresence = async (classroomId: string, name: string, className: string) => {
    const playerKey = getPlayerKey(name, className);
    await remove(ref(db, `classrooms/${classroomId}/onlineStudents/${playerKey}`));
};

export const listenToOnlineStudents = (classroomId: string, callback: (students: any) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/onlineStudents`), (snapshot) => callback(snapshot.val()));
};

export const updateStudentProgress = async (classroomId: string, name: string, className: string, correct: number, incorrect: number) => {
    const playerKey = getPlayerKey(name, className);
    await update(ref(db, `classrooms/${classroomId}/studentProgress/${playerKey}`), { name, class: className, correct, incorrect });
};

export const listenToStudentProgress = (classroomId: string, callback: (progress: any) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/studentProgress`), (snapshot) => callback(snapshot.val()));
};

// --- Cheating & Kicking ---
export const incrementCheatCount = async (classroomId: string, name: string, className: string) => {
    const playerKey = getPlayerKey(name, className);
    const cheatRef = ref(db, `classrooms/${classroomId}/cheatCounts/${playerKey}`);
    const snapshot = await get(cheatRef);
    const currentCount = snapshot.val() || 0;
    await set(cheatRef, currentCount + 1);
};

export const listenToCheatCounts = (classroomId: string, callback: (counts: any) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/cheatCounts`), (snapshot) => callback(snapshot.val()));
};

export const kickPlayer = async (classroomId: string, name: string, className: string) => {
    const playerKey = getPlayerKey(name, className);
    await set(ref(db, `classrooms/${classroomId}/kickedPlayers/${playerKey}`), true);
    await removeStudentPresence(classroomId, name, className);
};

export const listenForKickedStatus = (classroomId: string, name: string, className: string, callback: () => void) => {
    const playerKey = getPlayerKey(name, className);
    const kickRef = ref(db, `classrooms/${classroomId}/kickedPlayers/${playerKey}`);
    return onValue(kickRef, (snapshot) => {
        if (snapshot.val() === true) {
            callback();
            remove(kickRef);
        }
    });
};

// --- Quiz Questions ---
export const saveQuizQuestions = async (classroomId: string, questions: QuizQuestion[]) => {
    await set(ref(db, `classrooms/${classroomId}/quizQuestions`), questions);
};

export const listenToQuizQuestions = (classroomId: string, callback: (questions: QuizQuestion[]) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/quizQuestions`), (snapshot) => callback(snapshot.val() || []));
};

export const deleteCurrentQuiz = async (classroomId: string) => {
    await remove(ref(db, `classrooms/${classroomId}/quizQuestions`));
};

export const checkAndSyncQuizVersion = async (classroomId: string, version: string) => {
    const versionRef = ref(db, `classrooms/${classroomId}/quizVersion`);
    const snapshot = await get(versionRef);
    if (snapshot.val() !== version) {
        await set(versionRef, version);
    }
};

// --- Results Management ---
export const listenToResults = (classroomId: string, callback: (results: any) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/results`), (snapshot) => callback(snapshot.val()));
};

export const clearResults = async (classroomId: string) => {
    await remove(ref(db, `classrooms/${classroomId}/results`));
    await remove(ref(db, `classrooms/${classroomId}/cheatCounts`));
    await remove(ref(db, `classrooms/${classroomId}/studentProgress`));
};

export const deleteStudentResult = async (classroomId: string, name: string, className: string) => {
    const playerKey = getPlayerKey(name, className);
    await remove(ref(db, `classrooms/${classroomId}/results/${playerKey}`));
};

// --- Unit Specifics (Grade 12 etc) ---
export const listenToUnitsStatusByGrade = (classroomId: string, grade: number, callback: (status: UnitsState) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/units_${grade}`), (snapshot) => callback(snapshot.val() || {}));
};

export const setUnitStatusByGrade = async (classroomId: string, grade: number, unitId: string, isEnabled: boolean) => {
    await update(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}`), { enabled: isEnabled });
};

export const saveUnitQuizQuestionsByGrade = async (classroomId: string, grade: number | 'topics', unitId: string, questions: QuizQuestion[]) => {
    const path = grade === 'topics' ? `classrooms/${classroomId}/topics/${unitId}/quizQuestions` : `classrooms/${classroomId}/units_${grade}/${unitId}/quizQuestions`;
    await set(ref(db, path), questions);
};

export const listenToUnitQuizQuestionsByGrade = (classroomId: string, grade: number, unitId: string, callback: (questions: QuizQuestion[]) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/quizQuestions`), (snapshot) => callback(snapshot.val() || []));
};

export const getUnitQuizQuestionsByGrade = async (classroomId: string, grade: number, unitId: string) => {
    const snapshot = await get(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/quizQuestions`));
    return snapshot.val() || [];
};

export const saveUnitVocabularyByGrade = async (classroomId: string, grade: number | 'topics', unitId: string, vocabulary: VocabularyWord[]) => {
    const path = grade === 'topics' ? `classrooms/${classroomId}/topics/${unitId}/vocabulary` : `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`;
    await set(ref(db, path), vocabulary);
};

export const listenToUnitVocabularyByGrade = (classroomId: string, grade: number, unitId: string, callback: (vocab: VocabularyWord[]) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`), (snapshot) => callback(snapshot.val() || []));
};

export const getUnitVocabularyByGrade = async (classroomId: string, grade: number, unitId: string) => {
    const snapshot = await get(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`));
    return snapshot.val() || [];
};

export const listenToUnitResultsByGrade = (classroomId: string, grade: number, unitId: string, callback: (results: any) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results`), (snapshot) => callback(snapshot.val()));
};

export const clearUnitResultsByGrade = async (classroomId: string, grade: number, unitId: string) => {
    await remove(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results`));
};

export const deleteUnitStudentResultByGrade = async (classroomId: string, grade: number, unitId: string, name: string, className: string) => {
    const playerKey = getPlayerKey(name, className);
    await remove(ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results/${playerKey}`));
};

// --- Topics Specifics ---
export const listenToTopicsStatus = (classroomId: string, callback: (status: UnitsState) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/topics`), (snapshot) => callback(snapshot.val() || {}));
};

export const setTopicStatus = async (classroomId: string, topicId: string, isEnabled: boolean) => {
    await update(ref(db, `classrooms/${classroomId}/topics/${topicId}`), { enabled: isEnabled });
};

export const listenToTopicQuizQuestions = (classroomId: string, topicId: string, callback: (questions: QuizQuestion[]) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/topics/${topicId}/quizQuestions`), (snapshot) => callback(snapshot.val() || []));
};

export const getTopicQuizQuestions = async (classroomId: string, topicId: string) => {
    const snapshot = await get(ref(db, `classrooms/${classroomId}/topics/${topicId}/quizQuestions`));
    return snapshot.val() || [];
};

export const saveTopicQuizQuestions = async (classroomId: string, topicId: string, questions: QuizQuestion[]) => {
    await set(ref(db, `classrooms/${classroomId}/topics/${topicId}/quizQuestions`), questions);
};

export const listenToTopicVocabulary = (classroomId: string, topicId: string, callback: (vocab: VocabularyWord[]) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`), (snapshot) => callback(snapshot.val() || []));
};

export const getTopicVocabulary = async (classroomId: string, topicId: string) => {
    const snapshot = await get(ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`));
    return snapshot.val() || [];
};

export const saveTopicVocabulary = async (classroomId: string, topicId: string, vocabulary: VocabularyWord[]) => {
    await set(ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`), vocabulary);
};

export const listenToTopicResults = (classroomId: string, topicId: string, callback: (results: any) => void) => {
    return onValue(ref(db, `classrooms/${classroomId}/topics/${topicId}/results`), (snapshot) => callback(snapshot.val()));
};

export const clearTopicResults = async (classroomId: string, topicId: string) => {
    await remove(ref(db, `classrooms/${classroomId}/topics/${topicId}/results`));
};

export const deleteTopicStudentResult = async (classroomId: string, topicId: string, name: string, className: string) => {
    const playerKey = getPlayerKey(name, className);
    await remove(ref(db, `classrooms/${classroomId}/topics/${topicId}/results/${playerKey}`));
};

// --- Activity Sessions ---
export const startUnitActivity = async (classroomId: string, grade: number | 'topics', unitId: string, player: PlayerData, type: string) => {
    const playerKey = getPlayerKey(player.name, player.class);
    const basePath = grade === 'topics' 
        ? `classrooms/${classroomId}/topics/${unitId}/results/${playerKey}`
        : `classrooms/${classroomId}/units_${grade}/${unitId}/results/${playerKey}`;
    
    const activityRef = push(ref(db, basePath));
    const activityId = activityRef.key!;
    await set(activityRef, {
        playerName: player.name,
        playerClass: player.class,
        gameType: type,
        status: 'in-progress',
        timestamp: Date.now()
    });
    return activityId;
};

export const updateUnitActivityResult = async (classroomId: string, grade: number | 'topics', unitId: string, player: PlayerData, activityId: string, result: Partial<GameResult>) => {
    const playerKey = getPlayerKey(player.name, player.class);
    const basePath = grade === 'topics' 
        ? `classrooms/${classroomId}/topics/${unitId}/results/${playerKey}/${activityId}`
        : `classrooms/${classroomId}/units_${grade}/${unitId}/results/${playerKey}/${activityId}`;
    
    await update(ref(db, basePath), {
        ...result,
        status: 'completed',
        timestamp: Date.now()
    });
};

// --- CACHE VOCABULARY ASSETS ---
export const updateVocabularyAudio = async (classroomId: string, grade: number | 'topics', unitId: string, word: string, base64Audio: string): Promise<void> => {
    const basePath = grade === 'topics' 
        ? `classrooms/${classroomId}/topics/${unitId}/vocabulary`
        : `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`;

    const vocabRef = ref(db, basePath);
    const snapshot = await get(vocabRef);
    const vocabList = snapshot.val() as VocabularyWord[];
    
    if (vocabList) {
        const index = vocabList.findIndex(v => v.word === word);
        if (index !== -1) {
            await set(ref(db, `${basePath}/${index}/audio`), base64Audio);
        }
    }
};

export const updateVocabularyImage = async (classroomId: string, grade: number | 'topics', unitId: string, word: string, imageUrl: string): Promise<void> => {
    const basePath = grade === 'topics' 
        ? `classrooms/${classroomId}/topics/${unitId}/vocabulary`
        : `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`;

    const vocabRef = ref(db, basePath);
    const snapshot = await get(vocabRef);
    const vocabList = snapshot.val() as VocabularyWord[];
    
    if (vocabList) {
        const index = vocabList.findIndex(v => v.word === word);
        if (index !== -1) {
            await set(ref(db, `${basePath}/${index}/image`), imageUrl);
        }
    }
};
