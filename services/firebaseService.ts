


// IMPORTANT: You need to install firebase for this to work
// In a real project, you would run: npm install firebase
// For this environment, we will assume it's available globally or via import map.
// We'll use the CDN version for this example.
import { initializeApp, FirebaseApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, onValue, remove, Unsubscribe, Database, onDisconnect, runTransaction, update, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { GameResult, PlayerData, QuizQuestion, StudentProgress, UnitsState, VocabularyWord } from "../types";

// User's Firebase configuration
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


// --- Singleton Firebase Initialization ---
let db: Database;
let firebaseInitialized = false;

try {
    if (firebaseConfig.apiKey === "YOUR_API_KEY" || !firebaseConfig.databaseURL) {
        throw new Error("Lỗi cấu hình: Firebase chưa được thiết lập. Vui lòng thêm cấu hình dự án của bạn vào tệp services/firebaseService.ts.");
    }

    let app: FirebaseApp;
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    db = getDatabase(app);
    firebaseInitialized = true;
} catch (error) {
    const errorMessage = "Không thể khởi tạo kết nối đến cơ sở dữ liệu. Vui lòng kiểm tra cấu hình Firebase và kết nối mạng.";
    console.error("Lỗi khởi tạo Firebase:", error);
    alert(`${errorMessage}\n\n${(error as Error).message}`);
}

const checkFirebase = (): Database => {
    if (!firebaseInitialized) {
        const errorMsg = "Firebase không được khởi tạo. Các chức năng sẽ không hoạt động.";
        console.error(errorMsg);
        alert(errorMsg);
        throw new Error(errorMsg);
    }
    return db;
};

const getPlayerKey = (playerName: string, playerClass: string) => {
    const normalizedClass = (playerClass || '').trim().toUpperCase();
    const normalizedName = (playerName || '').trim();
    const combined = `${normalizedClass}_${normalizedName}`;
    return combined.replace(/[.#$[\]]/g, '_');
};

const handleFirebaseError = (error: unknown, context: string): never => {
    console.error(`Firebase error in ${context}:`, error);
    if (error instanceof Error && (error.message.toLowerCase().includes('permission denied'))) {
        alert(
            "Lỗi Phân Quyền (Permission Denied):\n\n" +
            "Ứng dụng không có quyền ghi/đọc dữ liệu vào cơ sở dữ liệu.\n" +
            "Đây là lỗi cài đặt phía máy chủ, không phải lỗi của ứng dụng.\n\n" +
            "Vui lòng kiểm tra lại Cài đặt Rules trong Firebase Realtime Database của bạn.\n" +
            `Để thử nghiệm, bạn có thể cài đặt:\n{ "rules": { ".read": "true", ".write": "true" } }`
        );
    }
    // Re-throw so UI can handle it (e.g., stop loading spinners)
    throw error;
};


// Function to submit a student's result
export const submitResult = async (classroomId: string, result: GameResult): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(result.playerName, result.playerClass);
    const resultRef = ref(db, `classrooms/${classroomId}/results/${playerKey}`);
    await set(resultRef, result);
};

// Function to listen for real-time updates on results
export const listenToResults = (classroomId: string, callback: (results: Record<string, GameResult> | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const resultsRef = ref(db, `classrooms/${classroomId}/results`);
        return onValue(resultsRef, (snapshot) => {
            callback(snapshot.val());
        });
    } catch(e) {
        console.error("Failed to listen to results:", e);
        return () => {};
    }
};

// Function to clear all results for a classroom atomically
export const clearResults = async (classroomId: string): Promise<void> => {
    const db = checkFirebase();
    console.log(`Attempting to clear all data for classroom: ${classroomId}`);
    
    const updates: { [key: string]: null } = {};
    updates[`results`] = null;
    updates[`online`] = null;
    updates[`cheatCounts`] = null;
    updates[`kicked`] = null;
    updates[`progress`] = null;
    updates[`currentQuiz`] = null; // Also clear the current quiz

    const classroomRef = ref(db, `classrooms/${classroomId}`);

    try {
        await update(classroomRef, updates);
        console.log(`Successfully cleared all data for classroom: ${classroomId}`);
    } catch (error: any) {
        console.error(`Failed to clear data for classroom ${classroomId}. Error:`, error);
        alert(`Đã xảy ra lỗi khi xóa dữ liệu. Vui lòng kiểm tra console (F12) để biết thêm chi tiết. Lỗi: ${error.message}`);
        throw error;
    }
};

// Function to delete a single student's data
export const deleteStudentResult = async (classroomId: string, playerName: string, playerClass: string): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    console.log(`Attempting to delete data for student: ${playerName} (key: ${playerKey}) in classroom: ${classroomId}`);

    const updates: { [key: string]: null } = {};
    updates[`results/${playerKey}`] = null;
    updates[`online/${playerKey}`] = null;
    updates[`cheatCounts/${playerKey}`] = null;
    updates[`kicked/${playerKey}`] = null;
    updates[`progress/${playerKey}`] = null;
    
    const classroomRef = ref(db, `classrooms/${classroomId}`);

    try {
        await update(classroomRef, updates);
        console.log(`Successfully deleted data for student: ${playerName}`);
    } catch (error: any) {
        console.error(`Failed to delete data for student ${playerName}. Error:`, error);
        alert(`Đã xảy ra lỗi khi xóa dữ liệu của học sinh ${playerName}. Lỗi: ${error.message}`);
        throw error;
    }
};


// --- Game Status Functions ---
export const setGameStatus = async (classroomId: string, isEnabled: boolean): Promise<void> => {
    const db = checkFirebase();
    const statusRef = ref(db, `classrooms/${classroomId}/settings/gameEnabled`);
    await set(statusRef, isEnabled);
};

export const getGameStatus = (classroomId: string, callback: (isEnabled: boolean) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const statusRef = ref(db, `classrooms/${classroomId}/settings/gameEnabled`);
        return onValue(statusRef, (snapshot) => {
            const isEnabled = snapshot.val();
            callback(isEnabled === null ? true : isEnabled); // Default to true if not set
        });
    } catch(e) {
        console.error("Failed to get game status:", e);
        callback(true); // Default to enabled on error
        return () => {};
    }
};

// --- Presence Tracking Functions ---
export const trackStudentPresence = (classroomId: string, playerName: string, playerClass: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    const onlineRef = ref(db, `classrooms/${classroomId}/online/${playerKey}`);
    set(onlineRef, { name: playerName, class: playerClass });
    onDisconnect(onlineRef).remove();

    const progressRef = ref(db, `classrooms/${classroomId}/progress/${playerKey}`);
    set(progressRef, { name: playerName, class: playerClass, correct: 0, incorrect: 0 }); // Initial progress
    onDisconnect(progressRef).remove(); // Clean up progress on disconnect
};

export const listenToOnlineStudents = (classroomId: string, callback: (students: Record<string, {name: string, class: string}> | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const onlineRef = ref(db, `classrooms/${classroomId}/online`);
        return onValue(onlineRef, (snapshot) => {
            callback(snapshot.val());
        });
    } catch (e) {
        console.error("Failed to listen to online students:", e);
        return () => {};
    }
};

export const removeStudentPresence = async (classroomId: string, playerName: string, playerClass: string): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    const updates: { [key: string]: null } = {};
    updates[`online/${playerKey}`] = null;
    updates[`progress/${playerKey}`] = null;
    const classroomRef = ref(db, `classrooms/${classroomId}`);
    await update(classroomRef, updates);
};

// --- Student Progress Functions ---
export const updateStudentProgress = async (classroomId: string, playerName: string, playerClass: string, correct: number, incorrect: number): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    const progressRef = ref(db, `classrooms/${classroomId}/progress/${playerKey}`);
    await set(progressRef, { name: playerName, class: playerClass, correct, incorrect });
};

export const listenToStudentProgress = (classroomId: string, callback: (progress: Record<string, StudentProgress> | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const progressRef = ref(db, `classrooms/${classroomId}/progress`);
        return onValue(progressRef, (snapshot) => {
            callback(snapshot.val());
        });
    } catch (e) {
        console.error("Failed to listen to student progress:", e);
        return () => {};
    }
};

// --- Cheat Detection Functions ---
export const incrementCheatCount = (classroomId: string, playerName: string, playerClass: string) => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    const cheatRef = ref(db, `classrooms/${classroomId}/cheatCounts/${playerKey}`);
    runTransaction(cheatRef, (currentData) => (currentData || 0) + 1);
};

export const listenToCheatCounts = (classroomId: string, callback: (counts: Record<string, number> | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const countsRef = ref(db, `classrooms/${classroomId}/cheatCounts`);
        return onValue(countsRef, (snapshot) => callback(snapshot.val()));
    } catch (e) {
        console.error("Failed to listen to cheat counts:", e);
        return () => {};
    }
};


// --- Player Kick Functions ---
export const kickPlayer = async (classroomId: string, playerName: string, playerClass: string): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    console.log(`Attempting to kick player: ${playerName} (key: ${playerKey})`);

    const updates: { [key: string]: any } = {};
    updates[`kicked/${playerKey}`] = true;
    updates[`online/${playerKey}`] = null;

    const classroomRef = ref(db, `classrooms/${classroomId}`);

    try {
        await update(classroomRef, updates);
        console.log(`Successfully initiated kick for player: ${playerName}`);
    } catch (error: any) {
        console.error(`Failed to kick player ${playerName}. Error:`, error);
        alert(`Đã xảy ra lỗi khi loại học sinh ${playerName}. Lỗi: ${error.message}`);
        throw error;
    }
};

export const listenForKickedStatus = (classroomId: string, playerName: string, playerClass: string, callback: () => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const playerKey = getPlayerKey(playerName, playerClass);
        const kickedRef = ref(db, `classrooms/${classroomId}/kicked/${playerKey}`);
        return onValue(kickedRef, (snapshot) => {
            if (snapshot.val() === true) {
                callback();
                remove(kickedRef); // Clean up the flag after it's been received
            }
        });
    } catch(e) {
        console.error("Failed to listen for kicked status:", e);
        return () => {};
    }
};

// --- GENERAL Quiz Management Functions ---
export const saveQuizQuestions = async (classroomId: string, questions: QuizQuestion[]): Promise<void> => {
    const db = checkFirebase();
    const quizRef = ref(db, `classrooms/${classroomId}/currentQuiz`);
    await set(quizRef, questions);
};

export const listenToQuizQuestions = (classroomId: string, callback: (questions: QuizQuestion[] | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const quizRef = ref(db, `classrooms/${classroomId}/currentQuiz`);
        return onValue(quizRef, (snapshot) => {
            callback(snapshot.val());
        });
    } catch (e) {
        console.error("Failed to listen to quiz questions:", e);
        callback(null);
        return () => {};
    }
};

export const deleteCurrentQuiz = async (classroomId: string): Promise<void> => {
    const db = checkFirebase();
    const quizRef = ref(db, `classrooms/${classroomId}/currentQuiz`);
    await set(quizRef, null);
};

// --- GRADE-SPECIFIC UNIT MANAGEMENT (for Teacher Dashboard) ---

export const getUnitQuizQuestionsByGrade = async (classroomId: string, grade: number, unitId: string): Promise<QuizQuestion[] | null> => {
    const db = checkFirebase();
    const quizRef = ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/quiz`);
    try {
        const snapshot = await get(quizRef);
        return snapshot.val();
    } catch (error) {
        console.error(`Failed to get quiz for grade ${grade}, unit ${unitId}:`, error);
        return null;
    }
};

export const saveUnitQuizQuestionsByGrade = async (classroomId: string, grade: number, unitId: string, questions: QuizQuestion[]): Promise<void> => {
    const db = checkFirebase();
    const quizRef = ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/quiz`);
    await set(quizRef, questions);
};

export const listenToUnitQuizQuestionsByGrade = (classroomId: string, grade: number, unitId: string, callback: (questions: QuizQuestion[] | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const quizRef = ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/quiz`);
        return onValue(quizRef, (snapshot) => {
            callback(snapshot.val());
        });
    } catch (e) {
        console.error(`Failed to listen to quiz for grade ${grade}, unit ${unitId}:`, e);
        callback(null);
        return () => {};
    }
};

export const getUnitVocabularyByGrade = async (classroomId: string, grade: number, unitId: string): Promise<VocabularyWord[] | null> => {
    const db = checkFirebase();
    const vocabRef = ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`);
    try {
        const snapshot = await get(vocabRef);
        return snapshot.val();
    } catch (error) {
        console.error(`Failed to get vocabulary for grade ${grade}, unit ${unitId}:`, error);
        return null;
    }
};

export const saveUnitVocabularyByGrade = async (classroomId: string, grade: number, unitId: string, vocabulary: VocabularyWord[]): Promise<void> => {
    const db = checkFirebase();
    const vocabRef = ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`);
    await set(vocabRef, vocabulary);
};

export const listenToUnitVocabularyByGrade = (classroomId: string, grade: number, unitId: string, callback: (vocabulary: VocabularyWord[] | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const vocabRef = ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`);
        return onValue(vocabRef, (snapshot) => {
            callback(snapshot.val());
        });
    } catch (e) {
        console.error(`Failed to listen to vocabulary for grade ${grade}, unit ${unitId}:`, e);
        callback(null);
        return () => {};
    }
};

export const listenToUnitResultsByGrade = (classroomId: string, grade: number, unitId: string, callback: (results: Record<string, Record<string, GameResult>> | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const resultsRef = ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results`);
        return onValue(resultsRef, (snapshot) => {
            callback(snapshot.val());
        });
    } catch(e) {
        console.error(`Failed to listen to results for grade ${grade}, unit ${unitId}:`, e);
        return () => {};
    }
};

export const clearUnitResultsByGrade = async (classroomId: string, grade: number, unitId: string): Promise<void> => {
    const db = checkFirebase();
    const resultsRef = ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results`);
    await set(resultsRef, null);
};

export const deleteUnitStudentResultByGrade = async (classroomId: string, grade: number, unitId: string, playerName: string, playerClass: string): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    const resultRef = ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/results/${playerKey}`);
    await remove(resultRef);
};

export const setUnitStatusByGrade = async (classroomId: string, grade: number, unitId: string, isEnabled: boolean): Promise<void> => {
    const db = checkFirebase();
    const unitStatusRef = ref(db, `classrooms/${classroomId}/units_${grade}/${unitId}/enabled`);
    try {
        await set(unitStatusRef, isEnabled);
    } catch (error) {
        handleFirebaseError(error, `setUnitStatus for grade ${grade}, unit ${unitId}`);
    }
};

export const listenToUnitsStatusByGrade = (classroomId: string, grade: number, callback: (status: UnitsState | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const unitsRef = ref(db, `classrooms/${classroomId}/units_${grade}`);
        return onValue(unitsRef, (snapshot) => {
            callback(snapshot.val());
        });
    } catch (e) {
        console.error(`Failed to listen to units status for grade ${grade}:`, e);
        callback(null);
        return () => {};
    }
};

// --- STUDENT-FACING UNIT MANAGEMENT (defaults to Grade 12 for compatibility) ---
// DEPRECATED: Use ByGrade functions instead
export const getUnitQuizQuestions = async (classroomId: string, unitId: string): Promise<QuizQuestion[] | null> => {
    return getUnitQuizQuestionsByGrade(classroomId, 12, unitId);
};
export const getUnitVocabulary = async (classroomId: string, unitId: string): Promise<VocabularyWord[] | null> => {
    return getUnitVocabularyByGrade(classroomId, 12, unitId);
};
export const listenToUnitsStatus = (classroomId: string, callback: (status: UnitsState | null) => void): Unsubscribe => {
    return listenToUnitsStatusByGrade(classroomId, 12, callback);
};

export const startUnitActivity = async (
    classroomId: string,
    grade: number | 'topics',
    unitId: string, 
    playerData: PlayerData, 
    gameType: 'quiz' | 'spelling' | 'matching' | 'vocabulary'
): Promise<string> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerData.name, playerData.class);
    
    const basePath = grade === 'topics'
        ? `classrooms/${classroomId}/topics/${unitId}`
        : `classrooms/${classroomId}/units_${grade}/${unitId}`;

    const playerResultsRef = ref(db, `${basePath}/results/${playerKey}`);

    const newActivityRef = push(playerResultsRef);
    const activityId = newActivityRef.key!;

    await runTransaction(playerResultsRef, (currentData: Record<string, GameResult> | null) => {
        const resultsArray = currentData ? Object.values(currentData) : [];
        const attemptsOfSameType = resultsArray.filter(r => r.gameType === gameType).length;
        
        const newResult: GameResult = {
            playerName: playerData.name,
            playerClass: playerData.class,
            score: '0',
            correct: 0,
            incorrect: 0,
            answered: 0,
            totalQuestions: 0,
            timeTakenSeconds: 0,
            details: [],
            gameType,
            status: gameType === 'vocabulary' ? 'completed' : 'in-progress',
            attempts: attemptsOfSameType + 1,
        };

        const updates = { ...currentData };
        updates[activityId] = newResult;
        return updates;
    });
    
    return activityId;
};

export const updateUnitActivityResult = async (
    classroomId: string,
    grade: number | 'topics',
    unitId: string,
    playerData: PlayerData,
    activityId: string,
    finalResultData: Partial<GameResult>
): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerData.name, playerData.class);
    
    const basePath = grade === 'topics'
        ? `classrooms/${classroomId}/topics/${unitId}`
        : `classrooms/${classroomId}/units_${grade}/${unitId}`;
        
    const activityRef = ref(db, `${basePath}/results/${playerKey}/${activityId}`);
    
    const updates = {
        ...finalResultData,
        status: 'completed' as const,
        timestamp: serverTimestamp()
    };

    await update(activityRef, updates);
};


// --- PER-TOPIC Quiz Management ---
export const getTopicQuizQuestions = async (classroomId: string, topicId: string): Promise<QuizQuestion[] | null> => {
    const db = checkFirebase();
    const quizRef = ref(db, `classrooms/${classroomId}/topics/${topicId}/quiz`);
    try {
        const snapshot = await get(quizRef);
        return snapshot.val();
    } catch (error) {
        console.error(`Failed to get quiz for topic ${topicId}:`, error);
        return null;
    }
};

export const saveTopicQuizQuestions = async (classroomId: string, topicId: string, questions: QuizQuestion[]): Promise<void> => {
    const db = checkFirebase();
    const quizRef = ref(db, `classrooms/${classroomId}/topics/${topicId}/quiz`);
    await set(quizRef, questions);
};

export const listenToTopicQuizQuestions = (classroomId: string, topicId: string, callback: (questions: QuizQuestion[] | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const quizRef = ref(db, `classrooms/${classroomId}/topics/${topicId}/quiz`);
        return onValue(quizRef, (snapshot) => {
            callback(snapshot.val());
        });
    } catch (e) {
        console.error(`Failed to listen to quiz for topic ${topicId}:`, e);
        callback(null);
        return () => {};
    }
};

// --- PER-TOPIC Vocabulary Management ---
export const getTopicVocabulary = async (classroomId: string, topicId: string): Promise<VocabularyWord[] | null> => {
    const db = checkFirebase();
    const vocabRef = ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`);
    try {
        const snapshot = await get(vocabRef);
        return snapshot.val();
    } catch (error) {
        console.error(`Failed to get vocabulary for topic ${topicId}:`, error);
        return null;
    }
};

export const saveTopicVocabulary = async (classroomId: string, topicId: string, vocabulary: VocabularyWord[]): Promise<void> => {
    const db = checkFirebase();
    const vocabRef = ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`);
    await set(vocabRef, vocabulary);
};

export const listenToTopicVocabulary = (classroomId: string, topicId: string, callback: (vocabulary: VocabularyWord[] | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const vocabRef = ref(db, `classrooms/${classroomId}/topics/${topicId}/vocabulary`);
        return onValue(vocabRef, (snapshot) => {
            callback(snapshot.val());
        });
    } catch (e) {
        console.error(`Failed to listen to vocabulary for topic ${topicId}:`, e);
        callback(null);
        return () => {};
    }
};

// --- CACHE VOCABULARY AUDIO ---
export const updateVocabularyAudio = async (classroomId: string, grade: number | 'topics', unitId: string, word: string, base64Audio: string): Promise<void> => {
    const db = checkFirebase();
    const basePath = grade === 'topics' 
        ? `classrooms/${classroomId}/topics/${unitId}/vocabulary`
        : `classrooms/${classroomId}/units_${grade}/${unitId}/vocabulary`;

    const vocabRef = ref(db, basePath);
    
    // We fetch the list to find the index.
    const snapshot = await get(vocabRef);
    const vocabList = snapshot.val() as VocabularyWord[];
    
    if (vocabList) {
        const index = vocabList.findIndex(v => v.word === word);
        if (index !== -1) {
            const audioRef = ref(db, `${basePath}/${index}/audio`);
            await set(audioRef, base64Audio);
        }
    }
};


// --- PER-TOPIC Results Management ---
export const listenToTopicResults = (classroomId: string, topicId: string, callback: (results: Record<string, Record<string, GameResult>> | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const resultsRef = ref(db, `classrooms/${classroomId}/topics/${topicId}/results`);
        return onValue(resultsRef, (snapshot) => {
            callback(snapshot.val());
        });
    } catch(e) {
        console.error(`Failed to listen to results for topic ${topicId}:`, e);
        return () => {};
    }
};

export const clearTopicResults = async (classroomId: string, topicId: string): Promise<void> => {
    const db = checkFirebase();
    const resultsRef = ref(db, `classrooms/${classroomId}/topics/${topicId}/results`);
    await set(resultsRef, null);
};

export const deleteTopicStudentResult = async (classroomId: string, topicId: string, playerName: string, playerClass: string): Promise<void> => {
    const db = checkFirebase();
    const playerKey = getPlayerKey(playerName, playerClass);
    const resultRef = ref(db, `classrooms/${classroomId}/topics/${topicId}/results/${playerKey}`);
    await remove(resultRef);
};


// --- TOPIC Status Management ---
export const setTopicStatus = async (classroomId: string, topicId: string, isEnabled: boolean): Promise<void> => {
    const db = checkFirebase();
    const topicStatusRef = ref(db, `classrooms/${classroomId}/topics/${topicId}/enabled`);
    try {
        await set(topicStatusRef, isEnabled);
    } catch (error) {
        handleFirebaseError(error, `setTopicStatus for ${topicId}`);
    }
};

export const listenToTopicsStatus = (classroomId: string, callback: (status: UnitsState | null) => void): Unsubscribe => {
    try {
        const db = checkFirebase();
        const topicsRef = ref(db, `classrooms/${classroomId}/topics`);
        return onValue(topicsRef, (snapshot) => {
            callback(snapshot.val());
        });
    } catch (e) {
        console.error("Failed to listen to topics status:", e);
        callback(null);
        return () => {};
    }
};


// --- Quiz Versioning ---
export const checkAndSyncQuizVersion = async (classroomId: string, codeVersion: string): Promise<void> => {
    const db = checkFirebase();
    const versionRef = ref(db, `classrooms/${classroomId}/quizVersion`);
    
    try {
        const snapshot = await get(versionRef);
        const dbVersion = snapshot.val();

        if (dbVersion !== codeVersion) {
            console.log(`Quiz version mismatch. Code: ${codeVersion}, DB: ${dbVersion}. Clearing old results.`);
            
            // Call the existing function to clear all classroom data.
            await clearResults(classroomId); 
            
            // After clearing, update the version in the database to the new one
            await set(versionRef, codeVersion);
            
            console.log(`Results cleared and quiz version updated to ${codeVersion}.`);
        } else {
            console.log(`Quiz version is up to date (${codeVersion}). No action needed.`);
        }
    } catch (error) {
        handleFirebaseError(error, "checkAndSyncQuizVersion");
    }
};