// Standalone test suite verifying algorithms from firebaseService.ts

function decodePushIdTimestamp(id) {
    if (!id || typeof id !== 'string' || id.length < 8) return null;
    const PUSH_CHARS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
    let time = 0;
    for (let i = 0; i < 8; i++) {
        const idx = PUSH_CHARS.indexOf(id.charAt(i));
        if (idx === -1) return null;
        time = time * 64 + idx;
    }
    if (time < 1700000000000 || time > 1900000000000) return null;
    return time;
}

function resolveAttemptTimeSeconds(item, actId) {
    const recordedTime = parseInt(item?.timeTakenSeconds, 10);
    if (!isNaN(recordedTime) && recordedTime > 0) {
        return recordedTime;
    }

    const effectiveActId = actId || item?._actId || item?.activityId;

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
}

function isRealStudentAttempt(item) {
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
}

function calculateStudentCompletionPercent(attemptsList, unitVocabCount, unitQuizCount) {
    if (!attemptsList || attemptsList.length === 0) return 0;

    let vTime = 0;
    let vMaxUniqueWords = 0;
    let mMaxCorrect = 0;
    let mTime = 0;
    let lMaxCorrect = 0;
    let lTime = 0;
    let sMaxCorrect = 0;
    let sTime = 0;
    let qMaxCorrect = 0;
    let qTime = 0;

    for (const a of attemptsList) {
        const type = a.gameType;
        const time = resolveAttemptTimeSeconds(a, a._actId || a.activityId);
        const corr = typeof a.correct === 'number' ? a.correct : (parseInt(a.correct, 10) || 0);
        const audioCount = typeof a.audioListenedCount === 'number' ? a.audioListenedCount : (parseInt(a.audioListenedCount, 10) || 0);
        const uWords = typeof a.uniqueWordsListenedCount === 'number' 
            ? a.uniqueWordsListenedCount 
            : (Array.isArray(a.listenedWords) ? a.listenedWords.length : 0);

        if (type === 'vocabulary') {
            vTime += time;
            if (uWords > vMaxUniqueWords) vMaxUniqueWords = uWords;
        } else if (type === 'matching') {
            mTime += time;
            if (corr > mMaxCorrect) mMaxCorrect = corr;
        } else if (type === 'listen-choose') {
            lTime += time;
            if (corr > lMaxCorrect) lMaxCorrect = corr;
        } else if (type === 'spelling') {
            sTime += time;
            if (corr > sMaxCorrect) sMaxCorrect = corr;
        } else if (type === 'quiz') {
            qTime += time;
            if (corr > qMaxCorrect) qMaxCorrect = corr;
        }
    }

    const vocabThreshold = unitVocabCount ? Math.min(10, Math.ceil(unitVocabCount * 0.3)) : 5;
    const hasVocabProgress = (vMaxUniqueWords >= vocabThreshold) || (vTime >= 30) || (attemptsList.some(a => a.gameType === 'vocabulary' && a.score === 'ĐÃ HỌC'));
    const vScore = hasVocabProgress ? 20 : (vMaxUniqueWords > 0 || vTime > 0 ? 10 : 0);

    const mScore = mMaxCorrect >= 5 ? 20 : (mMaxCorrect > 0 || mTime > 0 ? 10 : 0);
    const lScore = lMaxCorrect >= 5 ? 20 : (lMaxCorrect > 0 || lTime > 0 ? 10 : 0);
    const sScore = sMaxCorrect >= 5 ? 20 : (sMaxCorrect > 0 || sTime > 0 ? 10 : 0);
    const qScore = qMaxCorrect >= 5 ? 20 : (qMaxCorrect > 0 || qTime > 0 ? 10 : 0);

    return Math.min(100, Math.max(0, vScore + mScore + lScore + sScore + qScore));
}

let passed = 0;
let failed = 0;

function assert(desc, cond) {
    if (cond) {
        passed++;
        console.log(`  [PASS] ${desc}`);
    } else {
        failed++;
        console.error(`  [FAIL] ${desc}`);
    }
}

console.log('=== TEST SUITE 1: decodePushIdTimestamp & resolveAttemptTimeSeconds ===');
const samplePushId = '-P416iW9pZzSdnp3WLnS';
const decodedTs = decodePushIdTimestamp(samplePushId);
assert('Decodes valid push ID timestamp', typeof decodedTs === 'number' && decodedTs > 1700000000000);
assert('Returns null for invalid push ID', decodePushIdTimestamp('invalid_id') === null);
assert('Returns null for empty push ID', decodePushIdTimestamp('') === null);

// Case 1: Recorded time exists and > 0
const itemWithTime = { timeTakenSeconds: 120, gameType: 'vocabulary' };
assert('Uses recorded time when > 0', resolveAttemptTimeSeconds(itemWithTime) === 120);

// Case 2: timeTakenSeconds = 0, but valid Push ID and timestamp
const pushEnd = 1792111559677;   // start was 1792110684234, diff is 875s
const itemWithPush = { 
    timeTakenSeconds: 0, 
    timestamp: pushEnd, 
    _actId: samplePushId, 
    audioListenedCount: 50,
    gameType: 'vocabulary' 
};
const resolvedFromPush = resolveAttemptTimeSeconds(itemWithPush);
assert('Derives time from push ID start and end timestamp (875s)', resolvedFromPush === 875);

// Case 3: timeTakenSeconds = 0, no valid push id / timestamps -> fallback heuristic
const itemFallbackVocab = {
    timeTakenSeconds: 0,
    gameType: 'vocabulary',
    audioListenedCount: 10,
    uniqueWordsListenedCount: 5
};
// Math.max(10, 10 * 3, 5 * 6) = 30
assert('Fallback heuristic for vocabulary based on audio/words (30s)', resolveAttemptTimeSeconds(itemFallbackVocab) === 30);

const itemFallbackQuiz = {
    timeTakenSeconds: 0,
    gameType: 'quiz',
    answered: 8
};
// Math.max(10, 8 * 5) = 40
assert('Fallback heuristic for quiz/other games based on answers (40s)', resolveAttemptTimeSeconds(itemFallbackQuiz) === 40);

// Case 4: Zero activity -> returns 0
const itemEmpty = {
    timeTakenSeconds: 0,
    gameType: 'vocabulary',
    audioListenedCount: 0,
    uniqueWordsListenedCount: 0
};
assert('Returns 0 for zero-activity attempt', resolveAttemptTimeSeconds(itemEmpty) === 0);

console.log('\n=== TEST SUITE 2: isRealStudentAttempt (Ghost attempt detection) ===');
assert('Rejects null/undefined', isRealStudentAttempt(null) === false && isRealStudentAttempt(undefined) === false);
assert('Rejects ghost session (0 time, 0 audio, 0 words, 0 ans)', isRealStudentAttempt({
    timeTakenSeconds: 0,
    audioListenedCount: 0,
    uniqueWordsListenedCount: 0,
    answered: 0,
    correct: 0,
    incorrect: 0
}) === false);
assert('Accepts session with audio listened even if time is 0', isRealStudentAttempt({
    timeTakenSeconds: 0,
    audioListenedCount: 5,
    uniqueWordsListenedCount: 0
}) === true);
assert('Accepts session with unique words even if time is 0', isRealStudentAttempt({
    timeTakenSeconds: 0,
    audioListenedCount: 0,
    uniqueWordsListenedCount: 2
}) === true);
assert('Accepts session with answered questions even if time is 0', isRealStudentAttempt({
    timeTakenSeconds: 0,
    answered: 3
}) === true);
assert('Accepts session with recorded time >= 5s even with 0 questions', isRealStudentAttempt({
    timeTakenSeconds: 15
}) === true);

console.log('\n=== TEST SUITE 3: Idempotency & Repeatability of calculateStudentCompletionPercent ===');
const mockAttempts = [
    { gameType: 'vocabulary', timeTakenSeconds: 80, uniqueWordsListenedCount: 20, totalQuestions: 48 },
    { gameType: 'matching', timeTakenSeconds: 120, correct: 10, totalQuestions: 20 },
    { gameType: 'quiz', timeTakenSeconds: 90, correct: 8, totalQuestions: 10 }
];

const run1 = calculateStudentCompletionPercent(mockAttempts, 48, 40);
const run2 = calculateStudentCompletionPercent(mockAttempts, 48, 40);
const run3 = calculateStudentCompletionPercent(mockAttempts, 48, 40);
assert('Idempotent: run1 === run2 === run3', run1 === run2 && run2 === run3);
assert('Produces reasonable score (vocab + matching + quiz = 60%)', run1 === 60);

// Test non-duplication when duplicate attempts are present
const duplicateAttempts = [
    ...mockAttempts,
    { gameType: 'vocabulary', timeTakenSeconds: 80, uniqueWordsListenedCount: 20, totalQuestions: 48 },
];
const runDup = calculateStudentCompletionPercent(duplicateAttempts, 48, 40);
assert('Completion percent does NOT inflate with duplicate retry attempts', runDup === run1);

console.log('\n=== TEST SUITE 4: Edge Cases & Boundaries ===');
assert('Empty attempts list returns 0%', calculateStudentCompletionPercent([], 48, 40) === 0);
assert('Undefined list returns 0%', calculateStudentCompletionPercent(undefined, 48, 40) === 0);

// Max 100% boundary test
const maxAttempts = [
    { gameType: 'vocabulary', timeTakenSeconds: 300, uniqueWordsListenedCount: 48, score: 'ĐÃ HỌC' },
    { gameType: 'matching', timeTakenSeconds: 300, correct: 20 },
    { gameType: 'listen-choose', timeTakenSeconds: 300, correct: 20 },
    { gameType: 'spelling', timeTakenSeconds: 300, correct: 20 },
    { gameType: 'quiz', timeTakenSeconds: 300, correct: 20 },
];
assert('All activities mastered caps at 100%', calculateStudentCompletionPercent(maxAttempts, 48, 40) === 100);

console.log(`\n========================================`);
console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
if (failed > 0) process.exit(1);
