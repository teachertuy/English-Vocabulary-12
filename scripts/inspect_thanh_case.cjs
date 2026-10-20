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
        card1Coverage: 0,
        card2Coverage: 0,
        card3Coverage: 0,
        card4Coverage: 0,
        card5Coverage: 0,
        card2Accuracy: 0,
        card3Accuracy: 0,
        card4Accuracy: 0,
        card5Accuracy: 0,
        card2Correct: 0, card2Answered: 0,
        card3Correct: 0, card3Answered: 0,
        card4Correct: 0, card4Answered: 0,
        card5Correct: 0, card5Answered: 0,
    };

    if (!attemptsList || !Array.isArray(attemptsList) || attemptsList.length === 0) return defaultResult;
    const validAttempts = attemptsList.filter(a => a && isRealStudentAttempt(a));
    if (validAttempts.length === 0) return defaultResult;

    let totalValidTimeSeconds = 0;
    validAttempts.forEach(a => {
        totalValidTimeSeconds += resolveAttemptTimeSeconds(a, a._actId || a.activityId);
    });

    let maxVocabTotQ = 0;
    let maxQuizTotQ = 0;

    const card1WordsSet = new Set();
    let card1MaxUnique = 0;

    const card2ItemsSet = new Set();
    let card2MaxAnsweredSingle = 0;
    let card2SumAnswered = 0;
    let card2SumCorrect = 0;

    const card3ItemsSet = new Set();
    let card3MaxAnsweredSingle = 0;
    let card3SumAnswered = 0;
    let card3SumCorrect = 0;

    const card4ItemsSet = new Set();
    let card4MaxAnsweredSingle = 0;
    let card4SumAnswered = 0;
    let card4SumCorrect = 0;

    const card5ItemsSet = new Set();
    let card5MaxAnsweredSingle = 0;
    let card5SumAnswered = 0;
    let card5SumCorrect = 0;

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

    const totalVocab = (unitVocabCount && unitVocabCount > 0) ? unitVocabCount : (maxVocabTotQ > 0 ? maxVocabTotQ : 10);
    const totalQuiz = (unitQuizCount && unitQuizCount > 0) ? unitQuizCount : (maxQuizTotQ > 0 ? maxQuizTotQ : 10);

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
    const cond2_coverage = card1Coverage >= 99.99 && card2Coverage >= 99.99 && card3Coverage >= 99.99 && card4Coverage >= 99.99 && card5Coverage >= 99.99;
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
        card1Coverage,
        card2Coverage,
        card3Coverage,
        card4Coverage,
        card5Coverage,
        card2Accuracy,
        card3Accuracy,
        card4Accuracy,
        card5Accuracy,
        card2Correct: card2SumCorrect, card2Answered: card2SumAnswered,
        card3Correct: card3SumCorrect, card3Answered: card3SumAnswered,
        card4Correct: card4SumCorrect, card4Answered: card4SumAnswered,
        card5Correct: card5SumCorrect, card5Answered: card5SumAnswered,
        card1UniqueCount: effectiveCard1Unique, totalVocab, totalQuiz
    };
}

async function inspectThanh() {
    const url = "https://teachertuy-englishapp-default-rtdb.asia-southeast1.firebasedatabase.app/classrooms/CLASS_220518/units_12.json";
    const res = await fetch(url);
    const data = await res.json();

    for (const uKey of ["unit_1", "unit_2"]) {
        const uVal = data[uKey];
        const vocabCount = uVal.vocabulary ? uVal.vocabulary.length : 0;
        const quizCount = uVal.quiz ? uVal.quiz.length : 0;
        const attempts = uVal.results["12B_NGUYỄN MINH THÀNH"];
        if (!attempts) continue;

        const list = Object.entries(attempts).map(([actId, att]) => ({ ...att, _actId: actId }));
        const details = calculateStudentCompletionDetails(list, vocabCount, quizCount);

        console.log(`\n================ STUDENT: 12B_NGUYỄN MINH THÀNH | ${uKey.toUpperCase()} ================`);
        console.log(`Unit catalog: ${vocabCount} vocabulary words, ${quizCount} quiz questions`);
        console.log(`Total attempts recorded: ${list.length}`);
        console.log(`Total valid learning time: ${details.totalValidTimeSeconds}s (${Math.floor(details.totalValidTimeSeconds/60)} phút ${details.totalValidTimeSeconds%60} giây)`);
        console.log(`1. Thẻ HỌC TỪ MỚI:     Bao phủ = ${details.card1Coverage.toFixed(1)}% (${details.card1UniqueCount}/${details.totalVocab} từ)`);
        console.log(`2. Thẻ GHÉP CẶP:       Bao phủ = ${details.card2Coverage.toFixed(1)}% | Đúng = ${details.card2Correct}/${details.card2Answered} (Tỷ lệ đúng: ${details.card2Accuracy.toFixed(1)}%)`);
        console.log(`3. Thẻ NGHE & CHỌN:    Bao phủ = ${details.card3Coverage.toFixed(1)}% | Đúng = ${details.card3Correct}/${details.card3Answered} (Tỷ lệ đúng: ${details.card3Accuracy.toFixed(1)}%)`);
        console.log(`4. Thẻ VIẾT CHÍNH TẢ:  Bao phủ = ${details.card4Coverage.toFixed(1)}% | Đúng = ${details.card4Correct}/${details.card4Answered} (Tỷ lệ đúng: ${details.card4Accuracy.toFixed(1)}%)`);
        console.log(`5. Thẻ KIỂM TRA LẠI:   Bao phủ = ${details.card5Coverage.toFixed(1)}% | Đúng = ${details.card5Correct}/${details.card5Answered} (Tỷ lệ đúng: ${details.card5Accuracy.toFixed(1)}%)`);
        console.log(`--------------------------------------------------`);
        console.log(`Điểm Nội dung C (thô):  ${details.contentScore.toFixed(4)}%`);
        console.log(`Điểm Thời gian T (thô): ${details.timeScore.toFixed(4)}% (${details.totalValidTimeSeconds}/9000s)`);
        console.log(`Điểm Tổng hợp P (thô):  ${(0.7 * details.contentScore + 0.3 * details.timeScore).toFixed(4)}%`);
        console.log(`Điểm hiển thị hiện tại: ${details.overallPercent}%`);
    }
}

inspectThanh();
