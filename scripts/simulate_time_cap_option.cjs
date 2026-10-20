/**
 * Simulation Script for Teacher's Proposed Time Cap Option:
 * P_final = is100Eligible ? 100 : min(P_temp, T, 99)
 * Where P_temp = 0.7 * C + 0.3 * T
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

function calculateDetails(attemptsList, unitVocabCount, unitQuizCount) {
    const defaultResult = {
        currentPercent: 0,
        proposedPercent: 0,
        is100PercentEligible: false,
        totalValidTimeSeconds: 0,
        contentScore: 0,
        timeScore: 0,
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

    const rawP = 0.7 * contentScore + 0.3 * timeScore;
    const roundedP = Math.round(rawP);

    // Formula A: Current Formula (0.7*C + 0.3*T) capped at 99
    const currentPercent = is100Eligible ? 100 : Math.min(99, roundedP);

    // Formula B: Proposed Time Cap Option: min(P_temp, T, 99)
    const proposedRaw = Math.min(rawP, timeScore);
    const proposedPercent = is100Eligible ? 100 : Math.min(99, Math.round(proposedRaw));

    return {
        currentPercent,
        proposedPercent,
        is100PercentEligible: is100Eligible,
        totalValidTimeSeconds,
        contentScore,
        timeScore,
    };
}

async function runSimulation() {
    const url = "https://teachertuy-englishapp-default-rtdb.asia-southeast1.firebasedatabase.app/classrooms/CLASS_220518/units_12.json";
    console.log("Fetching units_12 data from Firebase...");
    const res = await fetch(url);
    const units = await res.json();

    const targetUnits = ['unit_1', 'unit_2', 'unit_3'];
    let totalProcessed = 0;
    let totalAffected = 0;

    const simulationResults = [];

    for (const uKey of targetUnits) {
        const uObj = units[uKey];
        if (!uObj || !uObj.results) continue;

        const vocabCount = uObj.vocabulary ? uObj.vocabulary.length : 0;
        const quizCount = uObj.quiz ? uObj.quiz.length : 0;

        for (const [studentKey, attemptsObj] of Object.entries(uObj.results)) {
            if (!attemptsObj || typeof attemptsObj !== 'object') continue;

            const list = Object.entries(attemptsObj).map(([id, a]) => ({ ...a, _actId: id }));
            const d = calculateDetails(list, vocabCount, quizCount);

            totalProcessed++;
            const isChanged = d.currentPercent !== d.proposedPercent;
            if (isChanged) totalAffected++;

            simulationResults.push({
                unit: uKey,
                student: studentKey,
                validMinutes: `${Math.round(d.totalValidTimeSeconds/60)}m`,
                validTimeSeconds: d.totalValidTimeSeconds,
                timeScoreT: `${d.timeScore.toFixed(1)}%`,
                contentScoreC: `${d.contentScore.toFixed(1)}%`,
                currentPercent: `${d.currentPercent}%`,
                proposedPercent: `${d.proposedPercent}%`,
                scoreDiff: `${d.proposedPercent - d.currentPercent}%`,
                is100Eligible: d.is100PercentEligible
            });
        }
    }

    console.log("\n================ SIMULATION AUDIT SUMMARY ================");
    console.log(`Total Student-Unit Records Evaluated: ${totalProcessed}`);
    console.log(`Records Affected by Time Cap Option:   ${totalAffected} (${((totalAffected/totalProcessed)*100).toFixed(1)}%)`);
    console.log(`Records Unchanged (100% Eligible or Time >= Content): ${totalProcessed - totalAffected}`);

    const reportPath = path.join(__dirname, '../simulation_time_cap_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(simulationResults, null, 2));
    console.log(`\nSimulation report saved to: ${reportPath}`);

    // Print sample comparison table
    console.log("\nSAMPLE COMPARISON TABLE (First 15 Affected Students):");
    console.log("Unit | Student | Valid Time | Content C | Time T | Current % | PROPOSED Time Cap % | Diff");
    console.log("-----------------------------------------------------------------------------------------");
    simulationResults.filter(r => r.scoreDiff !== "0%").slice(0, 15).forEach(r => {
        console.log(`${r.unit} | ${r.student.padEnd(28)} | ${r.validMinutes.padEnd(6)} | ${r.contentScoreC.padEnd(7)} | ${r.timeScoreT.padEnd(6)} | ${r.currentPercent.padEnd(9)} | ${r.proposedPercent.padEnd(19)} | ${r.scoreDiff}`);
    });
}

runSimulation();
