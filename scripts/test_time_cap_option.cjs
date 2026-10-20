const fs = require('fs');

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
    if (!isNaN(recordedTime) && recordedTime > 0) return recordedTime;
    const effectiveActId = actId || item?._actId || item?.activityId;
    if (effectiveActId) {
        const startTime = decodePushIdTimestamp(effectiveActId);
        const endTime = typeof item?.timestamp === 'number' 
            ? item.timestamp 
            : (item?.timestamp?.seconds ? item.timestamp.seconds * 1000 : null);
        
        if (startTime && endTime && endTime >= startTime) {
            const calculatedSec = Math.round((endTime - startTime) / 1000);
            if (calculatedSec >= 5 && calculatedSec <= 7200) return calculatedSec;
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
        if (audioCount > 0 || uniqueWordsCount > 0) return Math.max(10, audioCount * 3, uniqueWordsCount * 6);
    } else {
        if (totalDone > 0) return Math.max(10, totalDone * 5);
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

    if (audioCount > 0 || uniqueCount > 0 || answered > 0 || correct > 0 || incorrect > 0 || hasDetails || recordedTime >= 5) return true;
    if (isCompleted && (recordedTime > 0 || answered > 0)) return true;
    return false;
}

function calculateStudentCompletionDetails(attemptsList, unitVocabCount, unitQuizCount) {
    const defaultResult = {
        overallPercent: 0,
        is100PercentEligible: false,
        totalValidTimeSeconds: 0,
        contentScore: 0,
        timeScore: 0,
        card1Coverage: 0, card2Coverage: 0, card3Coverage: 0, card4Coverage: 0, card5Coverage: 0,
        card2Accuracy: 0, card3Accuracy: 0, card4Accuracy: 0, card5Accuracy: 0,
    };

    if (!attemptsList || !Array.isArray(attemptsList) || attemptsList.length === 0) return defaultResult;
    const validAttempts = attemptsList.filter(a => a && isRealStudentAttempt(a));
    if (validAttempts.length === 0) return defaultResult;

    let totalValidTimeSeconds = 0;
    validAttempts.forEach(a => {
        totalValidTimeSeconds += resolveAttemptTimeSeconds(a, a._actId || a.activityId);
    });

    let maxVocabTotQ = 0, maxQuizTotQ = 0;
    const card1WordsSet = new Set();
    let card1MaxUnique = 0;

    const card2ItemsSet = new Set();
    let card2MaxAnsweredSingle = 0, card2SumAnswered = 0, card2SumCorrect = 0;

    const card3ItemsSet = new Set();
    let card3MaxAnsweredSingle = 0, card3SumAnswered = 0, card3SumCorrect = 0;

    const card4ItemsSet = new Set();
    let card4MaxAnsweredSingle = 0, card4SumAnswered = 0, card4SumCorrect = 0;

    const card5ItemsSet = new Set();
    let card5MaxAnsweredSingle = 0, card5SumAnswered = 0, card5SumCorrect = 0;

    validAttempts.forEach(a => {
        const gType = (a.gameType === 'listen-choose' || a.gameType === 'listenChoose') ? 'listenChoose' : a.gameType;
        const corr = typeof a.correct === 'number' ? a.correct : (parseInt(a.correct, 10) || 0);
        const incorr = typeof a.incorrect === 'number' ? a.incorrect : (parseInt(a.incorrect, 10) || 0);
        const ans = typeof a.answered === 'number' ? a.answered : (corr + incorr);
        const totQ = typeof a.totalQuestions === 'number' ? a.totalQuestions : (parseInt(a.totalQuestions, 10) || 0);

        if (gType === 'vocabulary') {
            if (totQ > maxVocabTotQ) maxVocabTotQ = totQ;
            const uniqueCount = typeof a.uniqueWordsListenedCount === 'number' ? a.uniqueWordsListenedCount : (Array.isArray(a.listenedWords) ? a.listenedWords.length : 0);
            if (uniqueCount > card1MaxUnique) card1MaxUnique = uniqueCount;
            if (Array.isArray(a.listenedWords)) a.listenedWords.forEach(w => { if (w) card1WordsSet.add(w); });
        } else if (gType === 'matching') {
            if (totQ > maxVocabTotQ) maxVocabTotQ = totQ;
            if (ans > card2MaxAnsweredSingle) card2MaxAnsweredSingle = ans;
            card2SumAnswered += ans; card2SumCorrect += corr;
            if (Array.isArray(a.details)) a.details.forEach(d => { const k = d.correctAnswer || d.question || d.translation; if (k) card2ItemsSet.add(k); });
        } else if (gType === 'listenChoose') {
            if (totQ > maxVocabTotQ) maxVocabTotQ = totQ;
            if (ans > card3MaxAnsweredSingle) card3MaxAnsweredSingle = ans;
            card3SumAnswered += ans; card3SumCorrect += corr;
            if (Array.isArray(a.details)) a.details.forEach(d => { const k = d.correctAnswer || d.question; if (k) card3ItemsSet.add(k); });
        } else if (gType === 'spelling') {
            if (totQ > maxVocabTotQ) maxVocabTotQ = totQ;
            if (ans > card4MaxAnsweredSingle) card4MaxAnsweredSingle = ans;
            card4SumAnswered += ans; card4SumCorrect += corr;
            if (Array.isArray(a.details)) a.details.forEach(d => { const k = d.correctAnswer || d.question; if (k) card4ItemsSet.add(k); });
        } else if (gType === 'quiz') {
            if (totQ > maxQuizTotQ) maxQuizTotQ = totQ;
            if (ans > card5MaxAnsweredSingle) card5MaxAnsweredSingle = ans;
            card5SumAnswered += ans; card5SumCorrect += corr;
            if (Array.isArray(a.details)) a.details.forEach(d => { const k = d.question || d.correctAnswer; if (k) card5ItemsSet.add(k); });
        }
    });

    const totalVocab = unitVocabCount || (maxVocabTotQ > 0 ? maxVocabTotQ : 10);
    const totalQuiz = unitQuizCount || (maxQuizTotQ > 0 ? maxQuizTotQ : 10);

    const card1Coverage = totalVocab > 0 ? Math.min(100, (Math.max(card1WordsSet.size, card1MaxUnique) / totalVocab) * 100) : 0;
    const card2Coverage = totalVocab > 0 ? Math.min(100, (Math.min(totalVocab, Math.max(card2ItemsSet.size, card2MaxAnsweredSingle, Math.min(totalVocab, card2SumAnswered))) / totalVocab) * 100) : 0;
    const card2Accuracy = card2SumAnswered > 0 ? Math.min(100, (card2SumCorrect / card2SumAnswered) * 100) : 0;

    const card3Coverage = totalVocab > 0 ? Math.min(100, (Math.min(totalVocab, Math.max(card3ItemsSet.size, card3MaxAnsweredSingle, Math.min(totalVocab, card3SumAnswered))) / totalVocab) * 100) : 0;
    const card3Accuracy = card3SumAnswered > 0 ? Math.min(100, (card3SumCorrect / card3SumAnswered) * 100) : 0;

    const card4Coverage = totalVocab > 0 ? Math.min(100, (Math.min(totalVocab, Math.max(card4ItemsSet.size, card4MaxAnsweredSingle, Math.min(totalVocab, card4SumAnswered))) / totalVocab) * 100) : 0;
    const card4Accuracy = card4SumAnswered > 0 ? Math.min(100, (card4SumCorrect / card4SumAnswered) * 100) : 0;

    const card5Coverage = totalQuiz > 0 ? Math.min(100, (Math.min(totalQuiz, Math.max(card5ItemsSet.size, card5MaxAnsweredSingle, Math.min(totalQuiz, card5SumAnswered))) / totalQuiz) * 100) : 0;
    const card5Accuracy = card5SumAnswered > 0 ? Math.min(100, (card5SumCorrect / card5SumAnswered) * 100) : 0;

    const cond1 = totalValidTimeSeconds >= 9000;
    const cond2 = card1Coverage >= 99.99 && card2Coverage >= 99.99 && card3Coverage >= 99.99 && card4Coverage >= 99.99 && card5Coverage >= 99.99;
    const cond3 = (card2SumAnswered > 0 && card2Accuracy > 50) && (card3SumAnswered > 0 && card3Accuracy > 50) && (card4SumAnswered > 0 && card4Accuracy > 50) && (card5SumAnswered > 0 && card5Accuracy > 50);

    const is100Eligible = cond1 && cond2 && cond3;

    const contentScore = (card1Coverage + card2Coverage + card3Coverage + card4Coverage + card5Coverage) / 5;
    const timeScore = Math.min(100, (totalValidTimeSeconds / 9000) * 100);

    return {
        is100PercentEligible: is100Eligible,
        totalValidTimeSeconds,
        contentScore,
        timeScore,
    };
}

function calculateProposedTimeCapPercent(attemptsList, vocabCount, quizCount) {
    const d = calculateStudentCompletionDetails(attemptsList, vocabCount, quizCount);
    if (d.is100PercentEligible) {
        return 100;
    }
    const rawP = 0.7 * d.contentScore + 0.3 * d.timeScore;
    const cappedRaw = Math.min(rawP, d.timeScore);
    return Math.min(99, Math.round(cappedRaw));
}

let passed = 0, failed = 0;
function assert(desc, condition) {
    if (condition) { passed++; console.log(`  [PASS] ${desc}`); }
    else { failed++; console.error(`  [FAIL] ${desc}`); }
}

console.log("=== SECTION V MANDATORY VERIFICATION TESTS FOR PROPOSED TIME CAP OPTION ===\n");

function createSet(opts = {}) {
    const timeSec = opts.timeSec !== undefined ? opts.timeSec : 9000;
    const vocabCount = opts.vocabCount || 48;
    const quizCount = opts.quizCount || 40;
    const acc = opts.accuracy !== undefined ? opts.accuracy : 80;
    const tPerCard = Math.floor(timeSec / 5);

    return [
        { gameType: "vocabulary", timeTakenSeconds: tPerCard, uniqueWordsListenedCount: opts.vocabWords !== undefined ? opts.vocabWords : vocabCount, totalQuestions: vocabCount, status: "completed", score: "ĐÃ HỌC" },
        { gameType: "matching", timeTakenSeconds: tPerCard, correct: Math.round((vocabCount * acc) / 100), incorrect: vocabCount - Math.round((vocabCount * acc) / 100), answered: vocabCount, totalQuestions: vocabCount, status: "completed" },
        { gameType: "listen-choose", timeTakenSeconds: tPerCard, correct: Math.round((vocabCount * acc) / 100), incorrect: vocabCount - Math.round((vocabCount * acc) / 100), answered: vocabCount, totalQuestions: vocabCount, status: "completed" },
        { gameType: "spelling", timeTakenSeconds: tPerCard, correct: Math.round((vocabCount * acc) / 100), incorrect: vocabCount - Math.round((vocabCount * acc) / 100), answered: vocabCount, totalQuestions: vocabCount, status: "completed" },
        { gameType: "quiz", timeTakenSeconds: tPerCard, correct: Math.round((quizCount * acc) / 100), incorrect: quizCount - Math.round((quizCount * acc) / 100), answered: quizCount, totalQuestions: quizCount, status: "completed" }
    ];
}

// 1. 54m 44s (3284s) -> capped at 37%
const s1 = createSet({ timeSec: 3284 });
const p1 = calculateProposedTimeCapPercent(s1, 48, 40);
assert("1. 54m 44s capped at 37% (Result: " + p1 + "%)", p1 === 37);

// 2. 60m (3600s), content 100% -> capped at 40%
const s2 = createSet({ timeSec: 3600 });
const p2 = calculateProposedTimeCapPercent(s2, 48, 40);
assert("2. 60m full content capped at 40% (Result: " + p2 + "%)", p2 === 40);

// 3. 120m (7200s), content 100% -> capped at 80%
const s3 = createSet({ timeSec: 7200 });
const p3 = calculateProposedTimeCapPercent(s3, 48, 40);
assert("3. 120m full content capped at 80% (Result: " + p3 + "%)", p3 === 80);

// 4. 149m (8940s), content 100% -> capped at 99%
const s4 = createSet({ timeSec: 8940 });
const p4 = calculateProposedTimeCapPercent(s4, 48, 40);
assert("4. 149m full content capped at 99% (Result: " + p4 + "%)", p4 === 99);

// 5. 150m (9000s), full content, accuracy > 50% -> 100%
const s5 = createSet({ timeSec: 9000, accuracy: 80 });
const p5 = calculateProposedTimeCapPercent(s5, 48, 40);
assert("5. 150m full content & >50% acc -> 100% (Result: " + p5 + "%)", p5 === 100);

// 6. 150m, 1 card incomplete -> < 100%
const s6 = createSet({ timeSec: 9000 });
s6[1].answered = 10;
const p6 = calculateProposedTimeCapPercent(s6, 48, 40);
assert("6. 150m 1 card partial -> < 100% (Result: " + p6 + "%)", p6 < 100);

// 7. 150m, 1 card accuracy == 50% -> < 100%
const s7 = createSet({ timeSec: 9000 });
s7[1].correct = 24; s7[1].incorrect = 24; s7[1].answered = 48;
const p7 = calculateProposedTimeCapPercent(s7, 48, 40);
assert("7. 150m 1 card acc == 50% -> < 100% (Result: " + p7 + "%)", p7 < 100);

// 8. 150m, Spelling card not performed -> < 100%
const s8 = createSet({ timeSec: 9000 });
s8[3] = { gameType: 'spelling', timeTakenSeconds: 0, correct: 0, incorrect: 0, answered: 0 };
const p8 = calculateProposedTimeCapPercent(s8, 48, 40);
assert("8. 150m Spelling not done -> < 100% (Result: " + p8 + "%)", p8 < 100);

console.log("\n========================================");
console.log(`TIME CAP OPTION VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
if (failed > 0) process.exit(1);
