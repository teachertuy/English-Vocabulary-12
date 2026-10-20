/**
 * Batch Recalculation Tool for Historical Progress (Unit 1, Unit 2, Unit 3)
 * Evaluates strict 100% teacher criteria (150 min, 100% content coverage, accuracy > 50%)
 * and 70/30 composite score formula for < 100%.
 */
const fs = require('fs');
const path = require('path');

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
    };

    if (!attemptsList || !Array.isArray(attemptsList) || attemptsList.length === 0) {
        return defaultResult;
    }

    const validAttempts = attemptsList.filter(a => a && isRealStudentAttempt(a));
    if (validAttempts.length === 0) {
        return defaultResult;
    }

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

    // Conditions
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
    };
}

// Old formula for comparison
function calculateOldCompletionPercent(attemptsList, unitVocabCount, unitQuizCount) {
    if (!attemptsList || attemptsList.length === 0) return 0;
    let vTime = 0, vMaxUniqueWords = 0, mMaxCorrect = 0, lMaxCorrect = 0, sMaxDone = 0, qMaxDone = 0;
    let maxVocabTotal = 0, maxQuizTotal = 0;
    const wordsSet = new Set();

    attemptsList.forEach(a => {
        if (!a || !isRealStudentAttempt(a)) return;
        const gType = (a.gameType === 'listen-choose' || a.gameType === 'listenChoose') ? 'listenChoose' : a.gameType;
        const time = resolveAttemptTimeSeconds(a, a._actId || a.activityId);
        const corr = typeof a.correct === 'number' ? a.correct : (parseInt(a.correct, 10) || 0);
        const incorr = typeof a.incorrect === 'number' ? a.incorrect : (parseInt(a.incorrect, 10) || 0);
        const totQ = typeof a.totalQuestions === 'number' ? a.totalQuestions : (parseInt(a.totalQuestions, 10) || 0);

        if (gType === 'vocabulary') {
            vTime += time;
            const u = typeof a.uniqueWordsListenedCount === 'number' ? a.uniqueWordsListenedCount : (Array.isArray(a.listenedWords) ? a.listenedWords.length : 0);
            if (u > vMaxUniqueWords) vMaxUniqueWords = u;
            if (Array.isArray(a.listenedWords)) a.listenedWords.forEach(w => { if (w) wordsSet.add(w); });
            if (totQ > maxVocabTotal) maxVocabTotal = totQ;
        } else if (gType === 'matching') {
            if (corr > mMaxCorrect) mMaxCorrect = corr;
            if (totQ > maxVocabTotal) maxVocabTotal = totQ;
        } else if (gType === 'listenChoose') {
            if (corr > lMaxCorrect) lMaxCorrect = corr;
            if (totQ > maxVocabTotal) maxVocabTotal = totQ;
        } else if (gType === 'spelling') {
            const done = corr + incorr;
            if (done > sMaxDone) sMaxDone = done;
            if (totQ > maxVocabTotal) maxVocabTotal = totQ;
        } else if (gType === 'quiz') {
            const done = corr + incorr;
            if (done > qMaxDone) qMaxDone = done;
            if (totQ > maxQuizTotal) maxQuizTotal = totQ;
        }
    });

    const vocabCount = unitVocabCount || (maxVocabTotal > 0 ? maxVocabTotal : 10);
    const quizCount = unitQuizCount || (maxQuizTotal > 0 ? maxQuizTotal : 10);

    const effWords = Math.max(vMaxUniqueWords, wordsSet.size);
    const r1 = Math.max(vocabCount > 0 ? Math.min(1.0, effWords / vocabCount) : 0, (vocabCount * 12) > 0 ? Math.min(1.0, vTime / (vocabCount * 12)) : 0);
    const r2 = vocabCount > 0 ? Math.min(1.0, mMaxCorrect / vocabCount) : 0;
    const r3 = vocabCount > 0 ? Math.min(1.0, lMaxCorrect / vocabCount) : 0;
    const r4 = vocabCount > 0 ? Math.min(1.0, sMaxDone / vocabCount) : 0;
    const r5 = quizCount > 0 ? Math.min(1.0, qMaxDone / quizCount) : 0;

    let pct = Math.min(100, Math.round((r1 + r2 + r3 + r4 + r5) * 20));
    if (r1 >= 1.0 && r2 >= 1.0 && r3 >= 1.0 && r4 >= 1.0 && r5 >= 1.0) pct = 100;
    return pct;
}

async function recalculateHistorical() {
    const backupDir = path.join(__dirname, '../.aistudio/backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const unitsUrl = "https://teachertuy-englishapp-default-rtdb.asia-southeast1.firebasedatabase.app/classrooms/CLASS_220518/units_12.json";
    console.log("Fetching units_12 data from Firebase...");
    const res = await fetch(unitsUrl);
    const units = await res.json();
    if (!units) {
        console.error("No units data found!");
        return;
    }

    const backupFile = path.join(backupDir, `backup_recalc_historical_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(units, null, 2));
    console.log(`[BACKUP] Saved raw snapshot backup to: ${backupFile}`);

    const targetUnits = ['unit_1', 'unit_2', 'unit_3'];
    const auditReport = [];

    let totalStudentsProcessed = 0;
    let count100InOld = 0;
    let count100InNew = 0;

    for (const unitKey of targetUnits) {
        const unitObj = units[unitKey];
        if (!unitObj || !unitObj.results) continue;

        const vocabCount = unitObj.vocabulary ? unitObj.vocabulary.length : 0;
        const quizCount = unitObj.quiz ? unitObj.quiz.length : 0;

        console.log(`\n================ Processing ${unitKey.toUpperCase()} (Vocab: ${vocabCount}, Quiz: ${quizCount}) ================`);

        for (const [studentKey, attemptsObj] of Object.entries(unitObj.results)) {
            if (!attemptsObj || typeof attemptsObj !== 'object') continue;

            const attemptsList = Object.entries(attemptsObj).map(([actId, att]) => ({
                ...att,
                _actId: actId
            }));

            const oldPercent = calculateOldCompletionPercent(attemptsList, vocabCount, quizCount);
            const newDetails = calculateStudentCompletionDetails(attemptsList, vocabCount, quizCount);

            if (oldPercent === 100) count100InOld++;
            if (newDetails.overallPercent === 100) count100InNew++;

            totalStudentsProcessed++;

            const validMin = Math.round(newDetails.totalValidTimeSeconds / 60);

            auditReport.push({
                unit: unitKey,
                student: studentKey,
                oldPercent: `${oldPercent}%`,
                newPercent: `${newDetails.overallPercent}%`,
                is100PercentEligible: newDetails.is100PercentEligible,
                validMinutes: `${validMin} phút (${newDetails.totalValidTimeSeconds}s)`,
                contentScoreC: `${Math.round(newDetails.contentScore)}%`,
                timeScoreT: `${Math.round(newDetails.timeScore)}%`,
                cardCoverage: {
                    vocabCard1: `${Math.round(newDetails.card1Coverage)}%`,
                    matchingCard2: `${Math.round(newDetails.card2Coverage)}% (Acc: ${Math.round(newDetails.card2Accuracy)}%)`,
                    listenChooseCard3: `${Math.round(newDetails.card3Coverage)}% (Acc: ${Math.round(newDetails.card3Accuracy)}%)`,
                    spellingCard4: `${Math.round(newDetails.card4Coverage)}% (Acc: ${Math.round(newDetails.card4Accuracy)}%)`,
                    quizCard5: `${Math.round(newDetails.card5Coverage)}% (Acc: ${Math.round(newDetails.card5Accuracy)}%)`,
                }
            });

            console.log(`  Student: [${studentKey}] | Old: ${oldPercent}% -> NEW: ${newDetails.overallPercent}% | Valid Time: ${validMin}m | Eligible 100%: ${newDetails.is100PercentEligible}`);
        }
    }

    console.log(`\n=== RECALCULATION AUDIT SUMMARY ===`);
    console.log(`Total Student-Unit Records Processed: ${totalStudentsProcessed}`);
    console.log(`Students with 100% in Old Formula: ${count100InOld}`);
    console.log(`Students with 100% in NEW Formula: ${count100InNew}`);
    console.log(`(Notice: Students previously showing 100% with < 150 minutes or incomplete content are now correctly re-adjusted to 20%-99%)`);

    const reportFile = path.join(__dirname, '../recalculation_audit_report.json');
    fs.writeFileSync(reportFile, JSON.stringify(auditReport, null, 2));
    console.log(`[REPORT] Detailed audit report written to: ${reportFile}`);
}

recalculateHistorical();
