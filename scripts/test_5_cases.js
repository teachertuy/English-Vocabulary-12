// Standalone unit test for the 5 requested manual verification cases

function calculateStudentCompletionDetails(attemptsList, unitVocabCount, unitQuizCount) {
    const defaultResult = {
        overallPercent: 0,
        is100PercentEligible: false,
        totalValidTimeSeconds: 0,
        contentScore: 0,
        timeScore: 0,
    };

    if (!attemptsList || !Array.isArray(attemptsList) || attemptsList.length === 0) {
        return defaultResult;
    }

    const validAttempts = attemptsList.filter(a => {
        if (!a) return false;
        return (a.timeTakenSeconds && a.timeTakenSeconds > 0) ||
               (a.answered && a.answered > 0) ||
               (a.correct && a.correct > 0) ||
               (a.incorrect && a.incorrect > 0) ||
               (a.uniqueWordsListenedCount && a.uniqueWordsListenedCount > 0) ||
               (a.audioListenedCount && a.audioListenedCount > 0);
    });

    if (validAttempts.length === 0) {
        return defaultResult;
    }

    let totalValidTimeSeconds = 0;
    validAttempts.forEach(a => {
        totalValidTimeSeconds += (a.timeTakenSeconds || 0);
    });

    let maxVocabTotQ = 0;
    let maxQuizTotQ = 0;

    let card1MaxUnique = 0;
    let card2MaxAnsweredSingle = 0, card2SumAnswered = 0, card2SumCorrect = 0;
    let card3MaxAnsweredSingle = 0, card3SumAnswered = 0, card3SumCorrect = 0;
    let card4MaxAnsweredSingle = 0, card4SumAnswered = 0, card4SumCorrect = 0;
    let card5MaxAnsweredSingle = 0, card5SumAnswered = 0, card5SumCorrect = 0;

    const card1WordsSet = new Set();
    const card2ItemsSet = new Set();
    const card3ItemsSet = new Set();
    const card4ItemsSet = new Set();
    const card5ItemsSet = new Set();

    validAttempts.forEach(a => {
        const gType = (a.gameType === 'listen-choose' || a.gameType === 'listenChoose') ? 'listenChoose' : a.gameType;
        const corr = typeof a.correct === 'number' ? a.correct : (parseInt(a.correct, 10) || 0);
        const incorr = typeof a.incorrect === 'number' ? a.incorrect : (parseInt(a.incorrect, 10) || 0);
        const ans = typeof a.answered === 'number' ? a.answered : (corr + incorr);
        const totQ = typeof a.totalQuestions === 'number' ? a.totalQuestions : (parseInt(a.totalQuestions, 10) || 0);

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
        } else if (gType === 'listenChoose') {
            if (totQ > maxVocabTotQ) maxVocabTotQ = totQ;
            if (ans > card3MaxAnsweredSingle) card3MaxAnsweredSingle = ans;
            card3SumAnswered += ans;
            card3SumCorrect += corr;
        } else if (gType === 'spelling') {
            if (totQ > maxVocabTotQ) maxVocabTotQ = totQ;
            if (ans > card4MaxAnsweredSingle) card4MaxAnsweredSingle = ans;
            card4SumAnswered += ans;
            card4SumCorrect += corr;
        } else if (gType === 'quiz') {
            if (totQ > maxQuizTotQ) maxQuizTotQ = totQ;
            if (ans > card5MaxAnsweredSingle) card5MaxAnsweredSingle = ans;
            card5SumAnswered += ans;
            card5SumCorrect += corr;
        }
    });

    const totalVocab = (unitVocabCount && unitVocabCount > 0)
        ? unitVocabCount
        : (maxVocabTotQ > 0 ? maxVocabTotQ : 10);

    const totalQuiz = (unitQuizCount && unitQuizCount > 0)
        ? unitQuizCount
        : (maxQuizTotQ > 0 ? maxQuizTotQ : 10);

    const effectiveCard1Unique = Math.max(card1WordsSet.size, card1MaxUnique);
    const card1Coverage = totalVocab > 0 ? Math.min(100, (effectiveCard1Unique / totalVocab) * 100) : 0;

    const card2UniqueCount = Math.min(totalVocab, Math.max(card2ItemsSet.size, card2MaxAnsweredSingle, Math.min(totalVocab, card2SumAnswered)));
    const card2Coverage = totalVocab > 0 ? Math.min(100, (card2UniqueCount / totalVocab) * 100) : 0;
    const card2Accuracy = card2SumAnswered > 0 ? Math.min(100, (card2SumCorrect / card2SumAnswered) * 100) : 0;

    const card3UniqueCount = Math.min(totalVocab, Math.max(card3ItemsSet.size, card3MaxAnsweredSingle, Math.min(totalVocab, card3SumAnswered)));
    const card3Coverage = totalVocab > 0 ? Math.min(100, (card3UniqueCount / totalVocab) * 100) : 0;
    const card3Accuracy = card3SumAnswered > 0 ? Math.min(100, (card3SumCorrect / card3SumAnswered) * 100) : 0;

    const card4UniqueCount = Math.min(totalVocab, Math.max(card4ItemsSet.size, card4MaxAnsweredSingle, Math.min(totalVocab, card4SumAnswered)));
    const card4Coverage = totalVocab > 0 ? Math.min(100, (card4UniqueCount / totalVocab) * 100) : 0;
    const card4Accuracy = card4SumAnswered > 0 ? Math.min(100, (card4SumCorrect / card4SumAnswered) * 100) : 0;

    const card5UniqueCount = Math.min(totalQuiz, Math.max(card5ItemsSet.size, card5MaxAnsweredSingle, Math.min(totalQuiz, card5SumAnswered)));
    const card5Coverage = totalQuiz > 0 ? Math.min(100, (card5UniqueCount / totalQuiz) * 100) : 0;
    const card5Accuracy = card5SumAnswered > 0 ? Math.min(100, (card5SumCorrect / card5SumAnswered) * 100) : 0;

    const cond1_time = totalValidTimeSeconds >= 9000;
    const cond2_coverage = card1Coverage >= 99.99 &&
                            card2Coverage >= 99.99 &&
                            card3Coverage >= 99.99 &&
                            card4Coverage >= 99.99 &&
                            card5Coverage >= 99.99;

    const cond3_accuracy = (card2SumAnswered > 0 && card2Accuracy > 50) &&
                            (card3SumAnswered > 0 && card3Accuracy > 50) &&
                            (card4SumAnswered > 0 && card4Accuracy > 50) &&
                            (card5SumAnswered > 0 && card5Accuracy > 50);

    const is100PercentEligible = cond1_time && cond2_coverage && cond3_accuracy;

    const contentScore = (card1Coverage + card2Coverage + card3Coverage + card4Coverage + card5Coverage) / 5;
    const timeScore = Math.min(100, (totalValidTimeSeconds / 9000) * 100);

    const rawP = 0.7 * contentScore + 0.3 * timeScore;
    const roundedP = Math.round(rawP);

    let overallPercent = 0;
    if (is100PercentEligible) {
        overallPercent = 100;
    } else {
        overallPercent = Math.min(99, roundedP);
    }

    return {
        overallPercent,
        is100PercentEligible,
        totalValidTimeSeconds,
        contentScore,
        timeScore,
        card1Coverage, card2Coverage, card3Coverage, card4Coverage, card5Coverage,
        card2Accuracy, card3Accuracy, card4Accuracy, card5Accuracy
    };
}

const makeAttempt = (gameType, timeSec, answered, correct, totalQ, listenedWords) => ({
    gameType,
    timeTakenSeconds: timeSec,
    answered,
    correct,
    incorrect: answered - correct,
    totalQuestions: totalQ,
    listenedWords,
    uniqueWordsListenedCount: listenedWords ? listenedWords.length : undefined
});

const fullVocab = Array.from({length: 48}, (_, i) => `w${i}`);
const partialVocab = Array.from({length: 40}, (_, i) => `w${i}`);

console.log("=== RUNNING MANUAL VERIFICATION SUITE ===");

// Case 1: 5 cards 100%, 60 mins (3600s = 720s each)
const case1 = [
    makeAttempt("vocabulary", 720, 48, 0, 48, fullVocab),
    makeAttempt("matching", 720, 48, 48, 48),
    makeAttempt("listenChoose", 720, 48, 48, 48),
    makeAttempt("spelling", 720, 48, 48, 48),
    makeAttempt("quiz", 720, 48, 48, 48)
];
const r1 = calculateStudentCompletionDetails(case1, 48, 48);
console.log("Case 1 (5 cards 100%, 60 mins):", r1.overallPercent, "% | Expected: 82% | C:", r1.contentScore, "% T:", r1.timeScore, "%");

// Case 2: 5 cards 100%, 149 mins (8940s = 1788s each)
const case2 = [
    makeAttempt("vocabulary", 1788, 48, 0, 48, fullVocab),
    makeAttempt("matching", 1788, 48, 48, 48),
    makeAttempt("listenChoose", 1788, 48, 48, 48),
    makeAttempt("spelling", 1788, 48, 48, 48),
    makeAttempt("quiz", 1788, 48, 48, 48)
];
const r2 = calculateStudentCompletionDetails(case2, 48, 48);
console.log("Case 2 (5 cards 100%, 149 mins):", r2.overallPercent, "% | Expected: <= 99% | C:", r2.contentScore, "% T:", r2.timeScore, "%");

// Case 3: 150 mins (9000s), 40/48 vocab listened, 4 other cards 100%
const case3 = [
    makeAttempt("vocabulary", 1800, 40, 0, 48, partialVocab),
    makeAttempt("matching", 1800, 48, 48, 48),
    makeAttempt("listenChoose", 1800, 48, 48, 48),
    makeAttempt("spelling", 1800, 48, 48, 48),
    makeAttempt("quiz", 1800, 48, 48, 48)
];
const r3 = calculateStudentCompletionDetails(case3, 48, 48);
console.log("Case 3 (150 mins, 40/48 vocab, 4 cards 100%):", r3.overallPercent, "% | Expected: 98% (<100%) | C:", r3.contentScore, "% T:", r3.timeScore, "%");

// Case 4: 150 mins, 100% content, accuracy > 50%
const case4 = [
    makeAttempt("vocabulary", 1800, 48, 0, 48, fullVocab),
    makeAttempt("matching", 1800, 48, 48, 48),
    makeAttempt("listenChoose", 1800, 48, 48, 48),
    makeAttempt("spelling", 1800, 48, 48, 48),
    makeAttempt("quiz", 1800, 48, 48, 48)
];
const r4 = calculateStudentCompletionDetails(case4, 48, 48);
console.log("Case 4 (150 mins, 100% content, accuracy > 50%):", r4.overallPercent, "% | Expected: 100%");

// Case 5: 150 mins, 100% content, but one card accuracy exactly 50% (24/48 correct)
const case5 = [
    makeAttempt("vocabulary", 1800, 48, 0, 48, fullVocab),
    makeAttempt("matching", 1800, 48, 24, 48), // 24/48 = 50%
    makeAttempt("listenChoose", 1800, 48, 48, 48),
    makeAttempt("spelling", 1800, 48, 48, 48),
    makeAttempt("quiz", 1800, 48, 48, 48)
];
const r5 = calculateStudentCompletionDetails(case5, 48, 48);
console.log("Case 5 (150 mins, 100% content, one card accuracy 50%):", r5.overallPercent, "% | Expected: <= 99% (Capped)");
